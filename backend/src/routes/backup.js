import express from 'express'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { DB_PATH } from '../models/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const BACKUP_DIR = path.join(__dirname, '../../database/backups')

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// 执行Git备份
router.post('/git-sync', async (req, res) => {
  try {
    const projectRoot = path.join(__dirname, '../../..')
    
    // 复制数据库到项目根目录以便Git追踪
    const dbBackupPath = path.join(projectRoot, 'database-backup.db')
    fs.copyFileSync(DB_PATH, dbBackupPath)
    
    // 执行Git命令
    const commands = [
      'git add database-backup.db',
      `git commit -m "数据库备份 ${new Date().toISOString()}"`,
      'git push'
    ]
    
    for (const cmd of commands) {
      await new Promise((resolve, reject) => {
        exec(cmd, { cwd: projectRoot }, (error, stdout, stderr) => {
          if (error && !stderr.includes('nothing to commit')) {
            reject(error)
          } else {
            resolve(stdout)
          }
        })
      })
    }
    
    res.json({ code: 200, message: 'Git同步成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建本地备份
router.post('/local', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`)
    
    fs.copyFileSync(DB_PATH, backupPath)
    
    // 清理旧备份（保留最近10个）
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.time - a.time)
    
    if (backups.length > 10) {
      backups.slice(10).forEach(b => {
        fs.unlinkSync(b.path)
      })
    }
    
    res.json({ code: 200, message: '本地备份成功', data: { path: backupPath } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取备份列表
router.get('/list', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ code: 200, data: [] })
    }
    
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f))
        return {
          name: f,
          size: (stat.size / 1024).toFixed(2) + ' KB',
          time: stat.mtime.toISOString()
        }
      })
      .sort((a, b) => new Date(b.time) - new Date(a.time))
    
    res.json({ code: 200, data: backups })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 恢复备份
router.post('/restore', (req, res) => {
  try {
    const { filename } = req.body
    const backupPath = path.join(BACKUP_DIR, filename)
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ code: 404, message: '备份文件不存在' })
    }
    
    // 先创建当前数据库的备份
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const currentBackup = path.join(BACKUP_DIR, `auto-before-restore-${timestamp}.db`)
    fs.copyFileSync(DB_PATH, currentBackup)
    
    // 恢复备份
    fs.copyFileSync(backupPath, DB_PATH)
    
    res.json({ code: 200, message: '恢复成功，请重启服务' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

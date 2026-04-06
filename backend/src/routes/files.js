import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb } from '../models/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 获取设置值
const getSetting = async (key, defaultValue) => {
  try {
    const db = await getDb()
    const setting = await db.get('SELECT value FROM settings WHERE key = ?', [key])
    return setting ? setting.value : defaultValue
  } catch (error) {
    console.error('获取设置失败:', error)
    return defaultValue
  }
}

// 获取基础目录配置（优先从数据库读取，其次环境变量，最后默认路径）
const getBaseDirs = async () => {
  const defaultGrowthPlans = path.join(__dirname, '../../uploads/growth_plans')
  const defaultMathPapers = path.join(__dirname, '../../uploads/math_papers')
  
  const growthPlansDir = await getSetting('growth-plans-dir', process.env.GROWTH_PLANS_DIR || defaultGrowthPlans)
  const mathPapersDir = await getSetting('math-papers-dir', process.env.MATH_PAPERS_DIR || defaultMathPapers)
  
  return {
    'growth-plans': growthPlansDir,
    'math-papers': mathPapersDir
  }
}

// 递归获取文件树
const getFileTree = (dirPath, basePath) => {
  if (!fs.existsSync(dirPath)) {
    return []
  }
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true })
  const result = []
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name)
    const relativePath = path.relative(basePath, fullPath)
    
    if (item.isDirectory()) {
      result.push({
        name: item.name,
        type: 'dir',
        path: relativePath,
        children: getFileTree(fullPath, basePath)
      })
    } else {
      const stat = fs.statSync(fullPath)
      result.push({
        name: item.name,
        type: 'file',
        path: relativePath,
        size: formatFileSize(stat.size),
        mtime: stat.mtime.toISOString().split('T')[0]
      })
    }
  }
  
  return result.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === 'dir' ? -1 : 1
  })
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 获取成长计划文件树
router.get('/growth-plans', async (req, res) => {
  try {
    const BASE_DIRS = await getBaseDirs()
    const dir = BASE_DIRS['growth-plans']
    if (!fs.existsSync(dir)) {
      return res.json({ code: 200, data: [] })
    }
    const tree = getFileTree(dir, dir)
    res.json({ code: 200, data: tree })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取数学试卷文件树
router.get('/math-papers', async (req, res) => {
  try {
    const BASE_DIRS = await getBaseDirs()
    const dir = BASE_DIRS['math-papers']
    if (!fs.existsSync(dir)) {
      return res.json({ code: 200, data: [] })
    }
    const tree = getFileTree(dir, dir)
    res.json({ code: 200, data: tree })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取文件内容（仅HTML）
router.get('/content', async (req, res) => {
  try {
    const BASE_DIRS = await getBaseDirs()
    const { path: filePath } = req.query
    const fullPath = path.join(BASE_DIRS['growth-plans'], filePath)
    
    // 安全检查：确保路径在允许目录内
    if (!fullPath.startsWith(BASE_DIRS['growth-plans'])) {
      return res.status(403).json({ code: 403, message: '非法路径' })
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ code: 404, message: '文件不存在' })
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8')
    res.json({ code: 200, data: content })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 下载文件
router.get('/download', async (req, res) => {
  try {
    const BASE_DIRS = await getBaseDirs()
    const { path: filePath, type = 'growth-plans', download } = req.query
    const baseDir = BASE_DIRS[type] || BASE_DIRS['growth-plans']
    const fullPath = path.join(baseDir, filePath)
    
    // 安全检查
    if (!fullPath.startsWith(baseDir)) {
      return res.status(403).json({ code: 403, message: '非法路径' })
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ code: 404, message: '文件不存在' })
    }
    
    const filename = path.basename(fullPath)
    
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    }
    
    res.sendFile(fullPath)
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 测试路径是否有效
router.post('/test-path', async (req, res) => {
  try {
    const { path: testPath } = req.body
    
    if (!testPath) {
      return res.status(400).json({ code: 400, message: '路径不能为空' })
    }
    
    const exists = fs.existsSync(testPath)
    const isDirectory = exists ? fs.statSync(testPath).isDirectory() : false
    
    if (!exists) {
      return res.json({ 
        code: 200, 
        data: { 
          valid: false, 
          message: '路径不存在，但可以在保存后自动创建' 
        } 
      })
    }
    
    if (!isDirectory) {
      return res.json({ 
        code: 200, 
        data: { 
          valid: false, 
          message: '路径存在但不是文件夹' 
        } 
      })
    }
    
    // 测试读写权限
    try {
      const testFile = path.join(testPath, '.test_write')
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
      
      res.json({ 
        code: 200, 
        data: { 
          valid: true, 
          message: '路径有效，读写权限正常' 
        } 
      })
    } catch (e) {
      res.json({ 
        code: 200, 
        data: { 
          valid: false, 
          message: '路径存在但无写入权限' 
        } 
      })
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

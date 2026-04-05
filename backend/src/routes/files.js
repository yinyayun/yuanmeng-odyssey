import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 基础目录配置
const BASE_DIRS = {
  'growth-plans': path.join(__dirname, '../../uploads/growth_plans'),
  'math-papers': path.join(__dirname, '../../uploads/math_papers')
}

// 确保目录存在
Object.values(BASE_DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// 递归获取文件树
const getFileTree = (dirPath, basePath) => {
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
router.get('/growth-plans', (req, res) => {
  try {
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
router.get('/math-papers', (req, res) => {
  try {
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
router.get('/content', (req, res) => {
  try {
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
router.get('/download', (req, res) => {
  try {
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

export default router

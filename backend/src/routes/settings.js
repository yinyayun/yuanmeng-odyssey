import express from 'express'
import { getDb } from '../models/database.js'

const router = express.Router()

// 获取所有设置
router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const settings = await db.all('SELECT key, value, description FROM settings')
    
    // 转换为对象格式
    const result = {}
    settings.forEach(s => {
      result[s.key] = s.value
    })
    
    res.json({ code: 200, data: result })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取单个设置
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const db = await getDb()
    const setting = await db.get('SELECT key, value, description FROM settings WHERE key = ?', [key])
    
    if (!setting) {
      return res.status(404).json({ code: 404, message: '设置不存在' })
    }
    
    res.json({ code: 200, data: setting })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新设置（批量）
router.post('/batch', async (req, res) => {
  try {
    const settings = req.body
    const db = await getDb()
    
    await db.run('BEGIN TRANSACTION')
    
    try {
      for (const [key, value] of Object.entries(settings)) {
        await db.run(
          `INSERT INTO settings (key, value, updated_at) 
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET 
           value = excluded.value, 
           updated_at = CURRENT_TIMESTAMP`,
          [key, value]
        )
      }
      
      await db.run('COMMIT')
      res.json({ code: 200, message: '设置保存成功' })
    } catch (error) {
      await db.run('ROLLBACK')
      throw error
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新单个设置
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const { value, description } = req.body
    const db = await getDb()
    
    await db.run(
      `INSERT INTO settings (key, value, description, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET 
       value = excluded.value, 
       description = COALESCE(excluded.description, settings.description),
       updated_at = CURRENT_TIMESTAMP`,
      [key, value, description]
    )
    
    res.json({ code: 200, message: '设置更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取设置值（内部使用）
export const getSetting = async (key, defaultValue = null) => {
  try {
    const db = await getDb()
    const setting = await db.get('SELECT value FROM settings WHERE key = ?', [key])
    return setting ? setting.value : defaultValue
  } catch (error) {
    console.error('获取设置失败:', error)
    return defaultValue
  }
}

export default router

import express from 'express'
import { getDb } from '../models/database.js'

const router = express.Router()

// 获取所有规则
router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const rules = await db.all('SELECT * FROM rules ORDER BY type, id')
    // 转换字段名
    const formattedRules = rules.map(rule => ({
      id: rule.id,
      type: rule.type,
      name: rule.name,
      timeUnit: rule.time_unit,
      pointsPerUnit: rule.points_per_unit,
      createdAt: rule.created_at
    }))
    res.json({ code: 200, data: formattedRules })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 添加规则
router.post('/', async (req, res) => {
  try {
    const { type, name, timeUnit, pointsPerUnit } = req.body
    const db = await getDb()
    const result = await db.run(
      'INSERT INTO rules (type, name, time_unit, points_per_unit) VALUES (?, ?, ?, ?)',
      [type, name, timeUnit, pointsPerUnit]
    )
    const rule = await db.get('SELECT * FROM rules WHERE id = ?', result.lastID)
    res.json({
      code: 200,
      data: {
        id: rule.id,
        type: rule.type,
        name: rule.name,
        timeUnit: rule.time_unit,
        pointsPerUnit: rule.points_per_unit
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除规则
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    await db.run('DELETE FROM rules WHERE id = ?', id)
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

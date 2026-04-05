import express from 'express'
import { getDb } from '../models/database.js'
import dayjs from 'dayjs'

const router = express.Router()

// 获取账户信息
router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const account = await db.get('SELECT * FROM accounts LIMIT 1')
    res.json({ code: 200, data: account })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建账户
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    const db = await getDb()
    const result = await db.run(
      'INSERT INTO accounts (name, balance) VALUES (?, ?)',
      [name, 0]
    )
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', result.lastID)
    res.json({ code: 200, data: account })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取账户统计
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const db = await getDb()
    const account = await db.get('SELECT * FROM accounts LIMIT 1')
    
    let query = 'SELECT * FROM transactions WHERE account_id = ?'
    const params = [account.id]
    
    if (startDate && endDate) {
      query += ' AND created_at BETWEEN ? AND ?'
      params.push(startDate, endDate + ' 23:59:59')
    } else {
      // 默认最近7天
      const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
      query += ' AND created_at >= ?'
      params.push(weekAgo)
    }
    
    const transactions = await db.all(query, params)
    
    const weekIncome = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.points, 0)
    
    const weekExpense = transactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.points, 0)
    
    res.json({
      code: 200,
      data: {
        balance: account.balance,
        weekIncome,
        weekExpense,
        transactionCount: transactions.length
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

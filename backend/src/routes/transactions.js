import express from 'express'
import { getDb } from '../models/database.js'
import dayjs from 'dayjs'

const router = express.Router()

// 获取交易记录
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, pageSize = 20 } = req.query
    const db = await getDb()
    const account = await db.get('SELECT * FROM accounts LIMIT 1')
    
    let query = `
      SELECT t.*, r.name as item_name 
      FROM transactions t 
      LEFT JOIN rules r ON t.rule_id = r.id 
      WHERE t.account_id = ?
    `
    const params = [account.id]
    
    if (startDate && endDate) {
      query += ' AND t.created_at BETWEEN ? AND ?'
      params.push(startDate, endDate + ' 23:59:59')
    }
    
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))
    
    const transactions = await db.all(query, params)
    
    // 格式化数据
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      type: t.type,
      itemName: t.item_name,
      timeAmount: t.time_amount,
      points: t.points,
      balance: t.balance,
      description: t.description,
      createdAt: t.created_at
    }))
    
    res.json({ code: 200, data: formattedTransactions })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 存入积分
router.post('/deposit', async (req, res) => {
  try {
    const { ruleId, timeAmount, description } = req.body
    const db = await getDb()
    
    // 获取规则
    const rule = await db.get('SELECT * FROM rules WHERE id = ?', ruleId)
    if (!rule) {
      return res.status(400).json({ code: 400, message: '规则不存在' })
    }
    
    // 计算积分
    const points = Math.floor(timeAmount / rule.time_unit * rule.points_per_unit)
    
    // 获取账户
    const account = await db.get('SELECT * FROM accounts LIMIT 1')
    const newBalance = account.balance + points
    
    // 开始事务
    await db.run('BEGIN TRANSACTION')
    
    try {
      // 创建交易记录
      await db.run(
        `INSERT INTO transactions 
         (account_id, type, rule_id, time_amount, points, balance, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [account.id, 'deposit', ruleId, timeAmount, points, newBalance, description]
      )
      
      // 更新账户余额
      await db.run(
        'UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?',
        [newBalance, dayjs().format('YYYY-MM-DD HH:mm:ss'), account.id]
      )
      
      await db.run('COMMIT')
      
      res.json({
        code: 200,
        data: {
          points,
          newBalance,
          message: `成功存入 ${points} 积分`
        }
      })
    } catch (error) {
      await db.run('ROLLBACK')
      throw error
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 提取积分
router.post('/withdraw', async (req, res) => {
  try {
    const { ruleId, timeAmount, description } = req.body
    const db = await getDb()
    
    // 获取规则
    const rule = await db.get('SELECT * FROM rules WHERE id = ?', ruleId)
    if (!rule) {
      return res.status(400).json({ code: 400, message: '规则不存在' })
    }
    
    // 计算积分
    const points = Math.ceil(timeAmount / rule.time_unit * rule.points_per_unit)
    
    // 获取账户
    const account = await db.get('SELECT * FROM accounts LIMIT 1')
    
    if (account.balance < points) {
      return res.status(400).json({ 
        code: 400, 
        message: `积分不足，当前余额 ${account.balance}，需要 ${points}` 
      })
    }
    
    const newBalance = account.balance - points
    
    // 开始事务
    await db.run('BEGIN TRANSACTION')
    
    try {
      // 创建交易记录
      await db.run(
        `INSERT INTO transactions 
         (account_id, type, rule_id, time_amount, points, balance, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [account.id, 'withdraw', ruleId, timeAmount, points, newBalance, description]
      )
      
      // 更新账户余额
      await db.run(
        'UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?',
        [newBalance, dayjs().format('YYYY-MM-DD HH:mm:ss'), account.id]
      )
      
      await db.run('COMMIT')
      
      res.json({
        code: 200,
        data: {
          points,
          newBalance,
          message: `成功提取 ${points} 积分`
        }
      })
    } catch (error) {
      await db.run('ROLLBACK')
      throw error
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

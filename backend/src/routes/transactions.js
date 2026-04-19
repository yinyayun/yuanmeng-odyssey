import express from 'express'
import { getDb } from '../models/database.js'
import dayjs from 'dayjs'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 辅助函数：获取账户（支持家长/管理员为指定账户操作）
const getTargetAccount = async (db, req) => {
  const { accountId } = req.body
  const user = req.session.user
  
  // 如果是家长或管理员且指定了账户ID，使用指定账户（需验证家庭隔离）
  if ((user.role === 'parent' || user.role === 'admin') && accountId) {
    const account = await db.get(`
      SELECT a.* FROM accounts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.id = ? AND (u.family_id = ? OR ? = 'admin')
    `, [accountId, user.family_id, user.role])
    if (account) return account
    
    // 如果是非管理员且账户不属于当前家庭，返回错误
    if (user.role !== 'admin') {
      throw new Error('无权操作该账户')
    }
  }
  
  // 否则使用当前用户关联的账户
  const account = await db.get('SELECT * FROM accounts WHERE user_id = ?', [user.id])
  if (account) return account
  
  // 最后默认返回第一个账户（兼容旧数据）
  return await db.get('SELECT * FROM accounts LIMIT 1')
}

// 获取交易记录
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, accountId, page = 1, pageSize = 20 } = req.query
    const db = await getDb()
    const user = req.session.user
    
    let targetAccountId = accountId
    
    // 如果没有指定账户ID，使用当前用户的账户
    if (!targetAccountId) {
      const account = await db.get('SELECT * FROM accounts WHERE user_id = ?', [user.id])
      if (account) {
        targetAccountId = account.id
      } else {
        // 默认第一个账户
        const defaultAccount = await db.get('SELECT * FROM accounts LIMIT 1')
        targetAccountId = defaultAccount?.id
      }
    } else {
      // 如果指定了账户ID，验证家庭隔离
      const accountCheck = await db.get(`
        SELECT a.* FROM accounts a 
        LEFT JOIN users u ON a.user_id = u.id 
        WHERE a.id = ? AND (u.family_id = ? OR ? = 'admin')
      `, [targetAccountId, user.family_id, user.role])
      
      if (!accountCheck && user.role !== 'admin') {
        return res.status(403).json({ code: 403, message: '无权查看该账户的记录' })
      }
    }
    
    // 宝宝只能查看自己的记录
    if (user.role === '宝宝' && accountId && parseInt(accountId) !== targetAccountId) {
      return res.status(403).json({ code: 403, message: '无权查看其他账户的记录' })
    }
    
    let query = `
      SELECT t.*, r.name as item_name, a.name as account_name, a.user_id
      FROM transactions t 
      LEFT JOIN rules r ON t.rule_id = r.id 
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.account_id = ?
    `
    const params = [targetAccountId]
    
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
router.post('/deposit', authMiddleware, async (req, res) => {
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
    
    // 获取目标账户（支持家长为指定账户操作）
    const account = await getTargetAccount(db, req)
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
router.post('/withdraw', authMiddleware, async (req, res) => {
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
    
    // 获取目标账户（支持家长为指定账户操作）
    const account = await getTargetAccount(db, req)
    
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

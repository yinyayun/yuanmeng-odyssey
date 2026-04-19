import express from 'express'
import { getDb } from '../models/database.js'
import dayjs from 'dayjs'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取所有账户（带用户信息）- 仅返回当前家庭的账户
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const user = req.session.user
    
    // 管理员可以看到所有家庭的账户
    if (user.role === 'admin') {
      const accounts = await db.all(`
        SELECT a.*, u.name as user_name, u.username, u.avatar, u.family_id
        FROM accounts a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.id
      `)
      return res.json({ code: 200, data: accounts })
    }
    
    // 普通用户只能看到自己家庭的账户
    const accounts = await db.all(`
      SELECT a.*, u.name as user_name, u.username, u.avatar, u.family_id
      FROM accounts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE u.family_id = ?
      ORDER BY a.id
    `, [user.family_id])
    res.json({ code: 200, data: accounts })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取当前用户的账户
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const userId = req.session.user.id
    
    // 找到当前用户关联的账户
    let account = await db.get('SELECT * FROM accounts WHERE user_id = ?', [userId])
    
    // 如果没有关联账户，创建一个
    if (!account) {
      const result = await db.run(
        'INSERT INTO accounts (user_id, name, balance) VALUES (?, ?, ?)',
        [userId, req.session.user.name, 0]
      )
      account = await db.get('SELECT * FROM accounts WHERE id = ?', result.lastID)
    }
    
    res.json({ code: 200, data: account })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建账户（关联用户）
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, name } = req.body
    const db = await getDb()
    const currentUser = req.session.user
    
    // 检查用户是否存在
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) {
      return res.status(400).json({ code: 400, message: '用户不存在' })
    }
    
    // 验证家庭隔离：普通用户只能为同家庭用户创建账户
    if (currentUser.role !== 'admin' && user.family_id !== currentUser.family_id) {
      return res.status(403).json({ code: 403, message: '无权为该用户创建账户' })
    }
    
    // 检查用户是否已有账户
    const existing = await db.get('SELECT * FROM accounts WHERE user_id = ?', [userId])
    if (existing) {
      return res.status(400).json({ code: 400, message: '该用户已有积分账户' })
    }
    
    const result = await db.run(
      'INSERT INTO accounts (user_id, name, balance) VALUES (?, ?, ?)',
      [userId, name || user.name, 0]
    )
    
    const account = await db.get(`
      SELECT a.*, u.name as user_name, u.username, u.avatar 
      FROM accounts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.id = ?
    `, result.lastID)
    
    res.json({ code: 200, data: account })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新账户
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { name, balance, userId } = req.body
    const db = await getDb()
    const currentUser = req.session.user
    
    // 验证账户是否存在且属于当前家庭（管理员除外）
    const accountCheck = await db.get(`
      SELECT a.* FROM accounts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.id = ? AND (u.family_id = ? OR ? = 'admin')
    `, [id, currentUser.family_id, currentUser.role])
    
    if (!accountCheck && currentUser.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权更新该账户' })
    }
    
    // 如果提供了 userId，检查该用户是否已被其他账户绑定
    if (userId) {
      const existing = await db.get(
        'SELECT * FROM accounts WHERE user_id = ? AND id != ?',
        [userId, id]
      )
      if (existing) {
        return res.status(400).json({ code: 400, message: '该用户已被其他账户绑定' })
      }
      
      // 验证新用户的家庭隔离
      const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [userId])
      if (targetUser && currentUser.role !== 'admin' && targetUser.family_id !== currentUser.family_id) {
        return res.status(403).json({ code: 403, message: '无权绑定该用户' })
      }
    }
    
    // 构建更新语句
    let updateSql = 'UPDATE accounts SET name = ?, balance = ?, updated_at = CURRENT_TIMESTAMP'
    let params = [name, balance]
    
    if (userId) {
      updateSql += ', user_id = ?'
      params.push(userId)
    }
    
    updateSql += ' WHERE id = ?'
    params.push(id)
    
    await db.run(updateSql, params)
    
    const account = await db.get(`
      SELECT a.*, u.name as user_name, u.username, u.avatar 
      FROM accounts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.id = ?
    `, id)
    
    res.json({ code: 200, data: account })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除账户
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const currentUser = req.session.user
    
    // 验证账户是否存在且属于当前家庭（管理员除外）
    const accountCheck = await db.get(`
      SELECT a.* FROM accounts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.id = ? AND (u.family_id = ? OR ? = 'admin')
    `, [id, currentUser.family_id, currentUser.role])
    
    if (!accountCheck && currentUser.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权删除该账户' })
    }
    
    await db.run('DELETE FROM accounts WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取账户统计
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query
    const db = await getDb()
    const user = req.session.user
    
    let targetAccountId = accountId
    
    // 如果没有指定账户ID，使用当前用户的账户
    if (!targetAccountId) {
      const account = await db.get('SELECT * FROM accounts WHERE user_id = ?', [user.id])
      if (account) {
        targetAccountId = account.id
      } else {
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
        return res.status(403).json({ code: 403, message: '无权查看该账户的统计' })
      }
    }
    
    // 宝宝只能查看自己的统计
    if (user.role === '宝宝' && accountId) {
      const myAccount = await db.get('SELECT * FROM accounts WHERE user_id = ?', [user.id])
      if (myAccount && parseInt(accountId) !== myAccount.id) {
        return res.status(403).json({ code: 403, message: '无权查看其他账户的统计' })
      }
    }
    
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [targetAccountId])
    
    let query = 'SELECT * FROM transactions WHERE account_id = ?'
    const params = [targetAccountId]
    
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

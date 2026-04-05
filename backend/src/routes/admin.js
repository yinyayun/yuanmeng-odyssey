import express from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../models/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 用户登录（支持多角色）
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '请提供用户名和密码' })
    }
    
    const db = await getDb()
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username])
    
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' })
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' })
    }
    
    // 写入 Session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    }
    
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        username: user.username,
        role: user.role,
        name: user.name
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 退出登录
router.post('/logout', (req, res) => {
  req.session.destroy()
  res.json({ code: 200, message: '退出成功' })
})

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    data: req.session.user
  })
})

// 修改密码（需要认证）
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    const userId = req.session.user.id
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ code: 400, message: '请提供旧密码和新密码' })
    }
    
    const db = await getDb()
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId])
    
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }
    
    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, user.password)
    if (!isValid) {
      return res.status(401).json({ code: 401, message: '旧密码错误' })
    }
    
    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId])
    
    res.json({ code: 200, message: '密码修改成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取所有用户（公开接口，用于登录页面）
router.get('/users-public', async (req, res) => {
  try {
    const db = await getDb()
    const users = await db.all(
      'SELECT id, username, name, role, avatar FROM users ORDER BY role, id'
    )
    res.json({ code: 200, data: users })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取所有用户（仅家长）
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const users = await db.all(
      'SELECT id, username, name, role, avatar, created_at FROM users ORDER BY role, id'
    )
    res.json({ code: 200, data: users })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建用户（仅家长）
router.post('/users', authMiddleware, async (req, res) => {
  try {
    const { username, password, name, role, avatar } = req.body
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ code: 400, message: '请填写完整信息' })
    }
    
    const db = await getDb()
    
    // 检查用户名是否已存在
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username])
    if (existing) {
      return res.status(400).json({ code: 400, message: '用户名已存在' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await db.run(
      'INSERT INTO users (username, password, name, role, avatar) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role, avatar || null]
    )
    
    res.json({ 
      code: 200, 
      message: '创建成功',
      data: { id: result.lastID }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新用户（仅家长）
router.put('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { name, role, avatar, password } = req.body
    
    const db = await getDb()
    
    // 检查用户是否存在
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id])
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }
    
    // 构建更新字段
    const updates = []
    const params = []
    
    if (name) {
      updates.push('name = ?')
      params.push(name)
    }
    if (role) {
      updates.push('role = ?')
      params.push(role)
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?')
      params.push(avatar)
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.push('password = ?')
      params.push(hashedPassword)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有要更新的内容' })
    }
    
    params.push(id)
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
    
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除用户（仅家长）
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    // 不能删除自己
    if (parseInt(id) === req.session.user.id) {
      return res.status(400).json({ code: 400, message: '不能删除当前登录用户' })
    }
    
    await db.run('DELETE FROM users WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

import express from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../models/database.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

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
    
    // 获取家庭信息
    let family = null
    if (user.family_id) {
      family = await db.get('SELECT id, name, code FROM families WHERE id = ?', [user.family_id])
    }
    
    // 写入 Session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      family_id: user.family_id,
      family: family
    }
    
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        username: user.username,
        role: user.role,
        name: user.name,
        family_id: user.family_id,
        family: family,
        // 超级管理员只能进入后台
        isAdminOnly: user.role === 'admin'
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

// 获取所有家庭（公开接口，用于登录页面）
router.get('/families-public', async (req, res) => {
  try {
    const db = await getDb()
    const families = await db.all(`
      SELECT f.id, f.name, f.code,
             COUNT(u.id) as user_count
      FROM families f
      LEFT JOIN users u ON f.id = u.family_id AND u.role != 'admin'
      GROUP BY f.id
      ORDER BY f.id
    `)
    res.json({ code: 200, data: families })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取所有用户（公开接口，用于登录页面）- 只返回家庭成员
router.get('/users-public', async (req, res) => {
  try {
    const db = await getDb()
    const users = await db.all(
      'SELECT id, username, name, role, avatar, family_id FROM users WHERE role != ? ORDER BY role, id',
      ['admin']
    )
    res.json({ code: 200, data: users })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取所有用户（仅超级管理员）
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const db = await getDb()
    const users = await db.all(`
      SELECT u.id, u.username, u.name, u.role, u.avatar, u.created_at, 
             u.family_id, f.name as family_name, f.code as family_code
      FROM users u
      LEFT JOIN families f ON u.family_id = f.id
      ORDER BY u.role, u.id
    `)
    res.json({ code: 200, data: users })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建用户（仅超级管理员）
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, role, avatar, family_id } = req.body
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ code: 400, message: '请填写完整信息' })
    }
    
    // 不允许创建超级管理员
    if (role === 'admin') {
      return res.status(403).json({ code: 403, message: '不能通过此接口创建超级管理员' })
    }
    
    const db = await getDb()
    
    // 检查用户名是否已存在
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username])
    if (existing) {
      return res.status(400).json({ code: 400, message: '用户名已存在' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await db.run(
      'INSERT INTO users (username, password, name, role, avatar, family_id) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role, avatar || null, family_id || null]
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

// 更新用户（仅超级管理员）
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, role, avatar, password, family_id } = req.body
    
    const db = await getDb()
    
    // 检查用户是否存在
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id])
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }
    
    // 不能修改其他超级管理员
    if (user.role === 'admin' && parseInt(id) !== req.session.user.id) {
      return res.status(403).json({ code: 403, message: '不能修改其他超级管理员' })
    }
    
    // 不能将其他用户设为超级管理员
    if (role === 'admin' && user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '不能将用户设为超级管理员' })
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
    if (family_id !== undefined) {
      updates.push('family_id = ?')
      params.push(family_id)
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

// 删除用户（仅超级管理员）
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    // 检查用户
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id])
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }
    
    // 不能删除自己
    if (parseInt(id) === req.session.user.id) {
      return res.status(400).json({ code: 400, message: '不能删除当前登录用户' })
    }
    
    // 不能删除其他超级管理员
    if (user.role === 'admin') {
      return res.status(403).json({ code: 403, message: '不能删除超级管理员' })
    }
    
    await db.run('DELETE FROM users WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ===== 家庭管理API（仅超级管理员） =====

// 获取所有家庭
router.get('/families', requireAdmin, async (req, res) => {
  try {
    const db = await getDb()
    const families = await db.all(`
      SELECT f.id, f.name, f.code, f.created_at,
             COUNT(u.id) as user_count
      FROM families f
      LEFT JOIN users u ON f.id = u.family_id
      GROUP BY f.id
      ORDER BY f.id
    `)
    res.json({ code: 200, data: families })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建家庭
router.post('/families', requireAdmin, async (req, res) => {
  try {
    const { name, code } = req.body
    
    if (!name || !code) {
      return res.status(400).json({ code: 400, message: '请填写家庭名称和编码' })
    }
    
    const db = await getDb()
    
    // 检查编码是否已存在
    const existing = await db.get('SELECT * FROM families WHERE code = ?', [code])
    if (existing) {
      return res.status(400).json({ code: 400, message: '家庭编码已存在' })
    }
    
    const result = await db.run(
      'INSERT INTO families (name, code) VALUES (?, ?)',
      [name, code]
    )
    
    res.json({ 
      code: 200, 
      message: '家庭创建成功',
      data: { id: result.lastID }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新家庭
router.put('/families/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    
    if (!name) {
      return res.status(400).json({ code: 400, message: '请填写家庭名称' })
    }
    
    const db = await getDb()
    await db.run('UPDATE families SET name = ? WHERE id = ?', [name, id])
    
    res.json({ code: 200, message: '家庭更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除家庭（会同时删除该家庭的所有用户）
router.delete('/families/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    // 不能删除默认家庭
    const family = await db.get('SELECT * FROM families WHERE id = ?', [id])
    if (family?.code === 'default') {
      return res.status(403).json({ code: 403, message: '不能删除默认家庭' })
    }
    
    await db.run('DELETE FROM families WHERE id = ?', [id])
    res.json({ code: 200, message: '家庭删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取指定家庭的成员
router.get('/families/:id/users', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const users = await db.all(
      'SELECT id, username, name, role, avatar, created_at FROM users WHERE family_id = ? ORDER BY role, id',
      [id]
    )
    res.json({ code: 200, data: users })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

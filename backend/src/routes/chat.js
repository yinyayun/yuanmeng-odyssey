import express from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getDb } from '../models/database.js'

const execAsync = promisify(exec)
const router = express.Router()

// 获取 OpenClaw 配置(从 settings 表读取)
const getOpenClawConfig = async () => {
  const db = await getDb()
  const config = {
    command: 'openclaw',           // 默认命令
    commandTemplate: '',           // 命令模板，为空时使用默认格式
    model: 'default',              // 默认模型
    timeout: 60000                 // 超时时间 60s
  }
  
  try {
    const settings = await db.all('SELECT key, value FROM settings WHERE key LIKE ?', ['openclaw-%'])
    settings.forEach(s => {
      if (s.key === 'openclaw-command') config.command = s.value
      if (s.key === 'openclaw-command-template') config.commandTemplate = s.value
      if (s.key === 'openclaw-model') config.model = s.value
      if (s.key === 'openclaw-timeout') config.timeout = parseInt(s.value)
    })
  } catch (error) {
    console.error('获取 OpenClaw 配置失败:', error)
  }
  
  return config
}

// 生成唯一 session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 1. 获取用户的所有会话列表
router.get('/sessions', async (req, res) => {
  try {
    const db = await getDb()
    const sessions = await db.all(
      'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.username]
    )
    res.json({ code: 200, data: sessions })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 2. 创建新会话
router.post('/sessions', async (req, res) => {
  try {
    const db = await getDb()
    const sessionId = generateSessionId()
    const { title = '新对话' } = req.body
    
    await db.run(
      'INSERT INTO chat_sessions (user_id, session_id, title) VALUES (?, ?, ?)',
      [req.user.username, sessionId, title]
    )
    
    res.json({ code: 200, data: { session_id: sessionId } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 3. 删除会话
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const db = await getDb()
    const { sessionId } = req.params
    
    await db.run('DELETE FROM chat_messages WHERE session_id = ?', [sessionId])
    await db.run('DELETE FROM chat_sessions WHERE session_id = ? AND user_id = ?', 
      [sessionId, req.user.username])
    
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 4. 获取会话消息历史
router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const db = await getDb()
    const { sessionId } = req.params
    
    const messages = await db.all(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    )
    
    res.json({ code: 200, data: messages })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 5. 发送消息(核心接口)
router.post('/send', async (req, res) => {
  try {
    const { session_id, message } = req.body
    
    if (!message || !message.trim()) {
      return res.status(400).json({ code: 400, message: '消息不能为空' })
    }
    
    const db = await getDb()
    const config = await getOpenClawConfig()
    
    // 如果没有 session_id,创建新会话
    let currentSessionId = session_id
    if (!currentSessionId) {
      currentSessionId = generateSessionId()
      await db.run(
        'INSERT INTO chat_sessions (user_id, session_id, title) VALUES (?, ?, ?)',
        [req.user.username, currentSessionId, message.substring(0, 30)]
      )
    }
    
    // 保存用户消息
    await db.run(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
      [currentSessionId, 'user', message]
    )
    
    // 调用 OpenClaw CLI 命令
    // OpenClaw 2026.3.28 支持的 AI 对话命令:
    // openclaw agent --to <session> --message "xxx" --deliver
    const escapedMessage = message.replace(/"/g, '\\"').replace(/\$/g, '\\$')
    
    // 从配置获取命令模板
    // 默认使用: {command} agent --to "{session}" --message "{message}" --deliver
    let commandTemplate = config.commandTemplate || '{command} agent --to "{session}" --message "{message}" --deliver'
    
    const command = commandTemplate
      .replace('{command}', config.command)
      .replace('{session}', currentSessionId)
      .replace('{message}', escapedMessage)
    
    console.log('执行 OpenClaw 命令:', command)
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: config.timeout,
      maxBuffer: 1024 * 1024 * 10  // 10MB buffer
    })
    
    if (stderr) {
      console.error('OpenClaw stderr:', stderr)
    }
    
    const aiResponse = stdout.trim()
    
    // 保存 AI 回复
    await db.run(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
      [currentSessionId, 'assistant', aiResponse]
    )
    
    // 更新会话时间
    await db.run(
      'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [currentSessionId]
    )
    
    res.json({ 
      code: 200, 
      data: { 
        session_id: currentSessionId,
        response: aiResponse 
      } 
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ 
      code: 500, 
      message: error.message || 'AI 回复失败' 
    })
  }
})

// 6. 更新会话标题
router.put('/sessions/:sessionId', async (req, res) => {
  try {
    const db = await getDb()
    const { sessionId } = req.params
    const { title } = req.body
    
    await db.run(
      'UPDATE chat_sessions SET title = ? WHERE session_id = ? AND user_id = ?',
      [title, sessionId, req.user.username]
    )
    
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

export default router

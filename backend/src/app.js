import express from 'express'
import cors from 'cors'
import session from 'express-session'
import path from 'path'
import { fileURLToPath } from 'url'
import accountRoutes from './routes/account.js'
import ruleRoutes from './routes/rules.js'
import transactionRoutes from './routes/transactions.js'
import fileRoutes from './routes/files.js'
import backupRoutes from './routes/backup.js'
import adminRoutes from './routes/admin.js'
import { initDatabase } from './models/database.js'
import { authMiddleware } from './middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session 配置
app.use(session({
  secret: 'yuanmeng-odyssey-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}))

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 公开路由
app.use('/api/admin', adminRoutes)

// 需要认证的路由
app.use('/api/account', authMiddleware, accountRoutes)
app.use('/api/rules', authMiddleware, ruleRoutes)
app.use('/api/transactions', authMiddleware, transactionRoutes)
app.use('/api/files', authMiddleware, fileRoutes)
app.use('/api/backup', authMiddleware, backupRoutes)

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ code: 500, message: err.message })
})

// 初始化数据库并启动服务
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`元梦大陆后端服务运行在端口 ${PORT}`)
  })
})

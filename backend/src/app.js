import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import accountRoutes from './routes/account.js'
import ruleRoutes from './routes/rules.js'
import transactionRoutes from './routes/transactions.js'
import fileRoutes from './routes/files.js'
import backupRoutes from './routes/backup.js'
import { initDatabase } from './models/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// API 路由
app.use('/api/account', accountRoutes)
app.use('/api/rules', ruleRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/backup', backupRoutes)

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

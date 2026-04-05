import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../../database/yuanmeng.db')

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

let db = null

export const getDb = async () => {
  if (!db) {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    })
  }
  return db
}

export const initDatabase = async () => {
  const database = await getDb()
  
  // 创建账户表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '元宵',
      balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建规则表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      time_unit INTEGER NOT NULL,
      points_per_unit INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建交易记录表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      rule_id INTEGER,
      item_name TEXT,
      time_amount INTEGER,
      points INTEGER NOT NULL,
      balance INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (rule_id) REFERENCES rules(id)
    )
  `)
  
  // 初始化默认账户
  const account = await database.get('SELECT * FROM accounts LIMIT 1')
  if (!account) {
    await database.run('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['元宵', 0])
  }
  
  // 初始化默认规则
  const rules = await database.all('SELECT * FROM rules')
  if (rules.length === 0) {
    const defaultRules = [
      { type: 'earn', name: '写作业', timeUnit: 10, pointsPerUnit: 5 },
      { type: 'earn', name: '阅读', timeUnit: 10, pointsPerUnit: 5 },
      { type: 'earn', name: '运动', timeUnit: 10, pointsPerUnit: 8 },
      { type: 'earn', name: '劳动', timeUnit: 10, pointsPerUnit: 6 },
      { type: 'consume', name: '看电视', timeUnit: 10, pointsPerUnit: 20 },
      { type: 'consume', name: '玩游戏', timeUnit: 10, pointsPerUnit: 25 },
      { type: 'consume', name: '平板时间', timeUnit: 10, pointsPerUnit: 20 }
    ]
    
    for (const rule of defaultRules) {
      await database.run(
        'INSERT INTO rules (type, name, time_unit, points_per_unit) VALUES (?, ?, ?, ?)',
        [rule.type, rule.name, rule.timeUnit, rule.pointsPerUnit]
      )
    }
  }
  
  console.log('数据库初始化完成')
}

export { DB_PATH }

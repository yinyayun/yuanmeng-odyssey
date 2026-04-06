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
  
  // 创建账户表（添加 user_id 关联）
  await database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL DEFAULT '元宵',
      balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  
  // 检查并添加 user_id 字段（表结构迁移）
  try {
    await database.get('SELECT user_id FROM accounts LIMIT 1')
  } catch (e) {
    await database.exec('ALTER TABLE accounts ADD COLUMN user_id INTEGER')
    console.log('已添加 user_id 字段到 accounts 表')
  }
  
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
  
  // 创建设置表（存储系统配置）
  await database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建家庭表
  await database.exec(`
    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 初始化默认家庭
  const defaultFamily = await database.get('SELECT * FROM families WHERE code = ?', ['default'])
  if (!defaultFamily) {
    await database.run(
      'INSERT INTO families (name, code) VALUES (?, ?)',
      ['元宵家庭', 'default']
    )
    console.log('默认家庭已创建')
  }
  
  // 初始化默认账户（与宝宝用户绑定）
  const account = await database.get('SELECT * FROM accounts LIMIT 1')
  if (!account) {
    // 先找到宝宝用户的ID
    const childUser = await database.get('SELECT id FROM users WHERE username = ?', ['yuanxiao'])
    if (childUser) {
      await database.run(
        'INSERT INTO accounts (user_id, name, balance) VALUES (?, ?, ?)', 
        [childUser.id, '元宵', 0]
      )
    }
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
  
  // 创建用户表（支持多角色和家庭）
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '宝宝',
      avatar TEXT,
      family_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id)
    )
  `)
  
  // 检查并添加 avatar 字段（表结构迁移）
  try {
    await database.get('SELECT avatar FROM users LIMIT 1')
  } catch (e) {
    await database.exec('ALTER TABLE users ADD COLUMN avatar TEXT')
    console.log('已添加 avatar 字段到 users 表')
  }
  
  // 检查并添加 family_id 字段（表结构迁移）
  try {
    await database.get('SELECT family_id FROM users LIMIT 1')
  } catch (e) {
    await database.exec('ALTER TABLE users ADD COLUMN family_id INTEGER')
    console.log('已添加 family_id 字段到 users 表')
  }
  
  // 获取默认家庭ID
  const defaultFamilyId = await database.get('SELECT id FROM families WHERE code = ?', ['default']).then(f => f?.id)
  
  // 初始化默认用户
  const bcrypt = await import('bcryptjs')
  
  // 超级管理员账号
  const admin = await database.get('SELECT * FROM users WHERE username = ?', ['admin'])
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await database.run(
      'INSERT INTO users (username, password, name, role, family_id) VALUES (?, ?, ?, ?, ?)',
      ['admin', hashedPassword, '超级管理员', 'admin', null]
    )
    console.log('超级管理员账号已创建：用户名 admin，密码 admin123')
  }
  
  // 爸爸账号
  const dad = await database.get('SELECT * FROM users WHERE username = ?', ['dad'])
  if (!dad) {
    const hashedPassword = await bcrypt.hash('dad123', 10)
    await database.run(
      'INSERT INTO users (username, password, name, role, family_id) VALUES (?, ?, ?, ?, ?)',
      ['dad', hashedPassword, '爸爸', 'parent', defaultFamilyId]
    )
    console.log('爸爸账号已创建：用户名 dad，密码 dad123')
  }
  
  // 妈妈账号
  const mom = await database.get('SELECT * FROM users WHERE username = ?', ['mom'])
  if (!mom) {
    const hashedPassword = await bcrypt.hash('mom123', 10)
    await database.run(
      'INSERT INTO users (username, password, name, role, family_id) VALUES (?, ?, ?, ?, ?)',
      ['mom', hashedPassword, '妈妈', 'parent', defaultFamilyId]
    )
    console.log('妈妈账号已创建：用户名 mom，密码 mom123')
  }
  
  // 宝宝账号（元宵）
  const child = await database.get('SELECT * FROM users WHERE username = ?', ['yuanxiao'])
  if (!child) {
    const hashedPassword = await bcrypt.hash('yuanxiao123', 10)
    await database.run(
      'INSERT INTO users (username, password, name, role, family_id) VALUES (?, ?, ?, ?, ?)',
      ['yuanxiao', hashedPassword, '元宵', '宝宝', defaultFamilyId]
    )
    console.log('宝宝账号已创建：用户名 yuanxiao，密码 yuanxiao123')
  }
  
  console.log('数据库初始化完成')
}

export { DB_PATH }

# 元梦大陆 - 元宵成长守护系统

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.4+-green.svg" alt="Vue 3">
  <img src="https://img.shields.io/badge/Node-20+-blue.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/SQLite-3-lightgrey.svg" alt="SQLite">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License">
</p>

<p align="center">
  ✨ Q版奇幻风 · 游戏化界面 · 沉浸式养成系统 · 低龄友好型设计 ✨
</p>

## 🎮 项目简介

**元梦大陆**是专为元宵（4年级）设计的成长守护系统，采用Q版奇幻风格，融合蛋仔派对、叶罗丽、斗罗大陆等动漫元素，让学习成长变得像游戏一样有趣！

### 🌟 核心特色

- **梦幻紫渐变**主题 + **活力橙**点缀 + **马卡龙色系**
- **圆润大圆角**卡片 + **3D卡通图标** + **魔法水晶特效**
- **蛋仔派对式**按钮 + **叶罗丽魔法光晕**
- **移动端优先**设计，随时随地记录成长

## 📱 功能模块

### 1. 时光银行（能量补给站）
- 💎 魔法水晶余额展示（呼吸动效）
- ⚡ 魂力值进度条
- 🔮 魔法罗盘积分折算
- 📜 时间轴明细列表
- 🏪 兑换商店货架式布局

### 2. 成长计划（勇者修炼手册）
- 🗺️ 章节地图式导航
- 📖 发光秘籍卡片
- 🔓 关卡解锁进度标识
- 📜 藏宝图卷轴背景

### 3. 数学培养计划（智慧试炼场）
- ⚔️ 斗罗斗魂台背景
- 📜 悬赏令式试卷列表
- 🏆 通关印章特效
- ⭐ 难度等级魂环标识

## 🚀 快速开始

### 环境要求
- Node.js >= 20
- npm >= 10

### 安装依赖

```bash
# 安装所有依赖（根目录会自动安装前后端）
npm run install:all
```

### 开发模式

```bash
# 同时启动前端和后端
npm run dev
```

访问 http://localhost:3000

### 生产部署

```bash
# 在阿里云服务器上执行
sudo bash deploy.sh
```

## 📁 项目结构

```
yuanmeng-odyssey/
├── frontend/              # Vue 3 前端
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── views/         # 页面
│   │   ├── router/        # 路由
│   │   ├── stores/        # Pinia 状态管理
│   │   └── styles/        # 样式文件
│   └── package.json
├── backend/               # Node.js 后端
│   ├── src/
│   │   ├── routes/        # API路由
│   │   └── models/        # 数据库模型
│   ├── database/          # SQLite数据库
│   └── uploads/           # 上传文件
│       ├── growth_plans/  # 成长计划
│       └── math_papers/   # 数学试卷
├── deploy.sh              # 部署脚本
└── package.json           # 根目录配置
```

## 🎨 技术栈

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Element Plus** - UI组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **ECharts** - 数据可视化
- **Vite** - 构建工具

### 后端
- **Node.js** - JavaScript运行时
- **Express** - Web框架
- **SQLite3** - 轻量级数据库
- **Multer** - 文件上传

## 📖 使用说明

### 时光银行使用指南

#### 赚取积分（充能）
1. 点击"充能"按钮
2. 选择事项（写作业、阅读、运动、劳动）
3. 输入投入时间
4. 系统自动计算魔法积分
5. 确认存入

#### 消费积分（释放）
1. 点击"释放"按钮
2. 选择想要的活动（看电视、玩游戏、平板时间）
3. 输入想要的时间
4. 系统显示需要消耗的积分
5. 确认余额充足后释放

### 文件管理

#### 成长计划
将HTML文件放入 `backend/uploads/growth_plans/` 目录，按学期组织文件夹结构。

```
growth_plans/
├── 4年级第二学期/
│   ├── 4年级第二学期成长计划总览.html
│   └── 20260405期内容.html
└── 5年级第一学期/
    └── ...
```

#### 数学试卷
将PDF/Word文件放入 `backend/uploads/math_papers/` 目录。

## 🔧 配置说明

### 数据库配置
数据库文件位于 `backend/database/yuanmeng.db`，系统会自动初始化。

### 默认规则
系统预置了以下兑换规则：

| 事项 | 时间 | 积分 |
|------|------|------|
| 写作业 | 10分钟 | 5积分 |
| 阅读 | 10分钟 | 5积分 |
| 运动 | 10分钟 | 8积分 |
| 劳动 | 10分钟 | 6积分 |
| 看电视 | 20积分 | 10分钟 |
| 玩游戏 | 25积分 | 10分钟 |
| 平板时间 | 20积分 | 10分钟 |

## 🎨 界面预览

### 首页 - 魔法水晶余额
- 悬浮魔法水晶展示
- 呼吸动效存钱罐
- 魔法罗盘积分折算

### 积分存取 - 充能/释放
- 渐变紫色卡片
- 橙色高亮按钮
- 蛋仔派对式按钮

### 存取明细 - 魔法记录
- 时间轴明细列表
- 圆角卡片设计
- 积分变动动画

## 📱 移动端适配

- 底部圆角悬浮导航
- 3D卡通图标
- 点击缩放反馈
- 当前选中光晕标识
- 毛玻璃背景蒙层

## 🔄 数据备份

### GitHub同步
```bash
curl -X POST http://localhost:3001/api/backup/git-sync
```

### 本地备份
```bash
curl -X POST http://localhost:3001/api/backup/local
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 💖 特别感谢

为元宵的成长保驾护航，让学习变得更有趣！

---

<p align="center">
  Made with ❤️ for 元宵
</p>

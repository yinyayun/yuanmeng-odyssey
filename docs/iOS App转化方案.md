# 元梦大陆 iOS App 转化方案

## 一、方案选型概览

将现有 Vue3 Web 应用转化为 iOS App，有三条路径，改动成本差异悬殊：

| 方案 | 技术路线 | 前端代码复用率 | 后端改动 | 上架难度 | 综合成本 |
|------|---------|-------------|---------|---------|---------|
| **A. WebView 套壳** | Capacitor / Cordova | ✅ 95%+ | 极小 | 中 | ⭐⭐ 低 |
| **B. uni-app 重写** | Vue3 语法跨端编译 | 🔄 40-60% | 中等 | 低 | ⭐⭐⭐ 中 |
| **C. 原生 Swift** | SwiftUI / UIKit | ❌ 0% | 大 | 低 | ⭐⭐⭐⭐⭐ 极高 |

**结论：推荐方案 A（Capacitor 套壳）**，代码几乎不用改，2-3天可完成 App 打包，同时保留后续升级原生能力的可扩展性。

---

## 二、方案 A：Capacitor WebView 套壳（推荐）

### 2.1 原理

Capacitor 是 Ionic 团队出品的跨平台框架，将 Web 应用嵌入原生 WebView，并提供 JavaScript 桥接原生能力（相机、文件、推送等）。

```
┌─────────────────────────────────┐
│           iOS App Shell         │
│  ┌───────────────────────────┐  │
│  │      WKWebView            │  │
│  │   ┌─────────────────┐     │  │
│  │   │  Vue3 前端代码   │     │  │
│  │   │  (现有代码复用)  │     │  │
│  │   └─────────────────┘     │  │
│  │         ↕ HTTP/API        │  │
│  │   ┌─────────────────┐     │  │
│  │   │ Express + SQLite │     │  │
│  │   │  (阿里云服务器)  │     │  │
│  │   └─────────────────┘     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 2.2 改动成本评估

#### 前端改动（约 1 天）

| 改动项 | 工作量 | 说明 |
|--------|--------|------|
| 安装 Capacitor | 0.5h | npm 安装，几条命令 |
| 修改 API 请求地址 | 1h | 本地请求改为完整 URL `https://lucy.yinjoy.top/api` |
| 认证方式调整 | 2-3h | Session+Cookie → JWT Token（WebView 内 Cookie 有限制） |
| PDF 下载适配 | 1h | 使用 Capacitor Filesystem 插件保存文件 |
| 状态栏/安全区域 | 0.5h | 适配 iPhone 刘海屏安全区域 |
| **合计** | **约 1 天** | |

#### 后端改动（约 0.5 天）

| 改动项 | 工作量 | 说明 |
|--------|--------|------|
| 新增 JWT 认证接口 | 2h | 与现有 Session 并存，App 用 JWT |
| CORS 配置 | 0.5h | 允许 App 的请求来源 |
| **合计** | **约 0.5 天** | |

#### 环境准备（约 1-2 天，非编码）

| 条件 | 说明 | 耗时 |
|------|------|------|
| Mac 电脑 | Capacitor 打包**必须在 Mac 上执行** | — |
| Xcode 安装 | 约 12GB，App Store 免费下载 | 0.5h |
| Apple 开发者账号 | **$99/年**，用于真机调试和上架 | 申请审核约 1-2天 |
| 证书和 Provisioning Profile | Xcode 自动管理 | 0.5h |

---

### 2.3 详细实施步骤

#### Step 1：安装 Capacitor

```bash
cd /path/to/yuanmeng-odyssey/frontend

# 安装 Capacitor 核心
npm install @capacitor/core @capacitor/cli

# 初始化（App名称、Bundle ID）
npx cap init "元梦大陆" "com.yuanmeng.odyssey" --web-dir dist

# 添加 iOS 平台
npm install @capacitor/ios
npx cap add ios
```

此时项目根目录会生成 `ios/` 文件夹（Xcode 工程）。

#### Step 2：修改 Vite 构建配置

修改 [vite.config.js](/Users/allen/workspaces/java/yuanmeng-odyssey/frontend/vite.config.js)，为 App 模式添加 base 路径：

```javascript
// vite.config.js
export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? './' : '/',  // App 用相对路径
  // ...其余配置不变
})
```

#### Step 3：修改 API 请求地址

修改 [frontend/src/utils/request.js](/Users/allen/workspaces/java/yuanmeng-odyssey/frontend/src/utils/request.js)：

```javascript
// App 内无法用 /api 相对路径，需指向服务器完整地址
const BASE_URL = window.location.protocol === 'file:'
  ? 'https://lucy.yinjoy.top/api'   // Capacitor App 环境
  : '/api'                           // 浏览器 H5 环境

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: false  // App 模式改为 false（使用 JWT 而非 Cookie）
})
```

#### Step 4：认证方式改为 JWT（双轨并行）

后端新增 JWT 支持（与 Session 并存，不影响现有 H5）：

```javascript
// backend/src/middleware/auth.js 增加 JWT 验证分支
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'yuanmeng-jwt-secret'

export const authMiddleware = (req, res, next) => {
  // 优先检查 JWT（App 使用）
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.user = decoded
      return next()
    } catch (e) {
      return res.status(401).json({ code: 401, message: '登录已过期' })
    }
  }

  // 其次检查 Session（H5 浏览器使用）
  if (req.session?.user) {
    req.user = req.session.user
    return next()
  }

  return res.status(401).json({ code: 401, message: '未登录或会话已过期' })
}
```

登录接口返回 JWT Token：

```javascript
// 登录成功后同时返回 token
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role, familyId: user.family_id },
  JWT_SECRET,
  { expiresIn: '30d' }
)
res.json({ code: 200, data: { ...userData, token } })
```

前端登录后存储 token：

```javascript
// App 模式保存 token，后续请求自动携带
const token = data.token
if (token) localStorage.setItem('jwt_token', token)

// request.js 请求拦截器
request.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

#### Step 5：PDF/文件下载适配

安装 Capacitor 文件系统插件：

```bash
npm install @capacitor/filesystem @capacitor/share
npx cap sync ios
```

修改下载逻辑，App 内使用原生文件保存：

```javascript
// utils/download.js
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const downloadFileNative = async (url, filename) => {
  if (!Capacitor.isNativePlatform()) {
    // H5 浏览器原有逻辑
    window.open(url, '_blank')
    return
  }

  // App 原生下载
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('jwt_token')}` }
  })
  const blob = await response.blob()
  const base64 = await blobToBase64(blob)

  const result = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents
  })

  // 调起系统分享菜单（可保存到文件、打印等）
  await Share.share({
    title: filename,
    url: result.uri,
  })
}
```

#### Step 6：适配 iPhone 安全区域

在 `index.html` 的 `<head>` 中添加：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

在 `App.vue` 或全局 CSS 中添加：

```css
/* 适配 iPhone 刘海屏底部 Home 条 */
.layout-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### Step 7：构建并同步到 Xcode

```bash
# 构建前端
CAPACITOR_BUILD=true npm run build

# 同步到 iOS 工程
npx cap sync ios

# 用 Xcode 打开工程
npx cap open ios
```

#### Step 8：Xcode 配置

1. 选择开发团队（需 Apple 开发者账号）
2. 修改 Bundle Identifier 为 `com.yuanmeng.odyssey`
3. 选择真机或模拟器，点击运行

---

## 三、方案 B：uni-app 重写（中等成本）

### 3.1 适用场景

- 需要更接近原生体验（流畅度、手势）
- 希望同时发布 iOS + Android + 微信小程序
- 接受 2-3 周重写时间

### 3.2 改动成本评估

| 模块 | 复用度 | 主要改动 |
|------|--------|---------|
| 登录页 | 60% | 布局可参考，组件需换 uni-ui |
| 时光银行 | 50% | ECharts 换 uCharts 或 qiun-data-charts |
| 智慧树洞 | 30% | HTML 渲染需用 `rich-text`，自定义样式受限严重 |
| 数能充电站 | 50% | PDF 改用 `uni.openDocument` |
| 管理后台 | 不建议移植 | 管理功能不适合 App |
| 后端 API | 100% 复用 | 仅需改认证为 JWT |
| **总工期** | — | **约 3-4 周** |

### 3.3 核心障碍

**智慧树洞的 HTML 渲染是最大瓶颈**：
- uni-app 的 `rich-text` 组件不支持 `<style>` 标签、不支持 `class` 样式
- 现有成长计划 HTML 文件若有复杂样式，在 App 内将丢失样式
- 备选方案：使用 `web-view` 组件内嵌（等同于套壳，但仅限部分页面）

---

## 四、方案 C：原生 Swift（高成本，不推荐）

### 4.1 成本评估

| 工作项 | 工时 |
|--------|------|
| 学习 Swift/SwiftUI | 2-4周（若无经验） |
| 重写所有界面 | 3-4周 |
| 重写网络层和认证 | 1周 |
| 重写图表（Charts库） | 1周 |
| 重写文件管理功能 | 1周 |
| 测试与调试 | 1-2周 |
| **总工期** | **约 2-3个月** |

后端 API 100% 可复用，但前端需全量重写，**不推荐**。

---

## 五、App Store 上架流程

无论选择哪种方案，最终上架 App Store 流程相同：

### 5.1 账号与证书准备

```
1. 注册 Apple ID（已有则跳过）
2. 注册 Apple Developer Program
   地址：https://developer.apple.com/programs/
   费用：$99/年（约 730元）
   审核时间：1-3个工作日
3. 在 Xcode → Preferences → Accounts 中登录开发者账号
4. Xcode 自动生成：
   - Development Certificate（开发调试用）
   - Distribution Certificate（上架用）
   - Provisioning Profile（描述文件）
```

### 5.2 App 信息准备

在 App Store Connect（https://appstoreconnect.apple.com）创建 App：

| 字段 | 填写建议 |
|------|---------|
| App 名称 | 元梦大陆 |
| Bundle ID | com.yuanmeng.odyssey |
| 副标题 | 元宵的成长守护系统 |
| 分类 | 教育 |
| 年龄评级 | 4+ |
| 隐私政策 URL | 需要提供（可挂在服务器上） |

### 5.3 截图要求

App Store 要求提供指定尺寸截图：

| 设备 | 尺寸（像素）| 张数 |
|------|-----------|------|
| iPhone 6.9"（iPhone 16 Pro Max）| 1320×2868 | 至少3张 |
| iPhone 6.5"（iPhone 14 Plus）| 1242×2688 | 至少3张 |
| iPad Pro 12.9"（若支持iPad）| 2048×2732 | 至少3张 |

可用模拟器截图，或工具 [Screenshotr](https://screenshotr.app) 自动生成。

### 5.4 提交审核

```
1. Xcode → Product → Archive → 打包 Release 版本
2. 上传到 App Store Connect
3. 填写版本说明、截图、描述
4. 提交审核
5. 审核时间：通常 1-3个工作日
   首次审核可能较慢（3-7天）
```

### 5.5 常见拒绝原因

| 原因 | 预防措施 |
|------|---------|
| 缺少隐私政策 | 提前在服务器部署一个隐私政策页面 |
| 登录门槛过高 | 提供 Apple 审核员的测试账号 |
| 功能不完整 | 确保所有按钮均有响应 |
| 内容需要分级 | 按实际内容填写年龄评级 |
| 需要登录但无注册 | 说明这是家庭内部系统，账号由管理员创建 |

---

## 六、改动成本汇总对比

### 方案 A（Capacitor 套壳）—— 推荐

| 阶段 | 内容 | 工时 | 前置条件 |
|------|------|------|---------|
| 环境搭建 | Xcode + 证书 + 开发者账号 | 0.5天 | Mac + $99/年 |
| 前端改造 | Capacitor接入、API地址、安全区域 | 1天 | — |
| 认证改造 | 后端新增JWT双轨 | 0.5天 | — |
| 文件下载 | Capacitor Filesystem插件 | 0.5天 | — |
| 打包调试 | Xcode真机测试 | 0.5天 | — |
| App Store上架 | 截图、描述、提交审核 | 0.5天 | — |
| **合计** | | **约 3-4天（编码）** | **Mac + $99** |

### 方案 B（uni-app 重写）

| 阶段 | 工时 |
|------|------|
| 框架搭建 | 2天 |
| 页面重写（5个主页面） | 10天 |
| 后端改造 | 1天 |
| 调试与测试 | 5天 |
| **合计** | **约 3-4周** |

---

## 七、推荐方案：Capacitor 路线图

```
Week 1（约4天）
├── Day 1：申请 Apple 开发者账号 + 安装 Xcode
├── Day 2：Capacitor 接入 + API 请求改造
├── Day 3：JWT 认证双轨 + 文件下载原生化
└── Day 4：真机调试 + 安全区域适配

Week 2（约3天）
├── Day 5：App Store Connect 建档 + 截图制作
├── Day 6：打包 Release + 提交审核
└── Day 7-14：等待审核通过（期间可做其他事）
```

### 优先级建议

如果当前已在推进微信公众号 H5 方案（HTTPS 升级），那么**先完成 H5 接入**，因为：

1. Capacitor App 同样需要 HTTPS 后端（API 调用需要 HTTPS）
2. H5 在微信内的体验对家庭用户完全够用
3. App 主要带来的价值是「桌面图标」和「原生文件操作」
4. 可以先观察公众号 H5 的实际使用情况，再决定是否做 App

---

## 八、参考资源

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Apple 开发者账号注册](https://developer.apple.com/programs/enroll/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Capacitor iOS 配置](https://capacitorjs.com/docs/ios)
- [Capacitor Filesystem 插件](https://capacitorjs.com/docs/apis/filesystem)

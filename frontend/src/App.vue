<template>
  <router-view />
</template>

<style>
@import './styles/fantasy-theme.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(135deg, #fef5f7 0%, #f5eef8 50%, #ffeef5 100%);
  min-height: 100vh;
}

/* Element Plus 主题覆盖 */
:root {
  --el-color-primary: #9b59b6;
  --el-color-primary-light-3: #d4a5e8;
  --el-color-primary-light-5: #e8d5f2;
  --el-color-primary-light-7: #f0e6f7;
  --el-color-primary-light-8: #f5eef8;
  --el-color-primary-light-9: #faf5fc;
  --el-color-primary-dark-2: #6c3483;
  --el-border-radius-base: 16px;
  --el-border-radius-small: 12px;
}

/* 全局卡片样式 */
.el-card {
  border-radius: var(--fantasy-radius-lg) !important;
  border: 2px solid rgba(255, 255, 255, 0.8) !important;
  box-shadow: var(--fantasy-shadow-md) !important;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(10px);
}

.el-card__header {
  border-bottom: 2px solid rgba(155, 89, 182, 0.1) !important;
  padding: 18px 24px !important;
}

/* 按钮样式 */
.el-button {
  border-radius: var(--fantasy-radius-xl) !important;
  font-weight: bold !important;
  transition: var(--fantasy-transition) !important;
}

.el-button--primary {
  background: linear-gradient(135deg, #9b59b6 0%, #e74c3c 100%) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(155, 89, 182, 0.3) !important;
}

.el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(155, 89, 182, 0.4) !important;
}

.el-button--success {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%) !important;
  border: none !important;
}

.el-button--warning {
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%) !important;
  border: none !important;
}

.el-button--danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%) !important;
  border: none !important;
}

/* 输入框样式 */
.el-input__wrapper {
  border-radius: var(--fantasy-radius-md) !important;
  box-shadow: 0 2px 8px rgba(155, 89, 182, 0.1) !important;
}

/* 表格样式 */
.el-table {
  border-radius: var(--fantasy-radius-md) !important;
  overflow: hidden;
}

.el-table th {
  background: linear-gradient(135deg, #f5eef8 0%, #ffeef5 100%) !important;
  font-weight: bold !important;
  color: #6c3483 !important;
}

/* 标签样式 */
.el-tag {
  border-radius: var(--fantasy-radius-sm) !important;
  font-weight: bold !important;
}

/* 菜单样式 */
.el-menu {
  border-radius: var(--fantasy-radius-md) !important;
}

/* 弹窗样式 */
.el-dialog {
  border-radius: var(--fantasy-radius-lg) !important;
  box-shadow: var(--fantasy-shadow-lg) !important;
}

.el-dialog__header {
  background: linear-gradient(135deg, #f5eef8 0%, #ffeef5 100%) !important;
  border-radius: var(--fantasy-radius-lg) var(--fantasy-radius-lg) 0 0 !important;
  padding: 20px 24px !important;
}

/* 抽屉样式 */
.el-drawer {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
}

/* 统计数字动画 */
.stat-number {
  font-family: 'Arial Rounded MT Bold', 'PingFang SC', sans-serif;
  font-weight: bold;
  background: linear-gradient(135deg, #9b59b6 0%, #e74c3c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 魔法标题 */
.magic-title {
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(135deg, #9b59b6 0%, #e74c3c 50%, #f39c12 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 10px rgba(155, 89, 182, 0.2);
}

/* 响应式适配 */
@media screen and (max-width: 768px) {
  .el-card__header {
    padding: 14px 16px !important;
  }
  
  .magic-title {
    font-size: 20px;
  }
}
</style>

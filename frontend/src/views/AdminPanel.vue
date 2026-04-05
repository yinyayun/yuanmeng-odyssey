<template>
  <div class="admin-panel">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="200px" class="admin-aside">
        <div class="admin-logo">
          <span>🔧 管理后台</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="admin-menu"
          router
          background-color="#2c3e50"
          text-color="#ecf0f1"
          active-text-color="#ffd700"
        >
          <el-menu-item index="/admin/dashboard">
            <el-icon><DataLine /></el-icon>
            <span>数据概览</span>
          </el-menu-item>
          <el-menu-item index="/admin/accounts">
            <el-icon><Wallet /></el-icon>
            <span>积分账户</span>
          </el-menu-item>
          <el-menu-item index="/admin/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/backup">
            <el-icon><Download /></el-icon>
            <span>数据备份</span>
          </el-menu-item>
          <el-menu-item index="/admin/settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <!-- 主内容区 -->
      <el-container>
        <el-header class="admin-header">
          <div class="header-left">
            <el-button type="primary" size="small" @click="$router.push('/')">
              <el-icon><HomeFilled /></el-icon>
              返回主页
            </el-button>
            <span class="welcome-text">欢迎，{{ username }}</span>
          </div>
          <div class="header-right">
            <el-button type="danger" size="small" @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-button>
          </div>
        </el-header>
        
        <el-main class="admin-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

const user = computed(() => {
  return JSON.parse(localStorage.getItem('user') || '{}')
})

const username = computed(() => user.value.name || '管理员')
const activeMenu = computed(() => route.path)

const handleLogout = async () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.post('/admin/logout')
    localStorage.removeItem('user')
    ElMessage.success('已退出登录')
    router.push('/login')
  })
}
</script>

<style scoped>
.admin-panel {
  min-height: 100vh;
}

.admin-aside {
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: #fff;
  box-shadow: 2px 0 10px rgba(0,0,0,0.2);
}

.admin-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #1f2d3d;
}

.admin-menu {
  border-right: none;
  background: transparent !important;
}

.admin-menu :deep(.el-menu-item),
.admin-menu :deep(.el-sub-menu__title) {
  color: #ecf0f1 !important;
  font-size: 15px;
  height: 50px;
  line-height: 50px;
  margin: 4px 8px;
  border-radius: 8px;
}

.admin-menu :deep(.el-menu-item:hover),
.admin-menu :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 215, 0, 0.15) !important;
}

.admin-menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 215, 0, 0.25) !important;
  color: #ffd700 !important;
  font-weight: bold;
}

.admin-menu :deep(.el-icon) {
  color: #ecf0f1;
  font-size: 18px;
}

.admin-menu :deep(.el-menu-item.is-active .el-icon) {
  color: #ffd700;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome-text {
  font-size: 16px;
  color: #606266;
}

.admin-main {
  background: #f0f2f5;
  padding: 20px;
}
</style>

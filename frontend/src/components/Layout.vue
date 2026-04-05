<template>
  <el-container class="layout-container">
    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-model="drawerVisible"
      :size="'70%'"
      :with-header="false"
      direction="ltr"
      class="mobile-drawer"
    >
      <div class="mobile-sidebar">
        <div class="logo">
          <el-icon size="32" color="#ffd700"><Star /></el-icon>
          <span class="logo-text">元梦大陆</span>
        </div>
        <el-menu
          :default-active="$route.path"
          :default-openeds="['/time-bank']"
          router
          class="sidebar-menu"
          background-color="#1a1a2e"
          text-color="#b8b8d1"
          active-text-color="#ffd700"
          @select="drawerVisible = false"
        >
          <template v-for="route in menuRoutes" :key="route.path">
            <!-- 有子菜单的 -->
            <el-sub-menu v-if="route.children" :index="route.path">
              <template #title>
                <el-icon>
                  <component :is="route.meta.icon" />
                </el-icon>
                <span>{{ route.meta.title }}</span>
              </template>
              <el-menu-item 
                v-for="child in route.children" 
                :key="child.path" 
                :index="child.path"
              >
                <el-icon>
                  <component :is="child.meta.icon" />
                </el-icon>
                <span>{{ child.meta.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <!-- 没有子菜单的 -->
            <el-menu-item v-else :index="route.path">
              <el-icon>
                <component :is="route.meta.icon" />
              </el-icon>
              <span>{{ route.meta.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </div>
    </el-drawer>

    <!-- PC端侧边栏 -->
    <el-aside width="220px" class="sidebar pc-only">
      <div class="logo">
        <el-icon size="32" color="#ffd700"><Star /></el-icon>
        <span class="logo-text">元梦大陆</span>
      </div>
      <el-menu
        :default-active="$route.path"
        :default-openeds="['/time-bank']"
        router
        class="sidebar-menu"
        background-color="#1a1a2e"
        text-color="#b8b8d1"
        active-text-color="#ffd700"
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <!-- 有子菜单的 -->
          <el-sub-menu v-if="route.children" :index="route.path">
            <template #title>
              <el-icon>
                <component :is="route.meta.icon" />
              </el-icon>
              <span>{{ route.meta.title }}</span>
            </template>
            <el-menu-item 
              v-for="child in route.children" 
              :key="child.path" 
              :index="child.path"
            >
              <el-icon>
                <component :is="child.meta.icon" />
              </el-icon>
              <span>{{ child.meta.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <!-- 没有子菜单的 -->
          <el-menu-item v-else :index="route.path">
            <el-icon>
              <component :is="route.meta.icon" />
            </el-icon>
            <span>{{ route.meta.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button
            class="mobile-menu-btn mobile-only"
            type="primary"
            text
            @click="drawerVisible = true"
          >
            <el-icon size="24"><Menu /></el-icon>
          </el-button>
          <div class="header-title">{{ $route.meta.title }}</div>
        </div>
        <div class="user-info">
          <el-avatar :size="isMobile ? 32 : 40" src="https://api.dicebear.com/7.x/avataaars/svg?seed=yuanxiao" />
          <span class="username pc-only">元宵</span>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const drawerVisible = ref(false)
const isMobile = ref(false)

const routes = computed(() => {
  return route.matched[0]?.children || []
})

// 构建菜单结构
const menuRoutes = computed(() => {
  const allRoutes = routes.value
  const timeBankChildren = allRoutes.filter(r => 
    ['time-transaction', 'time-records', 'rules'].includes(r.path)
  )
  
  return allRoutes
    .filter(r => !r.meta?.hidden)
    .map(r => {
      if (r.path === 'time-bank') {
        return {
          ...r,
          children: timeBankChildren
        }
      }
      return r
    })
})

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 50%, #16213e 100%);
  box-shadow: 4px 0 20px rgba(155, 89, 182, 0.3);
  border-right: 2px solid rgba(212, 165, 232, 0.2);
}

.logo {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-bottom: 2px solid rgba(212, 165, 232, 0.3);
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.2) 0%, rgba(231, 76, 60, 0.1) 100%);
}

.logo-text {
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 50%, #9b59b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
  animation: shimmer 3s ease-in-out infinite;
}

.sidebar-menu {
  border-right: none;
  padding-top: 10px;
}

.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  height: 56px;
  line-height: 56px;
  margin: 6px 12px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.3) 0%, rgba(231, 76, 60, 0.2) 100%) !important;
  transform: translateX(5px);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.4) 0%, rgba(231, 76, 60, 0.3) 100%) !important;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(155, 89, 182, 0.3);
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  height: 44px;
  line-height: 44px;
  padding-left: 45px !important;
  font-size: 14px;
}

.sidebar-menu :deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: #ffd700 !important;
}

.header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 238, 248, 0.95) 100%);
  box-shadow: 0 4px 20px rgba(155, 89, 182, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(212, 165, 232, 0.2);
}

.header-title {
  font-size: 22px;
  font-weight: bold;
  background: linear-gradient(135deg, #9b59b6 0%, #e74c3c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.main-content {
  background: linear-gradient(135deg, #fef5f7 0%, #f5eef8 50%, #ffeef5 100%);
  padding: 20px;
  overflow-y: auto;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .pc-only {
    display: none !important;
  }
  
  .mobile-only {
    display: flex !important;
  }
  
  .header {
    padding: 0 15px;
    height: 56px;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .header-title {
    font-size: 18px;
  }
  
  .main-content {
    padding: 12px;
  }
  
  .mobile-menu-btn {
    padding: 8px;
  }
  
  .mobile-sidebar {
    height: 100%;
    background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 50%, #16213e 100%);
  }
  
  .mobile-sidebar .logo {
    height: 60px;
  }
  
  .mobile-sidebar .sidebar-menu {
    padding-top: 0;
  }
}

@media screen and (min-width: 769px) {
  .mobile-only {
    display: none !important;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>

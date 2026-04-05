import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'

// 路由守卫 - 检查登录状态（通用）
const requireAuth = (to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (!user.username) {
    next('/login')
  } else {
    next()
  }
}

// 路由守卫 - 检查家长权限（管理后台专用）
const requireParent = (to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (!user.username) {
    next('/login')
  } else if (user.role !== 'parent') {
    next('/')
  } else {
    next()
  }
}

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    beforeEnter: requireAuth,
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '元梦大陆', icon: 'Star' }
      },
      {
        path: 'time-bank',
        name: 'TimeBank',
        component: () => import('@/views/TimeBank.vue'),
        meta: { title: '时光银行', icon: 'Clock' }
      },
      {
        path: 'time-transaction',
        name: 'TimeTransaction',
        component: () => import('@/views/TimeTransaction.vue'),
        meta: { title: '积分存取', icon: 'Coin', hidden: true }
      },
      {
        path: 'time-records',
        name: 'TimeRecords',
        component: () => import('@/views/TimeRecords.vue'),
        meta: { title: '存取明细', icon: 'List', hidden: true }
      },
      {
        path: 'rules',
        name: 'Rules',
        component: () => import('@/views/Rules.vue'),
        meta: { title: '兑换规则', icon: 'Setting', hidden: true }
      },
      {
        path: 'wisdom-tree',
        name: 'WisdomTree',
        component: () => import('@/views/WisdomTree.vue'),
        meta: { title: '智慧树洞', icon: 'Reading' }
      },
      {
        path: 'math-station',
        name: 'MathStation',
        component: () => import('@/views/MathStation.vue'),
        meta: { title: '数能充电站', icon: 'TrendCharts' }
      }
    ]
  },
  // 登录页面
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  // 管理后台路由（仅家长可访问）
  {
    path: '/admin',
    component: () => import('@/views/AdminPanel.vue'),
    redirect: '/admin/dashboard',
    beforeEnter: requireParent,
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/AdminDashboard.vue'),
        meta: { title: '数据概览' }
      },
      {
        path: 'accounts',
        name: 'AdminAccounts',
        component: () => import('@/views/admin/AdminAccounts.vue'),
        meta: { title: '积分账户' }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/AdminUsers.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'backup',
        name: 'AdminBackup',
        component: () => import('@/views/admin/AdminBackup.vue'),
        meta: { title: '数据备份' }
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('@/views/admin/AdminSettings.vue'),
        meta: { title: '系统设置' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

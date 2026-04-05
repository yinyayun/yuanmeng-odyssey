import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

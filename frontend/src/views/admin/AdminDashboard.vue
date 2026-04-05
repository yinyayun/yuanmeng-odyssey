<template>
  <div class="admin-dashboard">
    <h2>📊 数据概览</h2>
    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon">👤</div>
          <div class="stat-value">{{ stats.accountCount }}</div>
          <div class="stat-label">账户数量</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-value">{{ stats.totalBalance }}</div>
          <div class="stat-label">总积分</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-value">{{ stats.transactionCount }}</div>
          <div class="stat-label">交易次数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-value">{{ stats.ruleCount }}</div>
          <div class="stat-label">规则数量</div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近7天交易趋势</span>
          </template>
          <div ref="trendChart" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>积分收支统计</span>
          </template>
          <div ref="pieChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'

const stats = ref({
  accountCount: 0,
  totalBalance: 0,
  transactionCount: 0,
  ruleCount: 0
})

const trendChart = ref(null)
const pieChart = ref(null)

const loadStats = async () => {
  try {
    // 获取账户统计
    const accountRes = await request.get('/account')
    if (accountRes.code === 200) {
      stats.value.accountCount = accountRes.data.length
      stats.value.totalBalance = accountRes.data.reduce((sum, acc) => sum + acc.balance, 0)
    }
    
    // 获取交易统计
    const transRes = await request.get('/transactions?page=1&pageSize=1')
    if (transRes.code === 200) {
      stats.value.transactionCount = transRes.data.total || 0
    }
    
    // 获取规则统计
    const rulesRes = await request.get('/rules')
    if (rulesRes.code === 200) {
      stats.value.ruleCount = rulesRes.data.length
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const initCharts = () => {
  // 趋势图
  if (trendChart.value) {
    const chart = echarts.init(trendChart.value)
    chart.setOption({
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      },
      yAxis: { type: 'value' },
      series: [{
        data: [120, 200, 150, 80, 70, 110, 130],
        type: 'line',
        smooth: true
      }]
    })
  }
  
  // 饼图
  if (pieChart.value) {
    const chart = echarts.init(pieChart.value)
    chart.setOption({
      series: [{
        type: 'pie',
        data: [
          { value: 1048, name: '存入' },
          { value: 735, name: '提取' }
        ]
      }]
    })
  }
}

onMounted(() => {
  loadStats()
  initCharts()
})
</script>

<style scoped>
.admin-dashboard h2 {
  margin-bottom: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.chart-row {
  margin-top: 20px;
}

.chart-container {
  height: 300px;
}
</style>

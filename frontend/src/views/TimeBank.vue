<template>
  <div class="time-bank">
    <el-card class="account-card">
      <div class="account-header" :class="{ 'mobile': isMobile }">
        <div class="account-info">
          <el-avatar :size="isMobile ? 60 : 80" src="https://api.dicebear.com/7.x/avataaars/svg?seed=yuanxiao" />
          <div class="account-details">
            <h2>{{ accountStore.account?.name || '元宵' }}</h2>
            <p>账户: {{ accountStore.account?.id || '-' }}</p>
          </div>
        </div>
        <div class="balance-display">
          <div class="balance-label">当前积分</div>
          <div class="balance-value" :style="{ fontSize: isMobile ? '36px' : '48px' }">{{ accountStore.currentBalance }}</div>
        </div>
      </div>
    </el-card>

    <el-row :gutter="isMobile ? 10 : 20" class="mt-20">
      <el-col :xs="24" :sm="12" class="mb-10">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>赚取积分方式</span>
              <el-tag type="success">存入</el-tag>
            </div>
          </template>
          <div class="rule-list">
            <div class="rule-item" v-for="rule in earnRules" :key="rule.id">
              <div class="rule-info">
                <el-icon size="24" color="#67c23a"><CircleCheck /></el-icon>
                <span class="rule-name">{{ rule.name }}</span>
              </div>
              <div class="rule-rate">
                {{ rule.timeUnit }}分钟 = {{ rule.pointsPerUnit }}积分
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>消费积分方式</span>
              <el-tag type="danger">提取</el-tag>
            </div>
          </template>
          <div class="rule-list">
            <div class="rule-item" v-for="rule in consumeRules" :key="rule.id">
              <div class="rule-info">
                <el-icon size="24" color="#f56c6c"><VideoPlay /></el-icon>
                <span class="rule-name">{{ rule.name }}</span>
              </div>
              <div class="rule-rate">
                {{ rule.pointsPerUnit }}积分 = {{ rule.timeUnit }}分钟
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="mt-20">
      <template #header>
        <div class="card-header">
          <span>积分趋势</span>
          <el-radio-group v-model="timeRange" size="small">
            <el-radio-button label="week">本周</el-radio-button>
            <el-radio-button label="month">本月</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="chartRef" class="chart-container"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAccountStore } from '@/stores/account'
import * as echarts from 'echarts'

const accountStore = useAccountStore()
const chartRef = ref(null)
const timeRange = ref('week')
const isMobile = ref(false)
let chart = null

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

const earnRules = computed(() => 
  accountStore.rules.filter(r => r.type === 'earn')
)
const consumeRules = computed(() => 
  accountStore.rules.filter(r => r.type === 'consume')
)

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['收入', '支出']
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: [120, 200, 150, 80, 70, 110, 130],
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '支出',
        type: 'bar',
        data: [60, 120, 80, 100, 90, 150, 100],
        itemStyle: { color: '#f56c6c' }
      }
    ]
  }
  chart.setOption(option)
}

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  await accountStore.fetchAccount()
  await accountStore.fetchRules()
  initChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(timeRange, () => {
  // 重新加载数据
})
</script>

<style scoped>
.time-bank {
  padding: 10px;
}

.account-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.account-details h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.account-details p {
  margin: 0;
  opacity: 0.8;
}

.balance-display {
  text-align: right;
}

.balance-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.balance-value {
  font-size: 48px;
  font-weight: bold;
}

.mt-20 {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.rule-list {
  padding: 10px;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.3s;
}

.rule-item:hover {
  background: #ebeef5;
  transform: translateX(5px);
}

.rule-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rule-name {
  font-size: 16px;
  font-weight: 500;
}

.rule-rate {
  font-size: 14px;
  color: #606266;
  background: white;
  padding: 6px 12px;
  border-radius: 16px;
}

.chart-container {
  height: 300px;
}

.mb-10 {
  margin-bottom: 10px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .time-bank {
    padding: 5px;
  }
  
  .account-header.mobile {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .account-header.mobile .account-info {
    flex-direction: column;
  }
  
  .account-details h2 {
    font-size: 20px;
  }
  
  .balance-display {
    text-align: center;
  }
  
  .balance-label {
    font-size: 12px;
  }
  
  .rule-item {
    padding: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .rule-rate {
    font-size: 12px;
  }
  
  .chart-container {
    height: 200px;
  }
}
</style>

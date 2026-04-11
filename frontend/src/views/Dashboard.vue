<template>
  <div class="dashboard fantasy-dashboard">
    <!-- 魔法装饰背景 -->
    <div class="magic-bg">
      <div class="magic-circle" style="top: 10%; left: 5%;"></div>
      <div class="magic-circle" style="top: 60%; right: 10%; animation-delay: -5s;"></div>
    </div>
    
    <!-- 欢迎语 -->
    <div class="welcome-section">
      <h1 class="magic-welcome">✨ 欢迎来到元梦大陆 ✨</h1>
      <p class="welcome-subtitle">
        {{ isParent ? '魔法成长守护中心' : '元宵的魔法成长之旅' }}
      </p>
      
      <!-- 家长选择宝宝账户 -->
      <div v-if="isParent" class="account-selector">
        <el-select v-model="selectedAccountId" placeholder="选择宝宝账户" size="large" @change="handleAccountChange">
          <el-option 
            v-for="account in childAccounts" 
            :key="account.id" 
            :label="`${account.name} (余额: ${account.balance}积分)`" 
            :value="account.id"
          >
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="28" :src="account.avatar || getDefaultAvatar(account.username)" />
              <span>{{ account.name }}</span>
              <el-tag type="success" size="small">{{ account.balance }} 积分</el-tag>
            </div>
          </el-option>
        </el-select>
      </div>
    </div>
    
    <!-- 魔法水晶余额展示 -->
    <el-row :gutter="isMobile ? 10 : 20">
      <el-col :xs="24" :sm="8" class="mb-10">
        <div class="crystal-card balance-crystal">
          <div class="crystal-glow"></div>
          <div class="crystal-content">
            <div class="crystal-icon">💎</div>
            <div class="crystal-label">魔法积分</div>
            <div class="crystal-value">{{ accountStore.currentBalance }}</div>
            <div class="crystal-shine"></div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8" class="mb-10">
        <div class="crystal-card income-crystal">
          <div class="crystal-glow"></div>
          <div class="crystal-content">
            <div class="crystal-icon">⚡</div>
            <div class="crystal-label">本周充能</div>
            <div class="crystal-value">+{{ stats?.weekIncome || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8" class="mb-10">
        <div class="crystal-card expense-crystal">
          <div class="crystal-glow"></div>
          <div class="crystal-content">
            <div class="crystal-icon">🎮</div>
            <div class="crystal-label">本周消耗</div>
            <div class="crystal-value">-{{ stats?.weekExpense || 0 }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 魔法罗盘折算工具 -->
    <el-row :gutter="isMobile ? 10 : 20" class="mt-20">
      <el-col :xs="24" :sm="12" class="mb-10">
        <el-card class="magic-card compass-card">
          <template #header>
            <div class="card-header magic-header">
              <span>🔮 魔法罗盘</span>
              <span class="header-sub">积分兑换预测</span>
            </div>
          </template>
          <div class="compass-list">
            <div class="compass-item" v-for="rule in consumeRules" :key="rule.id">
              <div class="compass-icon">{{ getActivityIcon(rule.name) }}</div>
              <div class="compass-info">
                <span class="compass-name">{{ rule.name }}</span>
                <span class="compass-time">
                  可玩 {{ Math.floor(accountStore.currentBalance / rule.pointsPerUnit * rule.timeUnit / 60 * 10) / 10 }} 小时
                </span>
              </div>
              <div class="compass-ring" :style="{ '--progress': (accountStore.currentBalance / rule.pointsPerUnit * 100) + '%' }">
                <div class="ring-fill"></div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card class="magic-card action-card">
          <template #header>
            <div class="card-header magic-header">
              <span>⚡ 快捷魔法</span>
            </div>
          </template>
          <div class="magic-actions" :class="{ 'mobile': isMobile }">
            <button class="magic-btn deposit-btn" @click="$router.push('/time-transaction')">
              <span class="btn-icon">✨</span>
              <span class="btn-text">充能</span>
              <div class="btn-glow"></div>
            </button>
            <button class="magic-btn withdraw-btn" @click="$router.push('/time-transaction')">
              <span class="btn-icon">🎮</span>
              <span class="btn-text">释放</span>
              <div class="btn-glow"></div>
            </button>
            <button class="magic-btn record-btn" @click="$router.push('/time-records')">
              <span class="btn-icon">📜</span>
              <span class="btn-text">记录</span>
              <div class="btn-glow"></div>
            </button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近交易记录 - 移动端卡片式展示 -->
    <el-row class="mt-20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近交易记录</span>
              <el-button text @click="$router.push('/time-records')">查看全部</el-button>
            </div>
          </template>
          <!-- PC端表格 -->
          <el-table :data="recentTransactions" stripe class="pc-table">
            <el-table-column prop="createdAt" label="时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.type === 'deposit' ? 'success' : 'danger'">
                  {{ row.type === 'deposit' ? '存入' : '提取' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="itemName" label="事项" />
            <el-table-column prop="points" label="积分" width="120">
              <template #default="{ row }">
                <span :class="row.type === 'deposit' ? 'text-success' : 'text-danger'">
                  {{ row.type === 'deposit' ? '+' : '-' }}{{ row.points }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="备注" />
          </el-table>
          
          <!-- 移动端卡片列表 -->
          <div class="mobile-list">
            <div 
              v-for="item in recentTransactions" 
              :key="item.id" 
              class="transaction-card"
            >
              <div class="transaction-header">
                <span class="transaction-time">{{ formatDate(item.createdAt) }}</span>
                <el-tag :type="item.type === 'deposit' ? 'success' : 'danger'" size="small">
                  {{ item.type === 'deposit' ? '存入' : '提取' }}
                </el-tag>
              </div>
              <div class="transaction-body">
                <div class="transaction-item">
                  <span class="label">事项：</span>
                  <span class="value">{{ item.itemName }}</span>
                </div>
                <div class="transaction-item">
                  <span class="label">积分：</span>
                  <span :class="['value', 'points', item.type === 'deposit' ? 'text-success' : 'text-danger']">
                    {{ item.type === 'deposit' ? '+' : '-' }}{{ item.points }}
                  </span>
                </div>
                <div class="transaction-item" v-if="item.description">
                  <span class="label">备注：</span>
                  <span class="value">{{ item.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { formatShortDate } from '@/utils/date.js'
import request from '@/utils/request'

const accountStore = useAccountStore()
const isMobile = ref(false)

// 家长相关
const isParent = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role === 'parent'
})

const childAccounts = ref([])
const selectedAccountId = ref(null)
const selectedAccount = ref(null)

const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
}

// 加载所有宝宝账户（家长用）
const loadChildAccounts = async () => {
  if (!isParent.value) return
  try {
    const res = await request.get('/account')
    childAccounts.value = res.filter(a => a.username !== 'dad' && a.username !== 'mom')
    if (childAccounts.value.length > 0 && !selectedAccountId.value) {
      selectedAccountId.value = childAccounts.value[0].id
      selectedAccount.value = childAccounts.value[0]
    }
  } catch (error) {
    console.error('加载账户失败', error)
  }
}

const handleAccountChange = async () => {
  selectedAccount.value = childAccounts.value.find(a => a.id === selectedAccountId.value)
  await loadAccountData()
}

// 加载指定账户的数据
const loadAccountData = async () => {
  if (isParent.value && selectedAccountId.value) {
    // 家长查看指定宝宝的数据
    await accountStore.fetchAccountById(selectedAccountId.value)
    await accountStore.fetchTransactions({ accountId: selectedAccountId.value, limit: 5 })
  } else {
    // 宝宝查看自己的数据
    await accountStore.fetchAccount()
    await accountStore.fetchTransactions({ limit: 5 })
  }
  await accountStore.fetchRules()
  await accountStore.fetchStats({ accountId: selectedAccountId.value })
}

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

const stats = computed(() => accountStore.stats)
const consumeRules = computed(() => 
  accountStore.rules.filter(r => r.type === 'consume')
)

// 获取活动图标
const getActivityIcon = (name) => {
  const icons = {
    '看电视': '📺',
    '玩游戏': '🎮',
    '平板时间': '📱',
    '游戏': '🎯',
    '电视': '📺'
  }
  return icons[name] || '✨'
}
const recentTransactions = computed(() => 
  accountStore.transactions.slice(0, 5)
)

const formatDate = (date) => {
  return formatShortDate(date)
}

onMounted(async () => {
  await loadChildAccounts()
  await loadAccountData()
})
</script>

<style scoped>
.dashboard {
  padding: 10px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 215, 0, 0.1);
  margin-right: 20px;
}

.balance-card .stat-icon {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 107, 107, 0.2) 100%);
}

.income-card .stat-icon {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.2) 0%, rgba(103, 194, 58, 0.1) 100%);
}

.expense-card .stat-icon {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.2) 0%, rgba(245, 108, 108, 0.1) 100%);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #303133;
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

.converter {
  padding: 10px;
}

.converter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #ebeef5;
}

.converter-item:last-child {
  border-bottom: none;
}

.converter-label {
  font-size: 16px;
  color: #606266;
}

.converter-value {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.quick-actions {
  display: flex;
  gap: 15px;
  padding: 20px;
  justify-content: center;
}

.quick-actions.mobile {
  flex-direction: column;
  padding: 10px;
}

.quick-actions.mobile .el-button {
  width: 100%;
  margin: 0;
}

.mb-10 {
  margin-bottom: 10px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .dashboard {
    padding: 5px;
  }
  
  .stat-card {
    padding: 15px;
    margin-bottom: 10px;
  }
  
  .stat-icon {
    width: 60px;
    height: 60px;
    margin-right: 15px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .converter-item {
    padding: 12px 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .converter-label {
    font-size: 14px;
  }
  
  .converter-value {
    font-size: 16px;
  }
  
  .mt-20 {
    margin-top: 10px;
  }
  
  .pc-table {
    display: none;
  }
  
  /* 移动端交易卡片 */
  .transaction-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
  }
  
  .transaction-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .transaction-time {
    font-size: 13px;
    color: #909399;
  }
  
  .transaction-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .transaction-item {
    display: flex;
    align-items: center;
    font-size: 14px;
  }
  
  .transaction-item .label {
    color: #909399;
    width: 50px;
    flex-shrink: 0;
  }
  
  .transaction-item .value {
    color: #303133;
    flex: 1;
  }
  
  .transaction-item .points {
    font-weight: bold;
    font-size: 16px;
  }
}

@media screen and (min-width: 769px) {
  .mobile-list {
    display: none;
  }
}

.text-success {
  color: #27ae60;
  font-weight: bold;
}

.text-danger {
  color: #e74c3c;
  font-weight: bold;
}

/* ========== Q版奇幻风样式 ========== */
.fantasy-dashboard {
  position: relative;
  min-height: 100%;
}

.magic-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.welcome-section {
  text-align: center;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.magic-welcome {
  font-size: 32px;
  font-weight: bold;
  background: linear-gradient(135deg, #9b59b6 0%, #e74c3c 50%, #f39c12 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  text-shadow: 0 2px 20px rgba(155, 89, 182, 0.3);
}

.welcome-subtitle {
  font-size: 16px;
  color: #9b59b6;
  font-weight: 500;
}

.account-selector {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.account-selector .el-select {
  width: 300px;
}

/* 魔法水晶卡片 */
.crystal-card {
  position: relative;
  border-radius: 24px;
  padding: 24px;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.crystal-card:hover {
  transform: translateY(-5px) scale(1.02);
}

.balance-crystal {
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.9) 0%, rgba(231, 76, 60, 0.8) 100%);
  box-shadow: 0 8px 32px rgba(155, 89, 182, 0.4);
}

.income-crystal {
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.9) 0%, rgba(39, 174, 96, 0.8) 100%);
  box-shadow: 0 8px 32px rgba(46, 204, 113, 0.4);
}

.expense-crystal {
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.9) 0%, rgba(230, 126, 34, 0.8) 100%);
  box-shadow: 0 8px 32px rgba(243, 156, 18, 0.4);
}

.crystal-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  animation: rotate-slow 20s linear infinite;
}

.crystal-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.crystal-icon {
  font-size: 40px;
  margin-bottom: 8px;
  animation: float 3s ease-in-out infinite;
}

.crystal-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.crystal-value {
  font-size: 36px;
  font-weight: bold;
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.crystal-shine {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 30%;
  height: 30%;
  background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 100%);
  border-radius: 50%;
  filter: blur(8px);
}

/* 魔法卡片 */
.magic-card {
  border-radius: 24px !important;
  background: rgba(255, 255, 255, 0.95) !important;
  border: 3px solid rgba(212, 165, 232, 0.3) !important;
  box-shadow: 0 8px 32px rgba(155, 89, 182, 0.15) !important;
}

.magic-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #6c3483;
}

.header-sub {
  font-size: 12px;
  color: #9b59b6;
  font-weight: normal;
  margin-left: auto;
}

/* 魔法罗盘 */
.compass-list {
  padding: 10px;
}

.compass-item {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #f5eef8 0%, #ffeef5 100%);
  border-radius: 16px;
  border: 2px solid rgba(212, 165, 232, 0.2);
  transition: all 0.3s ease;
}

.compass-item:hover {
  transform: translateX(5px);
  box-shadow: 0 4px 15px rgba(155, 89, 182, 0.2);
}

.compass-icon {
  font-size: 28px;
  margin-right: 12px;
}

.compass-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.compass-name {
  font-weight: bold;
  color: #6c3483;
  font-size: 15px;
}

.compass-time {
  font-size: 13px;
  color: #9b59b6;
  margin-top: 2px;
}

.compass-ring {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid rgba(212, 165, 232, 0.3);
  position: relative;
  overflow: hidden;
}

.ring-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--progress, 0%);
  background: linear-gradient(180deg, #9b59b6 0%, #e74c3c 100%);
  border-radius: 0 0 25px 25px;
  transition: height 0.5s ease;
}

/* 魔法按钮 */
.magic-actions {
  display: flex;
  gap: 16px;
  padding: 20px;
  justify-content: center;
}

.magic-actions.mobile {
  flex-direction: column;
}

.magic-btn {
  position: relative;
  padding: 20px 32px;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.magic-btn:hover {
  transform: translateY(-5px) scale(1.05);
}

.magic-btn:active {
  transform: translateY(-2px) scale(0.98);
}

.deposit-btn {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
}

.withdraw-btn {
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  box-shadow: 0 6px 20px rgba(243, 156, 18, 0.4);
}

.record-btn {
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  box-shadow: 0 6px 20px rgba(155, 89, 182, 0.4);
}

.btn-icon {
  font-size: 28px;
}

.btn-text {
  font-size: 14px;
}

.btn-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.magic-btn:hover .btn-glow {
  opacity: 1;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .magic-welcome {
    font-size: 24px;
  }
  
  .welcome-subtitle {
    font-size: 14px;
  }
  
  .crystal-card {
    padding: 16px;
    min-height: 100px;
  }
  
  .crystal-icon {
    font-size: 32px;
  }
  
  .crystal-value {
    font-size: 28px;
  }
  
  .magic-btn {
    padding: 16px 24px;
    min-width: 80px;
  }
  
  .btn-icon {
    font-size: 24px;
  }
  
  .compass-item {
    padding: 12px;
  }
  
  .compass-icon {
    font-size: 24px;
  }
}
</style>

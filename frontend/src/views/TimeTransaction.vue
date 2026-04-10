<template>
  <div class="time-transaction">
    <!-- 家长选择宝宝 -->
    <el-card v-if="isParent" class="mb-20 account-selector">
      <template #header>
        <div class="card-header">
          <el-icon size="24"><User /></el-icon>
          <span>选择操作账户</span>
        </div>
      </template>
      <el-select v-model="selectedAccountId" placeholder="选择要为哪个宝宝操作" style="width: 100%">
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
    </el-card>
    
    <el-row :gutter="isMobile ? 10 : 20">
      <el-col :xs="24" :sm="12" class="mb-10">
        <el-card class="transaction-card deposit-card">
          <template #header>
            <div class="card-header">
              <el-icon size="24"><CirclePlus /></el-icon>
              <span>存入积分</span>
              <span v-if="selectedAccountName" class="account-tag">{{ selectedAccountName }}</span>
            </div>
          </template>
          <el-form :model="depositForm" label-position="top">
            <el-form-item label="选择事项">
              <el-select v-model="depositForm.ruleId" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="rule in earnRules"
                  :key="rule.id"
                  :label="rule.name"
                  :value="rule.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="投入时间（分钟）">
              <el-input-number 
                v-model="depositForm.timeAmount" 
                :min="1" 
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="预计获得积分">
              <div class="preview-points">
                <el-icon size="32" color="#ffd700"><Coin /></el-icon>
                <span class="points-value">+{{ depositPoints }}</span>
              </div>
            </el-form-item>
            <el-form-item label="备注">
              <el-input 
                v-model="depositForm.description" 
                type="textarea" 
                :rows="2"
                placeholder="可选：填写备注信息"
              />
            </el-form-item>
            <el-form-item>
              <el-button 
                type="success" 
                size="large" 
                style="width: 100%"
                @click="handleDeposit"
                :disabled="!depositForm.ruleId"
              >
                确认存入
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card class="transaction-card withdraw-card">
          <template #header>
            <div class="card-header">
              <el-icon size="24"><Remove /></el-icon>
              <span>提取积分</span>
              <span v-if="selectedAccountName" class="account-tag">{{ selectedAccountName }}</span>
            </div>
          </template>
          <el-form :model="withdrawForm" label-position="top">
            <el-form-item label="选择事项">
              <el-select v-model="withdrawForm.ruleId" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="rule in consumeRules"
                  :key="rule.id"
                  :label="rule.name"
                  :value="rule.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="想要时间（分钟）">
              <el-input-number 
                v-model="withdrawForm.timeAmount" 
                :min="1" 
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="需要扣除积分">
              <div class="preview-points">
                <el-icon size="32" color="#f56c6c"><Coin /></el-icon>
                <span class="points-value deduct">-{{ withdrawPoints }}</span>
              </div>
            </el-form-item>
            <el-form-item label="备注">
              <el-input 
                v-model="withdrawForm.description" 
                type="textarea" 
                :rows="2"
                placeholder="可选：填写备注信息"
              />
            </el-form-item>
            <el-form-item>
              <el-button 
                type="danger" 
                size="large" 
                style="width: 100%"
                @click="handleWithdraw"
                :disabled="!withdrawForm.ruleId"
                :loading="withdrawLoading"
              >
                确认提取
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="mt-20">
      <template #header>
        <div class="card-header">
          <span>兑换规则速查</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="12">
          <h4 class="rule-title">赚取规则</h4>
          <el-table :data="earnRules" border>
            <el-table-column prop="name" label="事项" />
            <el-table-column prop="timeUnit" label="时间单位" width="100">
              <template #default="{ row }">
                {{ row.timeUnit }}分钟
              </template>
            </el-table-column>
            <el-table-column prop="pointsPerUnit" label="获得积分" width="100" />
          </el-table>
        </el-col>
        <el-col :span="12">
          <h4 class="rule-title">消费规则</h4>
          <el-table :data="consumeRules" border>
            <el-table-column prop="name" label="事项" />
            <el-table-column prop="pointsPerUnit" label="消耗积分" width="100" />
            <el-table-column prop="timeUnit" label="获得时间" width="100">
              <template #default="{ row }">
                {{ row.timeUnit }}分钟
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const accountStore = useAccountStore()
const isMobile = ref(false)

// 家长相关
const isParent = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role === 'parent' || user.role === 'admin'
})

const childAccounts = ref([])
const selectedAccountId = ref(null)

const selectedAccountName = computed(() => {
  if (!isParent.value) return ''
  const account = childAccounts.value.find(a => a.id === selectedAccountId.value)
  return account ? account.name : ''
})

// 获取选中账户的余额（家长/管理员使用选中账户，宝宝使用自己的账户）
const targetBalance = computed(() => {
  if (isParent.value && selectedAccountId.value) {
    const account = childAccounts.value.find(a => a.id === selectedAccountId.value)
    return account ? account.balance : 0
  }
  return accountStore.currentBalance
})

const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
}

// 加载所有宝宝账户（家长/管理员用）
const loadChildAccounts = async () => {
  if (!isParent.value) return
  try {
    const res = await request.get('/account')
    // 管理员显示所有账户，家长只显示宝宝账户
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.role === 'admin') {
      childAccounts.value = res
    } else {
      childAccounts.value = res.filter(a => a.username !== 'dad' && a.username !== 'mom')
    }
    if (childAccounts.value.length > 0 && !selectedAccountId.value) {
      selectedAccountId.value = childAccounts.value[0].id
    }
  } catch (error) {
    console.error('加载账户失败', error)
  }
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

const depositForm = ref({
  ruleId: '',
  timeAmount: 30,
  description: ''
})

const withdrawForm = ref({
  ruleId: '',
  timeAmount: 30,
  description: ''
})

const withdrawLoading = ref(false)

const earnRules = computed(() => 
  accountStore.rules.filter(r => r.type === 'earn')
)
const consumeRules = computed(() => 
  accountStore.rules.filter(r => r.type === 'consume')
)

const depositPoints = computed(() => {
  const rule = earnRules.value.find(r => r.id === depositForm.value.ruleId)
  if (!rule) return 0
  return Math.floor(depositForm.value.timeAmount / rule.timeUnit * rule.pointsPerUnit)
})

const withdrawPoints = computed(() => {
  const rule = consumeRules.value.find(r => r.id === withdrawForm.value.ruleId)
  if (!rule) return 0
  return Math.ceil(withdrawForm.value.timeAmount / rule.timeUnit * rule.pointsPerUnit)
})

const handleDeposit = async () => {
  if (isParent.value && !selectedAccountId.value) {
    ElMessage.warning('请先选择宝宝账户')
    return
  }
  try {
    await accountStore.deposit({
      ruleId: depositForm.value.ruleId,
      timeAmount: depositForm.value.timeAmount,
      description: depositForm.value.description,
      accountId: isParent.value ? selectedAccountId.value : undefined
    })
    ElMessage.success(`存入成功！${selectedAccountName.value ? ' - ' + selectedAccountName.value : ''}`)
    depositForm.value = { ruleId: '', timeAmount: 30, description: '' }
    // 刷新余额
    await loadChildAccounts()
    await accountStore.fetchAccount()
  } catch (error) {
    ElMessage.error(error.message || '存入失败')
  }
}

const handleWithdraw = async () => {
  console.log('提取积分 - 开始', {
    isParent: isParent.value,
    selectedAccountId: selectedAccountId.value,
    targetBalance: targetBalance.value,
    withdrawPoints: withdrawPoints.value
  })
  
  if (isParent.value && !selectedAccountId.value) {
    ElMessage.warning('请先选择宝宝账户')
    return
  }
  // 检查积分是否足够（使用选中账户的余额）
  if (withdrawPoints.value > targetBalance.value) {
    ElMessage.warning(`积分不足，当前余额 ${targetBalance.value}，需要 ${withdrawPoints.value}`)
    return
  }
  withdrawLoading.value = true
  try {
    const params = {
      ruleId: withdrawForm.value.ruleId,
      timeAmount: withdrawForm.value.timeAmount,
      description: withdrawForm.value.description,
      accountId: isParent.value ? selectedAccountId.value : undefined
    }
    console.log('提取积分 - 请求参数:', params)
    
    await accountStore.withdraw(params)
    ElMessage.success(`提取成功！${selectedAccountName.value ? ' - ' + selectedAccountName.value : ''}`)
    withdrawForm.value = { ruleId: '', timeAmount: 30, description: '' }
    // 刷新余额
    await loadChildAccounts()
    await accountStore.fetchAccount()
  } catch (error) {
    console.error('提取积分 - 错误:', error)
    ElMessage.error(error.message || '提取失败')
  } finally {
    withdrawLoading.value = false
  }
}

onMounted(async () => {
  await accountStore.fetchRules()
  await accountStore.fetchAccount()
  await loadChildAccounts()
})
</script>

<style scoped>
.time-transaction {
  padding: 10px;
}

.transaction-card {
  min-height: 500px;
}

.mb-10 {
  margin-bottom: 10px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .time-transaction {
    padding: 5px;
  }
  
  .transaction-card {
    min-height: auto;
    margin-bottom: 10px;
  }
  
  .card-header {
    font-size: 16px;
  }
  
  .preview-points {
    padding: 10px;
  }
  
  .points-value {
    font-size: 24px;
  }
  
  :deep(.el-form-item__label) {
    font-size: 14px;
  }
}

.deposit-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.withdraw-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  color: white;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
}

.preview-points {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.points-value {
  font-size: 28px;
  font-weight: bold;
  color: #67c23a;
}

.points-value.deduct {
  color: #f56c6c;
}

.mt-20 {
  margin-top: 20px;
}

.rule-title {
  margin: 0 0 15px 0;
  color: #606266;
  font-size: 16px;
}

.account-selector {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.account-selector :deep(.el-card__header) {
  background: rgba(255,255,255,0.1);
  color: white;
}

.account-selector :deep(.el-card__body) {
  background: white;
}

.account-tag {
  margin-left: auto;
  background: rgba(255,255,255,0.3);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.mb-20 {
  margin-bottom: 20px;
}
</style>

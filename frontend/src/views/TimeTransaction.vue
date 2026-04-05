<template>
  <div class="time-transaction">
    <el-row :gutter="isMobile ? 10 : 20">
      <el-col :xs="24" :sm="12" class="mb-10">
        <el-card class="transaction-card deposit-card">
          <template #header>
            <div class="card-header">
              <el-icon size="24"><CirclePlus /></el-icon>
              <span>存入积分</span>
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
                :disabled="!withdrawForm.ruleId || withdrawPoints > accountStore.currentBalance"
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

const accountStore = useAccountStore()
const isMobile = ref(false)

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
  try {
    await accountStore.deposit({
      ruleId: depositForm.value.ruleId,
      timeAmount: depositForm.value.timeAmount,
      description: depositForm.value.description
    })
    ElMessage.success('存入成功！')
    depositForm.value = { ruleId: '', timeAmount: 30, description: '' }
  } catch (error) {
    ElMessage.error('存入失败')
  }
}

const handleWithdraw = async () => {
  try {
    await accountStore.withdraw({
      ruleId: withdrawForm.value.ruleId,
      timeAmount: withdrawForm.value.timeAmount,
      description: withdrawForm.value.description
    })
    ElMessage.success('提取成功！')
    withdrawForm.value = { ruleId: '', timeAmount: 30, description: '' }
  } catch (error) {
    ElMessage.error('提取失败')
  }
}

onMounted(async () => {
  await accountStore.fetchRules()
  await accountStore.fetchAccount()
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
</style>

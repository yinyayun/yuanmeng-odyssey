<template>
  <div class="time-records">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>存取明细</span>
          <div class="header-actions">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              size="small"
              :style="{ width: isMobile ? '220px' : '240px', marginRight: '10px' }"
            />
            <el-button type="primary" size="small" @click="handleSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="accountStore.transactions" stripe v-loading="loading">
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'deposit' ? 'success' : 'danger'" effect="dark">
              {{ row.type === 'deposit' ? '存入' : '提取' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="itemName" label="事项" width="150" />
        <el-table-column prop="timeAmount" label="时间" width="120">
          <template #default="{ row }">
            {{ row.timeAmount }} 分钟
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="120">
          <template #default="{ row }">
            <span :class="row.type === 'deposit' ? 'text-success' : 'text-danger'" class="points">
              {{ row.type === 'deposit' ? '+' : '-' }}{{ row.points }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="balance" label="余额" width="120">
          <template #default="{ row }">
            {{ row.balance }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="备注" show-overflow-tooltip />
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="8">
        <el-statistic title="总存入" :value="stats.totalDeposit">
          <template #suffix>积分</template>
        </el-statistic>
      </el-col>
      <el-col :span="8">
        <el-statistic title="总提取" :value="stats.totalWithdraw">
          <template #suffix>积分</template>
        </el-statistic>
      </el-col>
      <el-col :span="8">
        <el-statistic title="交易次数" :value="stats.totalCount">
          <template #suffix>笔</template>
        </el-statistic>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import dayjs from 'dayjs'

const accountStore = useAccountStore()
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  // 初始化默认最近一周的日期
  initDefaultDateRange()
  loadData()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 初始化默认日期范围（最近一周）
const initDefaultDateRange = () => {
  const end = dayjs()
  const start = dayjs().subtract(6, 'day')
  dateRange.value = [start.toDate(), end.toDate()]
}

const loading = ref(false)
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const stats = reactive({
  totalDeposit: 0,
  totalWithdraw: 0,
  totalCount: 0
})

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
    }
    await accountStore.fetchTransactions(params)
    
    // 计算统计
    const transactions = accountStore.transactions
    stats.totalDeposit = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.points, 0)
    stats.totalWithdraw = transactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.points, 0)
    stats.totalCount = transactions.length
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  loadData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.time-records {
  padding: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.header-actions {
  display: flex;
  align-items: center;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.points {
  font-size: 16px;
  font-weight: bold;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.mt-20 {
  margin-top: 20px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .time-records {
    padding: 5px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  :deep(.el-date-editor) {
    width: calc(100% - 50px) !important;
  }
}

:deep(.el-statistic__content) {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}
</style>

<template>
  <div class="rules-page">
    <el-row :gutter="isMobile ? 10 : 20">
      <el-col :xs="24" :sm="12" class="mb-10">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>赚取规则{{ isParent ? '配置' : '' }}</span>
              <el-button v-if="isParent" type="success" size="small" @click="openDialog('earn')">
                <el-icon><Plus /></el-icon> 添加规则
              </el-button>
            </div>
          </template>
          <el-table :data="earnRules" border>
            <el-table-column prop="name" label="事项名称" />
            <el-table-column prop="timeUnit" label="时间单位" width="100">
              <template #default="{ row }">
                {{ row.timeUnit }}分钟
              </template>
            </el-table-column>
            <el-table-column prop="pointsPerUnit" label="积分" width="100" />
            <el-table-column v-if="isParent" label="操作" width="120">
              <template #default="{ row }">
                <el-button type="danger" link @click="deleteRule(row.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>消费规则{{ isParent ? '配置' : '' }}</span>
              <el-button v-if="isParent" type="danger" size="small" @click="openDialog('consume')">
                <el-icon><Plus /></el-icon> 添加规则
              </el-button>
            </div>
          </template>
          <el-table :data="consumeRules" border>
            <el-table-column prop="name" label="事项名称" />
            <el-table-column prop="pointsPerUnit" label="消耗积分" width="100" />
            <el-table-column prop="timeUnit" label="获得时间" width="100">
              <template #default="{ row }">
                {{ row.timeUnit }}分钟
              </template>
            </el-table-column>
            <el-table-column v-if="isParent" label="操作" width="120">
              <template #default="{ row }">
                <el-button type="danger" link @click="deleteRule(row.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 只有家长能看到添加规则的对话框 -->
    <el-dialog
      v-if="isParent"
      v-model="dialogVisible"
      :title="dialogType === 'earn' ? '添加赚取规则' : '添加消费规则'"
      width="500px"
    >
      <el-form :model="ruleForm" label-width="100px">
        <el-form-item label="事项名称">
          <el-input v-model="ruleForm.name" placeholder="如：写作业、看电视" />
        </el-form-item>
        <el-form-item :label="dialogType === 'earn' ? '时间单位' : '消耗积分'">
          <el-input-number v-model="ruleForm.value1" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="dialogType === 'earn' ? '获得积分' : '获得时间'">
          <el-input-number v-model="ruleForm.value2" :min="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { ElMessage, ElMessageBox } from 'element-plus'

const accountStore = useAccountStore()
const isMobile = ref(false)

// 判断是否为家长
const isParent = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role === 'parent'
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
const dialogVisible = ref(false)
const dialogType = ref('earn')
const ruleForm = ref({
  name: '',
  value1: 10,
  value2: 5
})

const earnRules = computed(() => 
  accountStore.rules.filter(r => r.type === 'earn')
)
const consumeRules = computed(() => 
  accountStore.rules.filter(r => r.type === 'consume')
)

const openDialog = (type) => {
  dialogType.value = type
  ruleForm.value = { name: '', value1: 10, value2: type === 'earn' ? 5 : 10 }
  dialogVisible.value = true
}

const saveRule = async () => {
  if (!ruleForm.value.name) {
    ElMessage.warning('请输入事项名称')
    return
  }
  
  const rule = {
    type: dialogType.value,
    name: ruleForm.value.name,
    timeUnit: dialogType.value === 'earn' ? ruleForm.value.value1 : ruleForm.value.value2,
    pointsPerUnit: dialogType.value === 'earn' ? ruleForm.value.value2 : ruleForm.value.value1
  }
  
  try {
    await accountStore.saveRule(rule)
    ElMessage.success('添加成功')
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error('添加失败')
  }
}

const deleteRule = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这条规则吗？', '提示', {
      type: 'warning'
    })
    await accountStore.deleteRule(id)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(async () => {
  await accountStore.fetchRules()
})
</script>

<style scoped>
.rules-page {
  padding: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.mb-10 {
  margin-bottom: 10px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .rules-page {
    padding: 5px;
  }
  
  .card-header {
    font-size: 14px;
  }
  
  :deep(.el-table) {
    font-size: 12px;
  }
  
  :deep(.el-button--small) {
    padding: 6px 10px;
    font-size: 12px;
  }
}
</style>

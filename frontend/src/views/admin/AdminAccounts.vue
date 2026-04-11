<template>
  <div class="admin-accounts">
    <h2>💰 积分账户管理</h2>
    
    <el-card>
      <template #header>
        <div class="card-header">
          <span>账户列表（用户与积分账户绑定关系）</span>
          <div class="header-actions">
            <el-select v-model="selectedFamilyId" placeholder="筛选家庭" clearable style="width: 150px; margin-right: 10px">
              <el-option 
                v-for="family in families" 
                :key="family.id" 
                :label="family.name" 
                :value="family.id"
              />
            </el-select>
            <el-button type="primary" @click="handleAdd">新增账户</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="filteredAccounts" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="关联用户" width="150">
          <template #default="{ row }">
            <div class="user-info-cell" v-if="row.user_id">
              <el-avatar :size="32" :src="row.avatar || getDefaultAvatar(row.username)" />
              <span>{{ row.user_name || row.name }}</span>
              <el-tag size="small" :type="row.username === 'dad' || row.username === 'mom' ? 'danger' : 'success'">
                {{ row.username === 'dad' || row.username === 'mom' ? '家长' : '宝宝' }}
              </el-tag>
            </div>
            <span v-else class="no-user">未绑定用户</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="账户名称" />
        <el-table-column prop="balance" label="当前余额" width="120">
          <template #default="{ row }">
            <el-tag type="success" size="large">{{ row.balance }} 积分</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="450px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="选择用户" prop="userId" v-if="!isEdit">
          <el-select v-model="form.userId" placeholder="选择要绑定账户的用户" style="width: 100%">
            <el-option 
              v-for="user in unboundUsers" 
              :key="user.id" 
              :label="`${user.name} (${user.role === 'parent' ? '家长' : '宝宝'})`" 
              :value="user.id"
            >
              <div style="display: flex; align-items: center; gap: 8px">
                <el-avatar :size="24" :src="user.avatar || getDefaultAvatar(user.username)" />
                <span>{{ user.name }}</span>
                <el-tag size="small" :type="user.role === 'parent' ? 'danger' : 'success'">
                  {{ user.role === 'parent' ? '家长' : '宝宝' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="unboundUsers.length === 0" class="tip-text">
            所有用户都已绑定账户，请先<a @click="$router.push('/admin/users')">创建新用户</a>
          </div>
        </el-form-item>
        
        <el-form-item label="选择用户" prop="userId" v-if="isEdit">
          <el-select v-model="form.userId" placeholder="选择要绑定的用户" style="width: 100%">
            <el-option 
              v-for="user in availableUsersForEdit" 
              :key="user.id" 
              :label="`${user.name} (${user.role === 'parent' ? '家长' : '宝宝'})`" 
              :value="user.id"
            >
              <div style="display: flex; align-items: center; gap: 8px">
                <el-avatar :size="24" :src="user.avatar || getDefaultAvatar(user.username)" />
                <span>{{ user.name }}</span>
                <el-tag size="small" :type="user.role === 'parent' ? 'danger' : 'success'">
                  {{ user.role === 'parent' ? '家长' : '宝宝' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
          <div class="tip-text">当前绑定：{{ form.user_name || '未绑定' }}</div>
        </el-form-item>
        
        <el-form-item label="账户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入账户显示名称" />
        </el-form-item>
        
        <el-form-item label="余额" prop="balance">
          <el-input-number v-model="form.balance" :min="0" :step="10" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/date.js'
import request from '@/utils/request'

const accounts = ref([])
const users = ref([])
const families = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增账户')
const submitting = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const selectedFamilyId = ref(null)

const form = ref({
  id: null,
  userId: null,
  name: '',
  balance: 0
})

const rules = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  name: [{ required: true, message: '请输入账户名称', trigger: 'blur' }]
}

// 按家庭筛选的账户
const filteredAccounts = computed(() => {
  if (!selectedFamilyId.value) return accounts.value
  return accounts.value.filter(a => {
    const user = users.value.find(u => u.id === a.user_id)
    return user?.family_id === selectedFamilyId.value
  })
})

// 获取未绑定账户的用户（新增时用）
const unboundUsers = computed(() => {
  const boundUserIds = accounts.value.map(a => a.user_id).filter(Boolean)
  return users.value.filter(u => !boundUserIds.includes(u.id))
})

// 编辑时可用的用户（包含当前已绑定的用户 + 未绑定的用户）
const availableUsersForEdit = computed(() => {
  const currentUserId = form.value.user_id
  const boundUserIds = accounts.value
    .filter(a => a.user_id !== currentUserId) // 排除当前账户已绑定的用户ID
    .map(a => a.user_id)
    .filter(Boolean)
  return users.value.filter(u => !boundUserIds.includes(u.id))
})

const formatDateTime = (date) => {
  return formatDate(date, 'YYYY-MM-DD HH:mm')
}

const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
}

const loadAccounts = async () => {
  loading.value = true
  try {
    const data = await request.get('/account')
    accounts.value = data || []
  } catch (error) {
    ElMessage.error('加载账户失败')
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  try {
    const data = await request.get('/admin/users')
    users.value = data || []
  } catch (error) {
    console.error('加载用户失败', error)
  }
}

const loadFamilies = async () => {
  try {
    const data = await request.get('/admin/families')
    families.value = data || []
  } catch (error) {
    console.error('加载家庭失败', error)
  }
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增积分账户'
  form.value = { id: null, userId: null, name: '', balance: 0 }
  loadUsers() // 重新加载用户列表
  loadFamilies() // 加载家庭列表
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑积分账户'
  form.value = { 
    ...row,
    userId: row.user_id // 设置当前绑定的用户ID
  }
  loadUsers() // 加载用户列表
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除账户 "${row.name}" 吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/account/${row.id}`)
    ElMessage.success('删除成功')
    loadAccounts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    if (isEdit.value) {
      await request.put(`/account/${form.value.id}`, {
        name: form.value.name,
        balance: form.value.balance,
        userId: form.value.userId // 支持修改绑定用户
      })
      ElMessage.success('更新成功')
    } else {
      await request.post('/account', {
        userId: form.value.userId,
        name: form.value.name,
        balance: form.value.balance
      })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadAccounts()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadAccounts()
  loadFamilies()
})
</script>

<style scoped>
.admin-accounts h2 {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.user-info-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-user {
  color: #999;
  font-size: 12px;
}

.tip-text {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.tip-text a {
  color: #409eff;
  cursor: pointer;
}

.tip-text a:hover {
  text-decoration: underline;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .admin-accounts {
    padding: 5px;
  }
  
  .admin-accounts h2 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  :deep(.el-dialog) {
    width: 95% !important;
  }
}
</style>

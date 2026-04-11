<template>
  <div class="admin-families">
    <h2>🏠 家庭管理</h2>
    
    <el-card>
      <template #header>
        <div class="card-header">
          <span>家庭列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增家庭
          </el-button>
        </div>
      </template>
      
      <el-table :data="families" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="家庭名称" />
        <el-table-column prop="code" label="家庭编码" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="user_count" label="成员数" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="success">{{ row.user_count }} 人</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="150">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewUsers(row)">
              查看成员
            </el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
              :disabled="row.code === 'default'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="450px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="家庭名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入家庭名称" />
        </el-form-item>
        <el-form-item label="家庭编码" prop="code" v-if="!isEdit">
          <el-input v-model="form.code" placeholder="请输入家庭编码（唯一标识）" />
          <div class="form-tip">编码创建后不可修改，建议使用英文+数字</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 查看成员对话框 -->
    <el-dialog v-model="usersDialogVisible" :title="`${currentFamily?.name} - 家庭成员`" width="700px">
      <div class="dialog-toolbar">
        <el-button type="primary" size="small" @click="handleAddUser">
          <el-icon><Plus /></el-icon>
          添加成员
        </el-button>
      </div>
      <el-table :data="familyUsers" v-loading="usersLoading" stripe>
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :size="40" :src="row.avatar || getDefaultAvatar(row.username)" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'parent' ? 'danger' : 'success'">
              {{ row.role === 'parent' ? '👨‍👩‍👧 家长' : '👶 宝宝' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleCreateAccount(row)">
              创建账户
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    
    <!-- 添加成员对话框 -->
    <el-dialog v-model="userDialogVisible" title="添加家庭成员" width="450px">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入显示名称（如：爸爸、小明）" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="userForm.role">
            <el-radio label="parent">👨‍👩‍👧 家长</el-radio>
            <el-radio label="宝宝">👶 宝宝</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitUser" :loading="userSubmitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { formatDate as formatDateUtil } from '@/utils/date.js'
import request from '@/utils/request'

const loading = ref(false)
const families = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const form = reactive({
  id: null,
  name: '',
  code: ''
})

const rules = {
  name: [{ required: true, message: '请输入家庭名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入家庭编码', trigger: 'blur' }]
}

// 查看成员
const usersDialogVisible = ref(false)
const usersLoading = ref(false)
const familyUsers = ref([])
const currentFamily = ref(null)

// 添加成员
const userDialogVisible = ref(false)
const userFormRef = ref(null)
const userSubmitting = ref(false)
const userForm = reactive({
  username: '',
  password: '',
  name: '',
  role: '宝宝'
})
const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
}

const formatDate = (date) => {
  if (!date) return '-'
  return formatDateUtil(date, 'YYYY-MM-DD')
}

const loadFamilies = async () => {
  loading.value = true
  try {
    const data = await request.get('/admin/families')
    families.value = data || []
  } catch (error) {
    ElMessage.error('加载家庭列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增家庭'
  form.id = null
  form.name = ''
  form.code = ''
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑家庭'
  form.id = row.id
  form.name = row.name
  form.code = row.code
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    if (isEdit.value) {
      await request.put(`/admin/families/${form.id}`, { name: form.name })
      ElMessage.success('家庭更新成功')
    } else {
      await request.post('/admin/families', { name: form.name, code: form.code })
      ElMessage.success('家庭创建成功')
    }
    dialogVisible.value = false
    loadFamilies()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = (row) => {
  if (row.code === 'default') {
    ElMessage.warning('默认家庭不能删除')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除家庭 "${row.name}" 吗？此操作将同时删除该家庭的所有成员，不可恢复！`,
    '警告',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await request.delete(`/admin/families/${row.id}`)
      ElMessage.success('家庭删除成功')
      loadFamilies()
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  })
}

const handleViewUsers = async (row) => {
  currentFamily.value = row
  usersDialogVisible.value = true
  usersLoading.value = true
  try {
    const data = await request.get(`/admin/families/${row.id}/users`)
    familyUsers.value = data || []
  } catch (error) {
    ElMessage.error('加载成员列表失败')
  } finally {
    usersLoading.value = false
  }
}

// 添加成员
const handleAddUser = () => {
  userForm.username = ''
  userForm.password = ''
  userForm.name = ''
  userForm.role = '宝宝'
  userDialogVisible.value = true
}

const handleSubmitUser = async () => {
  const valid = await userFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  userSubmitting.value = true
  try {
    await request.post('/admin/users', {
      ...userForm,
      family_id: currentFamily.value.id
    })
    ElMessage.success('成员添加成功')
    userDialogVisible.value = false
    // 刷新成员列表
    handleViewUsers(currentFamily.value)
    // 刷新家庭列表（更新人数）
    loadFamilies()
  } catch (error) {
    ElMessage.error(error.message || '添加失败')
  } finally {
    userSubmitting.value = false
  }
}

// 创建账户
const handleCreateAccount = async (user) => {
  try {
    await request.post('/account', {
      userId: user.id,
      name: user.name,
      balance: 0
    })
    ElMessage.success(`已为 ${user.name} 创建积分账户`)
  } catch (error) {
    if (error.message?.includes('已存在')) {
      ElMessage.warning(`${user.name} 已有积分账户`)
    } else {
      ElMessage.error(error.message || '创建账户失败')
    }
  }
}

onMounted(() => {
  loadFamilies()
})
</script>

<style scoped>
.admin-families h2 {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-toolbar {
  margin-bottom: 15px;
  display: flex;
  justify-content: flex-end;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .admin-families {
    padding: 5px;
  }
  
  .admin-families h2 {
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

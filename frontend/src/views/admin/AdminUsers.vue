<template>
  <div class="admin-users">
    <h2>👥 用户管理</h2>
    
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-button type="primary" @click="handleAdd">新增用户</el-button>
        </div>
      </template>
      
      <el-table :data="users" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
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
        <el-table-column prop="created_at" label="创建时间">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
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
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="头像">
          <div class="avatar-selector">
            <el-avatar 
              v-for="(avatar, index) in avatarOptions" 
              :key="index"
              :size="50" 
              :src="avatar"
              :class="{ selected: form.avatar === avatar }"
              @click="form.avatar = avatar"
            />
          </div>
        </el-form-item>
        
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入显示名称" />
        </el-form-item>
        
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio label="parent">👨‍👩‍👧 家长</el-radio>
            <el-radio label="宝宝">👶 宝宝</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="密码" prop="password" :required="!isEdit">
          <el-input 
            v-model="form.password" 
            type="password" 
            :placeholder="isEdit ? '不修改请留空' : '请输入密码'"
            show-password
          />
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import request from '@/utils/request'

const users = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const submitting = ref(false)
const formRef = ref(null)
const isEdit = ref(false)

const form = ref({
  id: null,
  username: '',
  name: '',
  role: '宝宝',
  password: '',
  avatar: ''
})

// 预设头像选项 - 包含更多可爱女孩头像
const avatarOptions = [
  // 家长头像
  'https://api.dicebear.com/7.x/avataaars/svg?seed=dad&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=mom&backgroundColor=ffdfbf',
  // 男孩头像
  'https://api.dicebear.com/7.x/avataaars/svg?seed=boy1&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=boy2&backgroundColor=d1d4f9',
  // 可爱女孩头像（多种风格）
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess1&backgroundColor=ffdfbf&hairColor=ff6b6b&skinColor=f8d25c',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess2&backgroundColor=ffd1dc&hairColor=ff9ff3&skinColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess3&backgroundColor=e0c3fc&hairColor=c44569&skinColor=f8d25c',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess4&backgroundColor=ffecd2&hairColor=ff6b9d&skinColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess5&backgroundColor=f8b500&hairColor=6c5ce7&skinColor=f8d25c',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess6&backgroundColor=a8edea&hairColor=ff6b6b&skinColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess7&backgroundColor=fcd1d1&hairColor=e17055&skinColor=f8d25c',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=princess8&backgroundColor=dfe6e9&hairColor=fd79a8&skinColor=ffdfbf',
  // 小宝宝头像
  'https://api.dicebear.com/7.x/avataaars/svg?seed=baby1&backgroundColor=fff5b7&hairColor=ff9f43',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=baby2&backgroundColor=ffcccc&hairColor=ee5a6f',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=baby3&backgroundColor=c7ecee&hairColor=22a6b3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=baby4&backgroundColor=f9ca24&hairColor=f0932b'
]

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ 
    validator: (rule, value, callback) => {
      if (!isEdit.value && !value) {
        callback(new Error('请输入密码'))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  }]
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
}

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/users')
    users.value = res
  } catch (error) {
    ElMessage.error('加载用户失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增用户'
  form.value = { 
    id: null, 
    username: '', 
    name: '', 
    role: '宝宝', 
    password: '',
    avatar: avatarOptions[6]
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑用户'
  form.value = { 
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    password: '',
    avatar: row.avatar || getDefaultAvatar(row.username)
  }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${row.name}" 吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/admin/users/${row.id}`)
    ElMessage.success('删除成功')
    loadUsers()
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
      const data = {
        name: form.value.name,
        role: form.value.role,
        avatar: form.value.avatar
      }
      if (form.value.password) {
        data.password = form.value.password
      }
      await request.put(`/admin/users/${form.value.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await request.post('/admin/users', form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadUsers()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-users h2 {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.avatar-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.avatar-selector .el-avatar {
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.avatar-selector .el-avatar:hover {
  transform: scale(1.1);
}

.avatar-selector .el-avatar.selected {
  border-color: #409eff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.5);
}
</style>

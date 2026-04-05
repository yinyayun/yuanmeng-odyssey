<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <span>🔐 欢迎来到元梦大陆</span>
        </div>
      </template>
      
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-select v-model="form.username" placeholder="选择用户" style="width: 100%" :loading="loadingUsers">
            <el-option 
              v-for="user in users" 
              :key="user.username" 
              :label="`${getRoleEmoji(user.role)} ${user.name}`" 
              :value="user.username"
            >
              <div style="display: flex; align-items: center; gap: 8px">
                <el-avatar :size="28" :src="user.avatar || getDefaultAvatar(user.username)" />
                <span>{{ user.name }}</span>
                <el-tag size="small" :type="user.role === 'parent' ? 'danger' : 'success'">
                  {{ user.role === 'parent' ? '家长' : '宝宝' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-tips">
        <p>👨 爸爸 / 👩 妈妈：管理权限</p>
        <p>👶 宝宝：查看和积分存取</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const loadingUsers = ref(false)
const users = ref([])

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请选择用户', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 获取角色表情
const getRoleEmoji = (role) => {
  return role === 'parent' ? '👨‍👩‍👧' : '👶'
}

// 获取默认头像
const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
}

// 加载用户列表（公开接口，不需要认证）
const loadUsers = async () => {
  loadingUsers.value = true
  try {
    // 使用 axios 直接请求，不经过 request 拦截器
    const res = await axios.get('/api/admin/users-public')
    users.value = res.data.data || []
  } catch (error) {
    console.error('加载用户失败', error)
    // 如果接口不存在，使用默认用户
    users.value = [
      { username: 'dad', name: '爸爸', role: 'parent' },
      { username: 'mom', name: '妈妈', role: 'parent' },
      { username: 'yuanxiao', name: '元宵', role: '宝宝' }
    ]
  } finally {
    loadingUsers.value = false
  }
}

onMounted(() => {
  loadUsers()
})

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  try {
    const res = await axios.post('/api/admin/login', form)
    const data = res.data.data
    
    if (res.data.code !== 200) {
      throw new Error(res.data.message || '登录失败')
    }
    
    localStorage.setItem('user', JSON.stringify(data))
    ElMessage.success(`欢迎，${data.name}！`)
    
    // 所有用户都进入主页面
    router.push('/')
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
}

.card-header {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
}

.login-tips {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  text-align: center;
  color: #666;
  font-size: 13px;
}

.login-tips p {
  margin: 8px 0;
}
</style>

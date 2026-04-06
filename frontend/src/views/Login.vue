<template>
  <div class="login-page">
    <!-- 彩虹背景层 -->
    <div class="rainbow-bg"></div>
    
    <!-- 太阳 -->
    <div class="sun">☀️</div>
    
    <!-- 彩虹 -->
    <div class="rainbow">
      <div class="rainbow-arc red"></div>
      <div class="rainbow-arc orange"></div>
      <div class="rainbow-arc yellow"></div>
      <div class="rainbow-arc green"></div>
      <div class="rainbow-arc blue"></div>
      <div class="rainbow-arc purple"></div>
    </div>
    
    <!-- 漂浮云朵 -->
    <div class="cloud cloud-1">☁️</div>
    <div class="cloud cloud-2">☁️</div>
    <div class="cloud cloud-3">☁️</div>
    <div class="cloud cloud-4">☁️</div>
    <div class="cloud cloud-5">☁️</div>
    
    <!-- 可爱元素 -->
    <div class="cute-elements">
      <div class="element star">⭐</div>
      <div class="element heart">💖</div>
      <div class="element balloon">🎈</div>
      <div class="element butterfly">🦋</div>
      <div class="element flower">🌸</div>
    </div>
    
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <div class="logo-icon">🏰</div>
          <h1 class="title">元梦大陆</h1>
          <p class="subtitle">开启你的奇幻成长之旅</p>
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
        <div class="role-badges">
          <span class="role-badge parent">👨‍👩‍👧 家长</span>
          <span class="role-badge child">👶 宝宝</span>
        </div>
        <p class="tips-text">选择你的角色，开启冒险</p>
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
  background: linear-gradient(180deg, 
    #87CEEB 0%,     /* 天蓝 */
    #98D8E8 15%,    /* 浅蓝 */
    #B8E6F0 30%,    /* 更浅蓝 */
    #F0E68C 45%,    /* 浅黄 */
    #FFE4B5 55%,    /* 桃色 */
    #FFB6C1 70%,    /* 浅粉 */
    #DDA0DD 85%,    /* 梅红 */
    #E6E6FA 100%    /* 淡紫 */
  );
  position: relative;
  overflow: hidden;
}

/* 彩虹背景层 */
.rainbow-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 50%);
  pointer-events: none;
}

/* 太阳 */
.sun {
  position: absolute;
  top: 5%;
  right: 10%;
  font-size: 60px;
  animation: sunPulse 3s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(255, 200, 0, 0.6));
}

@keyframes sunPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 彩虹 */
.rainbow {
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 300px;
  opacity: 0.4;
  pointer-events: none;
}

.rainbow-arc {
  position: absolute;
  border-radius: 50% 50% 0 0;
  left: 50%;
  transform: translateX(-50%);
}

.rainbow-arc.red { width: 600px; height: 300px; border: 15px solid #ff6b6b; border-bottom: none; bottom: 0; }
.rainbow-arc.orange { width: 570px; height: 285px; border: 15px solid #ffa502; border-bottom: none; bottom: 0; }
.rainbow-arc.yellow { width: 540px; height: 270px; border: 15px solid #ffeaa7; border-bottom: none; bottom: 0; }
.rainbow-arc.green { width: 510px; height: 255px; border: 15px solid #55efc4; border-bottom: none; bottom: 0; }
.rainbow-arc.blue { width: 480px; height: 240px; border: 15px solid #74b9ff; border-bottom: none; bottom: 0; }
.rainbow-arc.purple { width: 450px; height: 225px; border: 15px solid #a29bfe; border-bottom: none; bottom: 0; }

/* 云朵 */
.cloud {
  position: absolute;
  font-size: 80px;
  opacity: 0.9;
  animation: cloudFloat 20s linear infinite;
  filter: drop-shadow(0 5px 10px rgba(0,0,0,0.1));
}

.cloud-1 { top: 8%; left: -10%; animation-duration: 25s; font-size: 100px; }
.cloud-2 { top: 15%; right: -5%; animation-duration: 30s; animation-delay: -5s; font-size: 80px; }
.cloud-3 { top: 65%; left: -8%; animation-duration: 35s; animation-delay: -10s; font-size: 90px; }
.cloud-4 { top: 75%; right: -10%; animation-duration: 28s; animation-delay: -15s; font-size: 70px; }
.cloud-5 { top: 85%; left: 20%; animation-duration: 32s; animation-delay: -8s; font-size: 60px; }

@keyframes cloudFloat {
  from { transform: translateX(0); }
  to { transform: translateX(calc(100vw + 200px)); }
}

/* 可爱元素 */
.cute-elements {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.cute-elements .element {
  position: absolute;
  font-size: 28px;
  animation: cuteFloat 8s ease-in-out infinite;
}

.cute-elements .star { top: 25%; left: 15%; animation-delay: 0s; }
.cute-elements .heart { top: 35%; right: 12%; animation-delay: 1.5s; font-size: 32px; }
.cute-elements .balloon { top: 55%; left: 8%; animation-delay: 3s; }
.cute-elements .butterfly { top: 70%; right: 18%; animation-delay: 4.5s; }
.cute-elements .flower { top: 45%; left: 5%; animation-delay: 6s; }

@keyframes cuteFloat {
  0%, 100% { 
    transform: translateY(0) rotate(0deg) scale(1); 
    opacity: 0.7;
  }
  50% { 
    transform: translateY(-25px) rotate(15deg) scale(1.1); 
    opacity: 1;
  }
}

/* 登录卡片 */
.login-card {
  width: 420px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.15), 
    0 0 0 4px rgba(255, 255, 255, 0.5),
    inset 0 0 20px rgba(255, 255, 255, 0.5);
  border: none;
  position: relative;
  z-index: 10;
  animation: cardAppear 0.6s ease-out;
  overflow: hidden;
}

.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, 
    #ff6b6b, #ffa502, #ffeaa7, #55efc4, #74b9ff, #a29bfe
  );
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-header {
  text-align: center;
  padding: 10px 0;
}

.logo-icon {
  font-size: 56px;
  margin-bottom: 10px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.title {
  font-size: 32px;
  font-weight: bold;
  background: linear-gradient(135deg, #ff6b6b 0%, #ffa502 25%, #55efc4 50%, #74b9ff 75%, #a29bfe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #888;
  margin: 0;
}

/* 登录提示 */
.login-tips {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  text-align: center;
}

.role-badges {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.role-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.role-badge.parent {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: #8b4513;
}

.role-badge.child {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #4a5568;
}

.tips-text {
  color: #999;
  font-size: 12px;
  margin: 0;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .login-card {
    width: 90%;
    max-width: 360px;
    margin: 20px;
  }
  
  .title {
    font-size: 26px;
  }
  
  .logo-icon {
    font-size: 48px;
  }
  
  .rainbow {
    width: 400px;
    height: 200px;
    opacity: 0.3;
  }
  
  .rainbow-arc.red { width: 400px; height: 200px; border-width: 10px; }
  .rainbow-arc.orange { width: 380px; height: 190px; border-width: 10px; }
  .rainbow-arc.yellow { width: 360px; height: 180px; border-width: 10px; }
  .rainbow-arc.green { width: 340px; height: 170px; border-width: 10px; }
  .rainbow-arc.blue { width: 320px; height: 160px; border-width: 10px; }
  .rainbow-arc.purple { width: 300px; height: 150px; border-width: 10px; }
  
  .sun {
    font-size: 40px;
  }
  
  .cloud {
    font-size: 50px;
  }
  
  .cute-elements {
    display: none;
  }
}
</style>

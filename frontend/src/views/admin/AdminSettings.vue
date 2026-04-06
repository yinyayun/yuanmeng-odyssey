<template>
  <div class="admin-settings">
    <h2>⚙️ 系统设置</h2>
    
    <!-- 文件夹路径设置 -->
    <el-card>
      <template #header>
        <span>📁 内容文件夹路径设置</span>
      </template>
      
      <el-form :model="pathForm" ref="pathRef" label-width="150px">
        <el-form-item label="智慧树洞路径">
          <el-input 
            v-model="pathForm.growthPlansDir" 
            placeholder="请输入智慧树洞内容文件夹路径"
          >
            <template #prefix>
              <el-icon><Folder /></el-icon>
            </template>
          </el-input>
          <div class="form-tip">存放成长计划 HTML 文件的目录</div>
        </el-form-item>
        
        <el-form-item label="数能充电站路径">
          <el-input 
            v-model="pathForm.mathPapersDir" 
            placeholder="请输入数能充电站内容文件夹路径"
          >
            <template #prefix>
              <el-icon><Folder /></el-icon>
            </template>
          </el-input>
          <div class="form-tip">存放数学试卷 PDF/Word 文件的目录</div>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSavePaths" :loading="pathLoading">
            保存路径设置
          </el-button>
          <el-button @click="handleTestPaths">测试路径</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card style="margin-top: 20px">
      <template #header>
        <span>修改管理员密码</span>
      </template>
      
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordRef" label-width="120px">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input 
            v-model="passwordForm.oldPassword" 
            type="password" 
            placeholder="请输入旧密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="passwordForm.newPassword" 
            type="password" 
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input 
            v-model="passwordForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleChangePassword" :loading="passwordLoading">
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card style="margin-top: 20px">
      <template #header>
        <span>系统信息</span>
      </template>
      
      <el-descriptions :column="2" border>
        <el-descriptions-item label="系统名称">元梦大陆</el-descriptions-item>
        <el-descriptions-item label="版本号">v1.0.1</el-descriptions-item>
        <el-descriptions-item label="后端端口">3001</el-descriptions-item>
        <el-descriptions-item label="数据库">SQLite</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

// 路径设置
const pathRef = ref(null)
const pathLoading = ref(false)

const pathForm = ref({
  growthPlansDir: '',
  mathPapersDir: ''
})

// 加载设置
const loadSettings = async () => {
  try {
    const data = await request.get('/settings')
    pathForm.value.growthPlansDir = data?.['growth-plans-dir'] || ''
    pathForm.value.mathPapersDir = data?.['math-papers-dir'] || ''
  } catch (error) {
    console.error('加载设置失败', error)
  }
}

const handleSavePaths = async () => {
  pathLoading.value = true
  try {
    await request.post('/settings/batch', {
      'growth-plans-dir': pathForm.value.growthPlansDir,
      'math-papers-dir': pathForm.value.mathPapersDir
    })
    ElMessage.success('路径设置保存成功')
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    pathLoading.value = false
  }
}

const handleTestPaths = async () => {
  try {
    await request.post('/settings/test-paths', {
      'growth-plans-dir': pathForm.value.growthPlansDir,
      'math-papers-dir': pathForm.value.mathPapersDir
    })
    ElMessage.success('路径测试通过')
  } catch (error) {
    ElMessage.error(error.message || '路径测试失败')
  }
}

// 密码设置
const passwordRef = ref(null)
const passwordLoading = ref(false)

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

onMounted(() => {
  loadSettings()
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleChangePassword = async () => {
  const valid = await passwordRef.value.validate().catch(() => false)
  if (!valid) return
  
  passwordLoading.value = true
  try {
    await request.post('/admin/change-password', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    ElMessage.success('密码修改成功')
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error) {
    ElMessage.error(error.message || '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style scoped>
.admin-settings h2 {
  margin-bottom: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .admin-settings {
    padding: 5px;
  }
  
  .admin-settings h2 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  
  :deep(.el-form-item__label) {
    float: none;
    display: block;
    text-align: left;
    margin-bottom: 5px;
  }
  
  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>

<template>
  <div class="admin-backup">
    <h2>💾 数据备份</h2>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>本地备份</span>
          </template>
          <div class="backup-content">
            <p>将数据库备份到服务器本地目录</p>
            <p class="backup-path">备份路径：/opt/yuanmeng-odyssey/backups/</p>
            <el-button type="primary" @click="handleLocalBackup" :loading="localLoading">
              <el-icon><Download /></el-icon>
              立即备份
            </el-button>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>GitHub 同步</span>
          </template>
          <div class="backup-content">
            <p>将数据库同步到 GitHub 仓库</p>
            <p class="backup-path">需要配置 GitHub 仓库权限</p>
            <el-button type="success" @click="handleGitSync" :loading="gitLoading">
              <el-icon><Upload /></el-icon>
              同步到 GitHub
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-card class="backup-list" v-if="backups.length > 0">
      <template #header>
        <span>备份历史</span>
      </template>
      <el-table :data="backups">
        <el-table-column prop="filename" label="文件名" />
        <el-table-column prop="size" label="大小" />
        <el-table-column prop="createdAt" label="备份时间">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleDownload(row)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import request from '@/utils/request'

const localLoading = ref(false)
const gitLoading = ref(false)
const backups = ref([])

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const handleLocalBackup = async () => {
  localLoading.value = true
  try {
    const res = await request.post('/backup/local')
    if (res.code === 200) {
      ElMessage.success('本地备份成功')
      backups.value.unshift(res.data)
    }
  } catch (error) {
    ElMessage.error(error.message || '备份失败')
  } finally {
    localLoading.value = false
  }
}

const handleGitSync = async () => {
  gitLoading.value = true
  try {
    const res = await request.post('/backup/git-sync')
    if (res.code === 200) {
      ElMessage.success('GitHub 同步成功')
    }
  } catch (error) {
    ElMessage.error(error.message || '同步失败')
  } finally {
    gitLoading.value = false
  }
}

const handleDownload = (row) => {
  window.open(`/api/backup/download/${row.filename}`, '_blank')
}
</script>

<style scoped>
.admin-backup h2 {
  margin-bottom: 20px;
}

.backup-content {
  text-align: center;
  padding: 20px;
}

.backup-content p {
  margin-bottom: 10px;
  color: #666;
}

.backup-path {
  font-size: 12px;
  color: #999;
}

.backup-list {
  margin-top: 20px;
}
</style>

<template>
  <div class="math-station">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数能充电站</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索..."
            :style="{ width: isMobile ? '140px' : '200px' }"
            size="small"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <!-- 移动端：文件选择器 -->
      <div v-if="isMobile" class="mobile-file-select">
        <el-cascader
          v-model="selectedPath"
          :options="cascaderOptions"
          :props="{ label: 'name', value: 'path', children: 'children', checkStrictly: true }"
          placeholder="选择试卷"
          style="width: 100%"
          @change="handleCascaderChange"
        />
      </div>

      <el-row :gutter="isMobile ? 10 : 20">
        <el-col :xs="24" :sm="6" class="pc-only">
          <div class="file-tree">
            <el-tree
              :data="fileTree"
              :props="{ label: 'name', children: 'children' }"
              @node-click="handleNodeClick"
              highlight-current
              default-expand-all
            >
              <template #default="{ node, data }">
                <span class="tree-node">
                  <el-icon v-if="data.type === 'dir'" color="#409eff"><Folder /></el-icon>
                  <el-icon v-else-if="isPdf(data.name)" color="#f56c6c"><Document /></el-icon>
                  <el-icon v-else-if="isWord(data.name)" color="#409eff"><Document /></el-icon>
                  <el-icon v-else color="#909399"><Document /></el-icon>
                  <span class="node-label">{{ node.label }}</span>
                </span>
              </template>
            </el-tree>
          </div>
        </el-col>
        <el-col :xs="24" :sm="18">
          <div class="file-preview" v-if="currentFile">
            <div class="file-info">
              <div class="file-title">
                <el-icon size="24" color="#f56c6c" v-if="isPdf(currentFile.name)"><Document /></el-icon>
                <el-icon size="24" color="#409eff" v-else-if="isWord(currentFile.name)"><Document /></el-icon>
                <h3>{{ currentFile.name }}</h3>
              </div>
              <div class="file-actions">
                <el-button type="primary" @click="previewFile" v-if="isPdf(currentFile.name)">
                  <el-icon><View /></el-icon> 预览
                </el-button>
                <el-button type="success" @click="downloadFile">
                  <el-icon><Download /></el-icon> 下载
                </el-button>
              </div>
            </div>
            <div class="file-meta">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="文件类型">{{ getFileType(currentFile.name) }}</el-descriptions-item>
                <el-descriptions-item label="文件大小">{{ currentFile.size || '-' }}</el-descriptions-item>
                <el-descriptions-item label="修改时间">{{ currentFile.mtime || '-' }}</el-descriptions-item>
                <el-descriptions-item label="文件路径">{{ currentFile.path }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
          <el-empty v-else description="请选择文件" />
        </el-col>
      </el-row>
    </el-card>

    <el-dialog
      v-model="previewVisible"
      :title="currentFile?.name"
      width="90%"
      top="5vh"
      destroy-on-close
    >
      <iframe 
        v-if="previewUrl" 
        :src="previewUrl" 
        style="width: 100%; height: 70vh; border: none;"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const fileTree = ref([])
const currentFile = ref(null)
const searchKeyword = ref('')
const previewVisible = ref(false)
const previewUrl = ref('')
const isMobile = ref(false)
const selectedPath = ref([])

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 将文件树转换为级联选择器选项
const cascaderOptions = computed(() => {
  const convert = (items) => {
    return items.map(item => ({
      ...item,
      disabled: item.type === 'dir',
      children: item.children ? convert(item.children) : undefined
    }))
  }
  return convert(fileTree.value)
})

const handleCascaderChange = (value) => {
  const path = value[value.length - 1]
  const findFile = (items) => {
    for (const item of items) {
      if (item.path === path) return item
      if (item.children) {
        const found = findFile(item.children)
        if (found) return found
      }
    }
    return null
  }
  const file = findFile(fileTree.value)
  if (file && file.type === 'file') {
    handleNodeClick(file)
  }
}

const isPdf = (filename) => filename.toLowerCase().endsWith('.pdf')
const isWord = (filename) => {
  const ext = filename.toLowerCase()
  return ext.endsWith('.doc') || ext.endsWith('.docx')
}
const getFileType = (filename) => {
  if (isPdf(filename)) return 'PDF 文档'
  if (isWord(filename)) return 'Word 文档'
  return '其他文件'
}

const loadFileTree = async () => {
  try {
    const data = await request.get('/files/math-papers')
    fileTree.value = data
  } catch (error) {
    console.error('加载文件树失败', error)
  }
}

const handleNodeClick = (data) => {
  if (data.type === 'file') {
    currentFile.value = data
  }
}

const previewFile = () => {
  if (!currentFile.value) return
  previewUrl.value = `/api/files/download?path=${encodeURIComponent(currentFile.value.path)}`
  previewVisible.value = true
}

const downloadFile = () => {
  if (!currentFile.value) return
  const url = `/api/files/download?path=${encodeURIComponent(currentFile.value.path)}&download=true`
  window.open(url, '_blank')
  ElMessage.success('开始下载')
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadFileTree()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.math-station {
  padding: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.file-tree {
  border-right: 1px solid #ebeef5;
  padding-right: 15px;
  min-height: 500px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-label {
  margin-left: 4px;
}

.file-preview {
  padding: 20px;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.file-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-title h3 {
  margin: 0;
  color: #303133;
}

.file-actions {
  display: flex;
  gap: 10px;
}

.file-meta {
  margin-top: 20px;
}

.mobile-file-select {
  margin-bottom: 15px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .math-station {
    padding: 5px;
  }
  
  .card-header span {
    font-size: 16px;
  }
  
  .file-preview {
    padding: 10px;
  }
  
  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .file-title h3 {
    font-size: 16px;
  }
  
  .file-actions {
    width: 100%;
  }
  
  .file-actions .el-button {
    flex: 1;
  }
}

@media screen and (min-width: 769px) {
  .pc-only {
    display: block;
  }
  
  .mobile-file-select {
    display: none;
  }
}
</style>

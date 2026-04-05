<template>
  <div class="wisdom-tree">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>智慧树洞</span>
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
          placeholder="选择文件"
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
                  <el-icon v-else color="#67c23a"><Document /></el-icon>
                  <span class="node-label">{{ node.label }}</span>
                </span>
              </template>
            </el-tree>
          </div>
        </el-col>
        <el-col :xs="24" :sm="18">
          <div class="content-preview" v-if="currentFile">
            <div class="file-info">
              <h3>{{ currentFile.name }}</h3>
              <el-button type="primary" size="small" @click="openFullscreen">
                <el-icon><FullScreen /></el-icon> 全屏查看
              </el-button>
            </div>
            <div class="html-content" v-html="fileContent"></div>
          </div>
          <el-empty v-else description="请选择文件查看内容" />
        </el-col>
      </el-row>
    </el-card>

    <el-dialog
      v-model="fullscreenVisible"
      :title="currentFile?.name"
      width="90%"
      top="5vh"
      destroy-on-close
    >
      <div class="fullscreen-content" v-html="fileContent"></div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import request from '@/utils/request'

const fileTree = ref([])
const currentFile = ref(null)
const fileContent = ref('')
const searchKeyword = ref('')
const fullscreenVisible = ref(false)
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

const loadFileTree = async () => {
  try {
    const data = await request.get('/files/growth-plans')
    fileTree.value = data
  } catch (error) {
    console.error('加载文件树失败', error)
  }
}

const handleNodeClick = async (data) => {
  if (data.type === 'file') {
    currentFile.value = data
    try {
      const content = await request.get(`/files/content?path=${encodeURIComponent(data.path)}`)
      fileContent.value = content
    } catch (error) {
      fileContent.value = '<p style="color: red">加载失败</p>'
    }
  }
}

const openFullscreen = () => {
  fullscreenVisible.value = true
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
.wisdom-tree {
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

.content-preview {
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

.file-info h3 {
  margin: 0;
  color: #303133;
}

.html-content {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  min-height: 400px;
  overflow: auto;
}

.fullscreen-content {
  min-height: 70vh;
  padding: 20px;
  background: #fff;
}

.mobile-file-select {
  margin-bottom: 15px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .wisdom-tree {
    padding: 5px;
  }
  
  .card-header span {
    font-size: 16px;
  }
  
  .content-preview {
    padding: 10px;
  }
  
  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .file-info h3 {
    font-size: 16px;
  }
  
  .html-content {
    padding: 10px;
    min-height: 300px;
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

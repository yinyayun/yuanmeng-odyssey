<template>
  <div class="wisdom-tree">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>智慧树洞</span>
          <div class="header-actions">
            <el-button 
              v-if="currentFile && isMobile" 
              type="primary" 
              size="small" 
              @click="exportPdf"
              :loading="pdfLoading"
            >
              <el-icon><Document /></el-icon> 导出PDF
            </el-button>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索..."
              :style="{ width: isMobile ? '120px' : '200px' }"
              size="small"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
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
            <div class="html-content" v-html="renderedContent"></div>
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
      <div class="fullscreen-content" v-html="renderedContent"></div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import request from '@/utils/request'
import MarkdownIt from 'markdown-it'
import { isMarkdown } from '@/utils/fileTypes'
import { Search, FullScreen, Folder, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const fileTree = ref([])
const currentFile = ref(null)
const fileContent = ref('')
const searchKeyword = ref('')
const fullscreenVisible = ref(false)
const isMobile = ref(false)
const selectedPath = ref([])
const pdfLoading = ref(false)

// 初始化 Markdown 渲染器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 渲染内容（HTML 直接显示，Markdown 需要转换）
const renderedContent = computed(() => {
  if (!fileContent.value) return ''
  if (currentFile.value && isMarkdown(currentFile.value.name)) {
    return md.render(fileContent.value)
  }
  return fileContent.value
})

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

// 导出PDF功能（支持移动端）
const exportPdf = async () => {
  if (!currentFile.value) return
  
  pdfLoading.value = true
  try {
    const element = document.querySelector('.html-content')
    if (!element) {
      ElMessage.warning('未找到内容区域')
      return
    }
    
    // 动态导入，减少首屏加载体积
    const html2pdf = (await import('html2pdf.js')).default
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${currentFile.value.name.replace(/\.[^/.]+$/, '')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    }
    
    await html2pdf().set(opt).from(element).save()
    ElMessage.success('PDF导出成功')
  } catch (error) {
    console.error('PDF导出失败', error)
    ElMessage.error('PDF导出失败，请重试')
  } finally {
    pdfLoading.value = false
  }
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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
  line-height: 1.8;
  font-size: 16px;
}

/* 优化 HTML 内容展示 */
.html-content :deep(*) {
  max-width: 100%;
}

.html-content :deep(p) {
  margin: 12px 0;
  line-height: 1.8;
}

.html-content :deep(h1),
.html-content :deep(h2),
.html-content :deep(h3),
.html-content :deep(h4),
.html-content :deep(h5),
.html-content :deep(h6) {
  margin: 20px 0 12px 0;
  line-height: 1.4;
  font-weight: 600;
}

.html-content :deep(ul),
.html-content :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.html-content :deep(li) {
  margin: 8px 0;
  line-height: 1.6;
}

.html-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.html-content :deep(th),
.html-content :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 12px;
  text-align: left;
}

.html-content :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.html-content :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 20px;
  border-left: 4px solid #409eff;
  background: #f5f7fa;
  color: #606266;
}

.html-content :deep(pre) {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 16px 0;
}

.html-content :deep(code) {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.html-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 12px 0;
}

.fullscreen-content {
  min-height: 70vh;
  padding: 30px;
  background: #fff;
  line-height: 1.8;
  font-size: 16px;
}

/* 全屏模式下的内容样式 */
.fullscreen-content :deep(*) {
  max-width: 100%;
}

.fullscreen-content :deep(p) {
  margin: 14px 0;
  line-height: 1.9;
  font-size: 16px;
}

.fullscreen-content :deep(h1) {
  font-size: 28px;
  margin: 24px 0 16px 0;
}

.fullscreen-content :deep(h2) {
  font-size: 24px;
  margin: 22px 0 14px 0;
}

.fullscreen-content :deep(h3) {
  font-size: 20px;
  margin: 20px 0 12px 0;
}

.fullscreen-content :deep(ul),
.fullscreen-content :deep(ol) {
  margin: 14px 0;
  padding-left: 28px;
}

.fullscreen-content :deep(li) {
  margin: 10px 0;
  line-height: 1.7;
}

.fullscreen-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 15px;
}

.fullscreen-content :deep(th),
.fullscreen-content :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 14px;
  text-align: left;
}

.fullscreen-content :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.fullscreen-content :deep(blockquote) {
  margin: 20px 0;
  padding: 16px 24px;
  border-left: 4px solid #409eff;
  background: #f5f7fa;
  color: #606266;
  font-size: 15px;
}

.fullscreen-content :deep(pre) {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 20px 0;
  font-size: 14px;
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
  
  .header-actions {
    gap: 8px;
  }
  
  .content-preview {
    padding: 8px;
  }
  
  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .file-info h3 {
    font-size: 15px;
    word-break: break-all;
  }
  
  .html-content {
    padding: 16px;
    min-height: 300px;
    font-size: 17px;
    line-height: 2;
  }
  
  .html-content :deep(p) {
    margin: 16px 0;
    line-height: 2;
    font-size: 17px;
  }
  
  .html-content :deep(h1) {
    font-size: 22px;
    margin: 24px 0 16px 0;
  }
  
  .html-content :deep(h2) {
    font-size: 20px;
    margin: 22px 0 14px 0;
  }
  
  .html-content :deep(h3) {
    font-size: 18px;
    margin: 20px 0 12px 0;
  }
  
  .html-content :deep(li) {
    margin: 10px 0;
    line-height: 1.9;
    font-size: 17px;
  }
  
  .fullscreen-content {
    padding: 20px;
    font-size: 17px;
    line-height: 2;
  }
  
  .fullscreen-content :deep(p) {
    font-size: 17px;
    line-height: 2;
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

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
                  <el-icon v-else-if="isMarkdown(data.name)" color="#67c23a"><Document /></el-icon>
                  <el-icon v-else color="#909399"><Document /></el-icon>
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
              <div class="file-actions">
                <el-button type="primary" size="small" @click="openFullscreen" v-if="isTextFile(currentFile.name)">
                  <el-icon><FullScreen /></el-icon> 全屏
                </el-button>
                <el-button type="info" size="small" @click="printFile" v-if="isTextFile(currentFile.name) && !isMobile">
                  <el-icon><Printer /></el-icon> 打印
                </el-button>
                <el-button type="warning" size="small" @click="exportPdf" v-if="isTextFile(currentFile.name)" :loading="pdfLoading">
                  <el-icon><Document /></el-icon> PDF
                </el-button>
                <el-button v-if="isTextFile(currentFile.name) && !isMobile" type="info" size="small" @click="saveAsImage" :loading="imageLoading">
                  <el-icon><Picture /></el-icon> 导出图片
                </el-button>
                <el-button v-if="isTextFile(currentFile.name) && isWechat()" type="success" size="small" @click="saveAsImage" :loading="imageLoading">
                  <el-icon><Picture /></el-icon> 生成长图
                </el-button>
                <el-button type="primary" size="small" @click="previewFile" v-if="isPdf(currentFile.name)">
                  <el-icon><View /></el-icon> 预览
                </el-button>
                <el-button type="success" size="small" @click="downloadFile">
                  <el-icon><Download /></el-icon> 下载
                </el-button>
              </div>
            </div>
            <!-- 文本内容展示（HTML/Markdown） -->
            <div v-if="isTextFile(currentFile.name)" class="html-content" v-html="renderedContent"></div>
            <!-- PDF/Word 文件信息展示 -->
            <div v-else class="file-meta">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="文件类型">{{ getFileType(currentFile.name) }}</el-descriptions-item>
                <el-descriptions-item label="文件大小">{{ currentFile.size || '-' }}</el-descriptions-item>
                <el-descriptions-item label="修改时间">{{ currentFile.mtime || '-' }}</el-descriptions-item>
                <el-descriptions-item label="文件路径">{{ currentFile.path }}</el-descriptions-item>
              </el-descriptions>
              <el-alert
                v-if="isWord(currentFile.name)"
                title="Word 文件暂不支持在线预览，请下载后查看"
                type="info"
                :closable="false"
                style="margin-top: 20px;"
              />
            </div>
          </div>
          <el-empty v-else description="请选择文件查看内容" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 全屏查看对话框 -->
    <el-dialog
      v-model="fullscreenVisible"
      :title="currentFile?.name"
      width="90%"
      top="5vh"
      destroy-on-close
    >
      <div class="fullscreen-content" v-html="renderedContent"></div>
    </el-dialog>

    <!-- PDF 预览对话框 -->
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
import MarkdownIt from 'markdown-it'
import { isPdf, isWord, isMarkdown, isHtml, isTextFile, getFileType } from '@/utils/fileTypes'
import { FullScreen, View, Download, Folder, Document, Printer, Search, Picture } from '@element-plus/icons-vue'

const fileTree = ref([])
const currentFile = ref(null)
const fileContent = ref('')
const searchKeyword = ref('')
const previewVisible = ref(false)
const previewUrl = ref('')
const fullscreenVisible = ref(false)
const isMobile = ref(false)
const selectedPath = ref([])
const pdfLoading = ref(false)
const imageLoading = ref(false)

// 检测是否在微信内
const isWechat = () => /MicroMessenger/i.test(navigator.userAgent)

// 初始化 Markdown 渲染器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

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

// getFileType 已从 @/utils/fileTypes 导入

// 渲染内容（HTML 直接显示，Markdown 需要转换）
const renderedContent = computed(() => {
  if (!fileContent.value) return ''
  if (currentFile.value && isMarkdown(currentFile.value.name)) {
    return md.render(fileContent.value)
  }
  return fileContent.value
})

const loadFileTree = async () => {
  try {
    const data = await request.get('/files/math-papers')
    fileTree.value = data
  } catch (error) {
    console.error('加载文件树失败', error)
  }
}

const handleNodeClick = async (data) => {
  if (data.type === 'file') {
    currentFile.value = data
    fileContent.value = ''
    
    // 如果是文本文件，加载内容
    if (isTextFile(data.name)) {
      try {
        const content = await request.get(`/files/content?path=${encodeURIComponent(data.path)}&type=math-papers`)
        fileContent.value = content
      } catch (error) {
        fileContent.value = '<p style="color: red">加载失败</p>'
      }
    }
  }
}

const openFullscreen = () => {
  fullscreenVisible.value = true
}

const previewFile = () => {
  if (!currentFile.value) return
  previewUrl.value = `/api/files/download?path=${encodeURIComponent(currentFile.value.path)}&type=math-papers`
  previewVisible.value = true
}

const downloadFile = () => {
  if (!currentFile.value) return
  const url = `/api/files/download?path=${encodeURIComponent(currentFile.value.path)}&type=math-papers&download=true`
  window.open(url, '_blank')
  ElMessage.success('开始下载')
}

// 导出PDF功能（支持移动端和PC端）
const exportPdf = async () => {
  if (!currentFile.value || !isTextFile(currentFile.value.name)) return
  
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

// 打印功能（仅PC端使用浏览器打印）
const printFile = () => {
  if (!currentFile.value || !isTextFile(currentFile.value.name)) return
  
  // 移动端提示使用导出功能
  if (isMobile.value) {
    ElMessage.info('移动端请使用"PDF"按钮导出文件')
    return
  }
  
  // 创建打印窗口
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.warning('请允许弹出窗口以使用打印功能')
    return
  }
  
  const title = currentFile.value.name.replace(/\.[^/.]+$/, '')
  const content = renderedContent.value
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @media print {
          @page { margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body {
          font-family: "Segoe UI", "Microsoft YaHei", "微软雅黑", sans-serif;
          line-height: 1.8;
          color: #333;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3, h4 { color: #2c3e50; margin-top: 1.5em; }
        h1 { font-size: 24px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { font-size: 20px; border-bottom: 1px solid #bdc3c7; padding-bottom: 8px; }
        code {
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: "Consolas", monospace;
        }
        pre {
          background: #f8f8f8;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
          border-left: 4px solid #3498db;
        }
        blockquote {
          border-left: 4px solid #3498db;
          margin: 0;
          padding: 10px 20px;
          background: #f9f9f9;
          color: #555;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        th { background: #f4f4f4; }
        img { max-width: 100%; height: auto; }
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .print-header h1 { margin: 0; border: none; }
        .print-footer {
          margin-top: 40px;
          padding-top: 15px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 10px 20px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }
        .print-btn:hover { background: #2980b9; }
        @media print {
          .print-btn, .print-footer { display: none; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">🖨️ 打印 / 保存为PDF</button>
      <div class="print-header">
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="print-footer">
        来自元梦大陆 - 数学能充电站
      </div>
      <script>
        // 页面加载完成后自动聚焦，方便用户直接按 Ctrl+P 打印
        window.onload = function() {
          document.querySelector('.print-btn').focus();
        };
      <\/script>
    </body>
    </html>
  `)
  printWindow.document.close()
  ElMessage.success('已打开打印页面，点击"打印 / 保存为PDF"按钮即可')
}

// 生成长图（支持微信内分享）
const saveAsImage = async () => {
  if (!currentFile.value) return
  
  imageLoading.value = true
  try {
    const element = document.querySelector('.html-content')
    if (!element) {
      ElMessage.warning('未找到内容区域')
      return
    }
    
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    })
    
    const link = document.createElement('a')
    link.download = `${currentFile.value.name.replace(/\.[^/.]+$/, '')}.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    if (isWechat()) {
      ElMessage.success('图片已生成！请长按图片→「保存到相册」，再发送到好友')
    } else {
      ElMessage.success('导出图片成功')
    }
  } catch (error) {
    console.error('生成图片失败', error)
    ElMessage.error('生成图片失败，请重试')
  } finally {
    imageLoading.value = false
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

.file-actions {
  display: flex;
  gap: 10px;
}

.file-meta {
  margin-top: 20px;
}

/* 内容展示样式（与智慧树洞一致） */
.html-content {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  min-height: 400px;
  overflow: auto;
  line-height: 1.8;
  font-size: 16px;
}

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

/* 全屏模式样式 */
.fullscreen-content {
  min-height: 70vh;
  padding: 30px;
  background: #fff;
  line-height: 1.8;
  font-size: 16px;
}

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
  
  .content-preview {
    padding: 8px;
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
  
  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .file-info h3 {
    font-size: 15px;
    word-break: break-all;
  }
  
  .file-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .file-actions .el-button {
    flex: 1;
    min-width: 60px;
    padding: 6px 8px;
    font-size: 12px;
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

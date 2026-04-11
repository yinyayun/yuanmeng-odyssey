<template>
  <div class="super-chat-container">
    <!-- 左侧会话列表(移动端可收起) -->
    <div class="session-sidebar" :class="{ collapsed: isMobile && !showSidebar }">
      <div class="sidebar-header">
        <el-button type="primary" @click="createNewSession" class="new-session-btn">
          <el-icon><Plus /></el-icon>
          <span class="pc-only">新建对话</span>
        </el-button>
      </div>
      
      <div class="session-list">
        <div 
          v-for="session in sessions" 
          :key="session.session_id"
          class="session-item"
          :class="{ active: currentSessionId === session.session_id }"
          @click="switchSession(session.session_id)"
        >
          <div class="session-title">{{ session.title }}</div>
          <div class="session-time">{{ formatDate(session.updated_at) }}</div>
          <el-icon class="delete-btn" @click.stop="deleteSession(session.session_id)">
            <Delete />
          </el-icon>
        </div>
      </div>
    </div>
    
    <!-- 主对话区域 -->
    <div class="chat-main">
      <!-- 移动端菜单按钮 -->
      <el-button class="mobile-only sidebar-toggle" @click="showSidebar = !showSidebar">
        <el-icon><Menu /></el-icon>
      </el-button>
      
      <!-- 消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="welcome-screen">
          <el-icon size="64" color="#9b59b6"><ChatDotRound /></el-icon>
          <h2>开始与 Luna 对话</h2>
          <p>我是你的智能伙伴，可以回答任何问题！</p>
        </div>
        
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-avatar">
            <el-avatar :size="40" :src="msg.role === 'user' ? userAvatar : aiAvatar" />
          </div>
          <div class="message-bubble">
            <div class="message-content" v-html="renderMarkdown(msg.content)"></div>
            <div class="message-time">{{ formatTime(msg.created_at) }}</div>
          </div>
        </div>
        
        <!-- 加载中指示器 -->
        <div v-if="isLoading" class="message-item assistant">
          <div class="message-avatar">
            <el-avatar :size="40" :src="aiAvatar" />
          </div>
          <div class="message-bubble">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="input-area">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入你的问题...(Ctrl+Enter 发送)"
          @keydown.ctrl.enter="sendMessage"
          :disabled="isLoading"
          resize="none"
        />
        <el-button 
          type="primary" 
          @click="sendMessage" 
          :loading="isLoading"
          :disabled="!inputMessage.trim()"
          class="send-btn"
        >
          <el-icon><Promotion /></el-icon>
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt()

const sessions = ref([])
const messages = ref([])
const currentSessionId = ref(null)
const inputMessage = ref('')
const isLoading = ref(false)
const showSidebar = ref(false)
const isMobile = ref(false)
const messagesContainer = ref(null)

const userAvatar = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
})

const aiAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=openclaw'

// 渲染 Markdown
const renderMarkdown = (content) => {
  return md.render(content)
}

// 加载会话列表
const loadSessions = async () => {
  try {
    sessions.value = await request.get('/chat/sessions')
  } catch (error) {
    console.error('加载会话失败:', error)
  }
}

// 创建新会话
const createNewSession = async () => {
  currentSessionId.value = null
  messages.value = []
  if (isMobile.value) showSidebar.value = false
}

// 切换会话
const switchSession = async (sessionId) => {
  currentSessionId.value = sessionId
  await loadMessages(sessionId)
  if (isMobile.value) showSidebar.value = false
}

// 加载消息历史
const loadMessages = async (sessionId) => {
  try {
    messages.value = await request.get(`/chat/sessions/${sessionId}/messages`)
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败:', error)
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''
  isLoading.value = true
  
  // 乐观更新:立即显示用户消息
  messages.value.push({
    role: 'user',
    content: userMessage,
    created_at: new Date().toISOString()
  })
  await nextTick()
  scrollToBottom()
  
  try {
    const result = await request.post('/chat/send', {
      session_id: currentSessionId.value,
      message: userMessage
    })
    
    // 添加 AI 回复
    messages.value.push({
      role: 'assistant',
      content: result.response,
      created_at: new Date().toISOString()
    })
    
    // 更新当前会话 ID
    if (!currentSessionId.value) {
      currentSessionId.value = result.session_id
      await loadSessions()
    }
    
    await nextTick()
    scrollToBottom()
  } catch (error) {
    ElMessage.error('发送消息失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

// 删除会话
const deleteSession = async (sessionId) => {
  try {
    await ElMessageBox.confirm('确定删除该会话吗?', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request.delete(`/chat/sessions/${sessionId}`)
    
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null
      messages.value = []
    }
    
    await loadSessions()
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60 / 1000)}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 60 / 60 / 1000)}小时前`
  return date.toLocaleDateString()
}

const formatTime = (dateStr) => {
  return new Date(dateStr).toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 检测移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  loadSessions()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.super-chat-container {
  display: flex;
  height: calc(100vh - 120px);
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(155, 89, 182, 0.1);
}

/* 左侧会话列表 */
.session-sidebar {
  width: 280px;
  background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 100%);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.new-session-btn {
  width: 100%;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.session-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  color: #b8b8d1;
}

.session-item:hover {
  background: rgba(155, 89, 182, 0.2);
}

.session-item.active {
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.4), rgba(231, 76, 60, 0.3));
  color: #ffd700;
}

.session-title {
  font-size: 14px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-time {
  font-size: 12px;
  opacity: 0.6;
}

.delete-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.3s;
  color: #e74c3c;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

/* 主对话区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.sidebar-toggle {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(135deg, #fef5f7 0%, #f5eef8 100%);
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #9b59b6;
}

.message-item {
  display: flex;
  margin-bottom: 20px;
  gap: 12px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, #9b59b6, #e74c3c);
  color: #fff;
}

.message-content {
  font-size: 15px;
  line-height: 1.6;
}

.message-content :deep(pre) {
  background: #1a1a2e;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content :deep(code) {
  background: rgba(155, 89, 182, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.message-time {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 6px;
  text-align: right;
}

/* 打字机指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9b59b6;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

/* 输入区域 */
.input-area {
  padding: 20px;
  background: #fff;
  border-top: 2px solid rgba(155, 89, 182, 0.1);
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.send-btn {
  height: 40px;
  padding: 0 24px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .super-chat-container {
    height: calc(100vh - 80px);
    border-radius: 0;
  }
  
  .session-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
  }
  
  .session-sidebar.collapsed {
    transform: translateX(-100%);
  }
  
  .session-sidebar:not(.collapsed) {
    transform: translateX(0);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
  }
  
  .message-bubble {
    max-width: 85%;
  }
  
  .pc-only {
    display: none;
  }
}
</style>

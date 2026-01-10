import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './user'
import { useTrainingStore } from './training'
import { ElNotification } from 'element-plus'

export const useNotifyStore = defineStore('notify', () => {
  const userStore = useUserStore()
  const trainingStore = useTrainingStore()
  
  // 状态 State
  const socket = ref(null)
  const isConnected = ref(false)
  // 从 LocalStorage 初始化消息列表
  const messages = ref(JSON.parse(localStorage.getItem('notify_msgs') || '[]'))
  
  // 监听 messages 变化，自动持久化
  const saveToStorage = () => {
      // 限制只存最近 50 条，防止爆炸
      const toSave = messages.value.slice(0, 50)
      localStorage.setItem('notify_msgs', JSON.stringify(toSave))
  }
  
  // 计算属性 Getters
  const unreadCount = computed(() => messages.value.length)

  // 动作 Actions
  
  // 1. 初始化连接
  const connect = () => {
    if (isConnected.value || !userStore.userInfo?.id) return

    // 假设后端地址 (注意替换为真实后端端口)
    const userId = userStore.userInfo.id
    
    // 使用相对路径 + 代理 (/ws)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    // 规范：通用通知使用 examId = 0
    const wsUrl = `${protocol}//${host}/ws/exam/0/${userId}` 
    
    socket.value = new WebSocket(wsUrl)

    // 监听连接开启
    socket.value.onopen = () => {
      console.log('🔗 WebSocket Connected')
      isConnected.value = true
    }

    // 监听收到消息
    socket.value.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        // 添加到列表头部
        messages.value.unshift(msg)
        saveToStorage() // 保存
        
        // 1. 处理每日特训推送
        if (msg.type === 'daily_train') {
          ElNotification({
            title: msg.title || '每日特训已生成',
            message: msg.content || '为您定制了今日强化练习，快来挑战吧！',
            type: 'success',
            duration: 0, // 不自动关闭
            position: 'bottom-right',
            onClick: () => {
                trainingStore.openTraining()
            }
          })
          return // 跳过普通通知逻辑
        }

        // 2. 处理 AI 助教通知
        const isAI = msg.source === 'AI' || msg.type === 'ai_reply'
        
        // 弹窗提示 (右上角浮窗)
        ElNotification({
          title: isAI ? 'AI 助教提醒' : (msg.title || '新消息'),
          message: msg.content,
          type: isAI ? 'success' : 'info',
          duration: 5000,
          position: 'bottom-right'
        })
        
      } catch (e) {
        console.error('解析消息失败', e)
      }
    }

    // 监听关闭
    socket.value.onclose = () => {
      console.log('🔗 WebSocket Disconnected')
      isConnected.value = false
    }
  }

  // 2. 断开连接 (退出登录时调用)
  const disconnect = () => {
    if (socket.value) {
      socket.value.close()
      socket.value = null
      isConnected.value = false
    }
  }

  // 3. 清空/标记已读
  const clearMessages = () => {
    messages.value = []
    saveToStorage()
  }

  // 模拟接收消息 (用于后端接口没好时测试 UI)
  const mockReceive = () => {
    const mockMsg = {
        title: '模拟消息',
        content: '老师刚刚回复了你的“Java基础”问题，快去查看吧！',
        time: new Date().toLocaleString()
    }
    messages.value.unshift(mockMsg)
    saveToStorage()
    ElNotification.success({ title: mockMsg.title, message: mockMsg.content })
  }

  return {
    isConnected,
    messages,
    unreadCount,
    connect,
    disconnect,
    clearMessages,
    mockReceive
  }
})

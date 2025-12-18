import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './user'
import { ElNotification } from 'element-plus'

export const useNotifyStore = defineStore('notify', () => {
  const userStore = useUserStore()
  
  // 状态 State
  const socket = ref(null)
  const isConnected = ref(false)
  const messages = ref([]) // 存储消息列表
  
  // 计算属性 Getters
  // 计算未读消息数量 (这里简单处理：只要在列表中就是未读，或者你可以给消息加 read 字段)
  const unreadCount = computed(() => messages.value.length)

  // 动作 Actions
  
  // 1. 初始化连接
  const connect = () => {
    if (isConnected.value || !userStore.userInfo?.id) return

    // 假设后端地址 (注意替换为真实后端端口)
    const userId = userStore.userInfo.id
    // 这里的 url 需要根据你实际后端的地址修改
    const wsUrl = `ws://localhost:8080/ws/notify/${userId}` 
    
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
        
        // 弹窗提示 (右上角浮窗)
        ElNotification({
          title: msg.title || '新消息',
          message: msg.content,
          type: 'info',
          duration: 3000
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
  }

  // 模拟接收消息 (用于后端接口没好时测试 UI)
  const mockReceive = () => {
    const mockMsg = {
        title: '模拟消息',
        content: '老师刚刚回复了你的“Java基础”问题，快去查看吧！',
        time: new Date().toLocaleString()
    }
    messages.value.unshift(mockMsg)
    ElNotification.success({ title: mockMsg.title, message: mockMsg.content })
  }

  return {
    isConnected,
    messages,
    unreadCount,
    connect,
    disconnect,
    clearMessages,
    mockReceive // 导出这个方便测试
  }
})
# 🔔 消息通知中心实现指南 (Real-time Notification Guide)

本文档将指导你如何基于 **WebSocket** 和 **Pinia** 实现一个实时的消息通知中心。
请按照以下步骤，在你的项目中逐一实现。

---

## 📋 1. 准备工作 (后端需求)

在开始写前端之前，你需要明确（或告知后端开发）WebSocket 的连接地址和数据格式。

*   **WebSocket 地址**: `ws://localhost:8080/ws/notify/{userId}`
    *   前端需要把 `userId` 传过去，这样后端才知道消息发给谁。
*   **消息格式 (JSON)**:
    ```json
    {
      "type": "feedback_reply",  // 消息类型
      "title": "老师回复了你的提问",
      "content": "关于Java多线程的问题...",
      "time": "2025-12-19 10:00:00"
    }
    ```

---

## 🛠️ 2. 前端实现步骤

### Step 1: 创建通知状态仓库 (Pinia Store)

我们需要一个全局的地方来管理 WebSocket 连接和收到的消息列表。

**新建文件**: `src/stores/notify.js`

```javascript
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
```

---

### Step 2: 创建铃铛组件 (UI Component)

我们需要一个漂亮的铃铛图标，点击后弹出一个下拉框显示消息。

**新建文件**: `src/components/NotifyBell.vue`

```html
<script setup>
import { Bell } from '@element-plus/icons-vue'
import { useNotifyStore } from '@/stores/notify'
import { storeToRefs } from 'pinia'

const notifyStore = useNotifyStore()
// 使用 storeToRefs 保持响应性
const { unreadCount, messages } = storeToRefs(notifyStore)

const handleClear = () => {
  notifyStore.clearMessages()
}
</script>

<template>
  <div class="notify-container">
    <el-popover
      placement="bottom"
      :width="300"
      trigger="click"
    >
      <!-- 触发源：铃铛图标 -->
      <template #reference>
        <div class="bell-trigger">
          <el-badge :value="unreadCount" :max="99" :hidden="unreadCount === 0" class="item">
            <el-icon :size="20"><Bell /></el-icon>
          </el-badge>
        </div>
      </template>

      <!-- 弹出层内容：消息列表 -->
      <div class="notify-list">
        <div class="header">
            <span>消息通知</span>
            <el-button link type="primary" size="small" @click="handleClear" v-if="unreadCount > 0">
                全部已读
            </el-button>
        </div>
        <el-divider style="margin: 10px 0" />
        
        <div v-if="messages.length === 0" class="empty-state">
            暂无新消息
        </div>

        <div v-else class="list-content">
            <div v-for="(msg, index) in messages" :key="index" class="msg-item">
                <div class="msg-title">{{ msg.title }}</div>
                <div class="msg-body">{{ msg.content }}</div>
                <div class="msg-time">{{ msg.time }}</div>
            </div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<style scoped>
.bell-trigger {
    cursor: pointer;
    padding: 0 10px;
    height: 100%;
    display: flex;
    align-items: center;
    color: #5a5e66;
    transition: color 0.3s;
}
.bell-trigger:hover {
    color: #409EFF;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    color: #333;
}
.empty-state {
    text-align: center;
    color: #909399;
    padding: 20px 0;
    font-size: 13px;
}
.list-content {
    max-height: 300px;
    overflow-y: auto;
}
.msg-item {
    padding: 10px 0;
    border-bottom: 1px solid #f0f2f5;
}
.msg-item:last-child {
    border-bottom: none;
}
.msg-title {
    font-weight: bold;
    font-size: 14px;
    color: #303133;
    margin-bottom: 4px;
}
.msg-body {
    font-size: 13px;
    color: #606266;
    line-height: 1.4;
    margin-bottom: 4px;
}
.msg-time {
    font-size: 12px;
    color: #909399;
    text-align: right;
}
</style>
```

---

### Step 3: 将铃铛放入导航栏

修改你的 `Navbar.vue`，把刚刚写好的组件加进去。

**修改文件**: `src/layout/components/Navbar.vue`

1.  **引入组件**:
    ```javascript
    import NotifyBell from '@/components/NotifyBell.vue'
    import { useNotifyStore } from '@/stores/notify' // 可选：用于测试
    ```

2.  **在 Template 中放置**:
    找到显示全屏按钮或头像的地方，把 `<NotifyBell />` 塞进去。
    ```html
    <div class="right-menu">
      <!-- 原有的 Screenfull 等组件 -->
      
      <!-- 新增：通知铃铛 -->
      <NotifyBell class="right-menu-item" />

      <!-- 原有的 Avatar 下拉菜单 -->
      <el-dropdown ...>
    </div>
    ```

3.  **(可选) 添加一个测试按钮**:
    如果你后端还没好，可以在 Navbar 临时加个按钮测试效果：
    ```html
    <el-button size="small" @click="useNotifyStore().mockReceive()">测试消息</el-button>
    ```

---

### Step 4: 激活连接 (Lifecycle)

最后，我们需要确保用户登录后自动连接 WebSocket。

**修改文件**: `src/layout/index.vue` (或其他布局入口文件)

```javascript
<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useNotifyStore } from '@/stores/notify'

const notifyStore = useNotifyStore()

onMounted(() => {
  // 页面加载/刷新时尝试连接
  notifyStore.connect()
})

onBeforeUnmount(() => {
  // 页面销毁前断开
  notifyStore.disconnect()
})
</script>
```

---

## ✅ 验证与测试

1.  刷新页面。
2.  如果你加了“测试按钮”，点击它。
3.  看右上角铃铛是否出现红点。
4.  点击铃铛，看是否出现消息列表。
5.  如果后端开发好了，尝试让后端推一条消息，看是否有 `ElNotification` 弹窗。

祝你编码愉快！如有报错，请随时问我。

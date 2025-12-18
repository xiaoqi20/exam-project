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
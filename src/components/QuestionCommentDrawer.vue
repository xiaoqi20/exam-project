<script setup>
import { ref } from 'vue'
import { UserFilled, ChatLineSquare, Star, Promotion, Close } from '@element-plus/icons-vue'
import { getCommentList, addComment, likeComment } from '@/api/comment'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const visible = ref(false)
const questionId = ref(null)
const comments = ref([])
const loading = ref(false)
const content = ref('')

// 对外暴露的打开方法
const open = (id) => {
    questionId.value = id
    visible.value = true
    loadComments()
}

const handleClose = () => {
    visible.value = false
    comments.value = []
    content.value = ''
}

const loadComments = async () => {
  loading.value = true
  try {
    const res = await getCommentList(questionId.value)
    // 兼容逻辑：如果是标准结构 {code, data} 取 res.data；如果是解包后的数组，直接取 res
    const list = Array.isArray(res) ? res : (res.data || [])
    comments.value = list
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSend = async () => {
  if (!content.value.trim()) return ElMessage.warning('评论内容不能为空')
  
  try {
    await addComment({ questionId: questionId.value, content: content.value })
    ElMessage.success('评论发表成功')
    
    comments.value.unshift({
        id: Date.now(),
        studentName: userStore.userInfo.name || '我',
        avatar: userStore.userInfo.avatar,
        content: content.value,
        likeCount: 0,
        time: '刚刚',
        isLiked: false
    })
    
    content.value = ''
  } catch (e) {
    ElMessage.error('发表失败')
  }
}

const handleLike = async (item) => {
  if (item.isLiked) return 
  try {
    await likeComment(item.id)
    item.likeCount++
    item.isLiked = true
  } catch (e) {}
}

defineExpose({ open })
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="`题目讨论区 (${comments.length})`"
    direction="rtl"
    size="400px"
    :before-close="handleClose"
    class="comment-drawer"
  >
    <div class="drawer-content">
        <!-- 列表 -->
        <div class="list-container" v-loading="loading">
            <div v-if="comments.length === 0 && !loading" class="empty-tip">
                暂无评论，快来抢沙发~
            </div>
            
            <div v-for="item in comments" :key="item.id" class="comment-item" :class="{ 'is-me': item.studentName === userStore.userInfo.name }">
                <el-avatar :size="36" :src="item.avatar" :icon="UserFilled" class="avatar" />
                <div class="content-wrapper">
                    <div class="info">
                        <span class="name">{{ item.studentName || item.userName || '匿名同学' }}</span>
                        <span class="time">{{ item.time }}</span>
                    </div>
                    <div class="bubble">{{ item.content }}</div>
                    <div class="actions">
                        <span class="like-btn" :class="{ active: item.isLiked }" @click="handleLike(item)">
                            <el-icon><Star /></el-icon> {{ item.likeCount || '点赞' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部输入框 -->
        <div class="input-footer">
            <div class="input-container">
                <el-input 
                    v-model="content" 
                    type="textarea"
                    :rows="1"
                    autosize
                    placeholder="发表你的见解..." 
                    class="stylish-input"
                    @keyup.enter.ctrl="handleSend"
                />
                <el-button 
                    type="primary" 
                    circle 
                    :icon="Promotion" 
                    class="send-btn"
                    :disabled="!content.trim()"
                    @click="handleSend"
                />
            </div>
            <div class="input-tip">Ctrl + Enter 快速发送</div>
        </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #fcfcfc; /* 整体背景微灰 */
}
.list-container {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    /* 隐藏滚动条 (Firefox) */
    scrollbar-width: none;
    /* 隐藏滚动条 (IE/Edge) */
    -ms-overflow-style: none;
}
/* 隐藏滚动条 (Chrome/Safari/Webkit) */
.list-container::-webkit-scrollbar {
    display: none;
}
.comment-item {
    display: flex;
    gap: 12px;
    margin-bottom: 24px; /* 增加间距 */
    animation: fadeIn 0.3s ease;
}
.avatar { 
    flex-shrink: 0; 
    border: 1px solid #f0f0f0;
}
.content-wrapper { 
    flex: 1; 
    max-width: 85%;
}
.info { 
    display: flex; 
    align-items: baseline; 
    gap: 8px;
    margin-bottom: 6px; 
}
/* 我的评论 - 布局反转 */
.comment-item.is-me {
    flex-direction: row-reverse;
}
.comment-item.is-me .info {
    flex-direction: row-reverse;
}
.comment-item.is-me .content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-end; /* 气泡向右靠齐 */
}

.name { 
    font-weight: 600; 
    color: #333; 
    font-size: 13px;
}
.time { 
    color: #999; 
    font-size: 12px;
}
.bubble {
    background: #ffffff;
    padding: 10px 14px;
    border-radius: 12px;
    border-top-left-radius: 2px;
    font-size: 14px;
    color: #333;
    line-height: 1.6;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    border: 1px solid #f0f0f0;
    position: relative;
    word-break: break-all;
}

/* 我的评论 - 气泡高亮 */
.is-me .bubble {
    background-color: #409EFF;
    color: #ffffff;
    border: none;
    border-top-left-radius: 12px;
    border-top-right-radius: 2px;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.actions { 
    margin-top: 6px; 
    text-align: right; 
    font-size: 12px; 
    color: #909399; 
}
/* 我的评论 - 动作栏颜色 */
.is-me .actions .like-btn {
    color: #409EFF;
}
.is-me .actions .like-btn:hover {
    opacity: 0.8;
}
.like-btn { 
    cursor: pointer; 
    display: inline-flex; 
    align-items: center; 
    gap: 4px; 
    padding: 2px 8px;
    border-radius: 10px;
    transition: all 0.2s;
}
.like-btn:hover { 
    background-color: #ecf5ff;
    color: #409EFF; 
}
.like-btn.active { 
    color: #409EFF; 
}

.input-footer {
    padding: 12px 16px 20px;
    background: #ffffff;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
    z-index: 10;
}
.input-container {
    display: flex;
    align-items: flex-end;
    gap: 12px;
}
.stylish-input :deep(.el-textarea__inner) {
    border-radius: 20px;
    background-color: #f5f7fa;
    border: 1px solid #e4e7ed;
    padding: 8px 16px;
    resize: none;
    transition: all 0.3s;
    font-family: inherit;
}
.stylish-input :deep(.el-textarea__inner:focus) {
    background-color: #fff;
    border-color: #409EFF;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}
.send-btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    transition: all 0.3s;
}
.send-btn:not(:disabled):hover {
    transform: scale(1.1) rotate(-10deg);
}
.input-tip {
    font-size: 11px;
    color: #c0c4cc;
    margin-top: 6px;
    margin-left: 16px;
}
.empty-tip { 
    text-align: center; 
    color: #ccc; 
    margin-top: 80px; 
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

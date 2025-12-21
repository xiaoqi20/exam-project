<script setup>
import { ref, onMounted } from 'vue'
import { UserFilled, ChatLineSquare, Star, Promotion } from '@element-plus/icons-vue'
import { getCommentList, addComment, likeComment } from '@/api/comment'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  questionId: {
    type: [Number, String],
    required: true
  }
})

const userStore = useUserStore()
const comments = ref([])
const loading = ref(false)
const content = ref('')
const inputVisible = ref(false)

const toggleExpand = () => {
    inputVisible.value = !inputVisible.value
    if (inputVisible.value && comments.value.length === 0) {
        loadComments()
    }
}

const loadComments = async () => {
  loading.value = true
  try {
    const res = await getCommentList(props.questionId)
    comments.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSend = async () => {
  if (!content.value.trim()) return ElMessage.warning('评论内容不能为空')
  
  try {
    await addComment({ questionId: props.questionId, content: content.value })
    ElMessage.success('评论发表成功')
    
    // 乐观更新 UI
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
    inputVisible.value = false
  } catch (e) {
    ElMessage.error('发表失败')
  }
}

const handleLike = async (item) => {
  if (item.isLiked) return // 防止重复点赞 (或者后端支持取消点赞)
  
  try {
    await likeComment(item.id)
    item.likeCount++
    item.isLiked = true
  } catch (e) {}
}

onMounted(() => {
  // 懒加载？或者初始加载
  // loadComments() 
})
</script>

<template>
  <div class="comment-section">
    <!-- 头部栏 -->
    <div class="header-bar" @click="toggleExpand">
        <div class="left">
            <el-icon><ChatLineSquare /></el-icon>
            <span>讨论区 ({{ comments.length > 0 ? comments.length : '0' }})</span>
        </div>
        <el-button link type="primary" size="small">{{ inputVisible ? '收起' : '展开讨论' }}</el-button>
    </div>

    <!-- 展开区域 -->
    <transition name="el-zoom-in-top">
        <div v-if="inputVisible" class="comment-body">
            <!-- 评论列表 -->
            <div v-if="comments.length === 0 && !loading" class="empty-tip" @click="loadComments">
                暂无评论，点击加载
            </div>
            
            <div v-else class="list-container" v-loading="loading">
                <div v-for="item in comments" :key="item.id" class="comment-item">
                    <el-avatar :size="32" :src="item.avatar" :icon="UserFilled" class="avatar" />
                    <div class="content-wrapper">
                        <div class="info">
                            <span class="name">{{ item.studentName }}</span>
                            <span class="time">{{ item.time }}</span>
                        </div>
                        <div class="text">{{ item.content }}</div>
                        <div class="actions">
                            <span class="like-btn" :class="{ active: item.isLiked }" @click="handleLike(item)">
                                <el-icon><Star /></el-icon> {{ item.likeCount || '点赞' }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 输入框 -->
            <div class="input-area">
                <el-input 
                    v-model="content" 
                    placeholder="发表你的见解..." 
                    class="input-box"
                    @keyup.enter="handleSend"
                >
                    <template #suffix>
                        <el-icon class="send-icon" @click="handleSend"><Promotion /></el-icon>
                    </template>
                </el-input>
            </div>
        </div>
    </transition>
  </div>
</template>

<style scoped>
.comment-section {
    margin-top: 15px;
    border-top: 1px dashed #ebeef5;
    padding-top: 10px;
}
.header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 5px 0;
    color: #606266;
    font-size: 14px;
}
.header-bar:hover { color: #409EFF; }
.header-bar .left { display: flex; align-items: center; gap: 5px; font-weight: bold; }

.comment-body {
    margin-top: 10px;
    background: #f9faFc;
    border-radius: 4px;
    padding: 10px;
}
.empty-tip { text-align: center; color: #909399; font-size: 13px; padding: 10px; cursor: pointer; }

.list-container {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 10px;
}

.comment-item {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}
.avatar { flex-shrink: 0; }
.content-wrapper { flex: 1; }
.info { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
.name { font-weight: bold; color: #303133; }
.time { color: #909399; }
.text { font-size: 14px; color: #606266; line-height: 1.5; margin-bottom: 5px; }

.actions { display: flex; gap: 15px; font-size: 12px; color: #909399; }
.like-btn { cursor: pointer; display: flex; align-items: center; gap: 3px; transition: color 0.2s; }
.like-btn:hover { color: #409EFF; }
.like-btn.active { color: #409EFF; }

.input-area { margin-top: 10px; }
.send-icon { cursor: pointer; color: #409EFF; font-size: 16px; }
.send-icon:hover { color: #66b1ff; }
</style>

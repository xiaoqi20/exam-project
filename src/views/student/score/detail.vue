<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, Close, MagicStick, Loading, ArrowUp, ArrowDown, ChatLineRound, Cpu } from '@element-plus/icons-vue'
import { getScoreDetail } from '@/api/exam'
import { addFeedback } from '@/api/feedback'
import { ElMessage } from 'element-plus'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import QuestionCommentDrawer from '@/components/QuestionCommentDrawer.vue'
import { useUserStore } from '@/stores/user'
import { ChatLineSquare } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const paperInfo = ref({})
const questions = ref([])
const commentDrawerRef = ref(null)

// Open Comment Drawer
const handleOpenComments = (q) => {
    if (commentDrawerRef.value) {
        commentDrawerRef.value.open(q.id || q.questionId)
    }
}

// Feedback Dialog State
const feedbackDialogVisible = ref(false)
const currentFeedbackQ = ref({})
const feedbackContent = ref('')

const scoreId = route.params.id

// Open Feedback Dialog
const handleFeedback = (q) => {
    currentFeedbackQ.value = q
    feedbackContent.value = ''
    feedbackDialogVisible.value = true
    
    // 更新 URL，方便刷新后定位
    const qId = q.id || q.questionId
    router.replace({ query: { ...route.query, q: qId } })
}

// Submit Feedback
const submitFeedback = async () => {
    if (!feedbackContent.value.trim()) {
        ElMessage.warning('请输入您的疑问')
        return
    }
    
    try {
        await addFeedback({
            questionId: currentFeedbackQ.value.id || currentFeedbackQ.value.questionId,
            scoreId: scoreId,
            examId: paperInfo.value.examId, // 关联试卷ID
            content: feedbackContent.value
        })
        ElMessage.success('反馈已提交，老师会尽快回复')
        feedbackDialogVisible.value = false
    } catch (e) {
        ElMessage.error('提交失败')
    }
}

const loadDetail = async () => {
  loading.value = true
  try {
    const res = await getScoreDetail(scoreId)
    const data = res
    
    if (data) {
       // Ensure we get the ID, checking both root and nested paperInfo
       const foundId = data.examId || data.paperId || (data.paperInfo && (data.paperInfo.examId || data.paperInfo.paperId))
       
       paperInfo.value = {
           ...(data.paperInfo || {}),
           title: data.title || (data.paperInfo && data.paperInfo.title),
           studentScore: data.studentScore || data.score,
           totalScore: data.totalScore || 100,
           examId: foundId // Force inject the found ID
       }
       
       const rawQuestions = data.questions || []
       // 打印出所有包含回复的题目，方便快速定位
       const repliedQuestions = rawQuestions.filter(q => q.teacherReply)
       console.log('✅ [Debug] 有回复的题目列表:', repliedQuestions)
       
       questions.value = rawQuestions.map((q, index) => {
           let type = 'choice'
           if (q.type === '单选题' || q.type === '选择题') type = 'choice'
           else if (q.type === '多选题') type = 'multiple_choice'
           else if (q.type === '判断题') type = 'true_false'
           else if (q.type === '填空题' || q.type === 'fill_blank') type = 'fill_blank'
           else if (q.type === '简答题' || q.type === 'short_answer') type = 'short_answer'

           const options = {}
           if (type === 'choice' || type === 'multiple_choice') {
               if (q.optionA) options['A'] = q.optionA
               if (q.optionB) options['B'] = q.optionB
               if (q.optionC) options['C'] = q.optionC
               if (q.optionD) options['D'] = q.optionD
               if (q.optionE) options['E'] = q.optionE
               
               if (Object.keys(options).length === 0 && q.options) {
                   try {
                       const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                       Object.assign(options, parsed)
                   } catch(e) {}
               }
           }

           return {
               ...q,
               type,
               options,
               isCorrect: q.studentScore === q.score || q.answer === q.studentAnswer,
               analysis: q.analysis || '',
                                                            aiLoading: false,
                                                            isExpanded: false,
                                                            isAiExpanded: false, // AI回复默认折叠
                                                            teacherReply: q.teacherReply || '',
                                                            replySource: q.replySource || (q.status === 'ai_replied' ? 'AI' : 'TEACHER')
                                                        }
                                                    })

       // 自动滚动到指定题目 (如果 URL 有 ?q=questionId)
       const targetQId = route.query.q
       if (targetQId) {
           nextTick(() => {
               const el = document.getElementById('question-' + targetQId)
               if (el) {
                   el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                   // 可选：高亮一下该题目
                   el.classList.add('highlight-flash')
               }
           })
       }
    }
  } catch (error) {
    console.error('Failed to load score detail:', error)
    ElMessage.error('加载详情失败')
  } finally {
    loading.value = false
  }
}

// Fetch AI Analysis Stream
const fetchAIAnalysis = async (q) => {
    if (q.aiLoading) return
    q.aiLoading = true
    q.isExpanded = true
    q.analysis = '' 
    let rawAnalysis = ''
    
    try {
        const token = userStore.token
        const url = `/api/ai/analyze/stream?questionId=${q.id || q.questionId}&studentAnswer=${encodeURIComponent(q.studentAnswer || '')}`
        
        const response = await fetch(url, {
            headers: { 'token': token, 'Accept': 'text/event-stream' }
        })

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    let data = line.slice(5)
                    if (data.trim() === '[DONE]') break
                    if (data.startsWith(' ')) data = data.slice(1)
                    data = data.replace(/\\n/g, '\n')
                    rawAnalysis += data
                    q.analysis = rawAnalysis
                }
            }
        }
    } catch (e) {
        console.error('AI Stream Error:', e)
        ElMessage.error('AI 解析生成失败')
    } finally {
        q.aiLoading = false
    }
}

const getOptionClass = (q, key) => {
    const isUserSelected = (q.studentAnswer || '').includes(key)
    const isCorrectAns = (q.answer || q.correctAnswer || '').includes(key)
    if (isCorrectAns) return 'correct-option'
    if (isUserSelected && !isCorrectAns) return 'wrong-option'
    return ''
}

onMounted(() => {
  if (scoreId) {
    loadDetail()
  } else {
    ElMessage.error('无效的参数')
    router.back()
  }
})
</script>

<template>
  <div class="detail-container" v-loading="loading">
    <div class="header">
      <el-page-header @back="router.back()" title="返回列表">
        <template #content>
          <span class="text-large font-600 mr-3"> 试卷详情 </span>
        </template>
        <template #extra>
             <div class="score-board">
                 <span class="label">最终得分：</span>
                 <span class="score-val">{{ paperInfo.studentScore }}</span>
                 <span class="total"> / {{ paperInfo.totalScore }}</span>
             </div>
        </template>
      </el-page-header>
    </div>

    <div class="content-body">
         <el-card 
            v-for="(q, index) in questions" 
            :key="index" 
            :id="'question-' + (q.id || q.questionId)"
            class="question-card" 
            shadow="hover"
         >
             <template #header>
                 <div class="q-header">
                     <div class="q-meta">
                         <el-tag :type="q.type === 'choice' ? 'primary' : (q.type === 'multiple_choice' ? 'success' : (q.type === 'true_false' ? 'warning' : 'info'))" effect="plain">
                             {{ q.type === 'choice' ? '单选题' : (q.type === 'multiple_choice' ? '多选题' : (q.type === 'true_false' ? '判断题' : (q.type === 'fill_blank' ? '填空题' : '简答题'))) }}
                         </el-tag>
                         <span class="q-score">({{ q.score }}分)</span>
                     </div>
                     <span class="q-content">{{ index + 1 }}. {{ q.content }}</span>
                     
                     <div class="q-status">
                         <!-- 简答题特殊评分展示 -->
                         <el-tag v-if="q.type === 'short_answer'" type="info" effect="dark" class="status-tag">
                            AI 评分：{{ q.studentScore }} / {{ q.score }} 分
                         </el-tag>
                         <el-tag v-else-if="q.isCorrect" type="success" effect="dark" class="status-tag"><el-icon><Check /></el-icon> 正确</el-tag>
                         <el-tag v-else type="danger" effect="dark" class="status-tag"><el-icon><Close /></el-icon> 错误</el-tag>
                     </div>
                 </div>
             </template>
             
             <!-- Options Area (Only for choice types) -->
             <div class="options-list" v-if="q.type === 'choice' || q.type === 'multiple_choice' || q.type === 'true_false'">
                 <template v-if="q.type === 'choice' || q.type === 'multiple_choice'">
// ... (skip)
                 </template>
             </div>
             
             <div class="analysis-box">
                 <div class="analysis-row">
                    <span class="label">我的答案：</span>
                    <div class="value" :class="q.type !== 'short_answer' ? (q.isCorrect ? 'text-success' : 'text-danger') : ''">
                        <template v-if="q.type === 'short_answer' || q.type === 'fill_blank'">
                            {{ q.studentAnswer || '(未作答)' }}
                        </template>
                        <span v-else>{{ q.studentAnswer || '未作答' }}</span>
                    </div>
                 </div>
                 <div class="analysis-row">
                    <span class="label">正确答案：</span>
                    <div class="value text-success">
                        <template v-if="q.type === 'true_false'">
                            {{ q.answer === 'A' ? '正确' : '错误' }}
                        </template>
                        <template v-else>
                            {{ q.answer || q.correctAnswer }}
                        </template>
                    </div>
                 </div>
                 
                 <!-- Analysis Section with Collapse -->
                 <div class="analysis-row analysis-text">
                    <span class="label">解析：</span>
                    <div class="value" style="flex: 1">
                        <template v-if="q.analysis">
                            <div :class="['analysis-content', q.isExpanded ? 'expanded' : 'collapsed']">
                                <MarkdownViewer :content="q.analysis" />
                            </div>
                            <div class="expand-toggle-bar">
                                <el-button 
                                    link 
                                    type="primary" 
                                    size="small" 
                                    @click="q.isExpanded = !q.isExpanded"
                                >
                                    {{ q.isExpanded ? '收起解析' : '展开全文' }}
                                    <el-icon class="el-icon--right">
                                        <component :is="q.isExpanded ? 'ArrowUp' : 'ArrowDown'" />
                                    </el-icon>
                                </el-button>
                            </div>
                        </template>
                        <div v-else>
                            <el-button 
                                type="primary" 
                                plain 
                                size="small" 
                                :loading="q.aiLoading" 
                                :icon="MagicStick"
                                @click="fetchAIAnalysis(q)"
                            >
                                {{ q.aiLoading ? '生成中...' : 'AI 智能解析' }}
                            </el-button>
                        </div>
                    </div>
                 </div>
                 
                 <!-- Feedback Buttons -->
                 <div v-if="!q.aiLoading" style="margin-left: 80px; margin-top: 10px; display: flex; gap: 10px;">
                      <el-button v-if="q.analysis" link type="primary" size="small" @click="fetchAIAnalysis(q)">重新生成</el-button>
                      <el-button link type="warning" size="small" @click="handleFeedback(q)">此题不懂?</el-button>
                 </div>

                 <!-- Reply Section (Teacher or AI Agent) -->
                 <div v-if="q.teacherReply" class="reply-box" :class="q.replySource === 'AI' ? 'ai-reply' : 'teacher-reply'">
                    <div class="reply-header">
                        <el-icon v-if="q.replySource === 'AI'"><Cpu /></el-icon>
                        <el-icon v-else><ChatLineRound /></el-icon>
                        <span>{{ q.replySource === 'AI' ? 'AI 助教解析 (仅供参考)：' : '老师的解答：' }}</span>
                    </div>
                    <div class="reply-content">
                        <div :class="['analysis-content', q.isAiExpanded ? 'expanded' : 'collapsed']">
                            <MarkdownViewer :content="q.teacherReply" />
                        </div>
                        <div class="expand-toggle-bar">
                             <el-button link type="primary" size="small" @click="q.isAiExpanded = !q.isAiExpanded">
                                 {{ q.isAiExpanded ? '收起' : '展开' }}
                                 <el-icon class="el-icon--right">
                                     <component :is="q.isAiExpanded ? 'ArrowUp' : 'ArrowDown'" />
                                 </el-icon>
                             </el-button>
                        </div>
                    </div>
                 </div>

                 <!-- 底部操作栏 -->
                 <div class="card-footer-actions">
                     <el-button type="primary" link :icon="ChatLineSquare" @click="handleOpenComments(q)">
                         查看讨论区
                     </el-button>
                 </div>
             </div>
         </el-card>
    </div>
    
    <!-- 全局评论抽屉 -->
    <QuestionCommentDrawer ref="commentDrawerRef" />
    
    <!-- Feedback Dialog -->
    <el-dialog v-model="feedbackDialogVisible" title="提交疑问" width="500px">
        <p style="margin-bottom: 10px; color: #606266;">
            <strong>针对题目：</strong> {{ currentFeedbackQ.content?.substring(0, 30) }}...
        </p>
        <el-input v-model="feedbackContent" type="textarea" :rows="4" placeholder="请详细描述您的疑问..." />
        <template #footer>
            <el-button @click="feedbackDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitFeedback">提交反馈</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.detail-container { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.header { background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.score-board { display: flex; align-items: baseline; }
.score-val { font-size: 28px; font-weight: bold; color: #409EFF; }
.total { color: #909399; font-size: 16px; }
.question-card { margin-bottom: 20px; border: none; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.q-header { display: flex; flex-wrap: wrap; gap: 12px; }
.q-content { font-weight: 600; font-size: 16px; flex: 1; color: #303133; }
.q-status { margin-left: auto; }

.options-list { margin: 15px 0; display: flex; flex-direction: column; gap: 12px; }
.option-item { padding: 12px 18px; border: 1px solid #e4e7ed; border-radius: 6px; display: flex; align-items: center; background: #fff; font-size: 15px; }
.opt-label { font-weight: bold; margin-right: 12px; width: 24px; color: #606266; }
.opt-text { flex: 1; color: #606266; }
.icon-indicator { font-size: 20px; margin-left: 12px; }
.icon-indicator.success { color: #67C23A; }

.correct-option { background-color: #f0f9eb; border-color: #c2e7b0; color: #67C23A; }
.wrong-option { background-color: #fef0f0; border-color: #fbc4c4; color: #F56C6C; }

.analysis-box { margin-top: 20px; padding: 16px 20px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ebeef5; }
.analysis-row { margin-bottom: 8px; display: flex; align-items: flex-start; }
.analysis-row .label { font-weight: bold; width: 80px; flex-shrink: 0; color: #606266; }

/* Folding styles */
.analysis-content { overflow: hidden; transition: max-height 0.3s ease-in-out; }
.analysis-content.collapsed { 
    max-height: 80px; 
    mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
}
.analysis-content.expanded { max-height: 3000px; }
.expand-toggle-bar { margin-top: 5px; }

/* Reply Box Base */
.reply-box { 
    margin-top: 15px; 
    padding: 12px 16px; 
    border-radius: 4px;
}
.teacher-reply { 
    background: #f0f9eb; 
    border-left: 4px solid #67C23A; 
}
.teacher-reply .reply-header { 
    color: #67C23A; 
}
.ai-reply { 
    background: #f0f5ff; 
    border-left: 4px solid #409EFF; 
}
.ai-reply .reply-header { 
    color: #409EFF; 
}

.reply-header { display: flex; align-items: center; gap: 6px; font-weight: bold; margin-bottom: 6px; font-size: 14px; }
.reply-content { color: #606266; font-size: 14px; line-height: 1.6; }

.card-footer-actions {
    margin-top: 15px;
    border-top: 1px dashed #ebeef5;
    padding-top: 10px;
    text-align: right;
}

.text-success { color: #67C23A; font-weight: bold; }
.text-danger { color: #F56C6C; font-weight: bold; }

/* 滚动定位高亮动画 */
@keyframes flash {
    0% { background-color: #fff; }
    50% { background-color: #ecf5ff; box-shadow: 0 0 15px rgba(64, 158, 255, 0.5); }
    100% { background-color: #fff; }
}
.highlight-flash {
    animation: flash 2s ease-in-out;
}

@media (max-width: 768px) {
    .detail-container { padding: 10px; }
    .q-header { flex-direction: column; }
    .q-status { width: 100%; justify-content: flex-end; display: flex; }
    .analysis-row { flex-direction: column; }
}
</style>
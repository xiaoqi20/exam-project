<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, Close, MagicStick, Loading } from '@element-plus/icons-vue'
import { getScoreDetail } from '@/api/exam'
import { ElMessage } from 'element-plus'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const paperInfo = ref({})
const questions = ref([])

const scoreId = route.params.id

const loadDetail = async () => {
  loading.value = true
  try {
    const res = await getScoreDetail(scoreId)
    const data = res
    
    if (data) {
       paperInfo.value = data.paperInfo || {
           title: data.title,
           studentScore: data.studentScore || data.score,
           totalScore: data.totalScore || 100
       }
       
       const rawQuestions = data.questions || []
       questions.value = rawQuestions.map((q, index) => {
           let type = 'choice'
           if (q.type === '单选题' || q.type === '选择题') type = 'choice'
           else if (q.type === '多选题') type = 'multiple_choice'
           else if (q.type === '判断题') type = 'true_false'

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
               analysis: q.analysis || '', // Default to empty string
               aiLoading: false // Track AI loading state
           }
       })
    }
  } catch (error) {
    console.error('Failed to load score detail:', error)
    ElMessage.error('加载详情失败')
  } finally {
    loading.value = false
  }
}

// Helper to clean spacing issues from AI response
const cleanAIContent = (text) => {
    if (!text) return ''
    
    return text
        // 1. CRITICAL: Remove spaces between Chinese characters (AI artifact)
        .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
        .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2') // Repeat for overlaps

        // 2. Fix bold tags spacing: "** Text **" -> "**Text**"
        .replace(/\*\*\s+(.*?)\s+\*\*/g, '**$1**')
        
        // 3. Fix Chinese punctuation spacing
        .replace(/\s*([，。：；！？])\s*/g, '$1')

        // 4. Normalize newlines (just in case)
        .replace(/\r\n/g, '\n')
        
        .trim()
}

// Fetch AI Analysis Stream
const fetchAIAnalysis = async (q) => {
    if (q.aiLoading) return
    q.aiLoading = true
    q.analysis = '' 
    let rawAnalysis = ''
    
    try {
        const token = userStore.token
        const url = `/api/ai/analyze/stream?questionId=${q.id || q.questionId}&studentAnswer=${encodeURIComponent(q.studentAnswer || '')}`
        
        const response = await fetch(url, {
            headers: {
                'token': token,
                'Accept': 'text/event-stream'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const data = line.slice(5).trim()
                    if (data === '[DONE]') break
                    
                    let contentToAdd = ''
                    try {
                         const json = JSON.parse(data)
                         contentToAdd = json.content || ''
                    } catch (e) {
                         contentToAdd = data + ' ' 
                    }
                    
                    rawAnalysis += contentToAdd
                    q.analysis = cleanAIContent(rawAnalysis)
                }
            }
        }
    } catch (e) {
        console.error('AI Stream Error:', e)
        ElMessage.error('AI 解析生成失败')
        q.analysis += '\n\n*(获取解析失败)*'
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
         <el-card v-for="(q, index) in questions" :key="index" class="question-card" shadow="hover">
             <template #header>
                 <div class="q-header">
                     <div class="q-meta">
                         <el-tag :type="q.type === 'choice' ? '' : (q.type === 'true_false' ? 'warning' : 'success')" effect="plain">
                             {{ q.type === 'choice' ? '单选题' : (q.type === 'multiple_choice' ? '多选题' : '判断题') }}
                         </el-tag>
                         <span class="q-score">({{ q.score }}分)</span>
                     </div>
                     <span class="q-content">{{ index + 1 }}. {{ q.content }}</span>
                     
                     <div class="q-status">
                         <el-tag v-if="q.isCorrect" type="success" effect="dark" class="status-tag"><el-icon><Check /></el-icon> 正确 (得{{ q.studentScore || q.score }}分)</el-tag>
                         <el-tag v-else type="danger" effect="dark" class="status-tag"><el-icon><Close /></el-icon> 错误 (得{{ q.studentScore || 0 }}分)</el-tag>
                     </div>
                 </div>
             </template>
             
             <!-- Options Area -->
             <div class="options-list">
                 <template v-if="q.type === 'choice' || q.type === 'multiple_choice'">
                     <div 
                        v-for="(val, key) in q.options" 
                        :key="key" 
                        class="option-item"
                        :class="getOptionClass(q, key)"
                     >
                         <span class="opt-label">{{ key }}.</span>
                         <span class="opt-text">{{ val }}</span>
                         <el-icon v-if="(q.answer || q.correctAnswer || '').includes(key)" class="icon-indicator success"><Check /></el-icon>
                         <el-icon v-if="(q.studentAnswer || '').includes(key) && !(q.answer || q.correctAnswer || '').includes(key)" class="icon-indicator danger"><Close /></el-icon>
                     </div>
                 </template>
                 
                 <template v-if="q.type === 'true_false'">
                      <div class="option-item" :class="getOptionClass(q, 'A')">
                          <span class="opt-label">A.</span>
                          <span class="opt-text">正确</span>
                          <el-icon v-if="(q.answer || q.correctAnswer || '') === 'A'" class="icon-indicator success"><Check /></el-icon>
                          <el-icon v-if="(q.studentAnswer || '') === 'A' && (q.answer || q.correctAnswer || '') !== 'A'" class="icon-indicator danger"><Close /></el-icon>
                      </div>
                      <div class="option-item" :class="getOptionClass(q, 'B')">
                          <span class="opt-label">B.</span>
                          <span class="opt-text">错误</span>
                          <el-icon v-if="(q.answer || q.correctAnswer || '') === 'B'" class="icon-indicator success"><Check /></el-icon>
                          <el-icon v-if="(q.studentAnswer || '') === 'B' && (q.answer || q.correctAnswer || '') !== 'B'" class="icon-indicator danger"><Close /></el-icon>
                      </div>
                 </template>
             </div>
             
             <div class="analysis-box">
                 <div class="analysis-row">
                    <span class="label">我的答案：</span>
                    <span class="value" :class="q.isCorrect ? 'text-success' : 'text-danger'">{{ q.studentAnswer || '未作答' }}</span>
                 </div>
                 <div class="analysis-row">
                    <span class="label">正确答案：</span>
                    <span class="value text-success">{{ q.answer || q.correctAnswer }}</span>
                 </div>
                 
                 <!-- Analysis Section -->
                 <div class="analysis-row analysis-text">
                    <span class="label">解析：</span>
                    <div class="value" style="flex: 1">
                        <template v-if="q.analysis">
                            <MarkdownViewer :content="q.analysis" />
                            <span v-if="q.aiLoading" class="cursor"></span>
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
                 <div v-if="q.analysis && !q.aiLoading" style="margin-left: 80px; margin-top: 5px;">
                      <el-button link type="primary" size="small" @click="fetchAIAnalysis(q)">重新生成</el-button>
                 </div>
             </div>

         </el-card>
    </div>
  </div>
</template>

<style scoped>
.detail-container {
    padding: 20px;
    background: #f5f7fa;
    min-height: 100vh;
}
.header {
    background: #fff;
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}
.score-board {
    display: flex;
    align-items: baseline;
    font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}
.label { color: #606266; font-size: 14px; margin-right: 4px;}
.score-val {
    font-size: 28px;
    font-weight: bold;
    color: #409EFF;
}
.total {
    color: #909399;
    font-size: 16px;
}

.question-card {
    margin-bottom: 20px;
    border: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.q-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px;
    line-height: 1.5;
}
.q-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}
.q-score { color: #909399; font-size: 13px; }
.q-content {
    font-weight: 600;
    font-size: 16px;
    flex: 1;
    min-width: 200px;
    color: #303133;
}
.q-status {
    flex-shrink: 0;
    margin-left: auto;
    display: flex;
}
.status-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    padding: 4px 12px;
    height: auto;
    line-height: 1.4;
    white-space: normal;
    min-height: 28px;
}

.options-list {
    margin: 15px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.option-item {
    padding: 14px 18px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    display: flex;
    align-items: center;
    background: #fff;
    transition: all 0.3s;
    font-size: 15px;
}
.option-item:hover {
    border-color: #c0c4cc;
    background-color: #fafafa;
}
.opt-label {
    font-weight: bold;
    margin-right: 12px;
    width: 24px;
    color: #606266;
}
.opt-text { flex: 1; color: #606266; line-height: 1.4; }

.icon-indicator {
    font-size: 20px;
    margin-left: 12px;
    font-weight: bold;
}
.icon-indicator.success { color: #67C23A; }
.icon-indicator.danger { color: #F56C6C; }

.correct-option {
    background-color: #f0f9eb;
    border-color: #c2e7b0;
    color: #67C23A;
}
.correct-option .opt-label, .correct-option .opt-text { color: #67C23A; }

.wrong-option {
    background-color: #fef0f0;
    border-color: #fbc4c4;
    color: #F56C6C;
}
.wrong-option .opt-label, .wrong-option .opt-text { color: #F56C6C; }

.analysis-box {
    margin-top: 20px;
    padding: 16px 20px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #ebeef5;
}
.analysis-row {
    margin-bottom: 8px;
    display: flex;
    align-items: flex-start;
}
.analysis-row:last-child { margin-bottom: 0; }
.analysis-row .label {
    font-weight: bold;
    width: 80px;
    flex-shrink: 0;
    color: #606266;
}
.analysis-text .value {
    color: #606266;
    line-height: 1.6;
}

.text-success { color: #67C23A; font-weight: bold; }
.text-danger { color: #F56C6C; font-weight: bold; }

/* AI Cursor Animation */
.cursor {
    display: inline-block;
    width: 2px;
    height: 14px;
    background: #d63384; /* Match the bold color for consistency */
    vertical-align: middle;
    margin-left: 2px;
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

@media (max-width: 768px) {
    .q-header {
        flex-direction: column;
        align-items: flex-start;
    }
    .q-status {
        margin-left: 0;
        margin-top: 8px;
    }
}
</style>
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, Close } from '@element-plus/icons-vue'
import { getScoreDetail } from '@/api/exam'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const paperInfo = ref({})
const questions = ref([])

const scoreId = route.params.id

const loadDetail = async () => {
  loading.value = true
  try {
    const res = await getScoreDetail(scoreId)
    // Assuming structure: res.data = { paperInfo: {}, questions: [] }
    // Adjust based on actual response
    const data = res
    
    if (data) {
       // Support both nested structure or flat if that's how backend sends it
       paperInfo.value = data.paperInfo || {
           title: data.title,
           studentScore: data.studentScore || data.score,
           totalScore: data.totalScore || 100
       }
       
       const rawQuestions = data.questions || []
       questions.value = rawQuestions.map(q => {
           let type = 'choice'
           if (q.type === '单选题' || q.type === '选择题') type = 'choice'
           else if (q.type === '多选题') type = 'multiple_choice'
           else if (q.type === '判断题') type = 'true_false'

           // Normalize options
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
               // Ensure correct boolean for rendering
               isCorrect: q.studentScore === q.score || q.answer === q.studentAnswer // Fallback logic
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

const getOptionClass = (q, key) => {
    // Logic for highlighting options
    // Green: Correct Answer
    // Red: User selected BUT Wrong
    
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
                 <!-- Choice / Multiple Choice -->
                 <template v-if="q.type === 'choice' || q.type === 'multiple_choice'">
                     <div 
                        v-for="(val, key) in q.options" 
                        :key="key" 
                        class="option-item"
                        :class="getOptionClass(q, key)"
                     >
                         <span class="opt-label">{{ key }}.</span>
                         <span class="opt-text">{{ val }}</span>
                         
                         <!-- Icons for clarity -->
                         <el-icon v-if="(q.answer || q.correctAnswer || '').includes(key)" class="icon-indicator success"><Check /></el-icon>
                         <el-icon v-if="(q.studentAnswer || '').includes(key) && !(q.answer || q.correctAnswer || '').includes(key)" class="icon-indicator danger"><Close /></el-icon>
                     </div>
                 </template>
                 
                 <!-- True/False -->
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
                 <div v-if="q.analysis" class="analysis-row analysis-text">
                    <span class="label">解析：</span>
                    <span class="value">{{ q.analysis }}</span>
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
    box-shadow: 0 4px 16px rgba(0,0,0,0.08); /* Softer shadow */
}

/* Question Header Layout */
.q-header {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping on small screens */
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
    min-width: 200px; /* Ensure text doesn't get too squashed */
    color: #303133;
}
.q-status {
    flex-shrink: 0;
    margin-left: auto; /* Push to right */
    display: flex; /* Use flex to control child tag */
}
.status-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    padding: 4px 12px; /* Add vertical padding */
    height: auto; /* Allow auto height */
    line-height: 1.4; /* Better line height for wrapping */
    white-space: normal; /* Allow text to wrap if absolutely necessary, though flex-shrink 0 usually prevents it */
    min-height: 28px;
}

/* Options */
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

/* Highlight Styles */
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

/* Analysis Box */
.analysis-box {
    margin-top: 20px;
    padding: 16px 20px;
    background: #f8f9fa; /* Lighter grey */
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

/* Responsive Adjustments */
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
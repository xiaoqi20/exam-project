<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back, QuestionFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const paperInfo = reactive({
  id: route.params.id,
  title: route.query.title || '试卷详情',
  score: route.query.score || 0,
  totalScore: 100
})

// 模拟详情数据（包含用户答案和标准答案）
const questions = [
  { 
    id: 1, 
    type: 'choice', 
    content: 'Vue 3 的响应式系统基于什么实现？', 
    options: {A:'Object.defineProperty', B:'Proxy', C:'Observer', D:'Watcher'}, 
    score: 5,
    userAnswer: 'B',
    correctAnswer: 'B',
    isCorrect: true,
    analysis: 'Vue 3 使用 ES6 的 Proxy 对象来实现响应式，解决了 Vue 2 中 Object.defineProperty 的一些局限性。'
  },
  { 
    id: 2, 
    type: 'choice', 
    content: '以下哪个是 Vue 的生命周期钩子？', 
    options: {A:'onMounted', B:'onReady', C:'onInit', D:'onStart'}, 
    score: 5,
    userAnswer: 'C',
    correctAnswer: 'A',
    isCorrect: false,
    analysis: 'Vue 3 组合式 API 中使用 onMounted，对应 Vue 2 的 mounted。'
  },
  { 
    id: 3, 
    type: 'true_false', 
    content: 'v-if 和 v-show 的作用完全相同。', 
    score: 5,
    userAnswer: 'True',
    correctAnswer: 'False',
    isCorrect: false,
    analysis: 'v-if 是条件渲染，不渲染 DOM；v-show 是切换 CSS 的 display 属性。'
  }
]

const handleBack = () => {
  router.go(-1)
}

// 错题反馈逻辑
const feedbackDialogVisible = ref(false)
const currentFeedbackQuestion = ref(null)
const feedbackContent = ref('')

const handleFeedback = (question) => {
  currentFeedbackQuestion.value = question
  feedbackContent.value = ''
  feedbackDialogVisible.value = true
}

const submitFeedback = () => {
  if (!feedbackContent.value.trim()) {
    ElMessage.warning('请输入疑问内容')
    return
  }
  console.log('Feedback:', {
    questionId: currentFeedbackQuestion.value.id,
    content: feedbackContent.value
  })
  ElMessage.success('反馈已提交，教师将尽快回复')
  feedbackDialogVisible.value = false
}
</script>

<template>
  <div class="app-container">
    <div class="detail-header">
      <el-page-header @back="handleBack">
        <template #content>
          <span class="header-title">{{ paperInfo.title }} - 成绩详情</span>
        </template>
        <template #extra>
          <div class="score-display">
            总分：<span class="score-num">{{ paperInfo.score }}</span> / {{ paperInfo.totalScore }}
          </div>
        </template>
      </el-page-header>
    </div>

    <div class="detail-content">
       <div v-for="(item, index) in questions" :key="item.id" class="question-card" :class="{ 'error-card': !item.isCorrect }">
         <div class="q-header">
           <span class="q-no">{{ index + 1 }}.</span>
           <el-tag size="small" :type="item.type === 'choice' ? '' : 'warning'">
             {{ item.type === 'choice' ? '单选题' : '判断题' }}
           </el-tag>
           <span class="q-text">{{ item.content }}</span>
           <span class="q-points">({{ item.score }}分)</span>
         </div>

         <div class="q-body">
           <!-- 选项展示 -->
           <div v-if="item.type === 'choice'" class="options-list">
             <div 
               v-for="(val, key) in item.options" 
               :key="key" 
               class="option-item"
               :class="{
                 'user-selected': item.userAnswer === key,
                 'correct-option': item.correctAnswer === key
               }"
             >
               <span class="opt-key">{{ key }}.</span> {{ val }}
               <span v-if="item.userAnswer === key && item.correctAnswer !== key" class="status-icon text-danger">✕</span>
               <span v-if="item.correctAnswer === key" class="status-icon text-success">✓</span>
             </div>
           </div>

           <div v-if="item.type === 'true_false'" class="options-list">
              <div class="option-item" :class="{'user-selected': item.userAnswer === 'True', 'correct-option': item.correctAnswer === 'True'}">
                正确
                <span v-if="item.userAnswer === 'True' && item.correctAnswer !== 'True'" class="status-icon text-danger">✕</span>
                <span v-if="item.correctAnswer === 'True'" class="status-icon text-success">✓</span>
              </div>
              <div class="option-item" :class="{'user-selected': item.userAnswer === 'False', 'correct-option': item.correctAnswer === 'False'}">
                错误
                <span v-if="item.userAnswer === 'False' && item.correctAnswer !== 'False'" class="status-icon text-danger">✕</span>
                <span v-if="item.correctAnswer === 'False'" class="status-icon text-success">✓</span>
              </div>
           </div>
           
           <!-- 结果分析 -->
           <div class="result-analysis">
             <div class="user-result">
               你的答案：<span :class="item.isCorrect ? 'text-success' : 'text-danger'">{{ item.userAnswer }}</span>
               <span class="divider">|</span>
               正确答案：<span class="text-success">{{ item.correctAnswer }}</span>
             </div>
             <div class="analysis-text">
               <strong>解析：</strong>{{ item.analysis }}
             </div>
           </div>
           
           <!-- 反馈按钮 -->
           <div class="card-footer" style="margin-top: 15px; text-align: right;">
             <el-button type="primary" link :icon="QuestionFilled" @click="handleFeedback(item)">
               对此题有疑问？反馈给老师
             </el-button>
           </div>
         </div>
       </div>
    </div>

    <!-- 疑问反馈弹窗 -->
    <el-dialog v-model="feedbackDialogVisible" title="错题疑问反馈" width="500px">
       <p style="margin-bottom: 10px; color: #606266;">
         当前题目：<strong>{{ currentFeedbackQuestion?.content }}</strong>
       </p>
       <el-input
         v-model="feedbackContent"
         type="textarea"
         rows="4"
         placeholder="请详细描述您的疑问，以便老师更好地解答..."
       />
       <template #footer>
         <span class="dialog-footer">
           <el-button @click="feedbackDialogVisible = false">取消</el-button>
           <el-button type="primary" @click="submitFeedback">提交反馈</el-button>
         </span>
       </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; max-width: 1000px; margin: 0 auto; }
.detail-header { background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.header-title { font-weight: bold; }
.score-display { font-size: 16px; }
.score-num { color: #F56C6C; font-size: 24px; font-weight: bold; }

.question-card { background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #ebeef5; }
.question-card.error-card { border-left: 4px solid #F56C6C; }

.q-header { margin-bottom: 15px; font-size: 16px; font-weight: 500; display: flex; align-items: center; }
.q-no { margin-right: 8px; font-weight: bold; color: #409EFF; }
.q-text { margin: 0 8px; }
.q-points { color: #999; font-size: 14px; }

.options-list { margin-bottom: 15px; padding-left: 30px; }
.option-item { padding: 8px 12px; margin-bottom: 5px; border-radius: 4px; border: 1px solid transparent; display: flex; align-items: center; }
.option-item.user-selected { background-color: #ecf5ff; border-color: #d9ecff; }
.option-item.correct-option { background-color: #f0f9eb; border-color: #e1f3d8; font-weight: bold; }
.opt-key { font-weight: bold; margin-right: 8px; }
.status-icon { margin-left: 10px; font-weight: bold; }
.text-danger { color: #F56C6C; }
.text-success { color: #67C23A; }

.result-analysis { background: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 14px; }
.user-result { margin-bottom: 8px; }
.divider { margin: 0 10px; color: #ccc; }
.analysis-text { line-height: 1.5; color: #606266; }
</style>
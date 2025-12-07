<script setup>
import { reactive, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, List } from '@element-plus/icons-vue'
import { enterExam, submitExam } from '@/api/exam'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const timer = ref(null)
const paperData = ref([])
const answers = reactive({})

const examInfo = reactive({
  id: route.params.id,
  title: route.query.title || '在线考试',
  duration: parseInt(route.query.duration) || 90,
  remainingTime: 0, // Will be calculated
  startTime: null // Record when the user actually started the exam
})

// Storage key for persisting exam deadline
const storageKey = computed(() => `exam_deadline_${userStore.userInfo.id}_${examInfo.id}`)
// Storage key for start time
const startTimeKey = computed(() => `exam_start_${userStore.userInfo.id}_${examInfo.id}`)

const initRemainingTime = () => {
  const savedDeadline = localStorage.getItem(storageKey.value)
  const savedStartTime = localStorage.getItem(startTimeKey.value)
  const now = Date.now()
  let deadline

  // Restore or set start time
  if (savedStartTime) {
    examInfo.startTime = parseInt(savedStartTime)
  } else {
    examInfo.startTime = now
    localStorage.setItem(startTimeKey.value, now.toString())
  }

  if (savedDeadline) {
    deadline = parseInt(savedDeadline)
  } else {
    // First time enter: current time + duration minutes
    deadline = now + examInfo.duration * 60 * 1000
    localStorage.setItem(storageKey.value, deadline.toString())
  }

  const diff = Math.floor((deadline - now) / 1000)
  examInfo.remainingTime = diff > 0 ? diff : 0
}

const formattedTime = computed(() => {
  const m = Math.floor(examInfo.remainingTime / 60)
  const s = examInfo.remainingTime % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const startTimer = () => {
  // Ensure time is initialized before starting
  if (examInfo.remainingTime <= 0 && localStorage.getItem(storageKey.value)) {
      // Checks if it was already finished
      handleSubmit(true)
      return
  }

  timer.value = setInterval(() => {
    if (examInfo.remainingTime > 0) {
      examInfo.remainingTime--
    } else {
      clearInterval(timer.value)
      handleSubmit(true)
    }
  }, 1000)
}

const scrollToQuestion = (id) => {
  const el = document.getElementById(`question-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const loadPaper = async () => {
  loading.value = true
  try {
    const res = await enterExam(examInfo.id)
    console.log('Exam Paper API Response:', res) // Debug log

    // Note: request.js interceptor returns res.data directly.
    // So 'res' here IS the exam object ({ paperId: 1, questions: [], ... })
    const data = res 

    if (data && data.questions) {
      const rawQuestions = data.questions || []
      
      // Adapt backend data structure to frontend needs
      paperData.value = rawQuestions.map(q => {
        let type = 'choice' // Default to choice
        
        if (q.type === '单选题') type = 'choice'
        else if (q.type === '多选题') type = 'multiple_choice'
        else if (q.type === '判断题') type = 'true_false'
        
        const adaptedQ = {
          id: q.qid,
          content: q.content,
          score: q.score,
          type: type, 
          options: {}
        }

        // Transform flat options (optionA...optionD) to options object for choice questions
        if (adaptedQ.type === 'choice' || adaptedQ.type === 'multiple_choice') {
          if (q.optionA) adaptedQ.options['A'] = q.optionA
          if (q.optionB) adaptedQ.options['B'] = q.optionB
          if (q.optionC) adaptedQ.options['C'] = q.optionC
          if (q.optionD) adaptedQ.options['D'] = q.optionD
          if (q.optionE) adaptedQ.options['E'] = q.optionE

          // Fallback: Try parsing 'options' field (JSON string or object)
          if (Object.keys(adaptedQ.options).length === 0 && q.options) {
             try {
                const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                Object.assign(adaptedQ.options, parsed)
             } catch (e) {
                console.error('Error parsing options:', e)
             }
          }
        }
        
        // Initialize answer array for multiple choice
        if (adaptedQ.type === 'multiple_choice') {
             answers[adaptedQ.id] = []
        }

        return adaptedQ
      })
    } else {
        console.warn('No questions found in response')
    }
  } catch (error) {
    console.error('Failed to load exam paper:', error)
    ElMessage.error('加载试卷失败，请重试')
  } finally {
    loading.value = false
  }
}

const submitLogic = async () => {
  loading.value = true
  try {
    // Format answers for API
    const formattedAnswers = []
    for (const [qId, val] of Object.entries(answers)) {
      let studentAnswer = ''
      if (Array.isArray(val)) {
        // For multiple choice, join directly (backend supports unordered matching)
        studentAnswer = val.join('')
      } else {
        studentAnswer = val ? val.toString() : ''
      }
      
      if (studentAnswer) {
        formattedAnswers.push({
          questionId: parseInt(qId),
          studentAnswer: studentAnswer
        })
      }
    }

    // Calculate actual duration in minutes (rounded up)
    const now = Date.now()
    const durationMs = now - (examInfo.startTime || now)
    const actualDuration = Math.ceil(durationMs / 1000 / 60)
    
    // Format start time string (YYYY-MM-DD HH:mm:ss)
    const startTimeDate = new Date(examInfo.startTime || now)
    const formattedStartTime = startTimeDate.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

    const submitData = {
      paperId: parseInt(examInfo.id),
      answers: formattedAnswers,
      // Extra fields for backend to record time
      startTime: formattedStartTime,
      duration: actualDuration
    }
    
    console.log('Submitting Exam:', submitData)
    
    await submitExam(submitData)
    
    // Clear the saved deadline and start time upon success submission
    localStorage.removeItem(storageKey.value)
    localStorage.removeItem(startTimeKey.value)
    
    ElMessage.success('试卷提交成功！')
    // TODO: Navigate to result page or history
    // For now back to hall
    router.replace('/dashboard/student/exam/hall') 
  } catch (error) {
    console.error('Submit failed:', error)
    ElMessage.error('提交失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleSubmit = (isAuto = false) => {
  if (isAuto) {
    ElMessage.info('考试时间结束，自动提交')
    submitLogic()
    return
  }
  
  const total = paperData.value.length
  // Count answered questions. For arrays (multiple choice), check length > 0.
  let answeredCount = 0
  for (const qId in answers) {
      const val = answers[qId]
      if (Array.isArray(val)) {
          if (val.length > 0) answeredCount++
      } else if (val !== null && val !== undefined && val !== '') {
          answeredCount++
      }
  }
  
  if (answeredCount < total) {
    ElMessageBox.confirm(`还有 ${total - answeredCount} 道题未作答，确定提交吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      submitLogic()
    }).catch(() => {})
  } else {
    ElMessageBox.confirm('确定要提交试卷吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }).then(() => {
      submitLogic()
    }).catch(() => {})
  }
}

onMounted(() => {
  loadPaper()
  initRemainingTime()
  startTimer()
})

onBeforeUnmount(() => {
  if (timer.value) clearInterval(timer.value)
})
</script>

<template>
  <div class="exam-container">
    <!-- 顶部悬浮条 -->
    <div class="exam-header">
      <div class="left">
        <h3>{{ examInfo.title }}</h3>
      </div>
      <div class="center">
        <el-icon><Clock /></el-icon>
        <span class="timer" :class="{ 'warning': examInfo.remainingTime < 300 }">
          剩余时间：{{ formattedTime }}
        </span>
      </div>
      <div class="right">
        <el-button type="primary" @click="handleSubmit(false)">提交试卷</el-button>
      </div>
    </div>

    <div class="exam-body">
      <!-- 左侧答题卡 -->
      <div class="answer-card">
        <div class="card-title">
          <el-icon><List /></el-icon> 答题卡
        </div>
        <div class="card-content">
          <div 
            v-for="(item, index) in paperData" 
            :key="item.id"
            class="card-item"
            :class="{ 'active': Array.isArray(answers[item.id]) ? answers[item.id].length > 0 : answers[item.id] }"
            @click="scrollToQuestion(item.id)"
          >
            {{ index + 1 }}
          </div>
        </div>
        <div class="card-legend">
          <span><span class="dot active"></span> 已答</span>
          <span><span class="dot"></span> 未答</span>
        </div>
      </div>

      <!-- 右侧题目区 -->
      <div class="question-area">
        <div 
          v-for="(item, index) in paperData" 
          :key="item.id" 
          :id="'question-' + item.id"
          class="question-item"
        >
          <div class="q-title">
            <span class="q-no">{{ index + 1 }}.</span>
            <el-tag size="small" style="margin-right: 8px">
              {{ item.type === 'choice' ? '单选题' : (item.type === 'multiple_choice' ? '多选题' : '判断题') }}
            </el-tag>
            <span>{{ item.content }}</span>
            <span class="q-score">({{ item.score }}分)</span>
          </div>
          
          <div class="q-options">
            <!-- 单选题 -->
            <el-radio-group v-if="item.type === 'choice'" v-model="answers[item.id]" class="vertical-radio">
              <el-radio 
                v-for="(val, key) in item.options" 
                :key="key" 
                :label="key" 
                size="large" 
                border
              >
                {{ key }}. {{ val }}
              </el-radio>
            </el-radio-group>

            <!-- 多选题 -->
            <el-checkbox-group v-if="item.type === 'multiple_choice'" v-model="answers[item.id]" class="vertical-checkbox">
               <el-checkbox
                v-for="(val, key) in item.options" 
                :key="key" 
                :label="key" 
                size="large" 
                border
              >
                {{ key }}. {{ val }}
              </el-checkbox>
            </el-checkbox-group>

            <!-- 判断题 -->
            <el-radio-group v-if="item.type === 'true_false'" v-model="answers[item.id]">
              <el-radio label="A" size="large" border>正确</el-radio>
              <el-radio label="B" size="large" border>错误</el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exam-container {
  height: calc(100vh - 60px); /* Adjust based on layout */
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 顶部栏 */
.exam-header {
  height: 60px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.timer {
  font-size: 18px;
  font-weight: bold;
  margin-left: 8px;
  color: #333;
}
.timer.warning { color: #F56C6C; animation: blink 1s infinite; }

/* 主体 */
.exam-body {
  flex: 1;
  display: flex;
  padding: 20px;
  overflow: hidden;
  gap: 20px;
}

/* 答题卡 */
.answer-card {
  width: 280px;
  background: #fff;
  border-radius: 4px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}
.card-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 10px;
  padding: 10px 0;
}
.card-item {
  width: 35px;
  height: 35px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.card-item:hover { border-color: #409EFF; color: #409EFF; }
.card-item.active { background: #409EFF; color: #fff; border-color: #409EFF; }

.card-legend { margin-top: 10px; font-size: 12px; color: #666; display: flex; gap: 15px; }
.dot { display: inline-block; width: 10px; height: 10px; border: 1px solid #dcdfe6; margin-right: 4px; }
.dot.active { background: #409EFF; border-color: #409EFF; }

/* 题目区 */
.question-area {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  padding: 20px 40px;
  overflow-y: auto;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}
.question-item { margin-bottom: 40px; }
.q-title { font-size: 16px; font-weight: 500; margin-bottom: 15px; line-height: 1.6; }
.q-no { font-weight: bold; margin-right: 5px; color: #409EFF; }
.q-score { color: #999; font-size: 14px; margin-left: 5px; }
.vertical-radio { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; width: 100%; }
.vertical-radio .el-radio { margin-left: 0; width: 100%; height: auto; padding: 10px 15px; }

.vertical-checkbox { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; width: 100%; }
.vertical-checkbox .el-checkbox { margin-left: 0; width: 100%; height: auto; padding: 10px 15px; }
.vertical-checkbox .el-checkbox.is-bordered+.el-checkbox.is-bordered { margin-left: 0; }

@keyframes blink { 50% { opacity: 0.5; } }
</style>
<script setup>
import { reactive, ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { Clock, List, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { enterExam, submitExam } from '@/api/exam'
import { useUserStore } from '@/stores/user'
import { useExamStore } from '@/stores/exam'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const examStore = useExamStore()

const loading = ref(false)
const timer = ref(null)
const paperData = ref([])
const answers = reactive({})
const isMobile = ref(false)
const sheetVisible = ref(false) // Mobile answer sheet drawer
let ws = null // WebSocket 实例

// Track current question for mobile navigation
const currentQIndex = ref(0)

// Computed for current question (Mobile)
const currentQuestion = computed(() => {
    if (!paperData.value.length) return null
    return paperData.value[currentQIndex.value]
})

const examInfo = reactive({
  id: route.params.id,
  title: route.query.title || '在线考试',
  duration: parseInt(route.query.duration) || 90,
  remainingTime: 0, 
  startTime: null 
})

const storageKey = computed(() => `exam_deadline_${userStore.userInfo.id}_${examInfo.id}`)
const startTimeKey = computed(() => `exam_start_${userStore.userInfo.id}_${examInfo.id}`)
const answersKey = computed(() => `exam_answers_${userStore.userInfo.id}_${examInfo.id}`)

// 防抖函数实现
const debounce = (fn, delay) => {
  let t = null
  return (...args) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

// 监听答案变化并保存
watch(answers, debounce((newVal) => {
    if (Object.keys(newVal).length > 0) {
        localStorage.setItem(answersKey.value, JSON.stringify(newVal))
    }
}, 1000), { deep: true })

// 监听答题进度 (合并防抖)
watch(answers, debounce(() => {
    reportProgress()
}, 2000), { deep: true })

const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
}

const initRemainingTime = () => {
  const savedDeadline = localStorage.getItem(storageKey.value)
  const savedStartTime = localStorage.getItem(startTimeKey.value)
  const now = Date.now()
  let deadline

  // Practice mode always starts fresh
  if (examInfo.id === 'practice') {
      examInfo.startTime = now
      // No deadline for practice usually, or reset it
      deadline = now + examInfo.duration * 60 * 1000
  } else if (savedStartTime) {
    examInfo.startTime = parseInt(savedStartTime)
  } else {
    examInfo.startTime = now
    localStorage.setItem(startTimeKey.value, now.toString())
  }

  if (savedDeadline) {
    deadline = parseInt(savedDeadline)
  } else {
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
  if (examInfo.remainingTime <= 0 && localStorage.getItem(storageKey.value)) {
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

// Jump to question
const jumpToQuestion = (index, id) => {
  if (isMobile.value) {
      currentQIndex.value = index
      sheetVisible.value = false
  } else {
      const el = document.getElementById(`question-${id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
  }
}

// Mobile Navigation
const nextQuestion = () => {
    if (currentQIndex.value < paperData.value.length - 1) {
        currentQIndex.value++
    } else {
        ElMessage.info('已经是最后一题了')
    }
}
const prevQuestion = () => {
    if (currentQIndex.value > 0) {
        currentQIndex.value--
    } else {
        ElMessage.info('已经是第一题了')
    }
}

const loadPaper = async () => {
  loading.value = true
  try {
    // Practice Mode
    if (examInfo.id === 'practice') {
        // Reset timer for new practice
        examInfo.startTime = Date.now()
        // Optional: Clear old storage if exists to avoid conflicts
        localStorage.removeItem(storageKey.value)
        localStorage.removeItem(startTimeKey.value)
        
        const pData = examStore.practicePaper
        if (pData && pData.questions) {
            paperData.value = pData.questions.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            }))
            // Initialize answers
            paperData.value.forEach(q => {
                if (q.type === 'multiple_choice') answers[q.id] = []
            })
        } else {
            ElMessage.error('练习数据丢失，请重新进入')
            router.replace('/dashboard')
        }
        loading.value = false
        return
    }

    const res = await enterExam(examInfo.id)
    const data = res 

    if (data && data.questions) {
      const rawQuestions = data.questions || []
      
      paperData.value = rawQuestions.map(q => {
        let type = 'choice'
        
        if (q.type === '单选题') type = 'choice'
        else if (q.type === '多选题') type = 'multiple_choice'
        else if (q.type === '判断题') type = 'true_false'
        else if (q.type === '填空题' || q.type === 'fill_blank') type = 'fill_blank'
        else if (q.type === '简答题' || q.type === 'short_answer') type = 'short_answer'
        
        const adaptedQ = {
          id: q.qid,
          content: q.content,
          score: q.score,
          type: type, 
          options: {}
        }

        if (adaptedQ.type === 'choice' || adaptedQ.type === 'multiple_choice') {
          if (q.optionA) adaptedQ.options['A'] = q.optionA
          if (q.optionB) adaptedQ.options['B'] = q.optionB
          if (q.optionC) adaptedQ.options['C'] = q.optionC
          if (q.optionD) adaptedQ.options['D'] = q.optionD
          if (q.optionE) adaptedQ.options['E'] = q.optionE

          if (Object.keys(adaptedQ.options).length === 0 && q.options) {
             try {
                const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                Object.assign(adaptedQ.options, parsed)
             } catch (e) {}
          }
        }
        
        if (adaptedQ.type === 'multiple_choice') {
             answers[adaptedQ.id] = []
        }

        return adaptedQ
      })

      // 恢复上次保存的答案
      const savedAnswers = localStorage.getItem(answersKey.value)
      if (savedAnswers) {
          try {
              const parsed = JSON.parse(savedAnswers)
              Object.assign(answers, parsed)
              ElMessage({
                  message: '已自动为您恢复答题进度',
                  type: 'success',
                  duration: 2000
              })
          } catch (e) {
              console.error('恢复进度失败', e)
          }
      }
    }
  } catch (error) {
    ElMessage.error('加载试卷失败')
  } finally {
    loading.value = false
  }
}

const submitLogic = async () => {
  // ... Practice Mode logic remains same ...
  if (examInfo.id === 'practice') {
      // ... (keep practice logic)
      let score = 0
      let totalScore = 0
      paperData.value.forEach(q => {
          totalScore += q.score
          const userAns = answers[q.id]
          let formattedAns = ''
          if (Array.isArray(userAns)) formattedAns = userAns.sort().join('')
          else formattedAns = userAns || ''
          
          if (formattedAns === q.answer) score += q.score
      })
      
      ElMessageBox.alert(`本次练习得分：${score} / ${totalScore}`, '练习结束', {
          confirmButtonText: '返回',
          callback: () => {
              router.replace('/dashboard/student/exam/hall')
          }
      })
      return
  }

  // 开启全屏加载
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在提交试卷，并同步调用 AI 阅卷中，请稍候...',
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    const formattedAnswers = []
    // ... rest of the formatting logic ...
    for (const [qId, val] of Object.entries(answers)) {
      let studentAnswer = ''
      if (Array.isArray(val)) {
        studentAnswer = val.join('')
      } else {
        // 去除首尾空格，防止填空题因为多余空格导致判错
        studentAnswer = val ? val.toString().trim() : ''
      }
      
      if (studentAnswer) {
        formattedAnswers.push({
          questionId: parseInt(qId),
          studentAnswer: studentAnswer
        })
      }
    }

    const now = Date.now()
    const durationMs = now - (examInfo.startTime || now)
    const actualDuration = Math.ceil(durationMs / 1000 / 60)
    
    const startTimeDate = new Date(examInfo.startTime || now)
    const formattedStartTime = startTimeDate.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

    const submitData = {
      paperId: parseInt(examInfo.id),
      answers: formattedAnswers,
      startTime: formattedStartTime,
      duration: actualDuration
    }
    
    await submitExam(submitData)
    
    // 发送交卷信号 (确保在连接断开前发送)
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'STATUS_UPDATE', data: { status: 'submitted' } }))
    }
    
    localStorage.removeItem(storageKey.value)
    localStorage.removeItem(startTimeKey.value)
    localStorage.removeItem(answersKey.value)
    
    // 关闭加载
    loadingInstance.close()

    ElMessage.success('试卷提交成功！')
    
    // 延迟跳转，确保 WS 消息已发出
    setTimeout(() => {
        router.replace('/dashboard/student/exam/hall') 
    }, 500) 
  } catch (error) {
    loadingInstance.close()
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
  let answeredCount = 0
  for (const qId in answers) {
      const val = answers[qId]
      if (Array.isArray(val)) {
          if (val.length > 0) answeredCount++
      } else if (val !== null && val !== undefined && val !== '') {
          answeredCount++
      }
  }
  
  const msg = answeredCount < total 
      ? `还有 ${total - answeredCount} 道题未作答，确定提交吗？`
      : '确定要提交试卷吗？'

  ElMessageBox.confirm(msg, '交卷提示', {
      confirmButtonText: '提交',
      cancelButtonText: '取消',
      type: 'warning'
  }).then(() => {
      submitLogic()
  }).catch(() => {})
}

// WebSocket Logic
const initWebSocket = () => {
    // 仅正式考试连接监控，练习模式跳过
    if (examInfo.id === 'practice') return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    // 严格对标规范：/ws/exam/{examId}/{userId}
    const wsUrl = `${protocol}//${host}/ws/exam/${examInfo.id}/${userStore.userInfo.id}`
    
    ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
        // 上线通知
        ws.send(JSON.stringify({ type: 'STATUS_UPDATE', data: { status: 'online' } }))
        
        // 心跳包 (每30秒发一次，保活 + 更新在线状态)
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'STATUS_UPDATE', data: { status: 'online' } }))
            }
        }, 30000)
    }
    
    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'FORCE_SUBMIT') {
                ElMessageBox.alert('您已被老师强制收卷！', '考试结束', {
                    confirmButtonText: '确定',
                    callback: () => handleSubmit(true) // 自动提交
                })
            } else if (msg.type === 'REMIND') {
                ElNotification({
                    title: '监考老师提醒',
                    message: msg.data.message,
                    type: 'warning',
                    duration: 0
                })
            }
        } catch(e) {}
    }
}

// 监听切屏
const handleVisibilityChange = () => {
    if (document.hidden && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
            type: 'ALERT', 
            data: { alertType: 'switch_screen' } 
        }))
        ElMessage.warning('警告：检测到切屏行为，已记录！')
    }
}

// 上报进度 (在答题时调用)
const reportProgress = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // 计算已答数量
        let answeredCount = 0
        for (const key in answers) {
            if (answers[key] && (Array.isArray(answers[key]) ? answers[key].length > 0 : true)) {
                answeredCount++
            }
        }
        ws.send(JSON.stringify({ 
            type: 'PROGRESS_UPDATE', 
            data: { 
                progress: answeredCount,
                total: paperData.value.length // 携带总题数
            } 
        }))
    }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('visibilitychange', handleVisibilityChange) // 注册切屏监听
  loadPaper()
  initRemainingTime()
  startTimer()
  initWebSocket() // 启动监控
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (timer.value) clearInterval(timer.value)
  if (ws) ws.close()
})
</script>

<template>
  <div class="exam-container">
    <!-- 顶部悬浮条 -->
    <div class="exam-header">
      <div class="left">
        <h3 v-if="!isMobile">{{ examInfo.title }}</h3>
        <el-icon v-else @click="router.back()"><ArrowLeft /></el-icon>
      </div>
      <div class="center">
        <el-icon><Clock /></el-icon>
        <span class="timer" :class="{ 'warning': examInfo.remainingTime < 300 }">
          {{ formattedTime }}
        </span>
      </div>
      <div class="right">
        <el-button type="primary" size="small" @click="handleSubmit(false)">交卷</el-button>
      </div>
    </div>

    <div class="exam-body">
      <!-- 左侧答题卡 (PC Only) -->
      <div class="answer-card" v-if="!isMobile">
        <div class="card-title">
          <el-icon><List /></el-icon> 答题卡
        </div>
        <div class="card-content">
          <div 
            v-for="(item, index) in paperData" 
            :key="item.id"
            class="card-item"
            :class="{ 'active': Array.isArray(answers[item.id]) ? answers[item.id].length > 0 : answers[item.id] }"
            @click="jumpToQuestion(index, item.id)"
          >
            {{ index + 1 }}
          </div>
        </div>
        <div class="card-legend">
          <span><span class="dot active"></span> 已答</span>
          <span><span class="dot"></span> 未答</span>
        </div>
      </div>

      <!-- 题目区 -->
      <div class="question-area" id="question-area">
        <!-- PC: Show List -->
        <template v-if="!isMobile">
            <div 
              v-for="(item, index) in paperData" 
              :key="item.id" 
              :id="'question-' + item.id"
              class="question-item"
            >
              <div class="q-title">
                <el-tag size="small" effect="dark" style="margin-right: 8px">
                  {{ item.type === 'choice' ? '单选题' : (item.type === 'multiple_choice' ? '多选题' : '判断题') }}
                </el-tag>
                <span class="q-no">{{ index + 1 }}.</span>
                <span>{{ item.content }}</span>
                <span class="q-score">({{ item.score }}分)</span>
              </div>
              
              <div class="q-options">
                <el-radio-group v-if="item.type === 'choice'" v-model="answers[item.id]" class="vertical-group">
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

                <el-checkbox-group v-if="item.type === 'multiple_choice'" v-model="answers[item.id]" class="vertical-group">
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

                <el-radio-group v-if="item.type === 'true_false'" v-model="answers[item.id]" class="horizontal-group">
                  <el-radio label="A" size="large" border>正确</el-radio>
                  <el-radio label="B" size="large" border>错误</el-radio>
                </el-radio-group>

                <!-- 填空题 -->
                <div v-if="item.type === 'fill_blank'" class="fill-blank-area">
                    <el-input v-model="answers[item.id]" placeholder="请输入答案" clearable />
                </div>

                <!-- 简答题 -->
                <div v-if="item.type === 'short_answer'" class="short-answer-area">
                    <el-input 
                        v-model="answers[item.id]" 
                        type="textarea" 
                        :rows="5" 
                        placeholder="请输入您的回答..." 
                        maxlength="1000"
                        show-word-limit
                    />
                </div>
              </div>
            </div>
        </template>

        <!-- Mobile: Show Single Question -->
        <template v-else-if="currentQuestion">
            <div class="question-item single-view">
              <div class="q-title">
                <el-tag size="small" effect="dark" style="margin-right: 8px">
                  {{ currentQuestion.type === 'choice' ? '单选题' : (currentQuestion.type === 'multiple_choice' ? '多选题' : '判断题') }}
                </el-tag>
                <span class="q-no">{{ currentQIndex + 1 }}/{{ paperData.length }}.</span>
                <span>{{ currentQuestion.content }}</span>
                <span class="q-score">({{ currentQuestion.score }}分)</span>
              </div>
              
              <div class="q-options">
                <el-radio-group v-if="currentQuestion.type === 'choice'" v-model="answers[currentQuestion.id]" class="vertical-group">
                  <el-radio 
                    v-for="(val, key) in currentQuestion.options" 
                    :key="key" 
                    :label="key" 
                    size="large" 
                    border
                  >
                    <span class="opt-label">{{ key }}.</span>
                    <span class="opt-text">{{ val }}</span>
                  </el-radio>
                </el-radio-group>

                <el-checkbox-group v-if="currentQuestion.type === 'multiple_choice'" v-model="answers[currentQuestion.id]" class="vertical-group">
                   <el-checkbox
                    v-for="(val, key) in currentQuestion.options" 
                    :key="key" 
                    :label="key" 
                    size="large" 
                    border
                  >
                    <span class="opt-label">{{ key }}.</span>
                    <span class="opt-text">{{ val }}</span>
                  </el-checkbox>
                </el-checkbox-group>

                <el-radio-group v-if="currentQuestion.type === 'true_false'" v-model="answers[currentQuestion.id]" class="vertical-group">
                  <el-radio label="A" size="large" border>正确</el-radio>
                  <el-radio label="B" size="large" border>错误</el-radio>
                </el-radio-group>

                <!-- 填空题 -->
                <div v-if="currentQuestion.type === 'fill_blank'" class="fill-blank-area">
                    <el-input v-model="answers[currentQuestion.id]" placeholder="请输入答案" clearable size="large" />
                </div>

                <!-- 简答题 -->
                <div v-if="currentQuestion.type === 'short_answer'" class="short-answer-area">
                    <el-input 
                        v-model="answers[currentQuestion.id]" 
                        type="textarea" 
                        :rows="8" 
                        placeholder="请输入您的回答..." 
                        maxlength="1000"
                        show-word-limit
                    />
                </div>
              </div>
            </div>
            <!-- Spacer for footer -->
            <div style="height: 60px;"></div>
        </template>
      </div>
    </div>

    <!-- Mobile Footer -->
    <div class="mobile-footer" v-if="isMobile">
        <div class="nav-btn" @click="prevQuestion" :class="{ disabled: currentQIndex === 0 }">
            <el-icon><ArrowLeft /></el-icon> 上一题
        </div>
        <div class="sheet-btn" @click="sheetVisible = true">
            <el-icon><List /></el-icon> 
            <!-- Correctly count answered -->
            <span>
                {{ Object.values(answers).filter(v => Array.isArray(v) ? v.length : !!v).length }}/{{ paperData.length }}
            </span>
        </div>
        <div class="nav-btn" @click="nextQuestion" :class="{ disabled: currentQIndex === paperData.length - 1 }">
            下一题 <el-icon><ArrowRight /></el-icon>
        </div>
    </div>

    <!-- Mobile Answer Sheet Drawer -->
    <el-drawer
        v-model="sheetVisible"
        title="答题卡"
        direction="btt"
        size="70%"
    >
        <div class="card-content mobile-sheet">
          <div 
            v-for="(item, index) in paperData" 
            :key="item.id"
            class="card-item"
            :class="{ 
                'active': Array.isArray(answers[item.id]) ? answers[item.id].length > 0 : answers[item.id],
                'current': index === currentQIndex
            }"
            @click="jumpToQuestion(index, item.id)"
          >
            {{ index + 1 }}
          </div>
        </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.exam-container {
  height: calc(100vh - 60px); 
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
  scroll-behavior: smooth;
}
.question-item { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px dashed #eee; }
.question-item:last-child { border-bottom: none; }

.q-title { font-size: 16px; font-weight: 500; margin-bottom: 15px; line-height: 1.6; }
.q-no { font-weight: bold; margin-right: 5px; color: #409EFF; }
.q-score { color: #999; font-size: 14px; margin-left: 5px; }

.vertical-group { display: flex; flex-direction: column; gap: 12px; width: 100%; }
.vertical-group .el-radio, .vertical-group .el-checkbox { 
    margin-left: 0 !important; /* Force remove default left margin */
    margin-right: 0;
    width: 100%; 
    height: auto; 
    padding: 12px 15px; 
    white-space: normal; 
    display: flex;
    align-items: flex-start; /* Align radio button to top for multi-line text */
}
/* Allow inner text to wrap */
:deep(.el-radio__label), :deep(.el-checkbox__label) {
    white-space: normal;
    line-height: 1.5;
    display: inline-block;
    width: 100%;
    text-align: left;
    margin-left: 8px; /* Standard spacing from icon */
}
/* Fix radio input alignment */
:deep(.el-radio__input), :deep(.el-checkbox__input) {
    margin-top: 2px; /* Align with first line of text */
}

.horizontal-group { display: flex; gap: 20px; }

@keyframes blink { 50% { opacity: 0.5; } }

/* Mobile Footer */
.mobile-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 50px;
    background: #fff;
    border-top: 1px solid #eee;
    display: flex;
    z-index: 200;
}
.nav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #606266;
    font-size: 14px;
    cursor: pointer;
    user-select: none;
}
.nav-btn:active { background: #f5f5f5; }
.nav-btn.disabled { color: #ccc; pointer-events: none; }
.sheet-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #409EFF;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
    .exam-container { height: 100vh; }
    .exam-body { padding: 0; gap: 0; }
    .question-area { 
        padding: 15px; 
        border-radius: 0; 
        box-shadow: none; 
    }
    .question-item { border-bottom: none; margin-bottom: 0; }
    .exam-header { padding: 0 10px; height: 50px; }
    .timer { font-size: 16px; }
    
    .mobile-sheet {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
        gap: 15px;
        padding: 20px;
        justify-items: center;
    }
    .mobile-sheet .card-item {
        width: 45px;
        height: 45px;
        font-size: 16px;
        border-radius: 12px; /* Soft square */
        background-color: #f0f2f5;
        border: 1px solid transparent;
        color: #606266;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .mobile-sheet .card-item.active {
        background-color: #409EFF;
        color: #fff;
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    }
    .mobile-sheet .card-item.current {
        border: 2px solid #E6A23C; /* Orange border for current question */
        position: relative;
    }
}
</style>
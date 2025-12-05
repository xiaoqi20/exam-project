<script setup>
import { reactive, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, List } from '@element-plus/icons-vue'
import { getExamPaper, submitExam } from '@/api/exam'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const examInfo = reactive({
// ... (unchanged part)

// ... (unchanged part)

const submitLogic = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    console.log('Submit Answers:', answers)
    // 构造后端需要的答案格式
    // 假设后端需要 { paperId: 1, answers: [{qid: 1, answer: "A"}, ...] }
    // 根据实际后端需求调整，这里先按照通用格式构造
    const answerList = Object.entries(answers).map(([key, value]) => ({
      qid: parseInt(key),
      answer: value
    }))
    
    await submitExam({
      paperId: examInfo.id,
      answers: answerList
    })
    
    ElMessage.success('试卷提交成功！')
    router.replace('/student/exam/hall') // 修正路由路径，假设是这个
  } catch (error) {
    console.error(error)
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}
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
            :class="{ 'active': answers[item.id] }"
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
              {{ item.type === 'choice' ? '单选题' : '判断题' }}
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

            <!-- 判断题 -->
            <el-radio-group v-if="item.type === 'true_false'" v-model="answers[item.id]">
              <el-radio label="True" size="large" border>正确</el-radio>
              <el-radio label="False" size="large" border>错误</el-radio>
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

@keyframes blink { 50% { opacity: 0.5; } }
</style>
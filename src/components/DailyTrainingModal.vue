<script setup>
import { ref, computed } from 'vue'
import { useTrainingStore } from '@/stores/training'
import { Check, Close, MagicStick } from '@element-plus/icons-vue'
import MarkdownViewer from './MarkdownViewer.vue'

const trainingStore = useTrainingStore()

// 提交练习 (前端判分)
const handleSubmit = (q) => {
  if (!q.userAnswer || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0)) return
  
  if (q.type === 'multiple_choice') {
      const userStr = [...q.userAnswer].sort().join('')
      const ansStr = (q.answer || '').split('').sort().join('')
      q.isCorrect = userStr === ansStr
  } else if (q.type === 'fill_blank') {
      // 填空题：全匹配（忽略首尾空格）
      q.isCorrect = q.userAnswer.trim().toLowerCase() === (q.answer || '').trim().toLowerCase()
  } else if (q.type === 'short_answer') {
      // 简答题：前端无法直接判分，默认设为 true 仅展示解析
      q.isCorrect = true 
  } else {
      q.isCorrect = q.userAnswer === q.answer
  }
  q.showAnalysis = true
}

// 辅助函数：判断多选选项是否该高亮
const isMultiOptionCorrect = (q, key) => {
    return (q.answer || '').includes(key)
}
const isMultiOptionWrong = (q, key) => {
    return q.userAnswer.includes(key) && !(q.answer || '').includes(key)
}

// 全部完成后的逻辑
const allDone = computed(() => {
    return trainingStore.questions.length > 0 && trainingStore.questions.every(q => q.showAnalysis)
})

const handleFinish = () => {
    trainingStore.closeTraining()
}
</script>

<template>
  <el-dialog
    v-model="trainingStore.visible"
    title="🌟 每日特训 (智能推荐)"
    width="90%"
    style="max-width: 800px; margin-top: 5vh;"
    :close-on-click-modal="false"
    destroy-on-close
    class="training-dialog"
  >
    <div v-loading="trainingStore.loading" class="training-body">
      <div v-if="trainingStore.questions.length === 0 && !trainingStore.loading" class="empty">
        暂无今日特训题目
      </div>
      
      <div v-else class="question-list">
        <el-card v-for="(q, index) in trainingStore.questions" :key="q.id" class="q-card" shadow="never">
          <div class="q-title">
            <el-tag size="small" :type="q.type === 'multiple_choice' ? 'warning' : ''">
                {{ q.type === 'multiple_choice' ? '多选题' : (q.type === 'true_false' ? '判断题' : '单选题') }}
            </el-tag>
            <span class="text">{{ q.content }}</span>
          </div>

          <!-- 单选题渲染 -->
          <div v-if="q.type === 'choice'" class="options">
            <el-radio-group v-model="q.userAnswer" :disabled="q.showAnalysis">
              <el-radio 
                v-for="(val, key) in q.options" 
                :key="key" 
                :label="key"
                class="option-item"
                :class="{
                    'correct': q.showAnalysis && key === q.answer,
                    'wrong': q.showAnalysis && q.userAnswer === key && key !== q.answer
                }"
              >
                <span class="opt-label">{{ key }}.</span> {{ val }}
              </el-radio>
            </el-radio-group>
          </div>

          <!-- 多选题渲染 -->
          <div v-else-if="q.type === 'multiple_choice'" class="options">
            <el-checkbox-group v-model="q.userAnswer" :disabled="q.showAnalysis">
              <el-checkbox
                v-for="(val, key) in q.options"
                :key="key"
                :label="key"
                class="option-item"
                :class="{
                    'correct': q.showAnalysis && isMultiOptionCorrect(q, key),
                    'wrong': q.showAnalysis && isMultiOptionWrong(q, key)
                }"
              >
                <span class="opt-label">{{ key }}.</span> {{ val }}
              </el-checkbox>
            </el-checkbox-group>
          </div>

          <!-- 判断题渲染 -->
          <div v-else-if="q.type === 'true_false'" class="options">
             <el-radio-group v-model="q.userAnswer" :disabled="q.showAnalysis">
                <el-radio label="A" class="option-item" :class="{'correct': q.showAnalysis && q.answer === 'A', 'wrong': q.showAnalysis && q.userAnswer === 'A' && q.answer !== 'A'}">正确</el-radio>
                <el-radio label="B" class="option-item" :class="{'correct': q.showAnalysis && q.answer === 'B', 'wrong': q.showAnalysis && q.userAnswer === 'B' && q.answer !== 'B'}">错误</el-radio>
             </el-radio-group>
          </div>

          <!-- 填空题渲染 -->
          <div v-else-if="q.type === 'fill_blank'" class="options">
              <el-input v-model="q.userAnswer" :disabled="q.showAnalysis" placeholder="请输入答案" clearable />
          </div>

          <!-- 简答题渲染 -->
          <div v-else-if="q.type === 'short_answer'" class="options">
              <el-input 
                v-model="q.userAnswer" 
                :disabled="q.showAnalysis" 
                type="textarea" 
                :rows="4" 
                placeholder="请输入您的简要回答..." 
              />
          </div>

          <!-- 确认按钮 -->
          <div v-if="!q.showAnalysis" class="q-actions">
            <el-button type="primary" size="small" :disabled="!q.userAnswer || (Array.isArray(q.userAnswer) && q.userAnswer.length===0)" @click="handleSubmit(q)">确认并查看解析</el-button>
          </div>

          <!-- 解析部分 -->
          <transition name="el-zoom-in-top">
            <div v-if="q.showAnalysis" class="analysis-box">
              <div class="result-tag" :class="q.isCorrect ? 'correct-text' : 'wrong-text'">
                <el-icon><component :is="q.isCorrect ? Check : Close" /></el-icon>
                {{ q.isCorrect ? '回答正确！' : `回答错误，正确答案是 ${q.answer}` }}
              </div>
              <div class="analysis-content">
                <strong>解析：</strong>
                <MarkdownViewer :content="q.analysis" />
              </div>
            </div>
          </transition>
        </el-card>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="trainingStore.closeTraining">以后再说</el-button>
        <el-button type="success" :disabled="!allDone" @click="handleFinish">
          {{ allDone ? '完成特训' : '请先完成所有题目' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.training-body {
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
}
.q-card {
  margin-bottom: 20px;
  border: 1px solid #ebeef5;
}
.q-title {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  line-height: 1.5;
}
.q-title .text {
  word-break: break-all;
  white-space: normal;
}
.options {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}
.option-item {
  margin-bottom: 10px;
  width: 100%;
  white-space: normal;
  height: auto;
  padding: 8px 0;
  display: flex;
  align-items: flex-start;
}
:deep(.el-radio__label), :deep(.el-checkbox__label) {
  white-space: normal;
  word-break: break-all;
  line-height: 1.5;
}
.opt-label { font-weight: bold; margin-right: 5px; }

.q-actions { margin-top: 10px; }

.analysis-box {
  margin-top: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
}
.result-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: bold;
  margin-bottom: 8px;
}
.correct-text { color: #67C23A; }
.wrong-text { color: #F56C6C; }

/* 选项高亮 */
:deep(.option-item.correct .el-radio__label),
:deep(.option-item.correct .el-checkbox__label) { color: #67C23A; font-weight: bold; }

:deep(.option-item.wrong .el-radio__label),
:deep(.option-item.wrong .el-checkbox__label) { color: #F56C6C; font-weight: bold; }

.empty { text-align: center; color: #909399; padding: 40px 0; }
</style>
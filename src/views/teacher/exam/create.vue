<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const activeStep = ref(0)
const formRef = ref(null)

// 步骤 1：基础信息表单
const examForm = reactive({
  title: '',
  description: '',
  duration: 90, // 分钟
  totalScore: 100,
  passScore: 60,
  type: 'random', // random: 随机抽题, manual: 手动组卷
  
  // 随机抽题配置
  randomConfig: {
    choiceCount: 20,
    choiceScore: 2,
    trueFalseCount: 10,
    trueFalseScore: 1
  }
})

const rules = {
  title: [{ required: true, message: '请输入试卷标题', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入考试时长', trigger: 'blur' }],
  totalScore: [{ required: true, message: '请输入总分', trigger: 'blur' }],
  type: [{ required: true, message: '请选择组卷方式', trigger: 'change' }]
}

// 模拟手动选择的试题列表（步骤2用）
const selectedQuestions = ref([])
// 模拟题库数据（用于手动选择）
const allQuestions = ref([
  { id: 101, type: 'choice', content: 'HTML 是什么语言的缩写？', score: 2 },
  { id: 102, type: 'true_false', content: 'Vue 3 使用 Options API。', score: 2 },
  { id: 103, type: 'choice', content: '以下哪个钩子函数被移除？', score: 2 },
  { id: 104, type: 'choice', content: 'Java 是脚本语言吗？', score: 2 },
  { id: 105, type: 'true_false', content: 'CSS 用于样式设计。', score: 2 },
])

// 处理下一步
const nextStep = async () => {
  if (activeStep.value === 0) {
    if (!formRef.value) return
    await formRef.value.validate((valid) => {
      if (valid) {
        // 校验分值配置是否合理
        if (examForm.type === 'random') {
           const calcTotal = examForm.randomConfig.choiceCount * examForm.randomConfig.choiceScore + 
                             examForm.randomConfig.trueFalseCount * examForm.randomConfig.trueFalseScore
           if (calcTotal !== examForm.totalScore) {
             ElMessage.warning(`配置的总分 (${calcTotal}) 与试卷总分 (${examForm.totalScore}) 不一致，请调整`)
             return
           }
        }
        activeStep.value++
      }
    })
  } else if (activeStep.value === 1) {
    // 如果是手动组卷，需要校验是否选了题
    if (examForm.type === 'manual' && selectedQuestions.value.length === 0) {
      ElMessage.warning('请至少选择一道试题')
      return
    }
    activeStep.value++
  }
}

// 处理上一步
const prevStep = () => {
  activeStep.value--
}

// 处理提交
const handleSubmit = () => {
  console.log('Create Exam:', { ...examForm, questions: selectedQuestions.value })
  ElMessage.success('试卷创建成功！')
  // 跳转回发布列表（暂未开发，先跳回首页或停留在当前）
  // router.push('/teacher/exam/publish')
}

// 手动组卷 - 表格选择变化
const handleSelectionChange = (selection) => {
  selectedQuestions.value = selection
}

// 计算手动组卷当前总分
const currentTotalScore = ref(0)
// 监听选中变化更新总分（简单实现）
const updateManualScore = (selection) => {
    selectedQuestions.value = selection
    currentTotalScore.value = selection.reduce((sum, item) => sum + item.score, 0)
}
</script>

<template>
  <div class="app-container">
    <el-card>
      <el-steps :active="activeStep" finish-status="success" simple style="margin-bottom: 20px">
        <el-step title="基础信息" />
        <el-step title="组卷配置" />
        <el-step title="确认发布" />
      </el-steps>

      <!-- 步骤 1：基础信息 -->
      <div v-show="activeStep === 0" class="step-content">
        <el-form ref="formRef" :model="examForm" :rules="rules" label-width="120px" style="max-width: 600px; margin: 0 auto;">
          <el-form-item label="试卷标题" prop="title">
            <el-input v-model="examForm.title" placeholder="例如：2025年第一学期期末考试" />
          </el-form-item>
          <el-form-item label="试卷描述" prop="description">
            <el-input v-model="examForm.description" type="textarea" rows="3" />
          </el-form-item>
          <el-form-item label="考试时长(分钟)" prop="duration">
            <el-input-number v-model="examForm.duration" :min="10" :step="10" />
          </el-form-item>
          <el-form-item label="试卷总分" prop="totalScore">
            <el-input-number v-model="examForm.totalScore" :min="10" :step="10" />
          </el-form-item>
          <el-form-item label="及格分数" prop="passScore">
            <el-input-number v-model="examForm.passScore" :min="0" :max="examForm.totalScore" />
          </el-form-item>
          <el-form-item label="组卷方式" prop="type">
            <el-radio-group v-model="examForm.type">
              <el-radio label="random">随机抽题</el-radio>
              <el-radio label="manual">手动选题</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤 2：组卷配置 -->
      <div v-show="activeStep === 1" class="step-content">
        
        <!-- 随机组卷配置 -->
        <div v-if="examForm.type === 'random'" class="random-config">
          <el-alert title="系统将根据以下规则从题库中随机抽取试题" type="info" show-icon :closable="false" style="margin-bottom: 20px" />
          
          <el-form :model="examForm.randomConfig" label-width="120px">
            <el-form-item label="单选题数量">
              <el-input-number v-model="examForm.randomConfig.choiceCount" :min="0" />
              <span class="ml-2">每题分值：</span>
              <el-input-number v-model="examForm.randomConfig.choiceScore" :min="1" />
            </el-form-item>
            <el-form-item label="判断题数量">
              <el-input-number v-model="examForm.randomConfig.trueFalseCount" :min="0" />
              <span class="ml-2">每题分值：</span>
              <el-input-number v-model="examForm.randomConfig.trueFalseScore" :min="1" />
            </el-form-item>
            
            <el-divider />
            <div class="score-summary">
               当前配置总分：
               <span class="score-value">
                 {{ examForm.randomConfig.choiceCount * examForm.randomConfig.choiceScore + examForm.randomConfig.trueFalseCount * examForm.randomConfig.trueFalseScore }}
               </span>
               / 目标总分：{{ examForm.totalScore }}
            </div>
          </el-form>
        </div>

        <!-- 手动组卷配置 -->
        <div v-else class="manual-config">
           <div class="mb-2">
             已选分数：<span :class="{'text-success': currentTotalScore === examForm.totalScore, 'text-danger': currentTotalScore !== examForm.totalScore}">{{ currentTotalScore }}</span> 
             / {{ examForm.totalScore }}
           </div>
           <el-table 
             :data="allQuestions" 
             border 
             stripe 
             @selection-change="updateManualScore"
             height="400px"
           >
             <el-table-column type="selection" width="55" />
             <el-table-column prop="type" label="题型" width="100">
                <template #default="scope">
                   {{ scope.row.type === 'choice' ? '单选题' : '判断题' }}
                </template>
             </el-table-column>
             <el-table-column prop="content" label="题目" show-overflow-tooltip />
             <el-table-column prop="score" label="分值" width="80" />
           </el-table>
        </div>
      </div>

      <!-- 步骤 3：确认预览 -->
      <div v-show="activeStep === 2" class="step-content preview-content">
        <el-descriptions title="试卷概览" :column="1" border>
          <el-descriptions-item label="试卷标题">{{ examForm.title }}</el-descriptions-item>
          <el-descriptions-item label="考试时长">{{ examForm.duration }} 分钟</el-descriptions-item>
          <el-descriptions-item label="总分">{{ examForm.totalScore }} 分</el-descriptions-item>
          <el-descriptions-item label="组卷方式">
            {{ examForm.type === 'random' ? '随机抽题' : '手动选题' }}
          </el-descriptions-item>
          <el-descriptions-item label="试题概况">
             <span v-if="examForm.type === 'random'">
                单选 {{ examForm.randomConfig.choiceCount }} 题，判断 {{ examForm.randomConfig.trueFalseCount }} 题
             </span>
             <span v-else>
                共选择 {{ selectedQuestions.length }} 道题目
             </span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 底部按钮 -->
      <div class="steps-action">
        <el-button v-if="activeStep > 0" @click="prevStep">上一步</el-button>
        <el-button v-if="activeStep < 2" type="primary" @click="nextStep">下一步</el-button>
        <el-button v-if="activeStep === 2" type="success" @click="handleSubmit">确认创建</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.step-content { padding: 20px 0; min-height: 300px; }
.steps-action { margin-top: 20px; text-align: center; }
.ml-2 { margin-left: 10px; }
.mb-2 { margin-bottom: 10px; }
.score-summary { font-size: 16px; font-weight: bold; text-align: center; }
.score-value { color: #409EFF; font-size: 20px; }
.text-success { color: #67C23A; }
.text-danger { color: #F56C6C; }
.preview-content { max-width: 800px; margin: 0 auto; }
</style>
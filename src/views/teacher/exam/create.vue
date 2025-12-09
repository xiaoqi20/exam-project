<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Plus, Delete, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'
import { getQuestionList } from '@/api/question'
import { createExamPaper, addQuestionsToPaper, publishExamPaper } from '@/api/examPaper'

const router = useRouter()
const activeStep = ref(0)
const loading = ref(false)

// Step 1: Basic Info
const baseForm = reactive({
  title: '',
  duration: 90,
  totalScore: 0 // calculated automatically
})
const baseFormRef = ref(null)
const baseRules = {
  title: [{ required: true, message: '请输入试卷名称', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入考试时长', trigger: 'blur' }]
}

// Step 2: Select Questions
const qQuery = reactive({
  page: 1,
  size: 10,
  content: '',
  type: ''
})
const sourceQuestions = ref([]) // From API
const totalQuestions = ref(0)
const selectedQuestions = ref([]) // Local selection

const typeOptions = [
  { label: '单选题', value: 'choice' },
  { label: '多选题', value: 'multiple_choice' },
  { label: '判断题', value: 'true_false' }
]

// Fetch source questions
const loadSourceQuestions = async () => {
  loading.value = true
  try {
    const res = await getQuestionList(qQuery)
    if (res && res.records) {
        sourceQuestions.value = res.records
        totalQuestions.value = res.total
    }
  } catch (e) {
      ElMessage.error('加载题库失败')
  } finally {
      loading.value = false
  }
}

// Add question to selection
const handleSelect = (row) => {
    if (selectedQuestions.value.some(q => q.id === row.id)) {
        ElMessage.warning('该题目已在试卷中')
        return
    }
    selectedQuestions.value.push(row)
    updateTotalScore()
}

// Remove from selection
const handleRemove = (index) => {
    selectedQuestions.value.splice(index, 1)
    updateTotalScore()
}

const updateTotalScore = () => {
    baseForm.totalScore = selectedQuestions.value.reduce((acc, cur) => acc + (cur.score || 0), 0)
}

const handleQuery = () => {
    qQuery.page = 1
    loadSourceQuestions()
}

const handlePageChange = (page) => {
    qQuery.page = page
    loadSourceQuestions()
}

// Navigation
const nextStep = async () => {
    if (activeStep.value === 0) {
        await baseFormRef.value.validate((valid) => {
            if (valid) activeStep.value++
        })
    } else if (activeStep.value === 1) {
        if (selectedQuestions.value.length === 0) {
            ElMessage.warning('请至少选择一道题目')
            return
        }
        activeStep.value++
    }
}

const prevStep = () => {
    if (activeStep.value > 0) activeStep.value--
}

// Submit
const handleSubmit = async () => {
    loading.value = true
    try {
        // 1. Create Paper (Draft status=0)
        const paperRes = await createExamPaper({
            title: baseForm.title,
            duration: baseForm.duration,
            totalMark: baseForm.totalScore // Optional, backend might verify
        })
        
        // Backend returns: { code: 200, data: { id: 105 } } OR just data: 105
        const paperId = paperRes.data ? (paperRes.data.id || paperRes.data) : (paperRes.id || null)
        
        if (!paperId) throw new Error('无法获取试卷ID')

        // 2. Add Questions
        const questionIds = selectedQuestions.value.map(q => q.id)
        if (questionIds.length > 0) {
            await addQuestionsToPaper({
                paperId: paperId,
                questionIds: questionIds
            })
        }

        // 3. Publish Paper (status=1)
        await publishExamPaper(paperId)

        ElMessage.success('试卷创建并发布成功！')
        // Redirect to list (if list page exists)
        // router.push('/teacher/exam/list')
        
        // Reset form for now
        activeStep.value = 0
        baseForm.title = ''
        baseForm.duration = 90
        baseForm.totalScore = 0
        selectedQuestions.value = []
        
    } catch (e) {
        console.error(e)
        ElMessage.error('操作失败：' + (e.message || '未知错误'))
    } finally {
        loading.value = false
    }
}
onMounted(() => {
    loadSourceQuestions()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
        <el-steps :active="activeStep" finish-status="success" simple style="margin-bottom: 20px">
            <el-step title="基本信息" />
            <el-step title="选择题目" />
            <el-step title="确认发布" />
        </el-steps>

        <!-- Step 1: Info -->
        <div v-show="activeStep === 0" class="step-content">
            <el-form ref="baseFormRef" :model="baseForm" :rules="baseRules" label-width="100px" style="max-width: 500px; margin: 0 auto;">
                <el-form-item label="试卷名称" prop="title">
                    <el-input v-model="baseForm.title" placeholder="例如：2024期末考试" />
                </el-form-item>
                <el-form-item label="考试时长" prop="duration">
                    <el-input-number v-model="baseForm.duration" :min="10" :step="10" />
                    <span class="unit">分钟</span>
                </el-form-item>
                <el-form-item label="预计总分">
                    <span class="total-score">{{ baseForm.totalScore }} 分</span>
                    <span class="tips">（将在选择题目后自动计算）</span>
                </el-form-item>
            </el-form>
        </div>

        <!-- Step 2: Select -->
        <div v-show="activeStep === 1" class="step-content">
            <div class="selector-container">
                <!-- Left: Source -->
                <div class="panel left-panel">
                    <div class="panel-header">题库列表</div>
                    <div class="filter-bar">
                        <el-input v-model="qQuery.content" placeholder="搜索题目" size="small" style="width: 120px" @keyup.enter="handleQuery" />
                        <el-select v-model="qQuery.type" placeholder="题型" size="small" style="width: 100px" clearable @change="handleQuery">
                             <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
                        </el-select>
                        <el-button :icon="Search" circle size="small" @click="handleQuery" />
                    </div>
                    <div class="list-body">
                         <el-table :data="sourceQuestions" size="small" stripe height="100%" @row-click="handleSelect">
                             <el-table-column type="index" label="序号" width="50" align="center" />
                             <el-table-column prop="content" label="题目" show-overflow-tooltip />
                             <el-table-column prop="type" label="类型" width="70">
                                 <template #default="scope">
                                     {{ scope.row.type === 'choice' ? '单选' : (scope.row.type === 'multiple_choice' ? '多选' : '判断') }}
                                 </template>
                             </el-table-column>
                             <el-table-column width="50" align="center">
                                 <template #default>
                                     <el-icon><ArrowRight /></el-icon>
                                 </template>
                             </el-table-column>
                         </el-table>
                    </div>
                    <div class="pagination-bar">
                        <el-pagination 
                           layout="prev, pager, next" 
                           :total="totalQuestions" 
                           v-model:current-page="qQuery.page" 
                           :page-size="qQuery.size"
                           @current-change="handlePageChange"
                           small
                        />
                    </div>
                </div>

                <!-- Right: Selected -->
                <div class="panel right-panel">
                    <div class="panel-header">
                        已选试题 ({{ selectedQuestions.length }})
                        <span style="float: right">总分: {{ baseForm.totalScore }}</span>
                    </div>
                    <div class="list-body">
                         <el-table :data="selectedQuestions" size="small" stripe height="100%">
                             <el-table-column width="50" type="index" label="序号" align="center" />
                             <el-table-column prop="content" label="题目" show-overflow-tooltip />
                             <el-table-column prop="score" label="分值" width="60" align="center" />
                             <el-table-column width="50" align="center">
                                 <template #default="scope">
                                     <el-button type="danger" link :icon="Delete" @click.stop="handleRemove(scope.$index)" />
                                 </template>
                             </el-table-column>
                         </el-table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 3: Confirm -->
        <div v-show="activeStep === 2" class="step-content confirm-view">
             <el-descriptions title="试卷预览" border column="1">
                 <el-descriptions-item label="试卷名称">{{ baseForm.title }}</el-descriptions-item>
                 <el-descriptions-item label="考试时长">{{ baseForm.duration }} 分钟</el-descriptions-item>
                 <el-descriptions-item label="题目数量">{{ selectedQuestions.length }} 道</el-descriptions-item>
                 <el-descriptions-item label="试卷总分">{{ baseForm.totalScore }} 分</el-descriptions-item>
             </el-descriptions>
             
             <div style="margin-top: 20px; text-align: center;">
                 <el-button type="primary" size="large" @click="handleSubmit" :loading="loading">确认创建并发布</el-button>
             </div>
        </div>

        <!-- Footer Actions -->
        <div class="footer-actions" v-if="activeStep < 2">
            <el-button v-if="activeStep > 0" @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="nextStep">下一步</el-button>
        </div>
    </el-card>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.step-content { min-height: 200px; padding: 30px 0; } /* Reduced min-height, increased padding */
.unit { margin-left: 10px; color: #666; }
.total-score { font-size: 18px; font-weight: bold; color: #409EFF; }
.tips { color: #999; font-size: 12px; }

.selector-container {
    display: flex;
    gap: 20px;
    height: 500px;
}
/* ... existing panel styles ... */
.panel {
    flex: 1;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
}
.panel-header {
    padding: 10px 15px;
    background: #f5f7fa;
    border-bottom: 1px solid #dcdfe6;
    font-weight: bold;
    color: #606266;
}
.filter-bar {
    padding: 10px;
    border-bottom: 1px solid #ebeef5;
    display: flex;
    gap: 10px;
}
.list-body {
    flex: 1;
    overflow: hidden; /* For table scroll */
}
.pagination-bar {
    padding: 5px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: center;
}

.confirm-view {
    max-width: 600px;
    margin: 0 auto;
}
.footer-actions {
    margin-top: 10px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center; /* Keep center or change to flex-end for right align */
    gap: 20px;
}
</style>

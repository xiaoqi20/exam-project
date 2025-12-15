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
  totalScore: 0 
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
const sourceQuestions = ref([]) 
const totalQuestions = ref(0)
const selectedQuestions = ref([]) 

const typeOptions = [
  { label: '单选题', value: 'choice' },
  { label: '多选题', value: 'multiple_choice' },
  { label: '判断题', value: 'true_false' }
]

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

const handleSelect = (row) => {
    if (selectedQuestions.value.some(q => q.id === row.id)) {
        ElMessage.warning('该题目已在试卷中')
        return
    }
    selectedQuestions.value.push(row)
    updateTotalScore()
}

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

const handleSubmit = async () => {
    loading.value = true
    try {
        const paperRes = await createExamPaper({
            title: baseForm.title,
            duration: baseForm.duration,
            totalMark: baseForm.totalScore 
        })
        
        const paperId = paperRes.data ? (paperRes.data.id || paperRes.data) : (paperRes.id || null)
        if (!paperId) throw new Error('无法获取试卷ID')

        const questionIds = selectedQuestions.value.map(q => q.id)
        if (questionIds.length > 0) {
            await addQuestionsToPaper({
                paperId: paperId,
                questionIds: questionIds
            })
        }

        await publishExamPaper(paperId)

        ElMessage.success('试卷创建并发布成功！')
        
        activeStep.value = 0
        baseForm.title = ''
        baseForm.duration = 90
        baseForm.totalScore = 0
        selectedQuestions.value = []
        
    } catch (e) {
        console.error(e)
        ElMessage.error('操作失败')
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
        <el-steps :active="activeStep" finish-status="success" simple style="margin-bottom: 20px" class="custom-steps">
            <el-step title="基本信息" />
            <el-step title="选题" />
            <el-step title="发布" />
        </el-steps>

        <!-- Step 1: Info -->
        <div v-show="activeStep === 0" class="step-content">
            <el-form ref="baseFormRef" :model="baseForm" :rules="baseRules" label-width="100px" class="base-form">
                <el-form-item label="试卷名称" prop="title">
                    <el-input v-model="baseForm.title" placeholder="例如：2024期末考试" />
                </el-form-item>
                <el-form-item label="考试时长" prop="duration">
                    <el-input-number v-model="baseForm.duration" :min="10" :step="10" style="width: 100%" />
                    <span class="unit hidden-mobile">分钟</span>
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
                        <el-input v-model="qQuery.content" placeholder="搜索" size="small" class="flex-1" @keyup.enter="handleQuery" />
                        <el-select v-model="qQuery.type" placeholder="题型" size="small" style="width: 80px" clearable @change="handleQuery">
                             <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
                        </el-select>
                        <el-button :icon="Search" circle size="small" @click="handleQuery" />
                    </div>
                    <div class="list-body">
                         <el-table :data="sourceQuestions" size="small" stripe height="100%" @row-click="handleSelect">
                             <el-table-column type="index" label="#" width="40" align="center" />
                             <el-table-column prop="content" label="题目" show-overflow-tooltip />
                             <el-table-column width="40" align="center">
                                 <template #default>
                                     <el-icon><Plus /></el-icon>
                                 </template>
                             </el-table-column>
                         </el-table>
                    </div>
                    <div class="pagination-bar">
                        <el-pagination 
                           layout="prev, next" 
                           :total="totalQuestions" 
                           v-model:current-page="qQuery.page" 
                           :page-size="qQuery.size"
                           @current-change="handlePageChange"
                           small
                        />
                        <span class="page-info">{{ qQuery.page }}页</span>
                    </div>
                </div>

                <!-- Right: Selected -->
                <div class="panel right-panel">
                    <div class="panel-header">
                        已选 ({{ selectedQuestions.length }})
                        <span style="float: right">{{ baseForm.totalScore }}分</span>
                    </div>
                    <div class="list-body">
                         <el-table :data="selectedQuestions" size="small" stripe height="100%">
                             <el-table-column width="40" type="index" label="#" align="center" />
                             <el-table-column prop="content" label="题目" show-overflow-tooltip />
                             <el-table-column width="40" align="center">
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
             <el-descriptions title="试卷预览" border :column="1">
                 <el-descriptions-item label="试卷名称">{{ baseForm.title }}</el-descriptions-item>
                 <el-descriptions-item label="考试时长">{{ baseForm.duration }} 分钟</el-descriptions-item>
                 <el-descriptions-item label="题目数量">{{ selectedQuestions.length }} 道</el-descriptions-item>
                 <el-descriptions-item label="试卷总分">{{ baseForm.totalScore }} 分</el-descriptions-item>
             </el-descriptions>
             
             <div style="margin-top: 20px; text-align: center;">
                 <el-button type="primary" size="large" @click="handleSubmit" :loading="loading" style="width: 100%">确认发布</el-button>
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
.step-content { min-height: 200px; padding: 20px 0; }
.unit { margin-left: 10px; color: #666; }
.total-score { font-size: 18px; font-weight: bold; color: #409EFF; }
.tips { color: #999; font-size: 12px; }

.base-form { max-width: 500px; margin: 0 auto; }

.selector-container {
    display: flex;
    gap: 20px;
    height: 500px;
}
.panel {
    flex: 1;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
}
.panel-header {
    padding: 10px;
    background: #f5f7fa;
    border-bottom: 1px solid #dcdfe6;
    font-weight: bold;
    font-size: 14px;
}
.filter-bar {
    padding: 8px;
    border-bottom: 1px solid #ebeef5;
    display: flex;
    gap: 8px;
    align-items: center;
}
.flex-1 { flex: 1; }

.list-body {
    flex: 1;
    overflow: hidden;
}
.pagination-bar {
    padding: 5px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #999;
}

.confirm-view { max-width: 600px; margin: 0 auto; }
.footer-actions {
    margin-top: 10px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
    gap: 20px;
}

/* Mobile */
@media (max-width: 768px) {
    .app-container { padding: 10px; }
    .custom-steps { padding: 10px; font-size: 12px; }
    
    .base-form :deep(.el-form-item) {
        flex-direction: column;
        align-items: flex-start;
    }
    .base-form :deep(.el-form-item__label) {
        text-align: left;
    }
    
    .selector-container {
        flex-direction: column;
        height: auto; /* Allow grow */
    }
    .panel {
        height: 350px; /* Fixed height for scroll */
    }
    .hidden-mobile { display: none; }
}
</style>
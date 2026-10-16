<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Plus, Delete, ArrowRight, ArrowLeft, InfoFilled, VideoCamera } from '@element-plus/icons-vue'
import { getQuestionList } from '@/api/question'
import { createExamPaper, addQuestionsToPaper, publishExamPaper } from '@/api/examPaper'
import { getAllClasses } from '@/api/class'

const router = useRouter()
const activeStep = ref(0)
const loading = ref(false)
const classOptions = ref([]) // 班级列表
const selectedClassIds = ref([]) // 选中的班级

// Load classes on mount
onMounted(async () => {
    loadSourceQuestions()
    try {
        const res = await getAllClasses()
        if (res) classOptions.value = Array.isArray(res) ? res : (res.data || [])
    } catch (e) {
        console.error('加载班级失败', e)
    }
})
const baseForm = reactive({
  title: '',
  duration: 90,
  totalScore: 0,
  // 防作弊配置
  enableAiMonitor: false,
  monitorConfig: {
      captureInterval: 30,
      faceCountLimit: 1,   // 多人检测
      allowBlur: false,     // 视线追踪
      allowCopy: false,     // 是否允许复制
      enableScreenLock: true, // 是否检测切屏
      maxScreenSwitches: 3, // 最大切屏次数
      enableFaceIdentity: true, // 是否开启人脸识别(身份核验)
      enableSnapshot: true  // 是否页面抓拍
  }
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
    if (selectedClassIds.value.length === 0) {
        ElMessage.warning('请选择适用班级')
        return
    }

    loading.value = true
    try {
        console.log('--- 开始创建试卷流程 ---')
        
        // 1. 创建基本信息
        console.log('Step 1: POST /examPaper', {
            title: baseForm.title,
            duration: baseForm.duration,
            totalMark: baseForm.totalScore,
            status: 0
        })
        const paperRes = await createExamPaper({
            title: baseForm.title,
            duration: baseForm.duration,   // 改回 duration
            totalMark: baseForm.totalScore, // 改回 totalMark
            status: 0
        })
        console.log('Step 1 成功:', paperRes)
        
        // 修正：request拦截器已经剥离了外层，返回的是 res.data
        // 也就是 { "id": 44 }，所以直接取 paperRes.id
        const paperId = paperRes?.id
        
        if (!paperId) {
            console.error('无法获取 Paper ID', paperRes)
            throw new Error('试卷创建失败：后端未返回有效的ID')
        }
        console.log('获取到 Paper ID:', paperId)

        // 2. 绑定题目
        const questionIds = selectedQuestions.value.map(q => q.id)
        if (questionIds.length > 0) {
            console.log('Step 2: POST /examPaper/addQuestions', { paperId, questionIds })
            const addRes = await addQuestionsToPaper({
                paperId: paperId,
                questionIds: questionIds
            })
            console.log('Step 2 成功:', addRes)
        }

        // 3. 发布并绑定班级
        console.log('Step 3: PUT /examPaper/publish/' + paperId, { classIds: selectedClassIds.value })
        const publishRes = await publishExamPaper(paperId, {
            classIds: selectedClassIds.value
        })
        console.log('Step 3 成功 (发布接口响应):', publishRes)

        ElMessage.success('试卷创建并发布成功！')
        
        // 重置状态...
        activeStep.value = 0
        baseForm.title = ''
        baseForm.duration = 90
        baseForm.totalScore = 0
        selectedQuestions.value = []
        selectedClassIds.value = []
        
    } catch (e) {
        console.error('--- 流程中断 ---')
        console.error('错误详情:', e)
        // 尝试从 e 中提取后端返回的错误消息
        const errorMsg = e.response?.data?.msg || e.message || '操作失败'
        ElMessage.error(errorMsg)
    } finally {
        loading.value = false
    }
}
onMounted(async () => {
    loadSourceQuestions()
    try {
        const res = await getAllClasses()
        if (res) classOptions.value = Array.isArray(res) ? res : (res.data || [])
    } catch (e) {
        console.error('加载班级失败', e)
    }
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
                <div class="config-section">
                    <div class="section-title">基础设置</div>
                    <el-form-item label="试卷名称" prop="title">
                        <el-input v-model="baseForm.title" placeholder="例如：Java程序设计期末考试" />
                    </el-form-item>
                    <el-form-item label="考试时长" prop="duration">
                        <el-input-number v-model="baseForm.duration" :min="10" :step="10" style="width: 180px" />
                        <span class="unit">分钟</span>
                    </el-form-item>
                </div>

                <div class="monitor-card" :class="{ 'is-active': baseForm.enableAiMonitor }">
                    <div class="card-header">
                        <div class="header-left">
                            <div class="icon-box">
                                <el-icon><VideoCamera /></el-icon>
                            </div>
                            <div class="header-text">
                                <span class="title">智能监考系统</span>
                                <span class="subtitle">实时监测考生行为，自动预警异常</span>
                            </div>
                        </div>
                        <el-switch v-model="baseForm.enableAiMonitor" />
                    </div>
                    
                    <transition name="smooth-expand">
                        <div v-if="baseForm.enableAiMonitor" class="card-body-wrapper">
                            <div class="card-body">
                                <!-- 第一组：AI 视觉监考 -->
                                <div class="config-group">
                                    <div class="group-label">AI 视觉监考</div>
                                    <div class="options-grid">
                                        <div class="option-item">
                                            <div class="opt-info">
                                                <span class="opt-name">人脸身份核验</span>
                                                <span class="opt-desc">开考前通过人脸比对确认考生身份</span>
                                            </div>
                                            <el-switch v-model="baseForm.monitorConfig.enableFaceIdentity" size="small" />
                                        </div>
                                        <div class="option-item">
                                            <div class="opt-info">
                                                <span class="opt-name">多人同框检测</span>
                                                <span class="opt-desc">识别画面中是否出现多张人脸</span>
                                            </div>
                                            <el-switch v-model="baseForm.monitorConfig.faceCountLimit" :active-value="1" :inactive-value="0" size="small" />
                                        </div>
                                        <div class="option-item">
                                            <div class="opt-info">
                                                <span class="opt-name">视线追踪</span>
                                                <span class="opt-desc">监测视线是否长时间离开屏幕</span>
                                            </div>
                                            <el-switch v-model="baseForm.monitorConfig.allowBlur" size="small" />
                                        </div>
                                        <div class="option-item">
                                            <div class="opt-info">
                                                <span class="opt-name">随机抓拍</span>
                                                <span class="opt-desc">监考过程中随机拍摄考生状态</span>
                                            </div>
                                            <el-switch v-model="baseForm.monitorConfig.enableSnapshot" size="small" />
                                        </div>
                                    </div>
                                    
                                    <div class="setting-row mini-row" v-if="baseForm.monitorConfig.enableSnapshot">
                                        <span class="label">抓拍频率</span>
                                        <el-radio-group v-model="baseForm.monitorConfig.captureInterval" size="small">
                                            <el-radio-button :label="10">高 (10s)</el-radio-button>
                                            <el-radio-button :label="30">中 (30s)</el-radio-button>
                                            <el-radio-button :label="60">低 (60s)</el-radio-button>
                                        </el-radio-group>
                                    </div>
                                </div>

                                <!-- 第二组：客户端限制 -->
                                <div class="config-group">
                                    <div class="group-label">客户端限制</div>
                                    <div class="options-grid">
                                        <div class="option-item">
                                            <div class="opt-info">
                                                <span class="opt-name">禁止复制粘贴</span>
                                                <span class="opt-desc">考试区域屏蔽右键及快捷键复制</span>
                                            </div>
                                            <el-switch v-model="baseForm.monitorConfig.allowCopy" :active-value="false" :inactive-value="true" size="small" />
                                        </div>
                                        <div class="option-item">
                                            <div class="opt-info">
                                                <span class="opt-name">切屏检测</span>
                                                <span class="opt-desc">记录并限制考生切换窗口的行为</span>
                                            </div>
                                            <el-switch v-model="baseForm.monitorConfig.enableScreenLock" size="small" />
                                        </div>
                                    </div>
                                    
                                    <div class="setting-row mini-row" v-if="baseForm.monitorConfig.enableScreenLock">
                                        <span class="label">最大允许切屏次数</span>
                                        <el-input-number v-model="baseForm.monitorConfig.maxScreenSwitches" :min="1" :max="10" size="small" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
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

             <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px; color: #606266;">发布设置</h4>
                <el-form label-width="100px">
                    <el-form-item label="适用班级" required>
                        <el-select 
                            v-model="selectedClassIds" 
                            multiple 
                            placeholder="请选择参考班级（必选）" 
                            style="width: 100%"
                            collapse-tags
                        >
                            <el-option
                                v-for="item in classOptions"
                                :key="item.id"
                                :label="item.className"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>
                </el-form>
             </div>
             
             <div style="margin-top: 20px; text-align: center;">
                 <el-button type="primary" size="large" @click="handleSubmit" :loading="loading" style="width: 100%">确认创建并发布</el-button>
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

.base-form { max-width: 650px; margin: 0 auto; }

.config-section {
    background: #fff;
    padding: 25px;
    border-radius: 12px;
    border: 1px solid #f0f0f0;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.02);
}
.section-title {
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 20px;
    letter-spacing: -0.5px;
}

/* Modern Monitor Card */
.monitor-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 20px 24px;
    transition: all 0.3s ease;
    margin-top: 30px;
}
.monitor-card.is-active {
    border-color: #3b82f6; /* Indigo/Blue */
    background: #f8fafc; /* Very light gray/blue */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.icon-box {
    width: 40px; height: 40px;
    background: #eff6ff; /* Blue-50 */
    color: #3b82f6;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
}
.monitor-card.is-active .icon-box { background: #3b82f6; color: #fff; }

.header-text { display: flex; flex-direction: column; }
.header-text .title { font-weight: 600; color: #111827; font-size: 15px; }
.header-text .subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

.card-body {
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* Config Groups */
.config-group { display: flex; flex-direction: column; gap: 12px; }
.group-label { font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }

.options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
.option-item {
    background: #fff;
    border: 1px solid #f3f4f6;
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.opt-info { display: flex; flex-direction: column; gap: 2px; }
.opt-name { font-size: 14px; font-weight: 600; color: #374151; }
.opt-desc { font-size: 12px; color: #9ca3af; }

.mini-row {
    background: #fff;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px dashed #e5e7eb;
}

/* Smooth Expand Transition */
.smooth-expand-enter-active,
.smooth-expand-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 800px; /* 增加高度限制以容纳更多内容 */
    overflow: hidden;
}
.smooth-expand-enter-from,
.smooth-expand-leave-to {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
}

.setting-row { display: flex; align-items: center; justify-content: space-between; }
.setting-row .label { font-size: 14px; color: #4b5563; font-weight: 500; }

.tags-group { display: flex; gap: 10px; }
/* Override Element checkbox for button-like look */
:deep(.el-checkbox.is-bordered) {
    border-radius: 8px;
    margin-right: 0;
    background: #fff;
    border-color: #e5e7eb;
}
:deep(.el-checkbox.is-bordered.is-checked) {
    background: #eff6ff;
    border-color: #3b82f6;
}

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
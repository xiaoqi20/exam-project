<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getMistakeList } from '@/api/mistake'
import { generateSimilarQuestions } from '@/api/ai' // New
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, ArrowUp, Warning, MagicStick, VideoPlay, Check, Close } from '@element-plus/icons-vue' // Icons
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const mistakeList = ref([])
const total = ref(0)

// AI Practice State
const practiceDialogVisible = ref(false)
const practiceLoading = ref(false)
const practiceQuestions = ref([])
const practiceAnswers = ref({})
const practiceSubmitted = ref(false)

const queryParams = reactive({
  page: 1,
  size: 10,
  dateRange: [] // 时间筛选
})

// Date helper
const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const pad = (n) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Check if a record is within range (Client-side fallback)
const isDateInRange = (dateStr) => {
    if (!queryParams.dateRange || queryParams.dateRange.length < 2) return true
    if (!dateStr) return false
    const target = new Date(dateStr).getTime()
    const start = new Date(queryParams.dateRange[0]).getTime()
    const end = new Date(queryParams.dateRange[1]).getTime()
    return target >= start && target <= end
}

// --- AI 变式训练核心逻辑 ---
const handleAiPractice = async (item) => {
    practiceDialogVisible.value = true
    practiceLoading.value = true
    practiceSubmitted.value = false
    practiceQuestions.value = []
    practiceAnswers.value = {}

    try {
        const res = await generateSimilarQuestions({
            questionId: item.id,
            content: item.content, 
            count: 3 
        })
        
        const questions = Array.isArray(res) ? res : (res.data || [])
        
        if (questions.length > 0) {
            practiceQuestions.value = questions.map(q => ({
                ...q,
                options: (typeof q.options === 'string' && q.options.startsWith('{')) ? JSON.parse(q.options) : q.options,
            }))
        } else {
            ElMessage.warning('AI 暂时没能生成相关题目')
            practiceDialogVisible.value = false
        }
    } catch (e) {
        console.error(e)
        ElMessage.error('生成训练题失败')
        practiceDialogVisible.value = false
    } finally {
        practiceLoading.value = false
    }
}

const submitPractice = () => {
    if (Object.keys(practiceAnswers.value).length < practiceQuestions.value.length) {
        ElMessage.warning('请先完成所有题目')
        return
    }
    practiceSubmitted.value = true
    
    let correctCount = 0
    practiceQuestions.value.forEach((q, idx) => {
        if (practiceAnswers.value[idx] === q.answer) correctCount++
    })
    
    if (correctCount === practiceQuestions.value.length) {
        ElMessage.success('太棒了！全部正确，您已掌握该知识点！')
    } else {
        ElMessage.info(`答对 ${correctCount} / ${practiceQuestions.value.length} 题`)
    }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // Construct params
    const apiParams = {
        page: queryParams.page,
        size: queryParams.size
    }
    if (queryParams.dateRange && queryParams.dateRange.length === 2) {
        apiParams.startTime = formatDate(queryParams.dateRange[0])
        apiParams.endTime = formatDate(queryParams.dateRange[1])
    }

    const res = await getMistakeList(apiParams)
    
    if (res && res.records) {
      // Client-side filtering fallback
      const filteredRecords = res.records.filter(item => {
          return isDateInRange(item.mistakeTime)
      })

      mistakeList.value = filteredRecords.map(item => {
        let parsedOptions = {}
        try {
            parsedOptions = typeof item.options === 'string' ? JSON.parse(item.options) : item.options
        } catch (e) { console.error('Option parse error', e) }

        return {
            ...item,
            parsedOptions,
            showAnalysis: false,
            aiLoading: false 
        }
      })
      total.value = res.total
    } else {
        mistakeList.value = []
        total.value = 0
    }
  } catch (e) {
    ElMessage.error('加载错题失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page) => {
    queryParams.page = page
    loadData()
}

// 选项样式判断
const getOptionClass = (question, key) => {
    const isMyWrong = (question.myAnswer || '').includes(key)
    const isCorrect = (question.answer || '').includes(key)
    
    if (isCorrect) return 'correct-option'
    if (isMyWrong && !isCorrect) return 'wrong-option'
    return ''
}

const toggleAnalysis = (row) => {
    row.showAnalysis = !row.showAnalysis
}

// AI Analysis Logic
const cleanAIContent = (text) => {
    if (!text) return ''
    let cleaned = text
        .replace(/\\n/g, '\n')
        .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
        .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2') 
        .replace(/\*\*\s+(.*?)\s+\*\*/g, '**$1**')
        .replace(/\s*([\uff0c\u3002\uff1a\uff1b\uff1f\uff01])\s*/g, '$1')

    // FORCE LAYOUT
    cleaned = cleaned.replace(
        /([\s\S])\s*(\*\*|###)?\s*错误选项分析\s*[:\uff1a]?\s*(\*\*|###)?/g, 
        '$1\n\n### 错误选项分析：\n' 
    ) 
    cleaned = cleaned.replace(/([^\n])\s*-\s/g, '$1\n- ')
    
    cleaned = cleaned.replace(/([^\n])\s*(选项\s*[A-E]\s*[\uff1a:]) /g, '$1\n- **$2**')
    cleaned = cleaned.replace(/^\s*：\s*/gm, '')
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

    return cleaned.trim()
}

const fetchAIAnalysis = async (item) => {
    if (item.aiLoading) return
    item.aiLoading = true
    if (!item.analysis || item.analysis === '暂无解析') item.analysis = ''
    
    let rawAnalysis = ''
    try {
        const token = userStore.token
        const url = `/api/ai/analyze/stream?questionId=${item.id}&studentAnswer=${encodeURIComponent(item.myAnswer || '')}`
        
        const response = await fetch(url, {
            headers: {
                'token': token,
                'Accept': 'text/event-stream'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const data = line.slice(5).trim()
                    if (data === '[DONE]') break
                    
                    let contentToAdd = ''
                    try {
                         const json = JSON.parse(data)
                         contentToAdd = json.content || ''
                    } catch (e) {
                         contentToAdd = data + ' ' 
                    }
                    
                    rawAnalysis += contentToAdd
                    item.analysis = cleanAIContent(rawAnalysis)
                }
            }
        }
    } catch (e) {
        console.error('AI Stream Error:', e)
        ElMessage.error('AI 解析生成失败')
        item.analysis += '\n\n*(获取解析失败)*'
    } finally {
        item.aiLoading = false
    }
}

onMounted(() => {
    // Set default range to Today
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    queryParams.dateRange = [start, end]
    
    loadData()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" class="page-header-card">
        <div class="page-header">
            <h2><el-icon><Warning /></el-icon> 错题本</h2>
            <!-- Time Filter -->
            <div class="filter-area">
                <el-date-picker
                    v-model="queryParams.dateRange"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    :shortcuts="[{ text: '今天', value: () => { const end = new Date(); const start = new Date(); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return [start, end] } }]"
                    @change="handlePageChange(1)"
                    size="default"
                    style="width: 320px"
                />
            </div>
        </div>
        <div class="sub-text">共收集 {{ total }} 道错题，温故而知新</div>
    </el-card>

    <div v-loading="loading" class="mistake-list">
        <el-empty v-if="!loading && mistakeList.length === 0" description="所选时间段内暂无错题记录！" />
        
        <div v-for="(item, index) in mistakeList" :key="item.id" class="mistake-card">
            <div class="card-header">
                <div class="header-left">
                    <span class="index-no">#{{ (queryParams.page - 1) * queryParams.size + index + 1 }}</span>
                    <el-tag size="small" :type="item.type === 'choice' ? '' : 'warning'">
                        {{ item.type === 'choice' ? '单选题' : (item.type === 'multiple_choice' ? '多选题' : '判断题') }}
                    </el-tag>
                    <span class="time">{{ item.mistakeTime?.replace('T', ' ') }}</span>
                </div>
            </div>
            
            <div class="card-content">
                <div class="q-text">{{ item.content }}</div>
                
                <!-- 选项列表 -->
                <div class="options-group">
                    <div 
                        v-for="(val, key) in item.parsedOptions" 
                        :key="key" 
                        class="option-item"
                        :class="getOptionClass(item, key)"
                    >
                        <span class="opt-key">{{ key }}.</span>
                        <span class="opt-val">{{ val }}</span>
                    </div>
                </div>
            </div>

            <div class="card-footer">
                <div class="result-info">
                    <span>我的答案：<span class="text-danger">{{ item.myAnswer }}</span></span>
                    <span class="divider">|</span>
                    <span>正确答案：<span class="text-success">{{ item.answer }}</span></span>
                </div>
                <div>
                    <el-button link type="success" :icon="VideoPlay" @click="handleAiPractice(item)">AI 举一反三</el-button>
                    <el-button link type="primary" @click="toggleAnalysis(item)">
                        {{ item.showAnalysis ? '收起解析' : '查看解析' }}
                        <el-icon class="el-icon--right">
                            <ArrowUp v-if="item.showAnalysis" /><ArrowDown v-else />
                        </el-icon>
                    </el-button>
                </div>
            </div>

            <!-- 解析区域 (折叠) -->
            <div v-if="item.showAnalysis" class="analysis-panel">
                <div class="panel-header-row">
                    <span class="panel-title">题目解析：</span>
                    <el-button 
                        v-if="!item.aiLoading" 
                        link 
                        type="primary" 
                        size="small" 
                        :icon="MagicStick"
                        @click="fetchAIAnalysis(item)"
                    >
                        {{ item.analysis ? '重新生成' : 'AI 智能解析' }}
                    </el-button>
                    <span v-else class="typing-text">AI 正在分析...</span>
                </div>
                
                <div class="analysis-content">
                    <MarkdownViewer :content="item.analysis || '暂无解析，请点击上方按钮获取 AI 解析。'" />
                    <span v-if="item.aiLoading" class="cursor"></span>
                </div>
            </div>
        </div>
    </div>

    <div class="pagination-container" v-if="total > 0">
        <el-pagination 
            background 
            layout="prev, pager, next"
            :total="total" 
            v-model:current-page="queryParams.page"
            :page-size="queryParams.size"
            @current-change="handlePageChange"
        />
    </div>

    <!-- AI Practice Dialog -->
    <el-dialog v-model="practiceDialogVisible" title="AI 变式训练营" width="600px" :close-on-click-modal="false">
        <div v-loading="practiceLoading" class="practice-container">
            <template v-if="!practiceLoading && practiceQuestions.length > 0">
                <div v-for="(q, idx) in practiceQuestions" :key="idx" class="practice-item">
                    <div class="p-title">{{ idx + 1 }}. {{ q.content }}</div>
                    <div class="p-options">
                        <el-radio-group v-model="practiceAnswers[idx]" :disabled="practiceSubmitted">
                            <el-radio 
                                v-for="(val, key) in q.options" 
                                :key="key" 
                                :label="key" 
                                border 
                                class="p-radio"
                                :class="{
                                    'is-correct': practiceSubmitted && key === q.answer,
                                    'is-wrong': practiceSubmitted && practiceAnswers[idx] === key && key !== q.answer
                                }"
                            >
                                {{ key }}. {{ val }}
                            </el-radio>
                        </el-radio-group>
                    </div>
                    <div v-if="practiceSubmitted" class="p-analysis">
                        <div class="ans-label">
                            正确答案：<span class="text-success">{{ q.answer }}</span>
                            <span v-if="practiceAnswers[idx] === q.answer" class="user-result success"><el-icon><Check /></el-icon> 回答正确</span>
                            <span v-else class="user-result error"><el-icon><Close /></el-icon> 回答错误</span>
                        </div>
                        <div class="ans-text">{{ q.analysis }}</div>
                    </div>
                </div>
            </template>
            <el-empty v-if="!practiceLoading && practiceQuestions.length === 0" description="生成失败" />
        </div>
        <template #footer>
            <el-button @click="practiceDialogVisible = false">关闭</el-button>
            <el-button type="primary" @click="submitPractice" v-if="!practiceSubmitted && practiceQuestions.length > 0">提交答案</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; max-width: 800px; margin: 0 auto; }
.page-header-card { margin-bottom: 20px; border: none; background: transparent; }
.page-header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    flex-wrap: wrap; 
    gap: 15px; 
}
.page-header h2 { margin: 0; display: flex; align-items: center; gap: 8px; color: #303133; }
.sub-text { color: #909399; font-size: 14px; margin-top: 4px; display: block; }
.filter-area { display: flex; align-items: center; }

.mistake-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
    transition: all 0.3s;
}
.mistake-card:hover { box-shadow: 0 4px 16px 0 rgba(0,0,0,0.1); }

.card-header { margin-bottom: 15px; }
.header-left { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.index-no { font-weight: bold; color: #909399; }
.time { color: #C0C4CC; font-size: 12px; margin-left: auto; }

.q-text { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 15px; line-height: 1.6; }

.options-group { display: flex; flex-direction: column; gap: 10px; }
.option-item {
    padding: 10px 15px;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 14px;
    color: #606266;
    border: 1px solid transparent;
    display: flex;
}
.opt-key { font-weight: bold; margin-right: 10px; width: 20px; }
.opt-val { flex: 1; }

.correct-option { background: #f0f9eb; color: #67C23A; border-color: #c2e7b0; }
.wrong-option { background: #fef0f0; color: #F56C6C; border-color: #fbc4c4; }

.card-footer {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.result-info { font-size: 14px; color: #606266; }
.text-success { color: #67C23A; font-weight: bold; margin-left: 4px; }
.text-danger { color: #F56C6C; font-weight: bold; margin-left: 4px; }
.divider { margin: 0 10px; color: #dcdfe6; }

/* Analysis Panel */
.analysis-panel {
    margin-top: 15px;
    background: #f8f9fa; /* Lighter grey for better AI text contrast */
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #ebeef5;
}
.panel-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    border-bottom: 1px dashed #e4e7ed;
    padding-bottom: 8px;
}
.panel-title { font-weight: bold; font-size: 14px; color: #606266; }
.typing-text { font-size: 12px; color: #909399; font-style: italic; }

.analysis-content {
    font-size: 14px;
    line-height: 1.6;
}

/* AI Cursor */
.cursor {
    display: inline-block;
    width: 2px;
    height: 14px;
    background: #d63384;
    vertical-align: middle;
    margin-left: 2px;
    animation: blink 1s infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.pagination-container { display: flex; justify-content: center; margin-top: 30px; }

/* Practice Dialog Styles */
.practice-container { max-height: 500px; overflow-y: auto; padding: 10px; }
.practice-item { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px dashed #eee; }
.p-title { font-weight: bold; margin-bottom: 10px; font-size: 15px; }
.p-radio { width: 100%; margin-bottom: 10px; margin-left: 0 !important; white-space: normal; height: auto; padding: 10px; }
.p-analysis { margin-top: 10px; background: #f0f9eb; padding: 10px; border-radius: 4px; font-size: 13px; }
.ans-label { font-weight: bold; margin-bottom: 5px; display: flex; align-items: center; gap: 10px; }
.user-result.success { color: #67C23A; font-weight: bold; }
.user-result.error { color: #F56C6C; font-weight: bold; }

/* Highlight styles for result */
:deep(.is-correct) { background-color: #f0f9eb !important; border-color: #67C23A !important; color: #67C23A !important; }
:deep(.is-wrong) { background-color: #fef0f0 !important; border-color: #F56C6C !important; color: #F56C6C !important; }

/* Mobile */
@media (max-width: 768px) {
    .app-container { padding: 10px; }
    .mistake-card { padding: 15px; }
    .result-info { font-size: 13px; }
    .page-header { flex-direction: column; align-items: flex-start; }
    .filter-area { width: 100%; margin-top: 10px; }
    .filter-area :deep(.el-date-editor) { width: 100% !important; }
}
</style>
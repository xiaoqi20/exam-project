<script setup>
import { ref, reactive, onMounted, computed } from 'vue' // Add onMounted
import { useRouter } from 'vue-router'
import {
    UploadFilled, MagicStick, ChatDotRound, Delete, Check, Plus,
    User, Cpu, ArrowLeft, Setting, Document, VideoPlay, Rank, Refresh // Add Refresh
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import { createExamPaper, addQuestionsToPaper, publishExamPaper } from '@/api/examPaper'
import { getAllClasses } from '@/api/class' // Import class API
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
const router = useRouter()
const userStore = useUserStore()
const currentStep = ref(1) // 1: 配置, 2: 生成
const generating = ref(false)

// 配置表单
const config = reactive({
    topic: '',
    targetAudience: 'undergraduate',
    difficulty: 'medium',
    // 题型详细配置：{ type: { checked, count, score } }
    typeConfig: {
        choice: { label: '单选题', checked: true, count: 10, score: 2 },
        multiple_choice: { label: '多选题', checked: false, count: 5, score: 4 },
        true_false: { label: '判断题', checked: false, count: 5, score: 2 },
        fill_blank: { label: '填空题', checked: false, count: 5, score: 2 },
        short_answer: { label: '简答题', checked: true, count: 2, score: 10 }
    },
    file: null
})

// 计算属性：实时总分
const calculatedTotalScore = computed(() => {
    let total = 0
    let count = 0
    for (const key in config.typeConfig) {
        const item = config.typeConfig[key]
        if (item.checked) {
            total += item.count * item.score
            count += item.count
        }
    }
    return { total, count }
})

// 题型映射表 (保留用于显示)
const typeMap = {
    'choice': '单选题',
    'multiple_choice': '多选题',
    'true_false': '判断题',
    'fill_blank': '填空题',
    'short_answer': '简答题'
}
// ...

// 2. 生成状态
const generatedQuestions = ref([])
const chatHistory = ref([])
const userInput = ref('')
const docId = ref(null) 

// --- A. 文件上传：先调用 /ai/upload-doc ---
const handleFileUpload = async (options) => {
    const file = options.file
    const formData = new FormData()
    formData.append('file', file)
    
    try {
        // request.js 已经配置了 /api 前缀和 token 携带
        const res = await request.post('/ai/upload-doc', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        // 假设返回结构 res.data 就是 UUID 字符串
        docId.value = res 
        config.file = file
        ElMessage.success('课件解析成功，AI 已准备就绪')
        chatHistory.value.push({
            role: 'assistant', 
            content: `📖 课件《${file.name}》已成功向量化。点击“立即生成”将基于此文档出题。` 
        })
    } catch (e) {
        ElMessage.error('课件上传失败，请检查后端 /ai/upload-doc 接口')
    }
}

// --- B. 核心生成：调用 /ai/generate/agent (SSE) ---
const startGenerate = async () => {
    // 校验总分
    if (calculatedTotalScore.value.total === 0) {
        ElMessage.warning('请至少选择一种题型并配置分数')
        return
    }

    console.log('--- 启动 AI 生成任务 ---')
    
    // 构造详细的题型描述
    const typeDesc = Object.values(config.typeConfig)
        .filter(c => c.checked)
        .map(c => `${c.count}道${c.label}(每题${c.score}分)`)
        .join('，')
    
    const payload = {
        topic: config.topic,
        docId: docId.value,
        targetAudience: config.targetAudience,
        difficulty: config.difficulty,
        // 这里把结构化信息拼接到 topic 或 types 中，或者后端增加字段
        // 假设后端复用 types 字段接收描述
        types: typeDesc, 
        count: calculatedTotalScore.value.count,
        totalScore: calculatedTotalScore.value.total
    }

    console.log('Payload:', payload)

    generating.value = true
    generatedQuestions.value = []
    
    // 初始化对话区
    chatHistory.value = [
        { role: 'user', content: `请基于主题“${config.topic || '课件内容'}”生成试卷：${typeDesc}，总分 ${payload.totalScore} 分。` },
        { role: 'assistant', content: '正在为您构思题目，请稍候...', isTyping: true }
    ]
    const aiMsg = chatHistory.value[1]

    let fullJsonString = '' 

    try {
        // 使用原生 fetch 处理 SSE 流
        const response = await fetch('/api/ai/generate/agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': userStore.token
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const content = line.replace('data:', '').trim()
                    if (content === '[DONE]') {
                        processFinalResult(fullJsonString, aiMsg)
                        break
                    }
                    fullJsonString += content
                    aiMsg.content = `正在接收数据... (${fullJsonString.length} bytes)`
                } else if (line.trim()) {
                    // 兼容非 data: 前缀的原始文本流
                    fullJsonString += line
                }
            }
        }
        
        // 最终解析
        processFinalResult(fullJsonString, aiMsg)

    } catch (e) {
        console.error('SSE 通信失败:', e)
        aiMsg.content = '抱歉，生成过程中遇到了连接故障。请检查后端 SSE 接口。'
        aiMsg.isTyping = false
    } finally {
        generating.value = false
    }
}

// 辅助：获取某题型的分值
const getScoreByType = (type) => {
    // 兼容后端返回的英文或中文类型名
    if (type === 'choice' || type === '单选题') return config.typeConfig.choice.score
    if (type === 'multiple_choice' || type === '多选题') return config.typeConfig.multiple_choice.score
    if (type === 'true_false' || type === '判断题') return config.typeConfig.true_false.score
    if (type === 'fill_blank' || type === '填空题') return config.typeConfig.fill_blank.score
    if (type === 'short_answer' || type === '简答题') return config.typeConfig.short_answer.score
    return 0
}

// --- 3. 后处理：解析 JSON 与 Options ---

const processFinalResult = (jsonStr, aiMsg) => {

    console.log('原始流数据:', jsonStr)

    

    // 细节 1：清洗 Markdown 标记

    let cleanJson = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim()



    // 细节 2：简易修复截断的 JSON (针对数组)

    if (cleanJson.startsWith("[") && !cleanJson.endsWith("]")) {

        console.warn('检测到 JSON 截断，尝试自动修复...')

        // 依次尝试补全层次

        if (!cleanJson.endsWith("}")) {

            if (cleanJson.endsWith('"')) cleanJson += "}"

            else cleanJson += '"}'

        }

        cleanJson += "]"

    }



    try {

        const rawList = JSON.parse(cleanJson)

        

        if (Array.isArray(rawList)) {

            generatedQuestions.value = rawList.map(q => ({

                ...q,

                id: Date.now() + Math.random(),

                score: getScoreByType(q.type),

                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options

            }))

            aiMsg.content = `生成完毕！共为您准备了 ${generatedQuestions.value.length} 道试题。`

        }

    } catch (e) {

        console.error('JSON 解析失败:', e)

        aiMsg.content = '生成数据格式解析失败，可能是由于网络中断。请尝试减少题目数量重试。'

    }

    aiMsg.isTyping = false

}

// --- C. 其他交互逻辑 ---
const goToGeneration = () => {
    if (!config.topic && !docId.value) {
        ElMessage.warning('请输入出题范围或上传课件')
        return
    }
    currentStep.value = 2
    startGenerate()
}

const handleChatSubmit = () => {
    if (!userInput.value.trim()) return
    chatHistory.value.push({ role: 'user', content: userInput.value })
    userInput.value = ''
    ElMessage.info('多轮对话功能开发中，目前请使用重新生成功能。')
}

const removeQuestion = (index) => {
    generatedQuestions.value.splice(index, 1)
}

const saveToBank = () => {
    ElMessage.success(`成功保存 ${generatedQuestions.value.length} 道题目到题库！`)
    router.push('/dashboard/teacher/question/list')
}

// --- 直接发布试卷逻辑 ---
const publishDialogVisible = ref(false)
const publishLoading = ref(false)
const classOptions = ref([]) // 班级列表
const publishForm = reactive({
    title: '',
    duration: 90,
    classIds: [] // 选中的班级
})

const loadClasses = async () => {
    try {
        const res = await getAllClasses()
        if (res) classOptions.value = Array.isArray(res) ? res : (res.data || [])
    } catch (e) {
        console.error(e)
    }
}

const openPublishDialog = async () => {
    if (generatedQuestions.value.length === 0) return
    publishForm.title = config.topic ? `${config.topic} - AI 生成试卷` : 'AI 智能组卷'
    publishForm.classIds = []
    await loadClasses()
    publishDialogVisible.value = true
}

const handleDirectPublish = async () => {
    if (publishForm.classIds.length === 0) {
        ElMessage.warning('请选择适用班级')
        return
    }

    publishLoading.value = true
    try {
        console.log('--- 启动一键组卷发布 ---')
        
        // 关键点：后端存库需要 options 是 JSON 字符串格式
        const preparedQuestions = generatedQuestions.value.map(q => ({
            ...q,
            // 如果 options 是对象，将其转换回字符串，匹配 DB 结构
            options: typeof q.options === 'object' ? JSON.stringify(q.options) : q.options
        }))

        // 调用一键组卷接口
        const res = await request.post('/examPaper/create-with-questions', {
            title: publishForm.title,
            duration: publishForm.duration,
            totalMark: calculatedTotalScore.value.total, // 使用计算出的动态总分
            status: 1, // 直接发布状态
            classIds: publishForm.classIds,
            questions: preparedQuestions
        })

        console.log('一键组卷成功响应:', res)
        ElMessage.success('试卷已成功创建并发布！')
        publishDialogVisible.value = false
        router.push('/dashboard/teacher/exam/publish')
    } catch (e) {
        console.error('发布失败:', e)
        ElMessage.error(e.response?.data?.msg || '发布失败：请检查后端接口连接')
    } finally {
        publishLoading.value = false
    }
}

// 拖拽排序逻辑
const dragIndex = ref(null)
const onDragStart = (i) => { dragIndex.value = i }
const onDragOver = (e) => { e.preventDefault() }
const onDrop = (i) => {
    const item = generatedQuestions.value.splice(dragIndex.value, 1)[0]
    generatedQuestions.value.splice(i, 0, item)
    dragIndex.value = null
}
</script>

<template>
    <div class="agent-wrapper">
        <!-- Step 1: 配置中心 -->
        <div v-if="currentStep === 1" class="step-config-layout">
            <div class="config-header">
                <h1>AI 试卷生成中心</h1>
                <p>配置您的智能助教，一键生成高质量试题。</p>
            </div>

            <div class="config-grid">
                <div class="main-task-area">
                    <div class="input-card">
                        <div class="card-title"><el-icon><ChatLineRound /></el-icon> 1. 核心考点 / 出题主题</div>
                        <el-input 
                            v-model="config.topic" 
                            type="textarea" 
                            :rows="6" 
                            placeholder="请描述出题范围（例如：Java集合框架底层原理）" 
                            class="topic-input"
                        />
                    </div>

                    <div class="upload-card">
                        <div class="card-title"><el-icon><Document /></el-icon> 2. 参考课件 (RAG 增强)</div>
                        <el-upload
                            class="upload-zone"
                            drag
                            action="#"
                            :http-request="handleFileUpload"
                            :limit="1"
                            :show-file-list="false"
                        >
                            <div class="upload-content">
                                <el-icon class="upload-icon"><UploadFilled /></el-icon>
                                <div class="upload-text" v-if="!config.file">拖拽 PDF/Word 到此处</div>
                                <div class="file-name" v-else><el-icon><Check /></el-icon> {{ config.file.name }}</div>
                            </div>
                        </el-upload>
                    </div>
                </div>

                <div class="params-sidebar">
                    <div class="param-group">
                        <div class="group-label">受众与难度</div>
                        <div class="control-row">
                            <el-select v-model="config.targetAudience" placeholder="适用人群">
                                <el-option label="大一/大二学生" value="freshman" />
                                <el-option label="大三/大四学生" value="undergraduate" />
                                <el-option label="研究生/科研" value="graduate" />
                                <el-option label="职业培训" value="vocational" />
                            </el-select>
                            <el-select v-model="config.difficulty" placeholder="难度">
                                <el-option label="🌱 简单" value="easy" />
                                <el-option label="🔥 中等" value="medium" />
                                <el-option label="🚀 困难" value="hard" />
                            </el-select>
                        </div>
                    </div>

                                        <div class="param-group">
                        <div class="group-label">题型与分值配置</div>
                        
                        <div class="type-grid">
                            <div 
                                v-for="(cfg, key) in config.typeConfig" 
                                :key="key" 
                                class="type-card" 
                                :class="{ 'is-selected': cfg.checked }"
                                @click="cfg.checked = !cfg.checked"
                            >
                                <div class="card-top">
                                    <div class="checkbox-mock" :class="{ 'checked': cfg.checked }">
                                        <el-icon v-if="cfg.checked"><Check /></el-icon>
                                    </div>
                                    <span class="type-name">{{ cfg.label }}</span>
                                </div>
                                
                                <div class="card-bottom" v-if="cfg.checked" @click.stop>
                                    <div class="input-group">
                                        <el-input-number v-model="cfg.count" :min="1" :max="50" size="small" controls-position="right" />
                                        <span class="suffix">题</span>
                                    </div>
                                    <div class="input-group">
                                        <el-input-number v-model="cfg.score" :min="1" :max="50" size="small" controls-position="right" />
                                        <span class="suffix">分/题</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 实时总分条 (更像一个进度条) -->
                        <div class="total-bar">
                            <div class="bar-info">
                                <span>预计总分</span>
                                <span class="score-val" :class="{ 'score-ok': calculatedTotalScore.total === 100 }">
                                    {{ calculatedTotalScore.total }}
                                </span>
                                <span class="unit">分</span>
                            </div>
                            <div class="bar-track">
                                <div class="bar-fill" :style="{ width: Math.min(calculatedTotalScore.total, 100) + '%', background: calculatedTotalScore.total > 100 ? '#F56C6C' : '#409EFF' }"></div>
                            </div>
                            <div class="bar-meta">{{ calculatedTotalScore.count }} 道题目</div>
                        </div>
                    </div>

                    <div class="action-area">
                        <el-button type="primary" size="large" class="launch-btn" @click="goToGeneration">
                            <el-icon><MagicStick /></el-icon> 立即生成
                        </el-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 2: 生成工作台 -->
        <div v-else class="step-workspace">
            <header class="workspace-header">
                <div class="left">
                    <el-button @click="currentStep = 1" circle><el-icon><ArrowLeft /></el-icon></el-button>
                    <span class="title">正在生成：{{ config.topic || '自定义任务' }}</span>
                </div>
                <div class="right">
                    <el-button v-if="!generating" :icon="Refresh" @click="startGenerate" size="small" plain>重新生成</el-button>
                    <el-button type="success" :icon="Check" @click="saveToBank" size="small" plain>保存到题库</el-button>
                    <el-button type="warning" :icon="VideoPlay" :disabled="generatedQuestions.length === 0" @click="openPublishDialog" size="small">直接发布试卷</el-button>
                </div>
            </header>

            <div class="workspace-body">
                <div class="chat-column">
                    <div class="panel-title">生成日志</div>
                    <div class="chat-scroll">
                        <div v-for="(msg, i) in chatHistory" :key="i" class="chat-msg" :class="msg.role">
                            <div class="avatar" :class="msg.role"><el-icon v-if="msg.role === 'assistant'"><Cpu /></el-icon><el-icon v-else><User /></el-icon></div>
                            <div class="bubble">
                                <div v-if="msg.isTyping" class="typing"><span></span><span></span><span></span></div>
                                <div v-else>{{ msg.content }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="chat-input-box">
                        <el-input v-model="userInput" placeholder="调整指令..." @keyup.enter="handleChatSubmit">
                            <template #append><el-button @click="handleChatSubmit">发送</el-button></template>
                        </el-input>
                    </div>
                </div>

                <div class="preview-column">
                    <div class="panel-title">试题预览 ({{ generatedQuestions.length }})</div>
                    <div class="question-scroll">
                        <transition-group name="list">
                            <div 
                                v-for="(q, idx) in generatedQuestions" 
                                :key="q.id" 
                                class="q-item-card"
                                draggable="true"
                                @dragstart="onDragStart(idx)"
                                @dragover="onDragOver"
                                @drop="onDrop(idx)"
                                :class="{ 'is-dragging': dragIndex === idx }"
                            >
                                <div class="q-item-head">
                                    <div class="head-left">
                                        <el-icon class="drag-handle"><Rank /></el-icon>
                                        <span class="q-idx">{{ idx + 1 }}</span>
                                        <el-tag size="small" effect="plain" style="margin-right: 8px">
                                            {{ typeMap[q.type] || q.type }}
                                        </el-tag>
                                        <el-tag size="small" type="warning" effect="dark" v-if="q.score">
                                            {{ q.score }}分
                                        </el-tag>
                                    </div>
                                    <el-button link type="danger" :icon="Delete" @click="removeQuestion(idx)" />
                                </div>
                                <div class="q-item-body">
                                    <div class="q-text">{{ q.content }}</div>
                                    <div v-if="q.options" class="q-opts">
                                        <div 
                                            v-for="(val, key) in q.options" 
                                            :key="key" 
                                            class="opt-row" 
                                            :class="{ 'correct': (q.answer || '').includes(key) }"
                                        >
                                            <span class="opt-k">{{ key }}.</span>
                                            <span class="opt-v">{{ val }}</span>
                                        </div>
                                    </div>
                                    <div v-else class="q-ref">参考答案：{{ q.answer }}</div>
                                    <div class="q-ana">解析：{{ q.analysis }}</div>
                                </div>
                            </div>
                        </transition-group>
                        <el-empty v-if="generatedQuestions.length === 0 && !generating" description="等待生成..." />
                    </div>
                </div>
            </div>
        </div>

        <el-dialog v-model="publishDialogVisible" title="发布为试卷" width="500px">
            <el-form label-position="top">
                <el-form-item label="试卷标题"><el-input v-model="publishForm.title" /></el-form-item>
                <el-form-item label="考试时长 (分钟)"><el-input-number v-model="publishForm.duration" :min="10" :step="10" /></el-form-item>
                <el-form-item label="适用班级" required>
                    <el-select 
                        v-model="publishForm.classIds" 
                        multiple 
                        placeholder="请选择参考班级" 
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
                <p style="font-size: 12px; color: #909399;">
                    <el-icon><Check /></el-icon> 将自动保存 {{ generatedQuestions.length }} 道题目并生成试卷。
                </p>
            </el-form>
            <template #footer>
                <el-button @click="publishDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="publishLoading" @click="handleDirectPublish">确认发布</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.agent-wrapper { min-height: 100vh; background: #f5f7fa; padding: 20px; }
.step-config-layout { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; }
.config-header { margin-bottom: 20px; } /* 从 30px 减小到 20px */
.config-header h1 { font-size: 22px; color: #303133; margin: 0 0 5px; } /* 字号从 28px 减小到 22px */
.config-header p { color: #94a3b8; font-size: 14px; margin: 0; } /* 缩小副标题 */
.config-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
.input-card, .upload-card { background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #ebeef5; }
.card-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
.topic-input :deep(.el-textarea__inner) { font-size: 16px; padding: 15px; }
.upload-zone :deep(.el-upload-dragger) { border: 2px dashed #dcdfe6; padding: 30px; }
.upload-icon { font-size: 40px; color: #c0c4cc; }
.file-name { color: #67C23A; font-weight: bold; }
.params-sidebar { background: #fff; border-radius: 12px; padding: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #ebeef5; }
.param-group { margin-bottom: 25px; }
.group-label { font-size: 12px; color: #909399; text-transform: uppercase; margin-bottom: 15px; font-weight: bold; }
.control-row { display: flex; gap: 10px; }
.control-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; }
.type-checks { display: flex; flex-direction: column; gap: 8px; }

/* New Type Configuration Grid */
.type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
}

.type-card {
    background: #fcfcfc; border: 1px solid #eee; border-radius: 8px;
    padding: 12px; cursor: pointer; transition: all 0.2s;
    display: flex; flex-direction: column; gap: 10px;
}
.type-card:hover { border-color: #dcdfe6; background: #fff; }
.type-card.is-selected {
    border-color: #409EFF; background: #ecf5ff;
    box-shadow: 0 4px 12px rgba(64,158,255,0.1);
}

.card-top { display: flex; align-items: center; gap: 8px; }
.checkbox-mock {
    width: 16px; height: 16px; border-radius: 4px; border: 1px solid #dcdfe6; background: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff;
}
.type-card.is-selected .checkbox-mock { background: #409EFF; border-color: #409EFF; }
.type-name { font-weight: bold; font-size: 14px; color: #606266; }
.type-card.is-selected .type-name { color: #409EFF; }

.card-bottom { animation: fadeIn 0.3s ease; display: flex; flex-direction: column; gap: 8px; }
.input-group { display: flex; align-items: center; gap: 5px; }
.suffix { font-size: 12px; color: #94a3b8; white-space: nowrap; }

/* Custom Input Number Styling */
:deep(.el-input-number.is-controls-right) { width: 70px !important; }
:deep(.el-input-number .el-input__wrapper) {
    padding-left: 5px !important;
    padding-right: 25px !important;
    background: transparent !important;
    box-shadow: none !important;
    border-bottom: 1px solid #e2e8f0;
    border-radius: 0;
}
:deep(.el-input-number .el-input__wrapper:hover) { border-color: #409EFF; }
:deep(.el-input-number .el-input__inner) { text-align: center; font-weight: bold; color: #334155; }
:deep(.el-input-number__decrease), :deep(.el-input-number__increase) {
    background: transparent !important;
    border: none !important;
    color: #94a3b8 !important;
}
:deep(.el-input-number__decrease:hover), :deep(.el-input-number__increase:hover) { color: #409EFF !important; }

/* Total Bar */
.total-bar {
    background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 15px 20px;
    display: flex; align-items: center; justify-content: space-between;
}
.bar-info { display: flex; align-items: baseline; gap: 5px; font-size: 13px; color: #606266; }
.score-val { font-size: 24px; font-weight: 800; color: #303133; line-height: 1; }
.score-val.score-ok { color: #67C23A; }
.bar-track { flex: 1; height: 6px; background: #f0f2f5; border-radius: 3px; margin: 0 20px; overflow: hidden; }
.bar-fill { height: 100%; transition: width 0.3s ease; }
.bar-meta { font-size: 12px; color: #909399; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

.launch-btn { 
    width: 100%; height: 52px; font-size: 18px; font-weight: bold; border: none;
    background: linear-gradient(135deg, #409EFF 0%, #3a8ee6 100%);
    border-radius: 12px; color: #fff; letter-spacing: 2px;
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.25);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    margin-top: 20px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
}
.launch-btn:hover { 
    transform: translateY(-3px) scale(1.02); 
    box-shadow: 0 12px 28px rgba(64, 158, 255, 0.4);
    background: linear-gradient(135deg, #66b1ff 0%, #409EFF 100%);
}
.launch-btn:active { transform: translateY(-1px) scale(1); }
.launch-btn .el-icon { font-size: 22px; }

.step-workspace { height: calc(100vh - 40px); display: flex; flex-direction: column; }
.workspace-header { height: 60px; background: #fff; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); }
.workspace-header .left { display: flex; align-items: center; gap: 15px; overflow: hidden; } /* 增加 overflow: hidden 辅助截断 */
.workspace-header .title { 
    font-weight: bold; 
    margin-left: 10px; 
    max-width: 350px; /* 限制最大宽度 */
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; /* 显示省略号 */
}
.workspace-body { flex: 1; display: flex; gap: 20px; overflow: hidden; }
.chat-column { width: 380px; background: #fff; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #e6e6e6; }
.chat-scroll { flex: 1; overflow-y: auto; padding: 15px; }
.chat-msg { display: flex; gap: 12px; margin-bottom: 15px; }
.chat-msg.user { flex-direction: row-reverse; }
.avatar { 
    width: 36px; height: 36px; border-radius: 50%; 
    display: flex; align-items: center; justify-content: center; 
    color: #fff; flex-shrink: 0; overflow: hidden; /* 防止被挤压，确保圆形 */
}
.avatar.assistant { background: #409EFF; }
.avatar.user { background: #909399; }
.bubble { background: #f4f4f5; padding: 10px 12px; border-radius: 10px; font-size: 13px; max-width: 85%; }
.chat-msg.user .bubble { background: #ecf5ff; color: #409EFF; }
.chat-input-box { padding: 10px; border-top: 1px solid #eee; }
.preview-column { flex: 1; background: #fff; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #e6e6e6; }
.panel-title { height: 45px; border-bottom: 1px solid #eee; display: flex; align-items: center; padding: 0 15px; font-weight: bold; font-size: 14px; }
.question-scroll { flex: 1; overflow-y: auto; padding: 15px; background: #fcfcfc; }
.q-item-card { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 15px; transition: 0.3s; cursor: grab; }
.q-item-card.is-dragging { opacity: 0.5; border: 2px dashed #409EFF; }
.q-item-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
.head-left { display: flex; align-items: center; gap: 10px; }
.drag-handle { cursor: move; color: #909399; }
.q-idx { width: 22px; height: 22px; background: #409EFF; color: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; }
.q-text { font-size: 14px; font-weight: bold; margin: 10px 0; }
.opt-row { display: flex; padding: 6px 10px; background: #f9f9f9; border-radius: 4px; font-size: 13px; margin-bottom: 5px; }
.opt-row.correct { background: #f0f9eb; color: #67C23A; font-weight: bold; }
.opt-k { margin-right: 8px; }
.q-ans, .q-ana { font-size: 12px; color: #909399; margin-top: 8px; }
.typing span { display: inline-block; width: 4px; height: 4px; background: #ccc; border-radius: 50%; margin: 0 2px; animation: bounce 1.4s infinite; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
.list-move { transition: transform 0.5s; }
</style>
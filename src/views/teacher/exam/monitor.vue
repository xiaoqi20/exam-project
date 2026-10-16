<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { ArrowLeft, Monitor, Warning, CircleCheck, Refresh, SwitchButton, Bell } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const examId = route.params.id
const examTitle = ref(route.query.title || '在线考试监控')

const stats = ref({
    total: 0,
    online: 0,
    submitted: 0,
    alerts: 0
})

const studentList = ref([])
const currentTime = ref(new Date().toLocaleTimeString())
let ws = null
let reconnectTimer = null
let clockTimer = null

const CACHE_KEY = `monitor_progress_${examId}`

// 核心辅助：清洗 ID (移除 S/T 前缀，仅保留纯数字或核心字符串)
const cleanId = (id) => {
    if (!id) return ''
    return id.toString().replace(/^[ST]_?/, '')
}

// --- API: 初始化数据 ---
const loadInitData = async () => {
    try {
        console.log('Fetching monitor data for:', examId)
        const res = await request.get(`/exam/monitor/${examId}/init`)
        const rawData = res.data || res 
        console.log('Monitor RAW Data:', rawData)

        if (rawData) {
            stats.value.total = rawData.totalCount || 0
            stats.value.online = rawData.onlineCount || 0
            stats.value.submitted = rawData.submittedCount || 0
            
            // 1. 获取全局总题数 (作为兜底)
            const globalTotalQ = rawData.totalQuestions || rawData.questionCount || 0
            
            const progressMap = rawData.progresses || {}
            const onlineList = rawData.onlineStudents || []
            
            console.log('Progress Map Keys:', Object.keys(progressMap))
            
            studentList.value = onlineList.map(s => {
                // 防御性获取 ID
                const rawId = s.id || s.userId || s.studentId
                const cleanSid = cleanId(rawId)
                
                // 进度匹配：暴力尝试所有可能的 Key
                // 优先级：原始ID > S+纯ID > 纯ID > S_纯ID
                let progressVal = 0
                if (progressMap) {
                    const keysToTry = [
                        rawId, 
                        `S${cleanSid}`, 
                        cleanSid, 
                        `S_${cleanSid}`
                    ]
                    
                    for (const k of keysToTry) {
                        if (progressMap[k] !== undefined) {
                            progressVal = parseInt(progressMap[k])
                            break
                        }
                    }
                }

                // 总题数兜底
                const totalQ = s.totalQuestions || globalTotalQ || 0

                return {
                    ...s,
                    id: cleanSid, // 展示用纯 ID
                    rawId: rawId, // 保留原始 ID
                    name: s.name || s.studentName || cleanSid,
                    status: 'online',
                    progress: progressVal,
                    totalQuestions: totalQ,
                    warningCount: s.warningCount || 0,
                    avatar: s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanSid}`
                }
            })
            updateStats()
        }
    } catch (e) {
        console.error('初始化监控失败', e)
        ElMessage.error('无法加载监控数据')
    }
}

// --- WebSocket: 实时通信 ---
const initWebSocket = () => {
    if (ws) ws.close()
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host 
    // 连接时使用不带 T_ 的 ID (假设后端已支持)
    const uid = cleanId(userStore.userInfo.id)
    const wsUrl = `${protocol}//${host}/ws/exam/${examId}/${uid}`
    
    console.log('Connecting WS:', wsUrl)
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
        console.log('WS Connected')
        ElMessage.success('实时监控通道已建立')
    }

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data)
            console.log('收到 WS 消息:', msg)
            handleWsMessage(msg)
        } catch (e) {
            console.error('解析消息失败', event.data)
        }
    }

    ws.onclose = () => {
        reconnectTimer = setTimeout(() => initWebSocket(), 5000)
    }
}

const handleWsMessage = (msg) => {
    const rawTargetId = msg.data?.studentId || msg.data?.userId
    if (!rawTargetId) return

    // 清洗消息中的 ID 再去匹配
    const targetCleanId = cleanId(rawTargetId)
    const student = studentList.value.find(s => s.id === targetCleanId)
    
    if (!student) {
        console.warn(`未找到匹配的学生: 原始ID=${rawTargetId}, 清洗ID=${targetCleanId}`)
        return
    }

    switch (msg.type) {
        case 'STATUS_UPDATE':
            student.status = msg.data.status
            if (msg.data.status === 'submitted') {
                ElNotification.success({ title: '交卷通知', message: `${student.name} 已交卷` })
            }
            break
        case 'PROGRESS_UPDATE':
            student.progress = msg.data.progress
            break
        case 'CHEAT_WARNING': 
        case 'ALERT':
            student.warningCount = (student.warningCount || 0) + 1
            ElNotification({
                title: '作弊预警',
                message: `考生 ${student.name} 触发：${msg.data.message || msg.data.alertType}`,
                type: 'error',
                duration: 0
            })
            break
    }
    updateStats()
}

const updateStats = () => {
    stats.value.alerts = studentList.value.filter(s => s.warningCount > 0).length
    if (studentList.value.length > 0) {
        stats.value.online = studentList.value.filter(s => s.status === 'online').length
    }
}

const handleForceSubmit = (student) => {
    ElMessageBox.confirm(`确定要强制收卷 "${student.name}" (ID: ${student.id}) 吗？`, '警告', { type: 'warning' }).then(async () => {
        await request.post('/exam/monitor/force-submit', { examId, studentId: student.id })
        ElMessage.success('指令已发送')
    })
}

onMounted(() => {
    document.body.style.overflow = 'hidden'
    loadInitData()
    initWebSocket()
    clockTimer = setInterval(() => {
        currentTime.value = new Date().toLocaleTimeString()
    }, 1000)
})

onUnmounted(() => {
    document.body.style.overflow = 'auto'
    if (ws) ws.close()
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
    <div class="monitor-screen">
        <!-- 动态背景网格 -->
        <div class="grid-bg"></div>

        <!-- 顶部 HUD (Heads-Up Display) -->
        <header class="hud-header">
            <div class="hud-left">
                <el-button class="cyber-btn back-btn" @click="router.back()">
                    <el-icon><ArrowLeft /></el-icon> 安全退出
                </el-button>
                <!-- 查看日志按钮 -->
                <el-button class="cyber-btn" @click="router.push({ path: '/dashboard/teacher/score/report', query: { examId: examId } })">
                    <el-icon><Monitor /></el-icon> 监考日志
                </el-button>
                <div class="title-box">
                    <h1>{{ examTitle }}</h1>
                    <div class="live-indicator">
                        <span class="pulse-dot"></span> 系统监控在线
                    </div>
                </div>
            </div>
            <div class="hud-right">
                <div class="time-display">{{ currentTime }}</div>
            </div>
        </header>

        <!-- 核心指标仪表盘 -->
        <section class="dashboard-panel">
            <div class="data-card blue">
                <div class="card-icon"><el-icon><Monitor /></el-icon></div>
                <div class="card-content">
                    <span class="label">应考总人数</span>
                    <span class="value">{{ stats.total || '-' }}</span>
                </div>
            </div>
            <div class="data-card green">
                <div class="card-icon"><el-icon><SwitchButton /></el-icon></div>
                <div class="card-content">
                    <span class="label">当前在线</span>
                    <span class="value">{{ stats.online }}</span>
                </div>
            </div>
            <div class="data-card yellow">
                <div class="card-icon"><el-icon><CircleCheck /></el-icon></div>
                <div class="card-content">
                    <span class="label">已提交卷数</span>
                    <span class="value">{{ stats.submitted }}</span>
                </div>
            </div>
            <div class="data-card red" :class="{ 'alert-pulse': stats.alerts > 0 }">
                <div class="card-icon"><el-icon><Warning /></el-icon></div>
                <div class="card-content">
                    <span class="label">异常预警</span>
                    <span class="value">{{ stats.alerts }}</span>
                </div>
            </div>
        </section>

        <!-- 监控矩阵 -->
        <main class="monitor-grid">
            <div 
                v-for="student in studentList" 
                :key="student.id"
                class="cyber-card"
                :class="[student.status, { 'warning-state': student.warningCount > 0 }]"
                @click="handleForceSubmit(student)"
            >
                <div class="card-inner">
                    <div class="avatar-box">
                        <img :src="student.avatar" alt="avatar" />
                        <div class="status-ring"></div>
                    </div>
                    <div class="info-box">
                        <div class="name">{{ student.name }}</div>
                        <div class="id">ID: {{ student.id }}</div>
                    </div>
                    
                    <div class="progress-box" v-if="student.status !== 'submitted'">
                        <div class="bar-bg">
                            <div 
                                class="bar-fill" 
                                :style="{ width: (student.totalQuestions > 0 ? (student.progress / student.totalQuestions * 100) : 0) + '%' }"
                            ></div>
                        </div>
                        <div class="bar-text">
                            {{ student.progress }}/{{ student.totalQuestions || '-' }}
                        </div>
                    </div>
                    <div class="submitted-box" v-else>
                        <el-icon color="#67C23A"><CircleCheck /></el-icon>
                    </div>

                    <div class="alert-badge" v-if="student.warningCount > 0">
                        <el-icon><Bell /></el-icon> {{ student.warningCount }}
                    </div>
                </div>
                <div class="scan-line"></div>
            </div>
        </main>
    </div>
</template>

<style scoped>
:root {
    --cyber-bg: #050b14;
    --cyber-blue: #00f3ff;
    --cyber-green: #00ff9d;
    --cyber-red: #ff0055;
    --cyber-yellow: #fcee0a;
}

.monitor-screen {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #050b14;
    color: #fff;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
}

.grid-bg {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-image: 
        linear-gradient(rgba(0, 243, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 243, 255, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    z-index: -1;
    pointer-events: none;
}

.hud-header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid rgba(0, 243, 255, 0.3);
    padding-bottom: 15px; margin-bottom: 20px;
}
.hud-left { display: flex; align-items: center; gap: 20px; }
.title-box h1 {
    margin: 0; font-size: 24px; letter-spacing: 1px; text-transform: uppercase;
    text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
}
.live-indicator {
    font-size: 12px; color: #00ff9d; display: flex; align-items: center; gap: 6px;
    margin-top: 4px; letter-spacing: 2px;
}
.pulse-dot {
    width: 8px; height: 8px; background: #00ff9d; border-radius: 50%;
    box-shadow: 0 0 10px #00ff9d;
    animation: blink 1s infinite;
}
.time-display {
    font-size: 24px; font-family: 'Courier New', monospace; font-weight: bold;
    color: #00f3ff; text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
}

.cyber-btn {
    background: transparent;
    border: 1px solid rgba(0, 243, 255, 0.5);
    color: #00f3ff;
    border-radius: 0;
    transition: all 0.3s;
}
.cyber-btn:hover {
    background: rgba(0, 243, 255, 0.1);
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.4);
    border-color: #00f3ff;
}

.dashboard-panel {
    display: flex; gap: 20px; margin-bottom: 30px;
}
.data-card {
    flex: 1;
    background: rgba(6, 33, 56, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 15px 20px;
    display: flex; align-items: center; gap: 15px;
    position: relative;
    overflow: hidden;
}
.data-card::before {
    content: ''; position: absolute; left: 0; top: 0; width: 4px; height: 100%;
}
.data-card.blue::before { background: #00f3ff; box-shadow: 0 0 10px #00f3ff; }
.data-card.green::before { background: #00ff9d; box-shadow: 0 0 10px #00ff9d; }
.data-card.yellow::before { background: #fcee0a; box-shadow: 0 0 10px #fcee0a; }
.data-card.red::before { background: #ff0055; box-shadow: 0 0 10px #ff0055; }

.card-icon { font-size: 28px; opacity: 0.8; }
.blue .card-icon { color: #00f3ff; }
.green .card-icon { color: #00ff9d; }
.yellow .card-icon { color: #fcee0a; }
.red .card-icon { color: #ff0055; }

.card-content { display: flex; flex-direction: column; }
.card-content .label { font-size: 12px; text-transform: uppercase; color: rgba(255,255,255,0.5); letter-spacing: 1px; }
.card-content .value { font-size: 28px; font-weight: bold; font-family: 'Courier New', monospace; }

.monitor-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    overflow-y: auto;
    padding-right: 5px;
}
.monitor-grid::-webkit-scrollbar { width: 4px; }
.monitor-grid::-webkit-scrollbar-thumb { background: rgba(0, 243, 255, 0.2); }

.cyber-card {
    position: relative;
    background: rgba(10, 25, 41, 0.6);
    border: 1px solid rgba(0, 243, 255, 0.2);
    height: 100px;
    display: flex; align-items: center; padding: 0 15px;
    transition: all 0.3s;
    cursor: pointer;
}
.cyber-card::after {
    content: ''; position: absolute; top: 0; right: 0;
    border-top: 10px solid rgba(0, 243, 255, 0.5);
    border-left: 10px solid transparent;
}

.cyber-card.online { 
    border-color: #00ff9d; 
    box-shadow: inset 0 0 15px rgba(0, 255, 157, 0.1); 
}
.cyber-card.online::after { border-top-color: #00ff9d; }

.cyber-card.submitted { 
    opacity: 0.7; 
    background: rgba(0, 255, 157, 0.05); 
    border-color: rgba(255, 255, 255, 0.2);
}
.cyber-card.submitted .name { color: #909399; }

.submitted-box {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #67C23A;
}

.cyber-card.warning-state { 
    border-color: #ff0055; 
    box-shadow: inset 0 0 20px rgba(255, 0, 85, 0.2); 
    animation: shake 0.5s;
}
.cyber-card.warning-state::after { border-top-color: #ff0055; }

.card-inner { display: flex; align-items: center; width: 100%; gap: 15px; }

.avatar-box { position: relative; }
.avatar-box img { width: 45px; height: 45px; border-radius: 50%; filter: grayscale(50%); }
.status-ring {
    position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px;
    border: 2px solid transparent; border-radius: 50%;
    border-top-color: #00f3ff;
    animation: spin 2s linear infinite;
}
.submitted .status-ring { border-top-color: #00ff9d; border-right-color: #00ff9d; animation: none; border: 2px solid #00ff9d; }
.warning-state .status-ring { border-top-color: #ff0055; border-bottom-color: #ff0055; animation-duration: 0.5s; }

.info-box { flex: 1; overflow: hidden; }
.info-box .name { font-weight: bold; font-size: 16px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.info-box .id { font-size: 12px; color: rgba(255,255,255,0.4); }

.progress-box { width: 60px; text-align: right; }
.bar-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-bottom: 4px; }
.bar-fill { height: 100%; background: #00f3ff; transition: width 0.5s; box-shadow: 0 0 5px #00f3ff; }
.bar-text { font-size: 12px; color: rgba(0, 243, 255, 0.8); font-family: monospace; }

.alert-badge {
    position: absolute; top: 5px; right: 5px;
    background: #ff0055; color: #fff; font-size: 10px;
    padding: 2px 6px; border-radius: 2px;
    display: flex; align-items: center; gap: 3px;
    box-shadow: 0 0 10px #ff0055;
    z-index: 2;
}

.scan-line {
    position: absolute; top: 0; left: 0; width: 100%; height: 2px;
    background: rgba(0, 243, 255, 0.3);
    box-shadow: 0 0 5px rgba(0, 243, 255, 0.5);
    animation: scan 3s linear infinite;
    pointer-events: none;
    opacity: 0;
}
.cyber-card:hover .scan-line { opacity: 1; }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
@keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } 100% { transform: translateX(0); } }
</style>
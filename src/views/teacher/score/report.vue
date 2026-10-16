<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
    Warning, Timer, CircleCheck, VideoCamera, User, InfoFilled, Picture
} from '@element-plus/icons-vue'
import request from '@/utils/request'
import { getExamPaperDetail } from '@/api/examPaper'

const route = useRoute()
const examId = route.query.examId
const examTitle = ref('加载中...')
const onlineCount = ref(0)
const alertCount = ref(0)

// 异常类型翻译
const typeLabelMap = {
    'MISSING': '离开座位',
    'MULTIPLE_FACES': '多人同框',
    'POSE': '视线偏移',
    'switch_screen': '切屏警告'
}

// 全局事件流数据
const timeline = ref([])

// Mock 数据 (兜底用)
const mockFallbackData = [
    { id: 0, time: '10:00:00', type: 'start', title: '考试正式开始', desc: '全班考生已进入考场', level: 'info' },
    { id: 101, name: '演示用户', type: 'alert', level: 'danger', title: '多人同框', desc: '系统检测到画面异常（此为演示数据）', time: '10:05:00' }
]

// 加载试卷基础信息
const loadExamInfo = async () => {
    if (!examId) return
    try {
        const res = await getExamPaperDetail(examId)
        if (res) {
            examTitle.value = res.title || '在线考试'
        }
    } catch (e) {
        console.error('获取试卷标题失败', e)
        examTitle.value = '未知考试'
    }
}

// 加载真实日志数据
const loadLogs = async () => {
    if (!examId) {
        timeline.value = mockFallbackData
        return
    }

    try {
        console.log('正在加载日志，ExamID:', examId)
        const res = await request.get('/exam/monitor/logs', { params: { examId } })
        
        if (res && Array.isArray(res) && res.length > 0) {
            timeline.value = res.map((log, index) => ({
                id: log.id,
                name: log.studentName || log.userId || '未知考生',
                type: 'alert', 
                level: (log.alertType === 'MULTIPLE_FACES' || log.alertType === 'danger') ? 'danger' : 'warning',
                title: typeLabelMap[log.alertType] || log.alertType, 
                desc: log.description || log.message || '触发了监考预警',
                snapshot: log.snapshotUrl,
                time: log.createTime ? new Date(log.createTime).toLocaleTimeString() : '未知时间',
                side: index % 2 === 0 ? 'left' : 'right'
            }))
            alertCount.value = timeline.value.length
        } else {
            console.warn('后端无数据，使用 Mock 数据展示')
            timeline.value = mockFallbackData
        }
    } catch (e) {
        console.error('获取日志失败，切换 Mock:', e)
        timeline.value = mockFallbackData
    }
}

onMounted(() => {
    loadExamInfo()
    loadLogs()
})
</script>

<template>
    <div class="monitor-page">
        <!-- 顶部信息栏 -->
        <div class="header-bar">
            <div class="title-section">
                <h2>{{ examTitle }}</h2>
                <el-tag type="success" size="small" effect="plain">正在监考</el-tag>
            </div>
            <div class="status-section">
                <div class="status-item">
                    <span class="label">应考人数</span>
                    <span class="val">--</span>
                </div>
                <div class="status-item">
                    <span class="label">当前在线</span>
                    <span class="val">{{ onlineCount }}</span>
                </div>
                <div class="status-item danger">
                    <span class="label">异常提醒</span>
                    <span class="val">{{ alertCount }}</span>
                </div>
            </div>
        </div>

        <!-- 居中时间轴容器 -->
        <div class="timeline-container">
            <!-- 粗实线中轴 -->
            <div class="vertical-axis"></div>

            <div class="timeline-list">
                <div 
                    v-for="item in timeline" 
                    :key="item.id" 
                    class="timeline-item" 
                    :class="item.side || 'center'"
                >
                    <!-- 中间的指示圆点 -->
                    <div class="axis-node" :class="item.level">
                        <el-icon v-if="item.type === 'alert'"><Warning /></el-icon>
                        <el-icon v-else-if="item.type === 'submit'"><CircleCheck /></el-icon>
                        <el-icon v-else><Timer /></el-icon>
                    </div>

                    <!-- 侧边内容卡片 -->
                    <div class="content-card">
                        <div class="card-time">{{ item.time }}</div>
                        <div class="card-main">
                            <div class="student-info">
                                <el-icon><User /></el-icon>
                                <strong>{{ item.name || '系统' }}</strong>
                                <el-tag :type="item.level" size="small" style="margin-left: 8px">{{ item.title }}</el-tag>
                            </div>
                            <div class="event-desc">{{ item.desc }}</div>
                            <div v-if="item.snapshot" class="snapshot-preview">
                                <el-image 
                                    :src="item.snapshot" 
                                    :preview-src-list="[item.snapshot]"
                                    fit="cover"
                                    class="evidence-img"
                                >
                                    <template #error>
                                        <div class="img-error">
                                            <el-icon><Picture /></el-icon>
                                            <span>图片加载失败</span>
                                        </div>
                                    </template>
                                </el-image>
                                <div class="snap-label">AI 抓拍存证</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.monitor-page {
    background: #f5f7fa;
    min-height: 100vh;
    padding: 30px;
}

/* Header */
.header-bar {
    max-width: 1100px;
    margin: 0 auto 50px;
    background: #fff;
    padding: 20px 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.title-section h2 { margin: 0 0 5px; font-size: 18px; color: #303133; }
.status-section { display: flex; gap: 30px; }
.status-item { text-align: center; }
.status-item .label { font-size: 12px; color: #909399; display: block; margin-bottom: 5px; }
.status-item .val { font-size: 24px; font-weight: bold; color: #303133; }
.status-item.danger .val { color: #F56C6C; }

/* Timeline Core */
.timeline-container {
    position: relative;
    max-width: 1100px;
    margin: 0 auto;
    padding-top: 20px;
}

.vertical-axis {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #dcdfe6;
    transform: translateX(-50%);
    z-index: 1;
}

.timeline-list {
    position: relative;
    z-index: 2;
}

.timeline-item {
    display: flex;
    width: 100%;
    margin-bottom: 25px;
    position: relative;
}

/* 中间圆点 */
.axis-node {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #dcdfe6;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    z-index: 3;
    font-size: 14px;
}
.axis-node.warning { border-color: #E6A23C; color: #E6A23C; }
.axis-node.danger { border-color: #F56C6C; color: #F56C6C; }
.axis-node.success { border-color: #67C23A; color: #67C23A; }

/* 卡片容器 */
.content-card {
    width: 44%;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.card-time {
    font-family: monospace;
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 4px;
}

.student-info { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.student-info strong { color: #334155; font-size: 14px; }

.event-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
}

.snapshot-preview {
    margin-top: 10px;
    border: 1px solid #f1f5f9;
    border-radius: 6px;
    overflow: hidden;
    width: 160px;
}
.evidence-img { 
    width: 100%; 
    height: 100px;
    display: block; 
}
.img-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100px;
    background: #f8fafc;
    color: #94a3b8;
    font-size: 10px;
}
.snap-label {
    background: #f8fafc;
    padding: 3px 8px;
    font-size: 10px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
}

/* 左右分布逻辑 */
.timeline-item.left { justify-content: flex-start; }
.timeline-item.left .content-card { text-align: right; }
.timeline-item.left .student-info { flex-direction: row-reverse; }

.timeline-item.right { justify-content: flex-end; }

/* 中间提示 (如开始考试) */
.timeline-item.center { justify-content: center; }
.timeline-item.center .axis-node { display: none; }
.timeline-item.center .content-card {
    width: auto;
    min-width: 300px;
    text-align: center;
    border-color: #dcdfe6;
    background: #fcfcfc;
}
</style>
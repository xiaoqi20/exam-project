<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Trophy, Timer, Check, MagicStick } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const activeTab = ref('all') // all, active, completed
const loading = ref(false)
const isTransitioning = ref(false) // 过渡动画状态

// Mock Data: 学科列表
const subjects = ref([
    {
        id: 1,
        title: 'Java 核心技术',
        desc: '涵盖面向对象、集合框架、多线程等核心知识点。',
        progress: 35,
        status: 'active', // active, completed
        cover: 'linear-gradient(135deg, #e66465, #9198e5)',
        taskCount: 24,
        doneCount: 8
    },
    {
        id: 2,
        title: '数据结构与算法',
        desc: '程序员的内功修炼，图解常见算法。',
        progress: 0,
        status: 'active',
        cover: 'linear-gradient(135deg, #43cbff, #9708cc)',
        taskCount: 40,
        doneCount: 0
    },
    {
        id: 3,
        title: '数据库系统原理',
        desc: '深入理解 SQL 优化与索引机制。',
        progress: 100,
        status: 'completed',
        cover: 'linear-gradient(135deg, #f6d365, #fda085)',
        taskCount: 15,
        doneCount: 15
    }
])

// 筛选逻辑
const filteredSubjects = computed(() => {
    if (activeTab.value === 'all') return subjects.value
    return subjects.value.filter(s => s.status === activeTab.value)
})

// 生成新路径 Dialog
const createDialogVisible = ref(false)
const createForm = ref({
    subject: '',
    currentLevel: 'beginner',
    goal: 'exam',
    dailyTime: 2,
    preference: 'video'
})

const handleCreate = () => {
    createDialogVisible.value = true
}

const submitCreate = () => {
    if (!createForm.value.subject) {
        ElMessage.warning('请选择目标学科')
        return
    }
    createDialogVisible.value = false
    
    // 模拟 AI 生成过程
    const loadingInstance = ElMessage.success({
        message: 'AI 正在分析您的历史错题与能力模型，生成个性化路径...',
        duration: 2000
    })
    
    loading.value = true
    setTimeout(() => {
        loading.value = false
        subjects.value.unshift({
            id: Date.now(),
            title: createForm.value.subject,
            desc: `AI 为您定制的 ${createForm.value.dailyTime}小时/天 冲刺计划。重点强化薄弱环节。`,
            progress: 0,
            status: 'active',
            cover: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
            taskCount: 15,
            doneCount: 0
        })
        ElMessage.success('学习路径生成完毕！')
    }, 2000)
}

const goToDetail = (sub) => {
    // 启动过渡动画
    isTransitioning.value = true
    
    // 模拟资源预加载
    setTimeout(() => {
        router.push({
            name: 'LearningPathDetail',
            params: { id: sub.id },
            query: { title: sub.title }
        })
        // 稍微延迟关闭，确保路由切换完成后遮罩才消失（或者在详情页 mount 时关闭，这里简单处理）
        setTimeout(() => { isTransitioning.value = false }, 500)
    }, 800)
}
</script>

<template>
    <div class="path-list-container">
        <!-- 过渡遮罩 -->
        <div class="transition-overlay" v-if="isTransitioning">
            <div class="spinner-box">
                <div class="pulse-ring"></div>
                <div class="loading-text">正在进入学习空间...</div>
            </div>
        </div>

        <!-- Header -->
        <div class="list-header">
            <div class="header-left">
                <h2>学习路径中心</h2>
                <p>制定目标，循序渐进，达成成就。</p>
            </div>
            <el-button type="primary" size="large" :icon="Plus" @click="handleCreate">
                生成新路径
            </el-button>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
            <div 
                class="tab-item" 
                :class="{ active: activeTab === 'all' }" 
                @click="activeTab = 'all'"
            >
                全部
            </div>
            <div 
                class="tab-item" 
                :class="{ active: activeTab === 'active' }" 
                @click="activeTab = 'active'"
            >
                进行中
            </div>
            <div 
                class="tab-item" 
                :class="{ active: activeTab === 'completed' }" 
                @click="activeTab = 'completed'"
            >
                已完成
            </div>
        </div>

        <!-- Grid -->
        <div class="subject-grid" v-loading="loading">
            <div 
                v-for="item in filteredSubjects" 
                :key="item.id" 
                class="subject-card"
                @click="goToDetail(item)"
            >
                <div class="card-cover" :style="{ background: item.cover }">
                    <div class="status-badge" v-if="item.status === 'completed'">
                        <el-icon><Check /></el-icon> 已达成
                    </div>
                    <h3>{{ item.title }}</h3>
                </div>
                <div class="card-body">
                    <p class="desc">{{ item.desc }}</p>
                    <div class="meta-row">
                        <span><el-icon><Trophy /></el-icon> {{ item.doneCount }}/{{ item.taskCount }} 关卡</span>
                        <span class="percentage">{{ item.progress }}%</span>
                    </div>
                    <el-progress 
                        :percentage="item.progress" 
                        :status="item.status === 'completed' ? 'success' : ''" 
                        :stroke-width="8" 
                        :show-text="false"
                    />
                </div>
            </div>
            
            <!-- Empty State -->
            <el-empty v-if="filteredSubjects.length === 0" description="暂无相关学习路径" />
        </div>

        <!-- Create Dialog -->
        <el-dialog v-model="createDialogVisible" title="AI 智能定制学习计划" width="550px">
            <el-form label-position="top">
                <el-form-item label="1. 您想攻克哪个学科？">
                    <el-select v-model="createForm.subject" placeholder="请选择" style="width: 100%">
                        <el-option label="Java 核心技术 (后端)" value="Java 核心技术" />
                        <el-option label="Vue3 前端开发" value="Vue3 前端开发" />
                        <el-option label="计算机网络 (考研/面试)" value="计算机网络" />
                        <el-option label="MySQL 数据库优化" value="MySQL 数据库优化" />
                    </el-select>
                </el-form-item>
                
                <el-form-item label="2. 您目前的自评水平？">
                    <el-radio-group v-model="createForm.currentLevel">
                        <el-radio-button label="beginner">零基础入门</el-radio-button>
                        <el-radio-button label="intermediate">有一定基础</el-radio-button>
                        <el-radio-button label="advanced">项目实战经验</el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <el-form-item label="3. 您的学习目标是？">
                    <el-radio-group v-model="createForm.goal">
                        <el-radio-button label="exam">期末考试通关</el-radio-button>
                        <el-radio-button label="job">求职面试突击</el-radio-button>
                        <el-radio-button label="interest">兴趣拓展</el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="4. 每日可用时长 (小时)">
                            <el-input-number v-model="createForm.dailyTime" :min="0.5" :max="10" :step="0.5" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="5. 偏好学习方式">
                            <el-select v-model="createForm.preference">
                                <el-option label="视频讲解为主" value="video" />
                                <el-option label="文档阅读为主" value="article" />
                                <el-option label="实战刷题为主" value="quiz" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                
                <div class="ai-tip">
                    <el-icon color="#E6A23C"><MagicStick /></el-icon>
                    <span>提交后，AI 将结合您的<b>历史错题数据</b>自动调整课程难度。</span>
                </div>
            </el-form>
            <template #footer>
                <el-button @click="createDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitCreate">开始生成</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.path-list-container { padding: 20px; min-height: 100vh; background-color: #f5f7fa; }

/* Header */
.list-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 30px;
}
.list-header h2 { margin: 0 0 5px 0; color: #303133; }
.list-header p { margin: 0; color: #909399; font-size: 14px; }

/* Tabs */
.filter-tabs {
    display: flex; gap: 30px; margin-bottom: 20px; border-bottom: 1px solid #e4e7ed;
    padding-bottom: 10px;
}
.tab-item {
    cursor: pointer; font-size: 15px; color: #606266; position: relative; padding: 5px 0;
    transition: all 0.3s;
}
.tab-item:hover { color: #409EFF; }
.tab-item.active { color: #409EFF; font-weight: bold; }
.tab-item.active::after {
    content: ''; position: absolute; bottom: -11px; left: 0; width: 100%; height: 2px; background: #409EFF;
}

/* Grid */
.subject-grid {
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); /* 缩小最小宽度 */
    gap: 20px; /* 缩小间距 */
}

.subject-card {
    background: #fff; border-radius: 10px; overflow: hidden; cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: all 0.3s;
    display: flex; flex-direction: column;
}
.subject-card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }

.card-cover {
    height: 90px; /* 缩小封面高度 */
    padding: 15px; color: #fff; position: relative;
    display: flex; align-items: flex-end;
}
.card-cover h3 { margin: 0; font-size: 16px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.status-badge {
    position: absolute; top: 10px; right: 10px;
    background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 20px;
    font-size: 11px; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(4px);
}

.card-body { padding: 15px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.desc { color: #606266; font-size: 13px; margin: 0 0 15px 0; line-height: 1.4; height: 38px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.meta-row {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
    font-size: 12px; color: #909399;
}
.percentage { color: #303133; font-weight: bold; }

@media (max-width: 768px) {
    .list-header { flex-direction: column; align-items: flex-start; gap: 15px; }
    .filter-tabs { gap: 20px; }
    .subject-grid { grid-template-columns: 1fr; }
}

.ai-tip {
    background: #fdf6ec; color: #e6a23c; padding: 10px; border-radius: 4px; font-size: 12px;
    display: flex; align-items: center; gap: 6px; margin-top: 10px;
}

/* Transition Overlay */
.transition-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #fff; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.3s ease;
}

.spinner-box { text-align: center; }
.pulse-ring {
    width: 50px; height: 50px; border-radius: 50%;
    border: 3px solid #409EFF; border-top-color: transparent;
    animation: spin 1s linear infinite; margin: 0 auto 20px;
}
.loading-text { font-size: 16px; color: #409EFF; font-weight: 500; letter-spacing: 1px; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
    ArrowLeft, Document, VideoPlay, Edit, Trophy, Odometer, 
    Folder, FolderOpened, Check, Fold, Expand 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MarkdownViewer from '@/components/MarkdownViewer.vue'

const route = useRoute()
const router = useRouter()

// 状态
const isSidebarCollapsed = ref(false)
// 优先从 URL 获取 tab，否则默认为 overview
const activeMenu = ref(route.query.tab || 'overview') 
const openedMenus = ref(['day-1', 'day-2']) 

// 练习作答状态
const userAnswers = ref({}) // { questionId: 'A' }

// Mock Data
const courseData = ref({
    title: route.query.title || 'Java 核心技术突破',
    progress: 35,
    overview: {
        desc: '本周重点攻克循环与数组，结合 AI 推荐题目进行针对性训练。',
        totalHours: 12,
        tasksDone: 4,
        tasksTotal: 12,
        objectives: [
            '熟练掌握 Java 三种循环结构的适用场景与性能差异',
            '理解并能手写常见的数组排序算法（冒泡、快速排序）',
            '掌握二维数组在实际业务逻辑中的内存映射与应用',
            '能够利用 AI 助教辅助分析复杂的循环逻辑错误'
        ]
    },
    days: [
        {
            id: 'day-1',
            label: 'Day 1: 循环基础',
            status: 'finished',
            children: [
                { 
                    id: 't-1-1', type: 'article', title: '讲义：Java 控制流基础', 
                    content: 'https://blog.csdn.net/example/java-loop', 
                    isExternal: true,
                    tags: ['while循环', 'for循环', 'do-while'],
                    desc: '本文精选自 CSDN 优质博文，深度解析了 Java 三大循环结构的底层原理。',
                    // 模拟抓取的正文预览
                    previewContent: `
### 1. while 循环
while 循环是最基本的循环结构，它的特点是 **“先判断，后执行”**。

\`\`\`java
int i = 0;
while (i < 5) {
    System.out.println(i);
    i++;
}
\`\`\`

### 2. do-while 循环
与 while 不同，do-while 保证循环体 **至少执行一次**。

### 3. for 循环
for 循环是最常用的，特别适合 **已知循环次数** 的场景。
                    `,
                    done: true 
                },
                { 
                    id: 't-1-2', type: 'video', title: '视频：Java 循环结构详解 (尚硅谷)', 
                    // B站嵌入链接: high_quality=1 强制高清
                    content: '//player.bilibili.com/player.html?bvid=BV1Kb411W75N&page=105&high_quality=1', 
                    source: 'bilibili', // 标记来源，方便区分渲染方式
                    done: true 
                },
                { 
                    id: 't-1-3', type: 'quiz', title: '练习：循环结构基础测验', 
                    done: true,
                    questions: [
                        {
                            id: 101,
                            content: '下列关于 while 循环和 do-while 循环的描述中，正确的是？',
                            options: { A: 'while 循环至少执行一次', B: 'do-while 循环至少执行一次', C: '两者没有区别', D: 'while 循环在执行后判断条件' },
                            answer: 'B',
                            analysis: 'do-while 语句的特点是先执行循环体，再判断循环条件，因此至少执行一次。'
                        },
                        {
                            id: 102,
                            content: '在 Java 中，跳出当前循环并进入下一次迭代的关键字是？',
                            options: { A: 'break', B: 'exit', C: 'continue', D: 'return' },
                            answer: 'C',
                            analysis: 'continue 用于跳过当前循环体中剩余的语句，直接进入下一次循环条件的判定。'
                        },
                        {
                            id: 103,
                            content: 'for(int i=0; i<10; i++) 循环执行结束后，变量 i 的最终值是？',
                            options: { A: '9', B: '10', C: '11', D: '无法确定' },
                            answer: 'B',
                            analysis: '当 i 自增到 10 时，条件 i < 10 不再满足，退出循环。'
                        }
                    ]
                }
            ]
        },
        {
            id: 'day-2',
            label: 'Day 2: 进阶与优化',
            status: 'active',
            children: [
                { id: 't-2-1', type: 'article', title: '文档：嵌套循环优化', content: '### 性能优化\n\n大循环套小循环还是小循环套大循环？', done: true },
                { id: 't-2-2', type: 'video', title: '视频：内存模型', content: 'https://media.w3.org/2010/05/sintel/trailer.mp4', done: false },
                { id: 't-2-3', type: 'quiz', title: '练习：进阶题目', done: false }
            ]
        },
        {
            id: 'day-3',
            label: 'Day 3: 数组实战',
            status: 'locked',
            children: [
                { id: 't-3-1', type: 'quiz', title: '实战：排序算法', done: false }
            ]
        },
        {
            id: 'day-4',
            label: 'Day 4: 面向对象',
            status: 'locked',
            children: [
                { id: 't-4-1', type: 'video', title: '视频：类与对象', done: false }
            ]
        },
        {
            id: 'day-5',
            label: 'Day 5: 周测验',
            status: 'locked',
            children: [
                { id: 't-5-1', type: 'exam', title: '阶段性测试一', done: false }
            ]
        }
    ]
})

// 计算当前选中的内容
const currentContent = computed(() => {
    if (activeMenu.value === 'overview') return { type: 'overview' }
    
    // 扁平化查找
    for (const day of courseData.value.days) {
        const found = day.children.find(t => t.id === activeMenu.value)
        if (found) return found
    }
    return null
})

const handleMenuSelect = (index) => {
    activeMenu.value = index
    
    // 同步到 URL，方便刷新保持状态
    router.replace({
        query: { ...route.query, tab: index }
    })

    // 自动标记完成 (模拟)
    const item = currentContent.value
    if (item && item.type !== 'overview' && !item.done) {
        setTimeout(() => { item.done = true }, 5000)
    }
}

const startQuiz = () => {
    router.push('/dashboard/student/exam/hall')
}

const openExternal = (url) => {
    window.open(url, '_blank')
}
</script>

<template>
    <div class="learning-layout">
        <!-- 顶部通栏 -->
        <header class="top-header">
            <div class="header-left">
                <el-button link @click="router.back()" class="back-link">
                    <el-icon><ArrowLeft /></el-icon> 课程中心
                </el-button>
                <div class="divider"></div>
                <el-button v-if="isSidebarCollapsed" link @click="toggleSidebar" class="toggle-btn-top">
                    <el-icon><Expand /></el-icon> 目录
                </el-button>
                <span class="course-name">{{ courseData.title }}</span>
            </div>
            <div class="header-right">
                <el-progress :percentage="courseData.progress" :stroke-width="10" :width="150" :show-text="true" color="#67C23A">
                    <template #default="{ percentage }">
                        <span class="prog-text">{{ percentage }}% 已完成</span>
                    </template>
                </el-progress>
            </div>
        </header>

        <div class="body-container">
            <!-- 左侧：多级目录 -->
            <aside class="sidebar-menu" :class="{ 'collapsed': isSidebarCollapsed }">
                <div class="sidebar-header-row">
                    <span>课程目录</span>
                    <el-icon class="collapse-icon" @click="toggleSidebar" title="收起目录"><Fold /></el-icon>
                </div>

                <el-menu
                    :default-active="activeMenu"
                    :default-openeds="openedMenus"
                    class="el-menu-vertical"
                    @select="handleMenuSelect"
                >
                    <!-- 固定项：课程概述 -->
                    <el-menu-item index="overview">
                        <el-icon><Odometer /></el-icon>
                        <span>课程概述</span>
                    </el-menu-item>

                    <!-- 动态项：Day 1~5 -->
                    <el-sub-menu v-for="day in courseData.days" :key="day.id" :index="day.id" :disabled="day.status === 'locked'">
                        <template #title>
                            <el-icon v-if="day.status === 'finished'" color="#67C23A"><Check /></el-icon>
                            <el-icon v-else><Folder /></el-icon>
                            <span>{{ day.label }}</span>
                        </template>
                        
                        <el-menu-item v-for="task in day.children" :key="task.id" :index="task.id">
                            <template #title>
                                <div class="menu-item-row">
                                    <div class="icon-wrap">
                                        <el-icon v-if="task.type === 'video'"><VideoPlay /></el-icon>
                                        <el-icon v-else-if="task.type === 'article'"><Document /></el-icon>
                                        <el-icon v-else><Edit /></el-icon>
                                    </div>
                                    <span class="menu-text">{{ task.title }}</span>
                                    <el-icon v-if="task.done" class="done-icon"><Check /></el-icon>
                                </div>
                            </template>
                        </el-menu-item>
                    </el-sub-menu>
                </el-menu>
            </aside>

            <!-- 右侧：内容呈现区 -->
            <main class="content-area">
                <!-- Case 1: Overview -->
                <div v-if="currentContent.type === 'overview'" class="overview-grid">
                    <!-- 左侧核心内容 -->
                    <div class="ov-main">
                        <header class="ov-header">
                            <h1>{{ courseData.title }}</h1>
                            <p class="summary">{{ courseData.overview.desc }}</p>
                        </header>

                        <section class="ov-section">
                            <h3 class="section-title">
                                <el-icon><Trophy /></el-icon> 
                                <span>本周学习目标</span>
                                <span class="badge-count">{{ courseData.overview.objectives.length }}</span>
                            </h3>
                            <div class="obj-cards">
                                <div v-for="(obj, i) in courseData.overview.objectives" :key="i" class="obj-card">
                                    <span class="index">{{ i + 1 }}</span>
                                    <span class="text">{{ obj }}</span>
                                </div>
                            </div>
                        </section>
                        
                        <section class="ov-section">
                            <h3 class="section-title"><el-icon><Star /></el-icon> AI 助教建议</h3>
                            <div class="ai-suggestion-box">
                                <p>根据您上周的刷题记录，您在<strong>循环嵌套</strong>逻辑上的错误率较高（45%）。本周的 Day 2 课程已为您特别强化了该知识点，建议在观看视频后，立即完成相关变式练习。</p>
                            </div>
                        </section>
                    </div>

                    <!-- 右侧数据看板 -->
                    <div class="ov-sidebar">
                        <div class="data-widget">
                            <div class="widget-row">
                                <div class="w-item">
                                    <div class="lbl">已完成</div>
                                    <div class="val text-green">{{ courseData.overview.tasksDone }}</div>
                                </div>
                                <div class="divider-v"></div>
                                <div class="w-item">
                                    <div class="lbl">总任务</div>
                                    <div class="val">{{ courseData.overview.tasksTotal }}</div>
                                </div>
                            </div>
                            <div class="progress-bar-mini">
                                <div class="fill" :style="{ width: (courseData.overview.tasksDone / courseData.overview.tasksTotal * 100) + '%' }"></div>
                            </div>
                        </div>

                        <div class="info-widget">
                            <h4><el-icon><Odometer /></el-icon> 预计投入</h4>
                            <div class="time-big">{{ courseData.overview.totalHours }} <span>小时</span></div>
                            <p class="sub-text">建议每天投入 1.5 - 2 小时</p>
                        </div>

                        <div class="next-widget">
                            <h4>后续预告</h4>
                            <div class="next-content">
                                <strong>面向对象进阶</strong>
                                <p>接口、多态与设计模式初探</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Case 2: Article -->
                <div v-else-if="currentContent.type === 'article'" class="article-viewer">
                    <div class="article-card">
                        <div class="art-header">
                            <h2>{{ currentContent.title }}</h2>
                            <div class="art-tags" v-if="currentContent.tags">
                                <el-tag v-for="tag in currentContent.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
                            </div>
                        </div>
                        
                        <div class="art-body">
                            <p class="art-desc" v-if="currentContent.desc">{{ currentContent.desc }}</p>
                            
                            <!-- 外部文章：先展示预览内容，再放跳转链接 -->
                            <div v-if="currentContent.isExternal">
                                <div class="markdown-body" style="margin-bottom: 30px">
                                    <MarkdownViewer :content="currentContent.previewContent || '暂无预览内容'" />
                                </div>
                                
                                <div class="external-link-box">
                                    <div class="link-left">
                                        <img src="https://g.csdnimg.cn/static/logo/favicon32.ico" alt="CSDN" class="site-icon" />
                                        <div class="link-text">
                                            <strong>CSDN 优质博文</strong>
                                            <span>该内容引用自外部优质资源，查看完整版请点击</span>
                                        </div>
                                    </div>
                                    <el-button type="primary" plain round @click="openExternal(currentContent.content)">
                                        前往阅读全文 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                                    </el-button>
                                </div>
                            </div>
                            
                            <!-- 内部文章：直接展示 -->
                            <div v-else class="markdown-body">
                                <MarkdownViewer :content="currentContent.content" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Case 3: Video -->
                <div v-else-if="currentContent.type === 'video'" class="video-viewer">
                    <div class="video-wrapper">
                        <!-- B站/外部 iframe -->
                        <iframe 
                            v-if="currentContent.content.includes('player.bilibili.com')"
                            :src="currentContent.content" 
                            scrolling="no" 
                            border="0" 
                            frameborder="no" 
                            framespacing="0" 
                            allowfullscreen="true"
                            class="main-player"
                        ></iframe>
                        <!-- 原生 MP4 -->
                        <video 
                            v-else 
                            :src="currentContent.content" 
                            controls 
                            autoplay 
                            class="main-player"
                        ></video>
                    </div>
                    <h3>{{ currentContent.title }}</h3>
                </div>

                <!-- Case 4: Quiz -->
                <div v-else-if="currentContent.type === 'quiz' || currentContent.type === 'exam'" class="quiz-viewer">
                    <div class="quiz-header">
                        <h2>{{ currentContent.title }}</h2>
                        <p class="quiz-meta">共 {{ currentContent.questions?.length }} 道练习题，点击选项即可查看对错。</p>
                    </div>

                    <div class="questions-list">
                        <div v-for="(q, index) in currentContent.questions" :key="q.id" class="q-item">
                            <div class="q-title">
                                <span class="q-index">{{ index + 1 }}</span>
                                <span class="q-text">{{ q.content }}</span>
                            </div>
                            
                            <div class="q-options">
                                <div 
                                    v-for="(val, key) in q.options" 
                                    :key="key" 
                                    class="q-option"
                                    :class="{
                                        'is-correct': userAnswers[q.id] === key && key === q.answer,
                                        'is-wrong': userAnswers[q.id] === key && key !== q.answer,
                                        'reveal-correct': userAnswers[q.id] && key === q.answer
                                    }"
                                    @click="userAnswers[q.id] = key"
                                >
                                    <span class="opt-key">{{ key }}</span>
                                    <span class="opt-val">{{ val }}</span>
                                    <div class="feedback-icon" v-if="userAnswers[q.id] === key">
                                        <el-icon v-if="key === q.answer"><Check /></el-icon>
                                        <el-icon v-else><Close /></el-icon>
                                    </div>
                                </div>
                            </div>

                            <transition name="fade">
                                <div class="q-analysis" v-if="userAnswers[q.id]">
                                    <div class="analysis-header">
                                        <el-tag :type="userAnswers[q.id] === q.answer ? 'success' : 'danger'" size="small">
                                            {{ userAnswers[q.id] === q.answer ? '回答正确' : '回答错误' }}
                                        </el-tag>
                                        <span class="ans-label">正确答案：{{ q.answer }}</span>
                                    </div>
                                    <div class="ans-text">{{ q.analysis }}</div>
                                </div>
                            </transition>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
.learning-layout {
    display: flex; flex-direction: column;
    height: 100vh; width: 100vw;
    background: #fff; overflow: hidden;
}

/* Header */
.top-header {
    height: 50px; border-bottom: 1px solid #e6e6e6;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); z-index: 20;
}
.header-left { display: flex; align-items: center; gap: 15px; }
.back-btn { font-size: 14px; color: #606266; }
.back-btn:hover { color: #409EFF; }
.divider { width: 1px; height: 16px; background: #e0e0e0; }
.course-name { font-weight: bold; color: #303133; }
.prog-text { font-size: 12px; color: #67C23A; margin-left: 10px; }

/* Body */
.body-container { display: flex; flex: 1; overflow: hidden; }

/* Sidebar */
.sidebar-menu {
    width: 280px; border-right: 1px solid #e6e6e6; background: #f9f9f9;
    overflow-y: auto; display: flex; flex-direction: column;
    transition: width 0.3s ease;
}
.sidebar-menu.collapsed { width: 0; padding: 0; border-right: none; overflow: hidden; }

.sidebar-header-row {
    padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;
    font-weight: bold; color: #606266; font-size: 14px;
}
.collapse-icon { cursor: pointer; color: #909399; }
.collapse-icon:hover { color: #409EFF; }

.toggle-btn-top { font-size: 14px; color: #606266; margin-right: 10px; }
.toggle-btn-top:hover { color: #409EFF; }

.el-menu-vertical { border-right: none; background: transparent; }
:deep(.el-menu-item), :deep(.el-sub-menu__title) { height: 50px; line-height: 50px; }
:deep(.el-menu-item.is-active) { background: #ecf5ff; border-right: 3px solid #409EFF; font-weight: bold; }

.menu-item-row { display: flex; align-items: center; width: 100%; }
.icon-wrap { margin-right: 8px; color: #909399; display: flex; align-items: center; }
.menu-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.done-icon { color: #67C23A; margin-left: 5px; }

/* Content Area */
.content-area { 
    flex: 1; 
    overflow-y: auto; 
    padding: 30px 5%; 
    background: #fff; 
}

/* Overview - Dashboard Grid (Restored) */
.overview-grid {
    display: grid;
    grid-template-columns: 2fr 1fr; /* 左2右1 */
    gap: 30px;
    height: 100%;
}

/* Left Main */
.ov-main { overflow-y: auto; padding-right: 10px; }

.ov-header { margin-bottom: 30px; }
.ov-header h1 { font-size: 28px; color: #1e293b; margin: 0 0 10px 0; }
.summary { font-size: 16px; color: #64748b; line-height: 1.6; }

.ov-section { margin-bottom: 35px; }
.section-title { font-size: 16px; font-weight: 700; color: #334155; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
.badge-count { background: #f1f5f9; color: #64748b; font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-left: 4px; }

.obj-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
.obj-card {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 15px; display: flex; gap: 12px;
}
.obj-card .index { 
    background: #e0f2fe; color: #0284c7; width: 24px; height: 24px; 
    border-radius: 6px; display: flex; align-items: center; justify-content: center; 
    font-weight: bold; font-size: 12px; flex-shrink: 0;
}
.obj-card .text { font-size: 14px; color: #475569; line-height: 1.5; }

.ai-suggestion-box {
    background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px;
    color: #92400e; font-size: 14px; line-height: 1.6;
}

/* Right Sidebar */
.ov-sidebar { display: flex; flex-direction: column; gap: 20px; }

.data-widget, .info-widget, .next-widget {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.widget-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.w-item { text-align: center; flex: 1; }
.w-item .lbl { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.w-item .val { font-size: 24px; font-weight: 800; color: #334155; }
.text-green { color: #10b981 !important; }
.divider-v { width: 1px; height: 30px; background: #e2e8f0; }

.progress-bar-mini { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.progress-bar-mini .fill { height: 100%; background: #10b981; border-radius: 3px; }

.info-widget h4, .next-widget h4 { margin: 0 0 15px 0; font-size: 14px; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.time-big { font-size: 32px; font-weight: 800; color: #3b82f6; }
.time-big span { font-size: 14px; color: #64748b; font-weight: normal; }
.sub-text { font-size: 12px; color: #94a3b8; margin-top: 5px; }

.next-content { background: #f8fafc; padding: 15px; border-radius: 8px; }
.next-content strong { display: block; color: #334155; margin-bottom: 4px; }
.next-content p { margin: 0; font-size: 12px; color: #64748b; }

/* Article - No max-width */
.article-viewer { margin: 0; /* 移除居中 */ color: #333; }
.article-card { padding: 10px 0; }

.art-header { margin-bottom: 30px; }
.art-header h2 { font-size: 28px; color: #111; margin: 0 0 15px 0; font-weight: 700; letter-spacing: -0.5px; }
.art-tags { display: flex; gap: 8px; flex-wrap: wrap; }

.art-desc { 
    font-size: 16px; color: #555; line-height: 1.8; margin-bottom: 30px; 
    border-left: 3px solid #333; padding-left: 15px; /* 引用样式 */
}

.external-link-box { 
    display: flex; justify-content: space-between; align-items: center;
    background: #fafafa; border: 1px solid #eee; padding: 20px 25px; border-radius: 8px;
    transition: all 0.3s;
}
.external-link-box:hover { border-color: #dcdfe6; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.link-left { display: flex; align-items: center; gap: 15px; }
.site-icon { width: 32px; height: 32px; border-radius: 4px; }
.link-text { display: flex; flex-direction: column; line-height: 1.4; }
.link-text strong { font-size: 15px; color: #333; }
.link-text span { font-size: 13px; color: #666; }

/* Video */
.video-viewer { max-width: 1000px; margin: 0 auto; text-align: center; }
.video-wrapper { background: #000; border-radius: 12px; overflow: hidden; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.main-player { width: 100%; height: 580px; display: block; border: none; }

/* Quiz */
.quiz-start-page { height: 100%; display: flex; align-items: center; justify-content: center; }
.quiz-card { text-align: center; padding: 40px; background: #f8f9fa; border-radius: 12px; border: 1px solid #eee; }
.quiz-card h2 { margin: 20px 0 10px; }
.quiz-card p { color: #606266; margin-bottom: 30px; }

/* Quiz Viewer */
.quiz-viewer { max-width: 800px; margin: 0 auto; padding-bottom: 50px; }
.quiz-header { margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
.quiz-header h2 { font-size: 24px; color: #111; margin-bottom: 10px; }
.quiz-meta { color: #666; font-size: 14px; }

.q-item { margin-bottom: 50px; }
.q-title { display: flex; gap: 15px; margin-bottom: 20px; }
.q-index { 
    background: #111; color: #fff; width: 24px; height: 24px; 
    border-radius: 4px; display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 13px; flex-shrink: 0; margin-top: 2px;
}
.q-text { font-size: 18px; font-weight: 600; color: #111; line-height: 1.5; }

.q-options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.q-option {
    padding: 15px 20px; background: #f9f9f9; border: 1px solid #eee; 
    border-radius: 8px; cursor: pointer; display: flex; align-items: center; 
    gap: 15px; transition: all 0.2s; position: relative;
}
.q-option:hover { background: #f1f1f1; border-color: #ccc; }
.opt-key { font-weight: 800; color: #111; width: 20px; }
.opt-val { font-size: 15px; color: #333; flex: 1; }

.is-correct { background: #f0fdf4 !important; border-color: #22c55e !important; }
.is-wrong { background: #fef2f2 !important; border-color: #ef4444 !important; }
.reveal-correct { background: #f0fdf4; border-color: #22c55e; }

.feedback-icon { font-size: 18px; display: flex; align-items: center; }
.is-correct .feedback-icon { color: #22c55e; }
.is-wrong .feedback-icon { color: #ef4444; }

.q-analysis { 
    background: #f8fafc; border-radius: 8px; padding: 20px; 
    border-left: 4px solid #3b82f6;
}
.analysis-header { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; }
.ans-label { font-weight: bold; color: #1e293b; font-size: 14px; }
.ans-text { font-size: 14px; color: #475569; line-height: 1.6; }

@media (max-width: 768px) {
    .learning-layout { flex-direction: column; }
    .sidebar-menu { display: none; } /* 移动端隐藏侧边栏 */
}
</style>
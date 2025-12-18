<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getKnowledgeAnalysis } from '@/api/knowledge'
import { ElMessage, ElLoading } from 'element-plus'

const chartRef = ref(null)
let chartInstance = null
const loading = ref(false)

// 统一颜色定义
const COLORS = {
    red: '#F56C6C',    // 薄弱
    yellow: '#E6A23C', // 一般
    green: '#67C23A',  // 熟练
    default: '#409EFF' // 默认/根节点
}

// 递归处理数据，直接注入样式
const processData = (node) => {
    if (!node) return
    
    // 1. Determine Color
    let color = COLORS.default
    if (node.name === '我的知识体系') {
        color = COLORS.default
    } else if (node.color) {
        const c = node.color.toLowerCase()
        if (c === 'red') color = COLORS.red
        else if (c === 'yellow') color = COLORS.yellow
        else if (c === 'green') color = COLORS.green
    } else if (node.value !== undefined) {
        color = getColor(node.value)
    }

    // 2. Inject itemStyle directly into data node
    // This is the most robust way to ensure ECharts renders the specific color
    node.itemStyle = {
        color: color,
        borderColor: color
    }
    
    // 3. Force symbol to be a solid circle so color is visible
    node.symbol = 'circle'

    // 4. Recursive for children
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => processData(child))
    }
}

// 加载数据并渲染
const initChart = async () => {
    if (!chartRef.value) return
    
    const loadingInstance = ElLoading.service({
        target: '.graph-container',
        text: '正在构建您的知识图谱...',
        background: 'rgba(255, 255, 255, 0.8)'
    })

    try {
        const res = await getKnowledgeAnalysis()
        let data = null

        // Structure Data
        if (Array.isArray(res)) {
            if (res.length > 1) {
                data = {
                    name: "我的知识体系",
                    value: 100,
                    children: res,
                    collapsed: false 
                }
            } else if (res.length === 1) {
                data = res[0]
            }
        } else {
            data = res
        }
        
        // Mock Fallback
        if (!data || (Array.isArray(res) && res.length === 0)) {
            // ... (Keep existing mock data but apply processData later)
             data = {
                name: "计算机科学 (演示)",
                value: 60,
                color: "green",
                children: [
                    {
                        name: "Java基础",
                        value: 80,
                        color: "green",
                        totalQuestions: 20,
                        children: [
                            { name: "面向对象", value: 90, color: "green", totalQuestions: 10 },
                            { name: "集合框架", value: 40, color: "red", totalQuestions: 5 },
                            { name: "多线程", value: 60, color: "yellow", totalQuestions: 5 }
                        ]
                    },
                    {
                        name: "数据库",
                        value: 50,
                        color: "yellow",
                        totalQuestions: 15,
                        children: [
                            { name: "SQL语法", value: 70, color: "green", totalQuestions: 8 },
                            { name: "索引优化", value: 30, color: "red", totalQuestions: 7 }
                        ]
                    }
                ]
            }
             ElMessage.warning('暂无真实数据，已展示演示图谱')
        }
        
        // CRITICAL STEP: Process data to inject colors
        processData(data)

        chartInstance = echarts.init(chartRef.value)
        
        const option = {
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove',
                formatter: function (params) {
                    const val = params.data.value !== undefined ? params.data.value : '-'
                    const total = params.data.totalQuestions || 0
                    const color = params.data.itemStyle?.color || COLORS.default // Use injected color
                    
                    return `
                        <div style="text-align: left;">
                            <b>${params.data.name}</b><br/>
                            掌握度: <span style="color:${color}">${val}%</span><br/>
                            刷题量: ${total}
                        </div>
                    `
                }
            },
            series: [
                {
                    type: 'tree',
                    data: [data],
                    top: '5%',
                    left: '10%',
                    bottom: '5%',
                    right: '20%',
                    symbolSize: 16,
                    initialTreeDepth: 3, 
                    label: {
                        position: 'left',
                        verticalAlign: 'middle',
                        align: 'right',
                        fontSize: 14,
                        formatter: '{b}'
                    },
                    leaves: {
                        label: {
                            position: 'right',
                            verticalAlign: 'middle',
                            align: 'left'
                        }
                    },
                    emphasis: {
                        focus: 'descendant'
                    },
                    expandAndCollapse: true,
                    animationDuration: 550,
                    animationDurationUpdate: 750
                    // Remove itemStyle callback since we injected it directly into data
                }
            ]
        }

        chartInstance.setOption(option)

    } catch (e) {
        console.error(e)
        ElMessage.error('图谱加载失败')
    } finally {
        loadingInstance.close()
    }
}

const handleResize = () => {
    chartInstance && chartInstance.resize()
}

onMounted(() => {
    nextTick(() => {
        initChart()
        window.addEventListener('resize', handleResize)
    })
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (chartInstance) chartInstance.dispose()
})
</script>

<template>
    <div class="app-container">
        <el-card class="graph-card" shadow="hover">
            <template #header>
                <div class="card-header">
                    <span><el-icon><Connection /></el-icon> 个人知识图谱</span>
                    <el-tag type="info">基于您的做题历史自动生成</el-tag>
                </div>
            </template>
            <div class="graph-container">
                <div ref="chartRef" style="width: 100%; height: 600px;"></div>
            </div>
            <div class="legend">
                <span class="dot green"></span> 熟练 (80-100%)
                <span class="dot yellow"></span> 一般 (60-79%)
                <span class="dot red"></span> 薄弱 (0-59%)
            </div>
        </el-card>
    </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
.card-header .el-icon { margin-right: 5px; vertical-align: middle; }
.graph-container { width: 100%; height: 600px; }

.legend {
    margin-top: 10px;
    text-align: center;
    font-size: 14px;
    color: #606266;
}
.dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-left: 15px;
    margin-right: 5px;
}
/* Ensure these match COLORS object in script */
.dot.green { background: #67C23A; }
.dot.yellow { background: #E6A23C; }
.dot.red { background: #F56C6C; }

@media (max-width: 768px) {
    .app-container { padding: 10px; }
    .graph-container { height: 400px; }
}
</style>
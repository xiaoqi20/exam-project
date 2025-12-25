<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import ForceGraph3D from '3d-force-graph'
import SpriteText from 'three-spritetext' // Import it
import { getKnowledgeAnalysis } from '@/api/knowledge'
import { ElMessage, ElLoading } from 'element-plus'
import { Connection, Switch } from '@element-plus/icons-vue' // Add Switch icon

const chartRef = ref(null)
const graph3dRef = ref(null) // 3D 容器 Ref
let chartInstance = null
let graph3dInstance = null // 3D 实例
const loading = ref(false)
const is3DMode = ref(false) // 切换开关
const rawData = ref(null) // 保存原始数据供两种模式使用

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

// 转换树形数据为图数据 (for 3D)
const flattenTree = (node, parentId = null, nodes = [], links = []) => {
    if (!node) return { nodes, links }
    
    // 构造唯一 ID
    const id = node.id || node.name + Math.random()
    
    // 添加节点
    nodes.push({
        id: id,
        name: node.name,
        val: node.value || 50, // 大小
        color: node.itemStyle?.color || COLORS.default, // 沿用 2D 计算好的颜色
        desc: `掌握度: ${node.value || 0}%`
    })
    
    // 添加连线
    if (parentId) {
        links.push({
            source: parentId,
            target: id
        })
    }
    
    // 递归
    if (node.children) {
        node.children.forEach(child => flattenTree(child, id, nodes, links))
    }
    return { nodes, links }
}

const init3DGraph = () => {
    if (!graph3dRef.value || !rawData.value) return
    
    const { nodes, links } = flattenTree(rawData.value)
    
    // 销毁旧实例（防止重复渲染）
    if (graph3dRef.value.innerHTML) graph3dRef.value.innerHTML = ''

    graph3dInstance = ForceGraph3D()(graph3dRef.value)
        .graphData({ nodes, links })
        .nodeLabel('desc') 
        .nodeColor(node => node.color)
        .nodeResolution(16)
        .nodeVal(node => Math.max(node.val / 5, 3))
        .nodeThreeObjectExtend(true)
        .nodeThreeObject(node => {
            const sprite = new SpriteText(node.name)
            // 亮色模式下，文字颜色加深处理
            sprite.color = node.color === COLORS.yellow ? '#D48806' : node.color
            sprite.textHeight = 5
            sprite.position.y = 10
            return sprite
        })
        .linkWidth(1)
        .linkColor(() => '#99999966') // 亮色背景下使用深灰色线条
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(1.5)
        .linkDirectionalParticleColor(() => '#409EFF') // 使用品牌蓝粒子
        .backgroundColor('#f5f7fa') // 改为淡灰色背景
        .showNavInfo(false)
        
    // 移除之前的黑色渐变背景
    graph3dRef.value.style.background = '#f5f7fa'

    // 自适应窗口
    graph3dInstance.width(graph3dRef.value.clientWidth)
    graph3dInstance.height(600)
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
        rawData.value = data

        chartInstance = echarts.init(chartRef.value)
        
        const option = {
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove',
                formatter: function (params) {
                    const val = params.data.value !== undefined ? params.data.value : '-'
                    const total = params.data.totalQuestions || 0
                    const color = params.data.itemStyle?.color || COLORS.default
                    
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
                    initialTreeDepth: 2, // 默认只展开到第3层 (根节点是0)
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

const toggleMode = () => {
    is3DMode.value = !is3DMode.value
    if (is3DMode.value) {
        nextTick(() => {
            init3DGraph()
        })
    } else {
        // 切回 2D 时可能需要 resize
        nextTick(() => {
            chartInstance && chartInstance.resize()
        })
    }
}

const handleResize = () => {
    chartInstance && chartInstance.resize()
    if (graph3dInstance && graph3dRef.value) {
        graph3dInstance.width(graph3dRef.value.clientWidth)
    }
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
                    <div>
                        <el-button 
                            :type="is3DMode ? 'primary' : 'default'" 
                            size="small" 
                            :icon="Switch"
                            @click="toggleMode"
                        >
                            {{ is3DMode ? '返回 2D 视图' : '进入 3D 宇宙' }}
                        </el-button>
                    </div>
                </div>
            </template>
            <div class="graph-container">
                <div v-show="!is3DMode" ref="chartRef" style="width: 100%; height: 600px;"></div>
                <div v-if="is3DMode" ref="graph3dRef" style="width: 100%; height: 600px;"></div>
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
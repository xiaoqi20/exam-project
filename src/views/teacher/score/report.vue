<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Download, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 模拟试卷列表
const examOptions = [
  { id: 201, title: '2024-2025第一学期期末考试' },
  { id: 202, title: 'Java 程序设计月考' },
  { id: 203, title: '计算机网络基础测验' }
]

const queryParams = reactive({
  examId: ''
})

// 统计数据
const statsData = ref({
  average: 0,
  max: 0,
  min: 0,
  passRate: 0,
  totalCount: 0
})

// 学生成绩列表
const tableData = ref([])

// 图表实例
let chartInstance = null
const chartRef = ref(null)

// 模拟后端数据获取
const fetchData = () => {
  if (!queryParams.examId) return
  
  // 模拟生成数据
  const total = 45
  const scores = Array.from({ length: total }, () => Math.floor(Math.random() * 41) + 60) // 60-100分
  
  // 计算统计指标
  const sum = scores.reduce((a, b) => a + b, 0)
  statsData.value = {
    average: (sum / total).toFixed(1),
    max: Math.max(...scores),
    min: Math.min(...scores),
    passRate: ((scores.filter(s => s >= 60).length / total) * 100).toFixed(1),
    totalCount: total
  }

  // 生成表格数据
  tableData.value = scores.map((score, index) => ({
    studentId: `2021${index.toString().padStart(3, '0')}`,
    name: `学生${index + 1}`,
    score: score,
    rank: 0 // 稍后计算
  })).sort((a, b) => b.score - a.score)

  // 计算排名
  tableData.value.forEach((item, index) => item.rank = index + 1)

  // 更新图表
  updateChart(scores)
  ElMessage.success('数据加载完成')
}

const updateChart = (scores) => {
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  
  // 统计各分数段人数
  const ranges = ['<60', '60-69', '70-79', '80-89', '90-100']
  const counts = [0, 0, 0, 0, 0]
  
  scores.forEach(s => {
    if (s < 60) counts[0]++
    else if (s < 70) counts[1]++
    else if (s < 80) counts[2]++
    else if (s < 90) counts[3]++
    else counts[4]++
  })

  const option = {
    title: { text: '成绩分布直方图', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ranges },
    yAxis: { type: 'value', name: '人数' },
    series: [
      {
        data: counts,
        type: 'bar',
        showBackground: true,
        backgroundStyle: { color: 'rgba(180, 180, 180, 0.2)' },
        itemStyle: { color: '#409EFF' },
        label: { show: true, position: 'top' }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

// 导出
const handleExport = () => {
  ElMessage.success('正在导出 Excel...')
}

// 监听窗口大小变化
window.addEventListener('resize', () => {
  chartInstance && chartInstance.resize()
})
</script>

<template>
  <div class="app-container">
    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-header">
        <span>选择试卷进行统计：</span>
        <el-select v-model="queryParams.examId" placeholder="请选择试卷" style="width: 300px" @change="fetchData">
          <el-option v-for="item in examOptions" :key="item.id" :label="item.title" :value="item.id" />
        </el-select>
        <el-button type="primary" :icon="Download" class="ml-2" :disabled="!queryParams.examId" @click="handleExport">导出报表</el-button>
      </div>
    </el-card>

    <div v-if="queryParams.examId" class="content-wrapper">
      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-item">
            <div class="stat-title">参考人数</div>
            <div class="stat-value text-primary">{{ statsData.totalCount }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-item">
            <div class="stat-title">平均分</div>
            <div class="stat-value text-warning">{{ statsData.average }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-item">
            <div class="stat-title">最高分</div>
            <div class="stat-value text-success">{{ statsData.max }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-item">
            <div class="stat-title">及格率</div>
            <div class="stat-value text-danger">{{ statsData.passRate }}%</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表与列表 -->
      <el-row :gutter="20">
        <!-- 左侧图表 -->
        <el-col :span="12" :xs="24">
          <el-card shadow="never" class="chart-card">
            <div ref="chartRef" style="width: 100%; height: 400px;"></div>
          </el-card>
        </el-col>
        
        <!-- 右侧排名表格 -->
        <el-col :span="12" :xs="24">
          <el-card shadow="never">
            <template #header>
              <div class="clearfix">
                <span>成绩排名 (Top 10)</span>
              </div>
            </template>
            <el-table :data="tableData.slice(0, 10)" border stripe height="350">
              <el-table-column prop="rank" label="排名" width="80" align="center">
                <template #default="scope">
                   <span v-if="scope.row.rank <= 3" style="font-size: 18px">
                     {{ ['🥇','🥈','🥉'][scope.row.rank - 1] }}
                   </span>
                   <span v-else>{{ scope.row.rank }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="姓名" width="120" />
              <el-table-column prop="studentId" label="学号" />
              <el-table-column prop="score" label="成绩" width="100" align="center" sortable>
                 <template #default="scope">
                   <span :style="{ fontWeight: 'bold', color: scope.row.score < 60 ? '#F56C6C' : '#303133' }">
                     {{ scope.row.score }}
                   </span>
                 </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <div v-else class="empty-state">
      <p>请从上方选择一份试卷以查看统计数据</p>
    </div>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-card { margin-bottom: 20px; }
.filter-header { display: flex; align-items: center; }
.ml-2 { margin-left: 15px; }

.stats-row { margin-bottom: 20px; }
.stat-item { text-align: center; }
.stat-title { color: #909399; font-size: 14px; margin-bottom: 10px; }
.stat-value { font-size: 24px; font-weight: bold; }

.text-primary { color: #409EFF; }
.text-warning { color: #E6A23C; }
.text-success { color: #67C23A; }
.text-danger { color: #F56C6C; }

.empty-state { text-align: center; color: #909399; padding: 50px; font-size: 16px; }
</style>
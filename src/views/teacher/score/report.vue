<script setup>
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getExamPaperList } from '@/api/examPaper'
import { getPaperScoreList } from '@/api/score' 
import { ElMessage } from 'element-plus'

// --- Data ---
const examList = ref([]) 
const selectedExamId = ref(null)
const loading = ref(false)
const reportData = ref(null) 
const scoreList = ref([])    

const chartRef = ref(null)
let myChart = null

// --- Methods ---

// 1. Load Exams for Dropdown
const loadExams = async () => {
  try {
    const res = await getExamPaperList({ page: 1, size: 100 })
    console.log('Report: Loaded Exams:', res)
    if (res && res.records) {
      examList.value = res.records.map(item => ({
        id: item.paperId || item.id,
        title: item.title,
        status: item.status,
        totalScore: item.totalMark || item.totalScore || 100
      }))
    }
  } catch (e) {
    console.error('Failed to load exams', e)
  }
}

// 2. Process Real Data
const processData = (data, totalScore = 100) => {
  const totalStudents = data.length
  if (totalStudents === 0) return null

  let sum = 0
  let max = 0
  let min = totalScore
  let passCount = 0
  const passScore = totalScore * 0.6

  const list = data.map(item => {
      const score = item.score || 0
      sum += score
      if (score > max) max = score
      if (score < min) min = score
      if (score >= passScore) passCount++
      
      return {
          studentId: item.studentId || item.stuId,
          name: item.name || item.sname || item.studentName,
          score: score
      }
  })
  
  // Sort by score desc
  list.sort((a, b) => b.score - a.score)

  return {
    overview: {
      total: totalStudents,
      avg: (sum / totalStudents).toFixed(1),
      max,
      min,
      passRate: ((passCount / totalStudents) * 100).toFixed(1) + '%'
    },
    list
  }
}

// 4. ECharts Logic
const initChart = () => {
  if (!chartRef.value) return
  if (myChart) myChart.dispose()

  myChart = echarts.init(chartRef.value)
  
  const segments = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '不及格': 0
  }
  
  scoreList.value.forEach(item => {
    if (item.score >= 90) segments['90-100']++
    else if (item.score >= 80) segments['80-89']++
    else if (item.score >= 70) segments['70-79']++
    else if (item.score >= 60) segments['60-69']++
    else segments['不及格']++
  })

  const option = {
    title: { text: '成绩段分布', left: 'center' },
    tooltip: { trigger: 'item' },
    xAxis: {
      type: 'category',
      data: Object.keys(segments),
      axisLabel: { interval: 0 } // Force show all labels
    },
    yAxis: {
      type: 'value'
    },
    grid: {
        left: '10%',
        right: '5%',
        bottom: '10%',
        containLabel: true
    },
    series: [
      {
        data: Object.values(segments),
        type: 'bar',
        itemStyle: {
          color: (params) => {
            if (params.name === '不及格') return '#F56C6C'
            if (params.name === '90-100') return '#67C23A'
            return '#409EFF'
          }
        },
        label: {
          show: true,
          position: 'top'
        }
      }
    ]
  }
  
  myChart.setOption(option)
}

// 3. Handle Exam Change
const handleExamChange = async () => {
  if (!selectedExamId.value) return
  
  loading.value = true
  try {
    const exam = examList.value.find(e => e.id === selectedExamId.value)
    const res = await getPaperScoreList(selectedExamId.value)
    console.log('API Score List:', res)

    if (res && (res.data || Array.isArray(res))) {
        const rawList = Array.isArray(res) ? res : (res.data || [])
        const processed = processData(rawList, exam ? (exam.totalScore || 100) : 100)
        
        if (processed) {
            reportData.value = processed.overview
            scoreList.value = processed.list
            nextTick(() => {
                initChart()
            })
        } else {
            reportData.value = null
            ElMessage.info('暂无考试数据')
        }
    } else {
        reportData.value = null
        ElMessage.info('暂无考试数据')
    }
  } catch (e) {
      console.error(e)
      ElMessage.error('获取成绩失败')
  } finally {
      loading.value = false
  }
}

// Resize chart on window resize
const handleResize = () => {
  myChart && myChart.resize()
}

onMounted(() => {
  loadExams()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (myChart) myChart.dispose()
})
</script>

<template>
  <div class="app-container">
    <!-- Header: Select Exam -->
    <el-card shadow="never" class="header-card">
      <div class="header-row">
        <span class="label">选择试卷：</span>
        <el-select 
          v-model="selectedExamId" 
          placeholder="请选择试卷" 
          style="width: 100%; max-width: 300px;"
          @change="handleExamChange"
          filterable
        >
          <el-option 
            v-for="item in examList" 
            :key="item.id" 
            :label="item.title" 
            :value="item.id" 
          />
        </el-select>
      </div>
    </el-card>

    <div v-if="reportData" v-loading="loading">
      <!-- Statistics Cards -->
      <el-row :gutter="10" style="margin-top: 20px">
        <el-col :span="6" :xs="12" :sm="12" class="mb-10">
          <el-card shadow="hover">
            <template #header>参考人数</template>
            <div class="stat-value">{{ reportData.total }}</div>
          </el-card>
        </el-col>
        <el-col :span="6" :xs="12" :sm="12" class="mb-10">
          <el-card shadow="hover">
            <template #header>平均分</template>
            <div class="stat-value" style="color: #409EFF">{{ reportData.avg }}</div>
          </el-card>
        </el-col>
        <el-col :span="6" :xs="12" :sm="12" class="mb-10">
          <el-card shadow="hover">
            <template #header>及格率</template>
            <div class="stat-value" style="color: #67C23A">{{ reportData.passRate }}</div>
          </el-card>
        </el-col>
        <el-col :span="6" :xs="12" :sm="12" class="mb-10">
          <el-card shadow="hover">
            <template #header>最高/最低</template>
            <div class="stat-value small-text">
              <span style="color: #67C23A">{{ reportData.max }}</span> / 
              <span style="color: #F56C6C">{{ reportData.min }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Chart & Table -->
      <el-row :gutter="20" style="margin-top: 10px">
        <!-- Left: Chart -->
        <el-col :span="12" :xs="24" class="mb-20">
          <el-card shadow="hover">
            <div ref="chartRef" style="height: 350px; width: 100%"></div>
          </el-card>
        </el-col>
        
        <!-- Right: Detail Table -->
        <el-col :span="12" :xs="24">
          <el-card shadow="hover" style="height: 400px; overflow: hidden; display: flex; flex-direction: column;">
            <template #header>成绩排名</template>
            <el-table :data="scoreList" stripe size="small" height="100%" style="width: 100%">
              <el-table-column type="index" label="排名" width="50" align="center" />
              <el-table-column prop="name" label="姓名" min-width="80" show-overflow-tooltip />
              <el-table-column prop="studentId" label="学号" min-width="100" show-overflow-tooltip />
              <el-table-column prop="score" label="分数" width="60" align="center" sortable>
                <template #default="{ row }">
                  <span :class="row.score < 60 ? 'score-fail' : 'score-pass'">
                    {{ row.score }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <el-empty v-else description="请选择一场考试以查看报表" style="margin-top: 50px" />
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.header-card { display: flex; align-items: center; }
.header-row { display: flex; align-items: center; font-size: 16px; font-weight: bold; width: 100%; }
.header-row .label { white-space: nowrap; margin-right: 10px; }

.stat-value { font-size: 24px; font-weight: bold; text-align: center; }
.small-text { font-size: 20px; } /* Smaller font for Max/Min on mobile */

.score-pass { color: #67C23A; font-weight: bold; }
.score-fail { color: #F56C6C; font-weight: bold; }

.mb-10 { margin-bottom: 10px; }
.mb-20 { margin-bottom: 20px; }

/* Mobile Adjustments */
@media (max-width: 768px) {
    .app-container { padding: 10px; }
    
    /* Header Card */
    .header-card :deep(.el-card__body) { padding: 15px; }
    .header-row { flex-direction: column; align-items: flex-start; gap: 10px; }
    .header-row .label { margin-bottom: 5px; }
    .header-row .el-select { max-width: 100% !important; }

    /* Stats */
    .stat-value { font-size: 20px; }
    .small-text { font-size: 16px; }
}
</style>
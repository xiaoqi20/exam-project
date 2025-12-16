<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { User, Document, Trophy, DataLine, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useExamStore } from '@/stores/exam'
import { getExamPaperList } from '@/api/examPaper'
import { getQuestionList } from '@/api/question'
import { getMistakeList } from '@/api/mistake'
import { getStatsSummary, getDailyActivity, getQuestionDistribution } from '@/api/stats'

const router = useRouter()
const userStore = useUserStore()
const examStore = useExamStore()
// Use optional chaining just in case userStore is not ready yet (though it should be)
const role = userStore?.role || 'student' 

// Stats Data
const stats = ref({
  userCount: 0,
  paperCount: 0,
  questionCount: 0,
  examCount: 0
})

// Charts Refs
const lineChartRef = ref(null)
const pieChartRef = ref(null)
let lineChart = null
let pieChart = null

// Daily Practice Logic
const startDailyPractice = async () => {
    const loading = ElLoading.service({ text: 'AI 正在为您生成个性化推荐题目...', background: 'rgba(0, 0, 0, 0.7)' })
    try {
        const res = await import('@/api/recommend').then(m => m.getRecommendedQuestions())
        
        const questions = Array.isArray(res) ? res : (res.data || [])

        if (questions && questions.length > 0) {
             const adaptedQuestions = questions.map(q => ({
                 ...q,
                 options: (typeof q.options === 'string' && q.options.startsWith('{')) 
                    ? JSON.parse(q.options) 
                    : q.options
             }))

             examStore.setPracticePaper({
                 title: '每日一练 (AI 智能推荐)',
                 questions: adaptedQuestions
             })
             
             router.push({
                 name: 'ExamPaper',
                 params: { id: 'practice' },
                 query: { title: '每日一练 (AI 智能推荐)', duration: 30 }
             })
             ElMessage.success('推荐题目生成成功！')
        } else {
            ElMessage.warning('暂无推荐题目，请先多做几道题吧')
        }

    } catch (e) {
        console.error(e)
        ElMessage.error('推荐生成失败，请稍后重试')
    } finally {
        loading.close()
    }
}

// Load Data
const loadStats = async () => {
  try {
    if (role !== 'student') {
        const res = await getStatsSummary()
        if (res) {
            stats.value = {
                userCount: res.userCount || 0,
                paperCount: res.paperCount || 0,
                questionCount: res.questionCount || 0,
                examCount: res.examCount || 0
            }
        }
    } else {
        stats.value.paperCount = 12
        stats.value.questionCount = 350
    }
  } catch (e) {
    console.error('Stats error', e)
  }
}

// Init Charts
const initCharts = async () => {
  if (lineChartRef.value) {
      lineChart = echarts.init(lineChartRef.value)
      
      let xData = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      let sData = [0, 0, 0, 0, 0, 0, 0]

      if (role !== 'student') {
          try {
              const res = await getDailyActivity()
              if (res) {
                  if (res.dates && res.values) {
                      xData = res.dates
                      sData = res.values
                  } else if (Array.isArray(res)) {
                      xData = res.map(i => i.date || i.name)
                      sData = res.map(i => i.count || i.value)
                  }
              }
          } catch(e) {}
      } else {
          sData = [5, 10, 2, 8, 15, 20, 12]
      }

      const optionLine = {
        title: { text: '近七日考试活跃度' },
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: xData },
        yAxis: { type: 'value' },
        series: [{
          name: '参与人次',
          type: 'line',
          smooth: true,
          data: sData,
          areaStyle: { opacity: 0.3 },
          itemStyle: { color: '#409EFF' }
        }]
      }
      lineChart.setOption(optionLine)
  }

  if (pieChartRef.value) {
      pieChart = echarts.init(pieChartRef.value)
      
      let pieData = []
      if (role !== 'student') {
          try {
              const res = await getQuestionDistribution()
              if (res && Array.isArray(res)) {
                  pieData = res
              }
          } catch(e) {}
      } else {
          pieData = [
              { value: 1048, name: 'Java 基础' },
              { value: 735, name: '数据库' },
              { value: 580, name: '前端开发' },
              { value: 484, name: '计算机网络' },
              { value: 300, name: '操作系统' }
          ]
      }

      const optionPie = {
        title: { text: '题库知识点分布', left: 'center' },
        tooltip: { trigger: 'item' },
        series: [
          {
            name: '数量',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: true },
            data: pieData
          }
        ]
      }
      pieChart.setOption(optionPie)
  }
}

const handleResize = () => {
  lineChart && lineChart.resize()
  pieChart && pieChart.resize()
}

onMounted(async () => {
  await loadStats()
  nextTick(() => {
    initCharts()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (lineChart) lineChart.dispose()
  if (pieChart) pieChart.dispose()
})
</script>

<template>
  <div class="dashboard-container">
    <div class="welcome-header">
        <!-- Safe access to userStore -->
        <h2>早安，{{ userStore?.userInfo?.name || 'User' }}！</h2>
        <p class="subtitle">今天是 {{ new Date().toLocaleDateString() }}，祝您使用愉快。</p>
    </div>

    <!-- Student Special: Daily Practice -->
    <el-row v-if="role === 'student'" class="practice-row">
        <el-col :span="24">
            <el-card shadow="hover" class="practice-card">
                <div class="practice-content">
                    <div class="p-icon">
                        <el-icon><VideoPlay /></el-icon>
                    </div>
                    <div class="p-info">
                        <h3>AI 每日一练</h3>
                        <p>根据您的错题记录，智能生成 5 道薄弱点专项训练题。</p>
                    </div>
                    <el-button type="primary" round size="large" @click="startDailyPractice">立即开始</el-button>
                </div>
            </el-card>
        </el-col>
    </el-row>

    <!-- Stat Cards -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon icon-user"><el-icon><User /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">注册用户</div>
            <div class="stat-num">{{ stats.userCount }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon icon-paper"><el-icon><Document /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">试卷总数</div>
            <div class="stat-num">{{ stats.paperCount }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon icon-question"><el-icon><DataLine /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">题目总量</div>
            <div class="stat-num">{{ stats.questionCount }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon icon-exam"><el-icon><Trophy /></el-icon></div>
          <div class="stat-info">
            <div class="stat-label">累计考试</div>
            <div class="stat-num">{{ stats.examCount }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :lg="16" class="mb-20">
        <el-card shadow="never">
          <div ref="lineChartRef" style="height: 350px;"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <div ref="pieChartRef" style="height: 350px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 20px;
}
.welcome-header { margin-bottom: 25px; }
.welcome-header h2 { margin: 0 0 10px 0; color: #303133; }
.subtitle { color: #909399; font-size: 14px; margin: 0; }

.practice-row { margin-bottom: 25px; }
.practice-card {
    background: linear-gradient(135deg, #e1f3ff 0%, #ffffff 100%);
    border: 1px solid #cbe9ff;
}
.practice-content {
    display: flex;
    align-items: center;
    padding: 10px;
}
.p-icon {
    width: 50px;
    height: 50px;
    background: #409EFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 24px;
    margin-right: 20px;
    box-shadow: 0 4px 10px rgba(64, 158, 255, 0.3);
}
.p-info { flex: 1; }
.p-info h3 { margin: 0 0 5px 0; color: #303133; font-size: 18px; }
.p-info p { margin: 0; color: #606266; font-size: 14px; }

.stat-row { margin-bottom: 20px; }
.stat-card {
  display: flex;
  align-items: center;
  border: none;
}
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  justify-content: center; 
  width: 100%;
  padding-left: 60px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-right: 20px; 
  color: #fff;
  flex-shrink: 0; 
}
.icon-user { background: linear-gradient(135deg, #69C9F8, #409EFF); }
.icon-paper { background: linear-gradient(135deg, #F8D869, #E6A23C); }
.icon-question { background: linear-gradient(135deg, #85F869, #67C23A); }
.icon-exam { background: linear-gradient(135deg, #F86969, #F56C6C); }

.stat-info { flex: 1; }
.stat-label { color: #909399; font-size: 14px; margin-bottom: 5px; }
.stat-num { color: #303133; font-size: 24px; font-weight: bold; }

.mb-20 { margin-bottom: 20px; }

/* Mobile */
@media (max-width: 768px) {
    .dashboard-container { padding: 10px; }
    .stat-row .el-col { margin-bottom: 10px; }
    .stat-card :deep(.el-card__body) { padding: 15px; }
    .stat-icon { width: 45px; height: 45px; font-size: 20px; }
    .stat-num { font-size: 20px; }
    
    .practice-content { flex-direction: column; text-align: center; gap: 15px; }
    .p-icon { margin-right: 0; }
}
</style>
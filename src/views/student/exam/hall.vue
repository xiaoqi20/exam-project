<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Timer, VideoPlay, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const searchQuery = ref('')

// 模拟可参加的考试列表
// 注意：目前只有 ID为1 的考试可以调用真实 API 预览
const allExams = [
  {
    id: 1,
    title: '数据库期末模拟考',
    duration: 90,
    totalScore: 100,
    startTime: '2025-12-05 09:00:00',
    endTime: '2025-12-07 18:00:00',
    description: '包含 E-R 图设计、SQL 语句编写（DDL/DML）、规范化理论等核心内容。',
    status: 'active' // active, upcoming, ended
  },
  {
    id: 202,
    title: 'Java 程序设计月考',
    duration: 60,
    totalScore: 100,
    startTime: '2025-12-01 09:00:00',
    endTime: '2025-12-30 11:00:00',
    description: '本考试主要测试 Java 基础语法及面向对象编程思想。',
    status: 'active'
  },
  {
    id: 205,
    title: 'Web 前端开发技术',
    duration: 90,
    totalScore: 100,
    startTime: '2025-12-05 14:00:00',
    endTime: '2025-12-05 16:00:00',
    description: '包含 HTML5, CSS3, JavaScript 及 Vue.js 基础知识。',
    status: 'ended'
  }
]

const examList = computed(() => {
  return allExams.filter(exam => 
    exam.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const getStatusTag = (status) => {
  const map = {
    active: 'success',
    upcoming: 'info',
    ended: 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    active: '进行中',
    upcoming: '未开始',
    ended: '已结束'
  }
  return map[status] || '未知'
}

// 进入考试
const handleStartExam = (exam) => {
  if (exam.status !== 'active') {
    ElMessage.warning('当前考试不在可参加的时间范围内')
    return
  }

  ElMessageBox.confirm(`确定要开始 "${exam.title}" 考试吗？\n考试时长: ${exam.duration}分钟`, '开始考试', {
    confirmButtonText: '立即开始',
    cancelButtonText: '稍后再来',
    type: 'info'
  }).then(() => {
    // 跳转到考试详情页（答题页）
    router.push({
      name: 'ExamPaper',
      params: { id: exam.id },
      query: { title: exam.title, duration: exam.duration }
    })
  }).catch(() => {})
}
</script>

<template>
  <div class="app-container">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h2>考试大厅</h2>
          <p class="sub-title">请选择当前开放的考试进行作答</p>
        </div>
        <div class="header-action">
           <el-input
            v-model="searchQuery"
            placeholder="搜索考试名称..."
            :prefix-icon="Search"
            style="width: 240px"
          />
        </div>
      </div>
    </div>

    <el-empty v-if="examList.length === 0" description="暂无符合条件的考试" />

    <el-row :gutter="20" v-else>
      <el-col :span="8" v-for="exam in examList" :key="exam.id" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="exam-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="exam-title" :title="exam.title">{{ exam.title }}</span>
              <el-tag :type="getStatusTag(exam.status)" effect="dark" size="small">
                {{ getStatusText(exam.status) }}
              </el-tag>
            </div>
          </template>
          
          <div class="exam-info">
            <p class="desc" :title="exam.description">{{ exam.description }}</p>
            <div class="meta-row">
              <div class="meta-item">
                <el-icon><Timer /></el-icon>
                <span>{{ exam.duration }} 分钟</span>
              </div>
              <div class="meta-item">
                <el-icon><VideoPlay /></el-icon>
                <span>{{ exam.totalScore }} 分</span>
              </div>
            </div>
            <div class="time-range">
              <small>截止: {{ exam.endTime }}</small>
            </div>
          </div>

          <div class="card-footer">
            <el-button 
              type="primary" 
              class="start-btn" 
              :disabled="exam.status !== 'active'"
              @click="handleStartExam(exam)"
            >
              {{ exam.status === 'active' ? '开始考试' : '不可参加' }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.page-header { margin-bottom: 20px; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.header-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-content h2 { margin: 0; font-size: 20px; color: #303133; }
.sub-title { color: #909399; font-size: 14px; margin: 5px 0 0; }

.exam-card { margin-bottom: 20px; transition: all 0.3s; border: none; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.exam-card:hover { transform: translateY(-5px); box-shadow: 0 8px 16px 0 rgba(0,0,0,0.1); }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.exam-title { font-weight: bold; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }

.exam-info { padding: 10px 0; color: #606266; }
.desc { font-size: 13px; color: #909399; margin-bottom: 15px; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.5; }

.meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.meta-item { display: flex; align-items: center; font-size: 13px; color: #606266; }
.meta-item .el-icon { margin-right: 4px; }

.time-range { color: #F56C6C; margin-top: 10px; font-size: 12px; }

.card-footer { text-align: center; margin-top: 5px; border-top: 1px solid #EBEEF5; padding-top: 15px; }
.start-btn { width: 100%; border-radius: 20px; }
</style>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Timer, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

// 模拟可参加的考试列表
const examList = ref([
  {
    id: 202,
    title: 'Java 程序设计月考',
    duration: 60,
    totalScore: 100,
    startTime: '2025-12-01 09:00:00',
    endTime: '2025-12-30 11:00:00',
    description: '本考试主要测试 Java 基础语法及面向对象编程思想。'
  },
  {
    id: 205,
    title: 'Web 前端开发技术',
    duration: 90,
    totalScore: 100,
    startTime: '2025-12-05 14:00:00',
    endTime: '2025-12-05 16:00:00',
    description: '包含 HTML5, CSS3, JavaScript 及 Vue.js 基础知识。'
  }
])

// 进入考试
const handleStartExam = (exam) => {
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
      <h2>考试大厅</h2>
      <p class="sub-title">当前有 {{ examList.length }} 场考试正在进行中，请选择参加。</p>
    </div>

    <el-row :gutter="20">
      <el-col :span="8" v-for="exam in examList" :key="exam.id" :xs="24" :sm="12" :md="8">
        <el-card class="exam-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="exam-title">{{ exam.title }}</span>
              <el-tag type="success" effect="dark">进行中</el-tag>
            </div>
          </template>
          
          <div class="exam-info">
            <p class="desc">{{ exam.description }}</p>
            <div class="meta-item">
              <el-icon><Timer /></el-icon>
              <span>时长：{{ exam.duration }} 分钟</span>
            </div>
            <div class="meta-item">
              <el-icon><VideoPlay /></el-icon>
              <span>总分：{{ exam.totalScore }} 分</span>
            </div>
            <div class="time-range">
              <small>截止时间：{{ exam.endTime }}</small>
            </div>
          </div>

          <div class="card-footer">
            <el-button type="primary" class="start-btn" @click="handleStartExam(exam)">
              开始考试
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.page-header { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.sub-title { color: #909399; font-size: 14px; margin-top: 5px; }

.exam-card { margin-bottom: 20px; transition: all 0.3s; }
.exam-card:hover { transform: translateY(-5px); }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.exam-title { font-weight: bold; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.exam-info { padding: 10px 0; color: #606266; }
.desc { font-size: 13px; color: #909399; margin-bottom: 15px; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.meta-item { display: flex; align-items: center; margin-bottom: 8px; font-size: 14px; }
.meta-item .el-icon { margin-right: 5px; }
.time-range { color: #F56C6C; margin-top: 10px; }

.card-footer { text-align: center; margin-top: 10px; }
.start-btn { width: 100%; }
</style>
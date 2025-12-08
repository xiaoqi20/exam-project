<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Timer, VideoPlay, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getExamPaperList } from '@/api/examPaper'

const router = useRouter()
const searchQuery = ref('')
const loading = ref(false)
const examList = ref([])
const total = ref(0)
const queryParams = reactive({
    page: 1,
    size: 9, // Grid layout 3x3
    title: ''
})

const getStatusTag = (status) => {
    // Backend status: 1=active (published). 
    // If backend returns status 1, we treat it as active.
    // Adjust logic if backend returns string 'active' or numbers
    return 'success' 
}

const getStatusText = (status) => {
    return '进行中'
}

const loadExams = async () => {
    loading.value = true
    try {
        queryParams.title = searchQuery.value
        const res = await getExamPaperList(queryParams)
        if (res && res.records) {
            // Adapt backend fields to frontend UI
            examList.value = res.records.map(item => ({
                id: item.paperId || item.id,
                title: item.title,
                duration: item.duration,
                totalScore: item.totalMark || item.totalScore || 100,
                description: item.description || '暂无描述',
                status: 'active', // Only published exams should be returned by this API
                endTime: '长期开放' // Assuming no strict end time yet
            }))
            total.value = res.total
        } else {
            examList.value = []
            total.value = 0
        }
    } catch (e) {
        ElMessage.error('加载考试列表失败')
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    queryParams.page = 1
    loadExams()
}

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

onMounted(() => {
    loadExams()
})
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
            @keyup.enter="handleSearch"
            clearable
            @clear="handleSearch"
          />
          <el-button type="primary" :icon="Search" @click="handleSearch" style="margin-left: 10px">搜索</el-button>
        </div>
      </div>
    </div>

    <div v-loading="loading" style="min-height: 200px">
        <el-empty v-if="!loading && examList.length === 0" description="暂无符合条件的考试" />

        <el-row :gutter="20" v-else>
          <el-col :span="8" v-for="exam in examList" :key="exam.id" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="exam-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="exam-title" :title="exam.title">{{ exam.title }}</span>
                  <el-tag type="success" effect="dark" size="small">
                    进行中
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
                  @click="handleStartExam(exam)"
                >
                  开始考试
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <div class="pagination-bar" v-if="total > 0">
             <el-pagination 
               layout="prev, pager, next" 
               :total="total" 
               v-model:current-page="queryParams.page" 
               :page-size="queryParams.size"
               @current-change="loadExams"
               background
             />
        </div>
    </div>
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
.pagination-bar { margin-top: 20px; display: flex; justify-content: center; }
</style>

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
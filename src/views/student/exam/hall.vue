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
    size: 20, // Increase size since we do client-side filtering
    title: ''
})

const isToday = (dateStr) => {
    if (!dateStr || dateStr === '-') return false
    const d = new Date(dateStr)
    const today = new Date()
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear()
}

const loadExams = async () => {
    loading.value = true
    try {
        // Query all exams (remove status filter if possible, or request backend to support multiple)
        // Note: Assuming backend returns all if status is not provided or handles custom logic.
        // If backend forces status=1 by default, we might need a separate API call or param.
        // Let's try sending NO status to get all.
        const params = { ...queryParams }
        delete params.status 
        
        const res = await getExamPaperList(params)
        if (res && res.records) {
            const rawList = res.records.map(item => ({
                id: item.paperId || item.id,
                title: item.title,
                duration: item.duration,
                totalScore: item.totalMark || item.totalScore || 100,
                description: item.description || '暂无描述',
                status: item.status !== undefined ? item.status : 1, // 1=active, 2=ended
                createTime: item.createTime,
                endTime: '长期开放' 
            }))

            // Client-side filtering:
            // 1. Status = 1 (Active)
            // 2. Status = 2 (Ended) AND created Today
            
            // FIXME: [性能与分页优化提醒]
            // 当前逻辑存在分页不准确的问题：
            // 后端返回的是基于所有状态的分页数据，前端过滤后，可能导致某一页显示的条目很少甚至为空。
            // 随着历史试卷增多，第一页可能全是“非今日的已结束试卷”，导致前端显示空白。
            // 
            // 优化方案 (TODO):
            // 需要后端提供支持复合条件的查询接口，例如: WHERE status = 1 OR (status = 2 AND create_time = TODAY)
            // 将过滤逻辑下沉到数据库层。
            examList.value = rawList.filter(item => {
                if (item.status === 1) return true
                if (item.status === 2 && isToday(item.createTime)) return true
                return false
            })
            
            // Note: Total count might be inaccurate due to client-side filtering of pages.
            // Ideally backend should handle this. For now, we accept this limitation.
            total.value = examList.value.length 
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
// ...
// 进入考试
const handleStartExam = (exam) => {
  if (exam.status === 2) {
      ElMessage.warning('该考试已结束')
      return
  }
  ElMessageBox.confirm(`确定要开始 "${exam.title}" 考试吗？\n考试时长: ${exam.duration}分钟`, '开始考试', {
// ...
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
            <el-card class="exam-card" shadow="hover" :class="{ 'is-ended': exam.status === 2 }">
              <template #header>
                <div class="card-header">
                  <span class="exam-title" :title="exam.title">{{ exam.title }}</span>
                  <el-tag :type="exam.status === 1 ? 'success' : 'info'" effect="dark" size="small">
                    {{ exam.status === 1 ? '进行中' : '已结束' }}
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
                  <small v-if="exam.status === 2">发布于: {{ exam.createTime }} (本日)</small>
                  <small v-else>截止: {{ exam.endTime }}</small>
                </div>
              </div>

              <div class="card-footer">
                <el-button 
                  :type="exam.status === 1 ? 'primary' : 'info'" 
                  class="start-btn" 
                  :disabled="exam.status === 2"
                  @click="handleStartExam(exam)"
                >
                  {{ exam.status === 1 ? '开始考试' : '已结束' }}
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <div class="pagination-bar" v-if="total > 0 && false">
             <!-- Hide pagination for now as we use client-side filtering on a single large page fetch -->
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
.is-ended { opacity: 0.8; filter: grayscale(0.2); }
.is-ended .exam-title { color: #909399; }

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
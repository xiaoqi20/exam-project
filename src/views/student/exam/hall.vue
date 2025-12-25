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
    size: 100, // Load enough items at once for client-side filtering
    title: ''
})

const isWithin24Hours = (dateStr) => {
    if (!dateStr || dateStr === '-') return false
    const end = new Date(dateStr).getTime()
    const now = Date.now()
    // 检查是否在结束时间后的 24 小时内 (86400000 毫秒)
    // 条件: now >= end 且 now - end <= 24h
    // 假设后端时间与客户端时间基本同步
    const diff = now - end
    return diff >= 0 && diff <= 86400000 
}

const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    return timeStr.replace('T', ' ')
}

const loadExams = async () => {
    loading.value = true
    try {
        // 准备参数：移除 status，让后端返回所有可见试卷（进行中 & 已结束）
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
                status: item.status !== undefined ? item.status : 1, // 1=进行中, 2=已结束
                createTime: item.createTime,
                updateTime: item.updateTime, 
                endTime: '长期开放' 
            }))

            // 前端过滤逻辑:
            // 1. 状态 = 1 (进行中): 保留
            // 2. 状态 = 2 (已结束): 仅保留结束时间在 24 小时内的
            // 3. 关键词过滤 (兜底，防止后端不支持模糊查询)
            const filteredList = rawList.filter(item => {
                // Title Match
                if (queryParams.title && !item.title.toLowerCase().includes(queryParams.title.toLowerCase())) {
                    return false
                }

                if (item.status === 1) return true
                if (item.status === 2) {
                    // 使用 updateTime 作为结束时间，如果为空则兜底使用 createTime
                    const timeToCheck = item.updateTime || item.createTime
                    if (isWithin24Hours(timeToCheck)) return true
                }
                return false
            })

            // 排序: 进行中(1) 在前, 已结束(2) 在后
            examList.value = filteredList.sort((a, b) => {
                return a.status - b.status
            })
            
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
const handleSearch = () => {
    queryParams.page = 1
    queryParams.title = searchQuery.value // Sync search input to query params
    loadExams()
}

// 手动键盘事件处理，避免 Vue 编译器生成 _withKeys 代码导致的运行时错误
const onKeyup = (e) => {
    if (e.key === 'Enter') {
        handleSearch()
    }
}

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
            @keyup="onKeyup"
            clearable
            @clear="handleSearch"
          />
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
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
                  <small v-if="exam.status === 2">
                      结束于: {{ formatTime(exam.updateTime || exam.createTime) }}
                  </small>
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
        
        <div v-if="examList.length > 0 && examList.length >= 100" style="text-align: center; color: #909399; margin-top: 20px; font-size: 13px;">
            仅展示最近发布的 100 场考试，请使用搜索查找更多
        </div>
    </div>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.page-header { margin-bottom: 20px; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.header-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
.header-content h2 { margin: 0; font-size: 20px; color: #303133; }
.sub-title { color: #909399; font-size: 14px; margin: 5px 0 0; }

.header-action { display: flex; align-items: center; gap: 10px; } /* Use gap instead of margin */

/* Mobile responsiveness */
@media (max-width: 768px) {
    .app-container { padding: 10px; }
    .header-content { flex-direction: column; align-items: stretch; }
    .header-action { width: 100%; }
    .header-action :deep(.el-input) { width: 100% !important; flex: 1; }
    .header-action :deep(.el-button) { margin-left: 0 !important; }
}

.exam-card { margin-bottom: 20px; transition: all 0.3s; border: none; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05); }
.exam-card:hover { transform: translateY(-5px); box-shadow: 0 8px 16px 0 rgba(0,0,0,0.1); }
.is-ended { opacity: 0.8; filter: grayscale(0.2); }
.is-ended .exam-title { color: #909399; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.exam-title { font-weight: bold; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }

.exam-info { padding: 5px 0; color: #606266; }
.desc { font-size: 14px; color: #909399; margin-bottom: 8px; height: 42px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.5; }

.meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.meta-item { display: flex; align-items: center; font-size: 14px; color: #606266; }
.meta-item .el-icon { margin-right: 4px; }

.time-range { color: #F56C6C; margin-top: 5px; font-size: 13px; }

.card-footer { text-align: center; margin-top: 5px; border-top: 1px solid #EBEEF5; padding-top: 15px; }
.start-btn { width: 100%; border-radius: 20px; }
.pagination-bar { margin-top: 20px; display: flex; justify-content: center; }
</style>

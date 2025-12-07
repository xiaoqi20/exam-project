<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, View, Refresh } from '@element-plus/icons-vue'
import { getScoreHistory } from '@/api/exam'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  size: 10,
  search: ''
})

const loadData = async () => {
  loading.value = true
  try {
    // userStore.userInfo.id is assumed to be the studentId (e.g., "S202301")
    const res = await getScoreHistory(userStore.userInfo.id, {
        page: queryParams.page,
        size: queryParams.size,
        search: queryParams.search || undefined
    })
    
    if (res && res.records) {
        tableData.value = res.records
        total.value = res.total
    } else {
        tableData.value = []
        total.value = 0
    }
  } catch (error) {
    console.error('Failed to load score history:', error)
    ElMessage.error('加载成绩记录失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

const handleReset = () => {
  queryParams.search = ''
  handleQuery()
}

const handleViewDetail = (row) => {
  router.push({
    name: 'ScoreDetail',
    params: { id: row.id },
    query: { title: row.title, score: row.score }
  })
}

const handlePageChange = (page) => {
    queryParams.page = page
    loadData()
}

const formatExamTime = (row) => {
  if (row.examTime) return row.examTime
  if (row.submitTime && row.duration) {
    // Fallback: calculate from submitTime - duration
    try {
      // Handle "YYYY-MM-DD HH:mm:ss" format manually or via Date
      // Assuming standard format compatible with Date constructor or need simple parsing
      const submitDate = new Date(row.submitTime.replace(/-/g, '/')) 
      if (isNaN(submitDate.getTime())) return '--'
      
      const startTime = new Date(submitDate.getTime() - row.duration * 60 * 1000)
      
      // Simple manual formatting to YYYY-MM-DD HH:mm:ss
      const pad = (n) => n.toString().padStart(2, '0')
      return `${startTime.getFullYear()}-${pad(startTime.getMonth() + 1)}-${pad(startTime.getDate())} ${pad(startTime.getHours())}:${pad(startTime.getMinutes())}:${pad(startTime.getSeconds())}`
    } catch (e) {
      return '--'
    }
  }
  return '--'
}

onMounted(() => {
    loadData()
})
</script>

<template>
  <div class="app-container">
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="试卷名称">
          <el-input v-model="queryParams.search" placeholder="请输入试卷名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-container" shadow="never">
      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="title" label="试卷名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="examTime" label="考试时间" width="180">
           <template #default="scope">
             {{ formatExamTime(scope.row) }}
           </template>
        </el-table-column>
        <el-table-column prop="submitTime" label="交卷时间" width="180" sortable />
        <el-table-column prop="duration" label="耗时(分)" width="100" align="center" />
        <el-table-column prop="score" label="得分" width="100" align="center" sortable>
          <template #default="scope">
            <span :class="scope.row.score >= scope.row.passScore ? 'text-success' : 'text-danger'">
              {{ scope.row.score }}
            </span>
            <span class="total-score"> / {{ scope.row.totalScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.score >= scope.row.passScore ? 'success' : 'danger'">
              {{ scope.row.score >= scope.row.passScore ? '及格' : '不及格' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" :icon="View" @click="handleViewDetail(scope.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
          <el-pagination
            v-model:current-page="queryParams.page"
            :page-size="queryParams.size"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
            background
          />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
.table-container { padding-bottom: 20px; }
.text-success { color: #67C23A; font-weight: bold; font-size: 16px; }
.text-danger { color: #F56C6C; font-weight: bold; font-size: 16px; }
.total-score { color: #909399; font-size: 12px; }
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
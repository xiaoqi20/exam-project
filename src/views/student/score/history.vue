<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, View, Refresh, ArrowRight } from '@element-plus/icons-vue'
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
    try {
      const submitDate = new Date(row.submitTime.replace(/-/g, '/')) 
      if (isNaN(submitDate.getTime())) return '--'
      const startTime = new Date(submitDate.getTime() - row.duration * 60 * 1000)
      const pad = (n) => n.toString().padStart(2, '0')
      return `${startTime.getFullYear()}-${pad(startTime.getMonth() + 1)}-${pad(startTime.getDate())} ${pad(startTime.getHours())}:${pad(startTime.getMinutes())}:${pad(startTime.getSeconds())}`
    } catch (e) { return '--' }
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
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="试卷名称">
          <el-input v-model="queryParams.search" placeholder="请输入试卷名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item class="filter-btns">
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-container" shadow="never" v-loading="loading">
      
      <!-- PC View: Table -->
      <div class="pc-view">
          <el-table :data="tableData" border stripe>
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
      </div>

      <!-- Mobile View: Card List -->
      <div class="mobile-view">
          <div v-if="tableData.length === 0" class="empty-text">暂无数据</div>
          <div v-for="item in tableData" :key="item.id" class="mobile-card" @click="handleViewDetail(item)">
              <div class="m-card-header">
                  <div class="m-title">{{ item.title }}</div>
                  <div class="m-score" :class="item.score >= item.passScore ? 'text-success' : 'text-danger'">
                      {{ item.score }} <span class="m-total">/ {{ item.totalScore }}</span>
                  </div>
              </div>
              <div class="m-card-body">
                  <div class="m-row">
                      <span class="m-label">交卷时间:</span>
                      <span class="m-val">{{ item.submitTime }}</span>
                  </div>
                  <div class="m-row">
                      <span class="m-label">耗时:</span>
                      <span class="m-val">{{ item.duration }}分钟</span>
                  </div>
              </div>
              <div class="m-card-footer">
                   <el-tag size="small" :type="item.score >= item.passScore ? 'success' : 'danger'">
                       {{ item.score >= item.passScore ? '及格' : '不及格' }}
                   </el-tag>
                   <span class="detail-link">查看详情 <el-icon><ArrowRight /></el-icon></span>
              </div>
          </div>
      </div>
      
      <div class="pagination-container">
          <el-pagination
            v-model:current-page="queryParams.page"
            :page-size="queryParams.size"
            :total="total"
            layout="prev, pager, next" 
            @current-change="handlePageChange"
            background
            small 
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

/* Desktop View Defaults */
.mobile-view { display: none; }
.pc-view { display: block; }

/* Mobile Optimization */
@media (max-width: 768px) {
    .app-container { padding: 10px; }
    .filter-container { margin-bottom: 10px; }
    
    /* Form Styles */
    :deep(.el-form-item) {
        margin-right: 0;
        margin-bottom: 10px;
        width: 100%;
    }
    :deep(.el-form-item__content) {
        width: 100%;
    }
    .filter-btns {
        display: flex;
        gap: 10px;
    }
    .filter-btns :deep(.el-button) {
        flex: 1;
        margin-left: 0 !important;
    }

    /* Switch Views */
    .pc-view { display: none; }
    .mobile-view { display: block; }

    /* Mobile Card Styles */
    .mobile-card {
        background: #fff;
        border: 1px solid #EBEEF5;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        cursor: pointer;
        transition: all 0.2s;
    }
    .mobile-card:active {
        background: #f5f7fa;
    }

    .m-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
    }
    .m-title {
        font-weight: 600;
        font-size: 15px;
        color: #303133;
        line-height: 1.4;
        flex: 1;
        margin-right: 10px;
    }
    .m-score {
        font-size: 18px;
        flex-shrink: 0;
    }
    .m-total {
        font-size: 12px;
        color: #909399;
        font-weight: normal;
    }

    .m-card-body {
        font-size: 13px;
        color: #606266;
        margin-bottom: 10px;
    }
    .m-row {
        margin-bottom: 4px;
    }
    .m-label { color: #909399; margin-right: 4px; }

    .m-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #f0f2f5;
        padding-top: 8px;
    }
    .detail-link {
        font-size: 13px;
        color: #409EFF;
        display: flex;
        align-items: center;
    }
    .empty-text {
        text-align: center;
        color: #909399;
        padding: 20px;
    }
}
</style>
<script setup>
import { reactive, ref, onMounted } from 'vue'
import { Search, Edit, Delete, VideoPlay, VideoPause, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getExamPaperList, publishExamPaper } from '@/api/examPaper'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  size: 10,
  title: '',
  status: '' // Backend support for filtering by status? If not, we filter locally or ignore.
})

// 状态字典
// Backend status: 0=Draft, 1=Published, 2=Ended (Assumption based on discussion)
const statusMap = {
  0: { label: '未发布', type: 'info', value: 'draft' },
  1: { label: '进行中', type: 'success', value: 'published' },
  2: { label: '已结束', type: 'danger', value: 'ended' }
}

const statusOptions = [
  { label: '未发布', value: 0 },
  { label: '进行中', value: 1 },
  { label: '已结束', value: 2 }
]

// Fetch Data
const loadData = async () => {
    loading.value = true
    try {
        const res = await getExamPaperList(queryParams)
        if (res && res.records) {
            tableData.value = res.records.map(item => ({
                id: item.paperId || item.id,
                title: item.title,
                duration: item.duration,
                totalScore: item.totalMark || item.totalScore,
                questionCount: item.questionCount || 0, // Map questionCount
                status: item.status !== undefined ? item.status : 1, 
                createTime: item.createTime || '-'
            }))
            total.value = res.total
        } else {
            tableData.value = []
            total.value = 0
        }
    } catch (e) {
        ElMessage.error('加载列表失败')
    } finally {
        loading.value = false
    }
}

// Search
const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

const handleReset = () => {
  queryParams.title = ''
  queryParams.status = ''
  handleQuery()
}

const handlePageChange = (page) => {
    queryParams.page = page
    loadData()
}

// Publish
const handlePublish = (row) => {
  ElMessageBox.confirm(`确定要发布试卷 "${row.title}" 吗？发布后学生即可参加考试。`, '发布确认', {
    confirmButtonText: '确定发布',
    cancelButtonText: '取消',
    type: 'success'
  }).then(async () => {
      try {
          await publishExamPaper(row.id)
          ElMessage.success('发布成功')
          loadData() // Refresh list
      } catch (e) {
          ElMessage.error('发布失败')
      }
  }).catch(() => {})
}

// End Exam (Placeholder - need API)
const handleEnd = (row) => {
  ElMessage.warning('暂无结束考试接口')
  // ElMessageBox.confirm(...)
}

// Delete (Placeholder - need API)
const handleDelete = (row) => {
  ElMessage.warning('暂无删除试卷接口')
}

onMounted(() => {
    loadData()
})
</script>

<template>
  <div class="app-container">
    <!-- 搜索 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="试卷标题">
          <el-input v-model="queryParams.title" placeholder="关键词" clearable @keyup.enter="handleQuery"/>
        </el-form-item>
        <!-- 暂隐藏状态筛选，除非后端明确支持 status 参数 -->
        <!-- 
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        -->
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-container" shadow="never">
      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="编号" width="80" sortable />
        <el-table-column prop="title" label="试卷标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="duration" label="时长(分)" width="100" align="center" />
        <el-table-column prop="totalScore" label="总分" width="80" align="center" />
        <el-table-column prop="questionCount" label="题数" width="80" align="center" />
        <el-table-column prop="createTime" label="创建时间" width="180" align="center" />
        
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="statusMap[scope.row.status]?.type || 'info'">
              {{ statusMap[scope.row.status]?.label || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <!-- 0: Draft -->
            <template v-if="scope.row.status === 0">
              <el-button link type="success" :icon="VideoPlay" @click="handlePublish(scope.row)">发布</el-button>
              <el-button link type="primary" :icon="Edit" disabled title="编辑功能开发中">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
            
            <!-- 1: Published -->
            <template v-if="scope.row.status === 1">
               <el-button link type="warning" :icon="VideoPause" @click="handleEnd(scope.row)" disabled>结束</el-button>
            </template>

            <!-- 2: Ended -->
            <template v-if="scope.row.status === 2">
              <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" style="margin-top: 20px; text-align: right">
          <el-pagination 
               layout="total, prev, pager, next" 
               :total="total" 
               v-model:current-page="queryParams.page" 
               :page-size="queryParams.size"
               @current-change="handlePageChange"
          />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
</style>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Search, View, Refresh } from '@element-plus/icons-vue'

const router = useRouter()

// 原始模拟数据
const sourceData = [
  { 
    id: 101, 
    title: '计算机网络期中测试', 
    examTime: '2025-11-10 14:00', 
    submitTime: '2025-11-10 15:30', 
    duration: 90, 
    score: 85, 
    totalScore: 100,
    passScore: 60 
  },
  { 
    id: 102, 
    title: 'Java 基础语法测验', 
    examTime: '2025-11-05 09:00', 
    submitTime: '2025-11-05 09:45', 
    duration: 45, 
    score: 58, 
    totalScore: 100,
    passScore: 60 
  },
  { 
    id: 103, 
    title: '马克思主义基本原理', 
    examTime: '2025-10-20 10:00', 
    submitTime: '2025-10-20 11:30', 
    duration: 88, 
    score: 92, 
    totalScore: 100,
    passScore: 60 
  }
]

// 响应式表格数据
const tableData = ref([...sourceData])

const queryParams = reactive({
  title: ''
})

const handleQuery = () => {
  if (!queryParams.title) {
    tableData.value = [...sourceData]
  } else {
    tableData.value = sourceData.filter(item => 
      item.title.toLowerCase().includes(queryParams.title.toLowerCase())
    )
  }
}

const handleReset = () => {
  queryParams.title = ''
  handleQuery()
}

const handleViewDetail = (row) => {
  router.push({
    name: 'ScoreDetail',
    params: { id: row.id },
    query: { title: row.title, score: row.score }
  })
}
</script>

<template>
  <div class="app-container">
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="试卷名称">
          <el-input v-model="queryParams.title" placeholder="请输入试卷名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-container" shadow="never">
      <el-table :data="tableData" border stripe>
        <el-table-column prop="title" label="试卷名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="examTime" label="考试时间" width="160" sortable />
        <el-table-column prop="submitTime" label="交卷时间" width="160" />
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
    </el-card>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
.text-success { color: #67C23A; font-weight: bold; font-size: 16px; }
.text-danger { color: #F56C6C; font-weight: bold; font-size: 16px; }
.total-score { color: #909399; font-size: 12px; }
</style>
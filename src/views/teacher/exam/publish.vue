<script setup>
import { reactive, ref } from 'vue'
import { Search, Edit, Delete, Timer, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 模拟试卷数据
const tableData = ref([
  { id: 201, title: '2024-2025第一学期期末考试', duration: 90, totalScore: 100, status: 'draft', startTime: '', endTime: '' },
  { id: 202, title: 'Java 程序设计月考', duration: 60, totalScore: 100, status: 'published', startTime: '2025-12-01 09:00:00', endTime: '2025-12-01 11:00:00' },
  { id: 203, title: '计算机网络基础测验', duration: 45, totalScore: 100, status: 'ended', startTime: '2025-11-01 14:00:00', endTime: '2025-11-01 16:00:00' },
])

const queryParams = reactive({
  title: '',
  status: ''
})

// 发布弹窗
const publishDialogVisible = ref(false)
const currentExam = ref({})
const publishForm = reactive({
  dateRange: []
})
const publishFormRef = ref(null)

const publishRules = {
  dateRange: [{ required: true, message: '请选择考试起止时间', trigger: 'change' }]
}

// 状态字典
const statusMap = {
  draft: { label: '未发布', type: 'info' },
  published: { label: '进行中', type: 'success' },
  ended: { label: '已结束', type: 'danger' }
}

const statusOptions = [
  { label: '未发布', value: 'draft' },
  { label: '进行中', value: 'published' },
  { label: '已结束', value: 'ended' }
]

// 查询
const handleQuery = () => {
  console.log('Query:', queryParams)
  ElMessage.success('查询成功')
}

const handleReset = () => {
  queryParams.title = ''
  queryParams.status = ''
  handleQuery()
}

// 发布按钮
const handlePublish = (row) => {
  currentExam.value = row
  publishDialogVisible.value = true
  publishForm.dateRange = []
  if (publishFormRef.value) publishFormRef.value.clearValidate()
}

// 确认发布
const submitPublish = async () => {
  if (!publishFormRef.value) return
  await publishFormRef.value.validate((valid) => {
    if (valid) {
      const [start, end] = publishForm.dateRange
      // 更新数据
      const index = tableData.value.findIndex(item => item.id === currentExam.value.id)
      if (index !== -1) {
        tableData.value[index].status = 'published'
        tableData.value[index].startTime = start
        tableData.value[index].endTime = end
      }
      ElMessage.success(`试卷 "${currentExam.value.title}" 发布成功`)
      publishDialogVisible.value = false
    }
  })
}

// 撤回/结束考试
const handleEnd = (row) => {
  ElMessageBox.confirm(`确定要结束试卷 "${row.title}" 的考试吗？结束生将无法再参加。`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    row.status = 'ended'
    ElMessage.success('考试已结束')
  }).catch(() => {})
}

// 删除
const handleDelete = (row) => {
  if (row.status === 'published') {
    ElMessage.warning('进行中的考试无法删除')
    return
  }
  ElMessageBox.confirm('确定删除该试卷吗？', '提示', { type: 'warning' })
    .then(() => {
      tableData.value = tableData.value.filter(item => item.id !== row.id)
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="试卷标题">
          <el-input v-model="queryParams.title" placeholder="关键词" clearable @keyup.enter="handleQuery"/>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-container" shadow="never">
      <el-table :data="tableData" border stripe>
        <el-table-column prop="id" label="编号" width="80" sortable />
        <el-table-column prop="title" label="试卷标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="duration" label="时长(分)" width="100" align="center" />
        <el-table-column prop="totalScore" label="总分" width="80" align="center" />
        <el-table-column label="有效时间" width="320" align="center">
          <template #default="scope">
            <span v-if="scope.row.startTime">
              {{ scope.row.startTime }} ~ {{ scope.row.endTime }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="statusMap[scope.row.status].type">
              {{ statusMap[scope.row.status].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <!-- 未发布状态：可发布、编辑、删除 -->
            <template v-if="scope.row.status === 'draft'">
              <el-button link type="success" :icon="VideoPlay" @click="handlePublish(scope.row)">发布</el-button>
              <el-button link type="primary" :icon="Edit">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
            
            <!-- 进行中状态：可结束 -->
            <template v-if="scope.row.status === 'published'">
               <el-button link type="warning" :icon="VideoPause" @click="handleEnd(scope.row)">结束考试</el-button>
            </template>

            <!-- 已结束状态：可删除、查看详情 -->
            <template v-if="scope.row.status === 'ended'">
              <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 发布弹窗 -->
    <el-dialog v-model="publishDialogVisible" title="发布考试" width="500px">
      <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="100px">
         <div style="margin-bottom: 20px">
           当前试卷：<strong>{{ currentExam.title }}</strong>
         </div>
         <el-form-item label="考试时间" prop="dateRange">
            <el-date-picker
              v-model="publishForm.dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
         </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPublish">确定发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
</style>
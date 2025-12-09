<script setup>
import { reactive, ref, onMounted } from 'vue'
import { Search, Edit, Delete, VideoPlay, VideoPause, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getExamPaperList, publishExamPaper, updateExamPaper, deleteExamPaper, updateExamPaperStatus } from '@/api/examPaper'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  size: 10,
  title: '',
  status: ''
})

// 编辑弹窗数据
const editDialogVisible = ref(false)
const editForm = reactive({
    id: null,
    title: '',
    duration: 90,
    description: ''
})
const editFormRef = ref(null)
const editRules = {
    title: [{ required: true, message: '请输入试卷标题', trigger: 'blur' }],
    duration: [{ required: true, message: '请输入考试时长', trigger: 'blur' }]
}

// 状态字典
// 后端状态: 0=草稿, 1=已发布, 2=已结束
const statusMap = {
  0: { label: '未发布', type: 'info', value: 'draft' },
  1: { label: '进行中', type: 'success', value: 'published' },
  2: { label: '已结束', type: 'danger', value: 'ended' }
}

// 加载列表数据
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
                questionCount: item.questionCount || 0,
                status: item.status !== undefined ? item.status : 1, 
                createTime: item.createTime || '-',
                description: item.description || '' // 确保获取描述字段
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

// 搜索
const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

// 重置搜索
const handleReset = () => {
  queryParams.title = ''
  queryParams.status = ''
  handleQuery()
}

// 翻页
const handlePageChange = (page) => {
    queryParams.page = page
    loadData()
}

// 打开编辑弹窗
const handleEdit = (row) => {
    editForm.id = row.id
    editForm.title = row.title
    editForm.duration = row.duration
    editForm.description = row.description
    editDialogVisible.value = true
}

// 提交修改
const submitEdit = async () => {
    if (!editFormRef.value) return
    await editFormRef.value.validate(async (valid) => {
        if (valid) {
            try {
                await updateExamPaper({
                    id: editForm.id,
                    title: editForm.title,
                    duration: editForm.duration,
                    description: editForm.description
                })
                ElMessage.success('修改成功')
                editDialogVisible.value = false
                loadData()
            } catch (e) {
                ElMessage.error('修改失败')
            }
        }
    })
}

// 发布试卷
const handlePublish = (row) => {
  ElMessageBox.confirm(`确定要发布试卷 "${row.title}" 吗？发布后学生即可参加考试。`, '发布确认', {
    confirmButtonText: '确定发布',
    cancelButtonText: '取消',
    type: 'success'
  }).then(async () => {
      try {
          await publishExamPaper(row.id)
          ElMessage.success('发布成功')
          loadData()
      } catch (e) {
          ElMessage.error('发布失败')
      }
  }).catch(() => {})
}

// End Exam
const handleEnd = (row) => {
  ElMessageBox.confirm(`确定要结束试卷 "${row.title}" 的考试吗？结束生将无法再参加。`, '结束确认', {
    confirmButtonText: '确定结束',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
      try {
          await updateExamPaperStatus(row.id, 2) // 2 = Ended
          ElMessage.success('考试已结束')
          loadData()
      } catch (e) {
          ElMessage.error('操作失败')
      }
  }).catch(() => {})
}

// 删除试卷
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除试卷 "${row.title}" 吗？此操作不可恢复。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
      try {
          await deleteExamPaper(row.id)
          ElMessage.success('删除成功')
          // 如果当前页为空且不是第一页，自动前翻
          if (tableData.value.length === 1 && queryParams.page > 1) {
              queryParams.page--
          }
          loadData()
      } catch (e) {
          ElMessage.error('删除失败')
      }
  }).catch(() => {})
}

onMounted(() => {
    loadData()
})
</script>

<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="试卷标题">
          <el-input v-model="queryParams.title" placeholder="关键词" clearable @keyup.enter="handleQuery"/>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表表格 -->
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
            <!-- 0: 未发布 -->
            <template v-if="scope.row.status === 0">
              <el-button link type="success" :icon="VideoPlay" @click="handlePublish(scope.row)">发布</el-button>
              <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
            
            <!-- 1: 进行中 -->
            <template v-if="scope.row.status === 1">
               <el-button link type="warning" :icon="VideoPause" @click="handleEnd(scope.row)" disabled>结束</el-button>
            </template>

            <!-- 2: 已结束 -->
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

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDialogVisible" title="编辑试卷信息" width="500px">
        <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
            <el-form-item label="试卷标题" prop="title">
                <el-input v-model="editForm.title" />
            </el-form-item>
            <el-form-item label="考试时长" prop="duration">
                <el-input-number v-model="editForm.duration" :min="10" :step="10" /> 分钟
            </el-form-item>
            <el-form-item label="试卷描述" prop="description">
                <el-input 
                   v-model="editForm.description" 
                   type="textarea" 
                   :rows="3"
                   placeholder="请输入试卷简介或考试注意事项"
                />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitEdit">确定修改</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
</style>

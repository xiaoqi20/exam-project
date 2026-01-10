<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Edit, Delete, VideoPlay, VideoPause, Refresh, More } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getExamPaperList, publishExamPaper, updateExamPaper, deleteExamPaper, updateExamPaperStatus } from '@/api/examPaper'
import { getAllClasses } from '@/api/class'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  size: 10,
  title: '',
  status: ''
})

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

// 发布相关
const publishDialogVisible = ref(false)
const classOptions = ref([])
const publishForm = reactive({
    paperId: null,
    paperTitle: '',
    classIds: []
})
const publishRules = {
    classIds: [{ required: true, message: '请选择考试班级', trigger: 'change' }]
}
const publishFormRef = ref(null)

const statusMap = {
  0: { label: '未发布', type: 'info', value: 'draft' },
  1: { label: '进行中', type: 'success', value: 'published' },
  2: { label: '已结束', type: 'danger', value: 'ended' }
}

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
                createTime: (item.createTime || '-').replace('T', ' '),
                description: item.description || '' 
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

// 加载班级列表
const loadClasses = async () => {
    try {
        const res = await getAllClasses()
        if (res) {
            // 兼容返回格式
            classOptions.value = Array.isArray(res) ? res : (res.data || [])
        }
    } catch (e) {
        console.error('加载班级失败', e)
    }
}

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

const handleEdit = (row) => {
    editForm.id = row.id
    editForm.title = row.title
    editForm.duration = row.duration
    editForm.description = row.description
    editDialogVisible.value = true
}

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

const handlePublish = async (row) => {
    publishForm.paperId = row.id
    publishForm.paperTitle = row.title
    publishForm.classIds = [] // 重置选项
    
    // 打开前加载班级数据
    await loadClasses()
    publishDialogVisible.value = true
}

const confirmPublish = async () => {
    console.log('点击了确认发布按钮')
    if (!publishFormRef.value) {
        console.error('错误：表单引用不存在 (publishFormRef is null)')
        return
    }
    
    await publishFormRef.value.validate(async (valid, fields) => {
        if (valid) {
            console.log('表单验证通过', publishForm)
            try {
                if (!publishForm.paperId) {
                    ElMessage.error('错误：试卷ID缺失')
                    console.error('Paper ID is missing')
                    return
                }
                
                console.log('准备发送请求: publishExamPaper', publishForm.paperId, publishForm.classIds)
                
                await publishExamPaper(publishForm.paperId, { 
                    classIds: publishForm.classIds 
                })
                
                console.log('请求发送成功')
                ElMessage.success('发布成功')
                publishDialogVisible.value = false
                loadData()
            } catch (e) {
                console.error('请求发送失败:', e)
                ElMessage.error('发布失败')
            }
        } else {
            console.warn('表单验证失败', fields)
            ElMessage.warning('请检查必填项，确保已选择班级')
        }
    })
}

const handleMonitor = (row) => {
    router.push({
        name: 'ExamMonitor',
        params: { id: row.id },
        query: { title: row.title }
    })
}

const handleEnd = (row) => {
  ElMessageBox.confirm(`确定要结束试卷 "${row.title}" 的考试吗？`, '结束确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
      try {
          await updateExamPaperStatus(row.id, 2) 
          ElMessage.success('考试已结束')
          loadData()
      } catch (e) {
          ElMessage.error('操作失败')
      }
  }).catch(() => {})
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除试卷 "${row.title}" 吗？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
      try {
          await deleteExamPaper(row.id)
          ElMessage.success('删除成功')
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
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="试卷标题">
          <el-input v-model="queryParams.title" placeholder="关键词" clearable @keyup.enter="handleQuery"/>
        </el-form-item>
        <el-form-item class="filter-btns">
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-container" shadow="never">
      <!-- PC Table -->
      <div class="pc-view">
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
                <template v-if="scope.row.status === 0">
                  <el-button link type="success" :icon="VideoPlay" @click="handlePublish(scope.row)">发布</el-button>
                  <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
                  <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
                </template>
                <template v-if="scope.row.status === 1">
                   <el-button link type="primary" :icon="More" @click="handleMonitor(scope.row)">监控</el-button>
                   <el-button link type="warning" :icon="VideoPause" @click="handleEnd(scope.row)">结束</el-button>
                </template>
                <template v-if="scope.row.status === 2">
                  <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
      </div>

      <!-- Mobile List -->
      <div class="mobile-view" v-loading="loading">
          <div v-for="item in tableData" :key="item.id" class="mobile-card">
              <div class="m-header">
                  <span class="m-title">{{ item.title }}</span>
                  <el-tag size="small" :type="statusMap[item.status]?.type || 'info'">
                      {{ statusMap[item.status]?.label }}
                  </el-tag>
              </div>
              <div class="m-body">
                  <div class="m-row">
                      <span>时长: {{ item.duration }}分钟</span>
                      <span>总分: {{ item.totalScore }}</span>
                  </div>
                  <div class="m-row">
                      <span>题数: {{ item.questionCount }}</span>
                      <span class="time">{{ item.createTime }}</span>
                  </div>
              </div>
              <div class="m-footer">
                  <!-- Actions based on status -->
                  <template v-if="item.status === 0">
                      <el-button size="small" type="success" plain @click="handlePublish(item)">发布</el-button>
                      <el-button size="small" type="primary" plain @click="handleEdit(item)">编辑</el-button>
                      <el-button size="small" type="danger" plain @click="handleDelete(item)">删除</el-button>
                  </template>
                  <template v-if="item.status === 1">
                      <el-button size="small" type="warning" plain @click="handleEnd(item)">结束考试</el-button>
                  </template>
                  <template v-if="item.status === 2">
                      <el-button size="small" type="danger" plain @click="handleDelete(item)">删除记录</el-button>
                  </template>
              </div>
          </div>
          <el-empty v-if="!loading && tableData.length === 0" description="暂无试卷" />
      </div>

      <div class="pagination-container">
          <el-pagination 
               layout="prev, pager, next" 
               :total="total" 
               v-model:current-page="queryParams.page" 
               :page-size="queryParams.size"
               @current-change="handlePageChange"
               background
               small
          />
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDialogVisible" title="编辑试卷" width="90%">
        <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="80px" label-position="top">
            <el-form-item label="试卷标题" prop="title">
                <el-input v-model="editForm.title" />
            </el-form-item>
            <el-form-item label="考试时长" prop="duration">
                <el-input-number v-model="editForm.duration" :min="10" :step="10" style="width: 100%"/>
            </el-form-item>
            <el-form-item label="试卷描述" prop="description">
                <el-input 
                   v-model="editForm.description" 
                   type="textarea" 
                   :rows="3"
                />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitEdit">保存</el-button>
        </template>
    </el-dialog>

    <!-- 发布确认弹窗 -->
    <el-dialog v-model="publishDialogVisible" title="发布考试" width="500px">
        <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="80px">
            <el-form-item label="试卷">
                <el-input v-model="publishForm.paperTitle" disabled />
            </el-form-item>
            <el-form-item label="适用班级" prop="classIds">
                <el-select 
                    v-model="publishForm.classIds" 
                    multiple 
                    placeholder="请选择参考班级" 
                    style="width: 100%"
                    collapse-tags
                    collapse-tags-tooltip
                >
                    <el-option
                        v-for="item in classOptions"
                        :key="item.id"
                        :label="item.className"
                        :value="item.id"
                    />
                </el-select>
            </el-form-item>
            <div style="color: #909399; font-size: 12px; margin-left: 80px;">
                <p>注：发布后，仅被选中的班级学生可见。</p>
            </div>
        </el-form>
        <template #footer>
            <el-button @click="publishDialogVisible = false">取消</el-button>
            <el-button type="success" @click="confirmPublish">确认发布</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }

/* Desktop Defaults */
.mobile-view { display: none; }
.pc-view { display: block; }

/* Mobile Optimization */
@media (max-width: 768px) {
    .app-container { padding: 10px; }
    .filter-container { margin-bottom: 10px; }
    
    /* Hide PC */
    .pc-view { display: none; }
    .mobile-view { display: block; }

    /* Form */
    :deep(.el-form-item) {
        margin-right: 0;
        margin-bottom: 10px;
        width: 100%;
    }
    :deep(.el-form-item__content) { width: 100%; }
    .filter-btns { display: flex; gap: 10px; }
    .filter-btns :deep(.el-button) { flex: 1; margin-left: 0 !important; }

    /* Mobile Card */
    .mobile-card {
        background: #fff;
        border: 1px solid #ebeef5;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }
    .m-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    .m-title {
        font-weight: 600;
        font-size: 15px;
        color: #303133;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 70%;
    }
    .m-body {
        font-size: 13px;
        color: #606266;
        margin-bottom: 10px;
    }
    .m-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
    }
    .time { color: #909399; font-size: 12px; }
    
    .m-footer {
        border-top: 1px solid #f0f2f5;
        padding-top: 10px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }
    .m-footer :deep(.el-button) { margin-left: 0; }
}
</style>
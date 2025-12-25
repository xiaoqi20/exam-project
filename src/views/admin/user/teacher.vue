<script setup>
import { reactive, ref, onMounted } from 'vue'
import { Search, Plus, Edit, Delete, Refresh, Key } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTeacherList, addTeacher, updateTeacher, deleteTeacher, getTeacherDetail } from '@/api/teacher'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)

const queryParams = reactive({
  page: 1,
  size: 10,
  name: '',
  teacherId: '', // Mapped to 'id' parameter in API
  dept: ''       // No dept filter in API, but keeping in data for now
})

const form = reactive({
  tid: '', // Corresponds to 'id' in API
  tname: '', // Corresponds to 'name' in API
  dept: '',
  phone: '', 
  pwd: ''
})

const rules = {
  tid: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  tname: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  dept: [{ required: true, message: '请输入学院', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: queryParams.page,
      size: queryParams.size,
      name: queryParams.name || undefined,
      id: queryParams.teacherId || undefined
    }
    const res = await getTeacherList(params)
    if (res && res.records) {
      tableData.value = res.records
      total.value = res.total
    } else {
      tableData.value = []
      total.value = 0
    }
  } catch (e) {
    ElMessage.error('加载教师列表失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

const handleReset = () => {
  queryParams.name = ''
  queryParams.teacherId = ''
  handleQuery()
}

const handlePageChange = (page) => {
  queryParams.page = page
  loadData()
}

const handleAdd = () => {
  dialogTitle.value = '添加教师'
  dialogVisible.value = true
  Object.assign(form, {
    tid: '',
    tname: '',
    dept: '',
    phone: '',
    pwd: ''
  })
  if (formRef.value) formRef.value.clearValidate()
}

const handleEdit = async (row) => {
  dialogTitle.value = '修改教师信息'
  dialogVisible.value = true
  
  Object.assign(form, { 
      tid: '', tname: '', dept: '', phone: '', pwd: '' 
  })
  if (formRef.value) formRef.value.clearValidate()

  try {
      // Use tid for fetching detail
      const id = row.tid 
      const res = await getTeacherDetail(id)
      
      if (res && res.data) {
          const data = res.data
          Object.assign(form, { 
              tid: data.tid,
              tname: data.tname,
              dept: data.dept,
              phone: data.phone, // Assuming backend might return phone/tel
              pwd: '' 
          })
      } else {
          // Fallback to row data
          Object.assign(form, { 
              tid: row.tid,
              tname: row.tname,
              dept: row.dept,
              phone: '', // List doesn't have phone based on your snippet
              pwd: '' 
          })
      }
  } catch (e) {
      ElMessage.warning('获取详情失败，使用列表数据回显')
      Object.assign(form, { 
          tid: row.tid,
          tname: row.tname,
          dept: row.dept,
          pwd: '' 
      })
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogTitle.value === '添加教师') {
             const password = form.pwd || `${form.tid}_123`
             const payload = {
                 id: form.tid,      // Map tid -> id
                 name: form.tname,  // Map tname -> name
                 dept: form.dept,
                 pwd: password
             }
             await addTeacher(payload)
             ElMessage.success(`添加成功，密码: ${password}`)
             dialogVisible.value = false
             loadData()
        } else {
            const payload = {
                id: form.tid,
                name: form.tname,
                dept: form.dept,
                pwd: form.pwd || ''
            }
            await updateTeacher(payload)
            ElMessage.success('修改成功')
            dialogVisible.value = false
            loadData()
        }
      } catch (e) {
        ElMessage.error('操作失败')
      }
    }
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`是否确认删除教师 "${row.tname}"?`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
        await deleteTeacher(row.tid) // Use row.tid
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

// Reset Password
const handleResetPassword = (row) => {
  ElMessageBox.confirm(`确定要重置教师 "${row.tname}" 的密码吗？重置后默认为 工号_123`, '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
      try {
          const newPwd = `${row.tid}_123`
          await updateTeacher({
              id: row.tid, // tid -> id
              pwd: newPwd
          })
          ElMessage.success(`密码已重置为: ${newPwd}`)
      } catch (e) {
          ElMessage.error('重置失败')
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
        <el-form-item label="工号">
          <el-input v-model="queryParams.teacherId" placeholder="精确查找" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="queryParams.name" placeholder="模糊查找" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏与表格 -->
    <el-card class="table-container" shadow="never">
      <div class="table-toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增教师</el-button>
      </div>
      
      <!-- PC View -->
      <div class="hidden-mobile">
          <el-table :data="tableData" border stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="tid" label="工号" width="120" sortable />
            <el-table-column prop="tname" label="姓名" width="120" />
            <el-table-column prop="dept" label="学院" width="180" sortable />
            <el-table-column prop="phone" label="联系电话" width="150" />
            <el-table-column label="操作" min-width="220">
              <template #default="scope">
                <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">修改</el-button>
                <el-button link type="warning" :icon="Key" @click="handleResetPassword(scope.row)">重置密码</el-button>
                <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
      </div>

      <!-- Mobile View: Cards -->
      <div class="visible-mobile">
          <el-empty v-if="!loading && tableData.length === 0" description="暂无数据" />
          <div v-for="item in tableData" :key="item.tid" class="mobile-card">
              <div class="card-header">
                  <span class="name">{{ item.tname }}</span>
                  <el-tag size="small">{{ item.dept }}</el-tag>
              </div>
              <div class="card-body">
                  <p><strong>工号:</strong> {{ item.tid }}</p>
                  <p><strong>电话:</strong> {{ item.phone || '-' }}</p>
              </div>
              <div class="card-footer">
                  <el-button size="small" type="primary" plain @click="handleEdit(item)">修改</el-button>
                  <el-button size="small" type="warning" plain @click="handleResetPassword(item)">重置密码</el-button>
                  <el-button size="small" type="danger" plain @click="handleDelete(item)">删除</el-button>
              </div>
          </div>
      </div>

      <div class="pagination-container" style="margin-top: 20px; text-align: right">
        <el-pagination
          layout="prev, pager, next"
          :total="total"
          v-model:current-page="queryParams.page"
          :page-size="queryParams.size"
          @current-change="handlePageChange"
          background
        />
      </div>
    </el-card>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" style="max-width: 500px;">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="工号" prop="tid">
          <el-input v-model="form.tid" placeholder="请输入工号" :disabled="dialogTitle === '修改教师信息'" />
        </el-form-item>
        <el-form-item label="姓名" prop="tname">
          <el-input v-model="form.tname" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="学院" prop="dept">
          <el-input v-model="form.dept" placeholder="请输入学院" />
        </el-form-item>
        <!-- 密码框 -->
        <el-form-item label="密码" prop="pwd">
          <el-input 
            v-model="form.pwd" 
            :placeholder="dialogTitle === '添加教师' ? '留空默认: 工号_123' : '留空则不修改密码'" 
            show-password 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
}
.filter-container {
  margin-bottom: 20px;
}
.table-toolbar {
  margin-bottom: 15px;
}

/* Responsive Utilities */
.visible-mobile { display: none; }
.hidden-mobile { display: block; }

@media (max-width: 768px) {
    .app-container { padding: 10px; }
    
    .hidden-mobile { display: none; }
    .visible-mobile { display: block; }
    
    /* Filter form */
    :deep(.el-form--inline .el-form-item) {
        display: block;
        margin-right: 0;
        margin-bottom: 15px;
    }
    :deep(.el-form--inline .el-form-item__content),
    :deep(.el-input) {
        width: 100% !important;
    }
    
    /* Mobile Card Style */
    .mobile-card {
        background: #fff;
        border: 1px solid #ebeef5;
        border-radius: 4px;
        margin-bottom: 15px;
        box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
        overflow: hidden;
    }
    .card-header {
        padding: 10px 15px;
        border-bottom: 1px solid #f0f2f5;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #fafafa;
    }
    .card-header .name { font-weight: bold; font-size: 16px; }
    
    .card-body { padding: 15px; }
    .card-body p { margin: 5px 0; font-size: 14px; color: #606266; }
    
    .card-footer {
        padding: 10px 15px;
        border-top: 1px solid #f0f2f5;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap; /* Allow wrap if buttons are too many */
    }
    
    /* Pagination */
    :deep(.el-pagination) {
        justify-content: center;
        flex-wrap: wrap;
    }
}
</style>
<script setup>
import { reactive, ref, onMounted } from 'vue'
import { Search, Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStudentList, addStudent, updateStudent, deleteStudent, getStudentDetail } from '@/api/student'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false) // 新增标志位
const formRef = ref(null)

const queryParams = reactive({
  page: 1,
  size: 10,
  studentId: '',
  class: '',
  name: ''
})

const form = reactive({
  stuId: '',
  sname: '',
  sex: '男',
  className: '',
  phone: '',
  pwd: ''
})

const rules = {
  id: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  sname: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: queryParams.page,
      size: queryParams.size,
      id: queryParams.studentId || undefined,
      name: queryParams.name || undefined
    }
    const res = await getStudentList(params)
    if (res && res.records) {
      tableData.value = res.records
      total.value = res.total
    } else {
      tableData.value = []
      total.value = 0
    }
  } catch (e) {
    ElMessage.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

const handleReset = () => {
  queryParams.studentId = ''
  queryParams.class = ''
  queryParams.name = ''
  handleQuery()
}

const handlePageChange = (page) => {
  queryParams.page = page
  loadData()
}

import { getAllClasses } from '@/api/class'

const classOptions = ref([])

const loadClassOptions = async () => {
    try {
        const res = await getAllClasses()
        // 兼容多种返回结构
        if (Array.isArray(res)) {
            classOptions.value = res
        } else if (res && Array.isArray(res.list)) {
            classOptions.value = res.list
        } else if (res && Array.isArray(res.records)) {
            classOptions.value = res.records
        }
    } catch (e) {
        console.error('加载班级失败', e)
    }
}

// 当选择班级时，同步更新 className
const handleClassChange = (val) => {
    // 兼容 val 可能为 string 或 number 的情况
    const selected = classOptions.value.find(item => (item.id === val || item.classId === val))
    if (selected) {
        form.className = selected.name || selected.className
        form.classId = selected.id || selected.classId
    }
}

onMounted(() => {
  loadData()
  loadClassOptions()
})

const handleAdd = () => {
  dialogTitle.value = '添加学生'
  dialogVisible.value = true
  isEdit.value = false // 明确标记为新增
  Object.assign(form, {
    id: null,
    stuId: null, // 关键：必须置空
    username: '',
    nickname: '',
    password: '',
    classId: null,
    className: '',
    email: '',
    phone: '',
    status: 1
  })
  if (formRef.value) formRef.value.clearValidate()
}

const handleEdit = async (row) => {
  dialogTitle.value = '修改学生信息'
  dialogVisible.value = true
  isEdit.value = true // 明确标记为编辑
  
  Object.assign(form, { 
      stuId: '', sname: '', sex: '男', className: '', phone: '', pwd: '' 
  })
  if (formRef.value) formRef.value.clearValidate()

  try {
      const res = await getStudentDetail(row.stuId || row.id)
      if (res && res.data) {
          const data = res.data
          Object.assign(form, { 
              stuId: data.stuId || data.id,
              sname: data.sname || data.name,
              sex: data.sex,
              classId: data.classId,
              className: data.className || data.clazz,
              phone: data.phone || data.tel,
              pwd: '' 
          })
      } else {
           Object.assign(form, { 
              stuId: row.stuId || row.id,
              sname: row.sname || row.nickname || row.username,
              sex: row.sex || '男',
              classId: row.classId,
              className: row.className,
              phone: row.phone,
              pwd: '' 
          })
      }
  } catch (e) {
      ElMessage.warning('获取详情失败，使用列表数据回显')
      Object.assign(form, { 
          stuId: row.stuId,
          sname: row.sname,
          sex: row.sex,
          className: row.className,
          phone: row.phone,
          pwd: '' 
      })
  }
}

const handleSubmit = async () => {
  await formRef.value.validate()
  try {
    const payload = {
        id: form.id || form.stuId,
        name: form.sname || form.name || form.nickname,
        classId: parseInt(form.classId),
        sex: form.sex,
        tel: form.phone || form.tel,
        email: form.email
    }

    if (isEdit.value) {
      await updateStudent(payload)
      ElMessage.success('修改成功')
    } else {
      await addStudent(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`是否确认删除学生 "${row.sname || row.name}"?`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
        await deleteStudent(row.stuId || row.id)
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
        <el-form-item label="学号">
          <el-input v-model="queryParams.studentId" placeholder="精确查找" clearable @keyup.enter="handleQuery" />
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

    <el-card class="table-container" shadow="never">
      <div class="table-toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增学生</el-button>
      </div>
      
      <!-- PC View: Table -->
      <div class="hidden-mobile">
          <el-table :data="tableData" border stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="stuId" label="学号" width="150" sortable />
            <el-table-column prop="sname" label="姓名" width="120" />
            <el-table-column prop="sex" label="性别" width="80" align="center" />
            <el-table-column prop="className" label="班级" width="150" align="center" />
            <el-table-column prop="phone" label="手机号" width="120" align="center" />
            <el-table-column label="操作" min-width="150">
              <template #default="scope">
                <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">修改</el-button>
                <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
      </div>

      <!-- Mobile View: Cards -->
      <div class="visible-mobile">
          <el-empty v-if="!loading && tableData.length === 0" description="暂无数据" />
          <div v-for="item in tableData" :key="item.stuId || item.id" class="mobile-card">
              <div class="card-header">
                  <span class="name">{{ item.sname || item.name }}</span>
                  <el-tag size="small" :type="item.sex === '男' ? '' : 'danger'">{{ item.sex }}</el-tag>
              </div>
              <div class="card-body">
                  <p><strong>学号:</strong> {{ item.stuId || item.id }}</p>
                  <p><strong>班级:</strong> {{ item.className || item.clazz }}</p>
                  <p><strong>电话:</strong> {{ item.phone || item.tel || '-' }}</p>
              </div>
              <div class="card-footer">
                  <el-button size="small" type="primary" plain @click="handleEdit(item)">修改</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" style="max-width: 500px;">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="学号" prop="id">
          <el-input v-model="form.id" placeholder="请输入学号 (如: 2024001)" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名" prop="sname">
          <el-input v-model="form.sname" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="pwd">
          <el-input 
            v-model="form.pwd" 
            :placeholder="dialogTitle === '添加学生' ? '留空默认: 学号_123' : '留空则不修改密码'" 
            show-password 
          />
        </el-form-item>
        <el-form-item label="性别" prop="sex">
          <el-radio-group v-model="form.sex">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="所属班级" prop="classId">
          <el-select 
            v-model="form.classId" 
            placeholder="请选择班级" 
            style="width: 100%"
            @change="handleClassChange"
          >
            <el-option
              v-for="item in classOptions"
              :key="item.id || item.classId"
              :label="item.name || item.className"
              :value="item.id || item.classId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="11" />
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
    
    /* Filter form responsiveness */
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
    }
    
    /* Pagination adjust */
    :deep(.el-pagination) {
        justify-content: center;
        flex-wrap: wrap;
    }
}
</style>
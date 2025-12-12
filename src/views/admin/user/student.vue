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
  stuId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  sname: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  className: [{ required: true, message: '请输入班级', trigger: 'blur' }]
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

const handleAdd = () => {
  dialogTitle.value = '添加学生'
  dialogVisible.value = true
  Object.assign(form, {
    stuId: '',
    sname: '',
    sex: '男',
    className: '',
    phone: '',
    pwd: ''
  })
  if (formRef.value) formRef.value.clearValidate()
}

const handleEdit = async (row) => {
  dialogTitle.value = '修改学生信息'
  dialogVisible.value = true
  
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
              className: data.className || data.clazz,
              phone: data.phone || data.tel,
              pwd: '' 
          })
      } else {
           Object.assign(form, { 
              stuId: row.stuId,
              sname: row.sname,
              sex: row.sex,
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
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogTitle.value === '添加学生') {
             const password = form.pwd || `${form.stuId}_123`
             const payload = {
                 id: form.stuId,
                 name: form.sname,
                 clazz: form.className,
                 tel: form.phone,
                 pwd: password,
                 sex: form.sex
             }
             await addStudent(payload)
             ElMessage.success(`添加成功，密码: ${password}`)
             dialogVisible.value = false
             loadData()
        } else {
            const payload = {
                id: form.stuId,
                name: form.sname,
                clazz: form.className,
                tel: form.phone,
                pwd: form.pwd || '', 
                sex: form.sex
            }
            await updateStudent(payload)
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
      
      <el-table :data="tableData" border stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="stuId" label="学号" width="150" sortable />
        <el-table-column prop="sname" label="姓名" width="120" />
        <el-table-column prop="sex" label="性别" width="80" align="center" />
        <el-table-column prop="className" label="班级" width="150" sortable />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column label="操作" min-width="150">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">修改</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="学号" prop="stuId">
          <el-input v-model="form.stuId" placeholder="请输入学号" :disabled="dialogTitle === '修改学生信息'" />
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
        <el-form-item label="班级" prop="className">
          <el-input v-model="form.className" placeholder="请输入班级" />
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
</style>
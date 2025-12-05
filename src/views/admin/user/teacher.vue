<script setup>
import { reactive, ref } from 'vue'
import { Search, Plus, Edit, Delete, Refresh, Key } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 模拟数据
const tableData = ref([
  { id: 1, teacherId: 'T001', name: '张教授', college: '计算机学院', phone: '13900139001' },
  { id: 2, teacherId: 'T002', name: '李副教授', college: '软件学院', phone: '13900139002' },
  { id: 3, teacherId: 'T003', name: '王讲师', college: '数学学院', phone: '13900139003' },
  { id: 4, teacherId: 'T004', name: '赵助教', college: '计算机学院', phone: '13900139004' },
])

const queryParams = reactive({
  name: '',
  college: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)

const form = reactive({
  id: null,
  teacherId: '',
  name: '',
  college: '',
  phone: ''
})

const rules = {
  teacherId: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  college: [{ required: true, message: '请输入学院', trigger: 'blur' }]
}

// 查询操作
const handleQuery = () => {
  console.log('Query with:', queryParams)
  ElMessage.success('查询成功（模拟）')
}

// 重置查询
const handleReset = () => {
  queryParams.name = ''
  queryParams.college = ''
  handleQuery()
}

// 新增按钮
const handleAdd = () => {
  dialogTitle.value = '添加教师'
  dialogVisible.value = true
  Object.assign(form, {
    id: null,
    teacherId: '',
    name: '',
    college: '',
    phone: ''
  })
  if (formRef.value) formRef.value.clearValidate()
}

// 编辑按钮
const handleEdit = (row) => {
  dialogTitle.value = '修改教师信息'
  dialogVisible.value = true
  Object.assign(form, { ...row })
  if (formRef.value) formRef.value.clearValidate()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      if (form.id) {
        const index = tableData.value.findIndex(item => item.id === form.id)
        if (index !== -1) tableData.value[index] = { ...form }
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...tableData.value.map(item => item.id)) + 1
        tableData.value.push({ ...form, id: newId })
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
    }
  })
}

// 删除按钮
const handleDelete = (row) => {
  ElMessageBox.confirm(`是否确认删除教师 "${row.name}"?`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    tableData.value = tableData.value.filter(item => item.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

// 重置密码
const handleResetPassword = (row) => {
  ElMessageBox.confirm(`确定要重置教师 "${row.name}" 的密码吗？重置后默认为 123456`, '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    // TODO: Call API
    ElMessage.success(`教师 ${row.name} 密码已重置`)
  }).catch(() => {})
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="姓名">
          <el-input v-model="queryParams.name" placeholder="请输入姓名" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="学院">
          <el-input v-model="queryParams.college" placeholder="请输入学院" clearable @keyup.enter="handleQuery" />
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
      
      <el-table :data="tableData" border stripe style="width: 100%">
        <el-table-column prop="teacherId" label="工号" width="120" sortable />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="college" label="学院" width="180" sortable />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column label="操作" min-width="220">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">修改</el-button>
            <el-button link type="warning" :icon="Key" @click="handleResetPassword(scope.row)">重置密码</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="工号" prop="teacherId">
          <el-input v-model="form.teacherId" placeholder="请输入工号" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="学院" prop="college">
          <el-input v-model="form.college" placeholder="请输入学院" />
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
<script setup>
import { reactive, ref } from 'vue'
import { Search, Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 模拟数据
const tableData = ref([
  { id: 1, studentId: '2021001', name: '张三', gender: '男', class: '计算机2101', phone: '13800138001' },
  { id: 2, studentId: '2021002', name: '李四', gender: '女', class: '计算机2101', phone: '13800138002' },
  { id: 3, studentId: '2021003', name: '王五', gender: '男', class: '软件2102', phone: '13800138003' },
  { id: 4, studentId: '2021004', name: '赵六', gender: '女', class: '软件2102', phone: '13800138004' },
  { id: 5, studentId: '2021005', name: '钱七', gender: '男', class: '网络2103', phone: '13800138005' },
])

const queryParams = reactive({
  studentId: '',
  class: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)

const form = reactive({
  id: null,
  studentId: '',
  name: '',
  gender: '男',
  class: '',
  phone: ''
})

const rules = {
  studentId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  class: [{ required: true, message: '请输入班级', trigger: 'blur' }]
}

// 查询操作
const handleQuery = () => {
  console.log('Query with:', queryParams)
  ElMessage.success('查询成功（模拟）')
  // TODO: 调用后端接口查询
}

// 重置查询
const handleReset = () => {
  queryParams.studentId = ''
  queryParams.class = ''
  handleQuery()
}

// 新增按钮
const handleAdd = () => {
  dialogTitle.value = '添加学生'
  dialogVisible.value = true
  Object.assign(form, {
    id: null,
    studentId: '',
    name: '',
    gender: '男',
    class: '',
    phone: ''
  })
  // 清除之前的校验结果
  if (formRef.value) formRef.value.clearValidate()
}

// 编辑按钮
const handleEdit = (row) => {
  dialogTitle.value = '修改学生信息'
  dialogVisible.value = true
  // 深拷贝数据到表单
  Object.assign(form, { ...row })
  if (formRef.value) formRef.value.clearValidate()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      if (form.id) {
        // 编辑逻辑
        const index = tableData.value.findIndex(item => item.id === form.id)
        if (index !== -1) {
          tableData.value[index] = { ...form }
        }
        ElMessage.success('修改成功')
      } else {
        // 新增逻辑
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
  ElMessageBox.confirm(`是否确认删除学生 "${row.name}" (学号: ${row.studentId})?`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    tableData.value = tableData.value.filter(item => item.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="学号">
          <el-input v-model="queryParams.studentId" placeholder="请输入学号" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="班级">
          <el-input v-model="queryParams.class" placeholder="请输入班级" clearable @keyup.enter="handleQuery" />
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
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增学生</el-button>
      </div>
      
      <el-table :data="tableData" border stripe style="width: 100%">
        <el-table-column prop="studentId" label="学号" width="120" sortable />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column prop="class" label="班级" width="150" sortable />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column label="操作" min-width="150">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">修改</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="学号" prop="studentId">
          <el-input v-model="form.studentId" placeholder="请输入学号" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="班级" prop="class">
          <el-input v-model="form.class" placeholder="请输入班级" />
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
<template>
  <div class="app-container">
    <!-- Filter Section -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="班级名称">
          <el-input v-model="queryParams.name" placeholder="请输入班级名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Toolbar -->
    <div class="table-toolbar">
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增班级</el-button>
    </div>

    <!-- PC View: Table -->
    <div class="pc-view">
        <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="className" label="班级名称" min-width="150" align="center" />
          <el-table-column prop="major" label="专业" width="120" align="center" />
          <el-table-column prop="grade" label="年级" width="100" align="center" />
          <el-table-column prop="studentCount" label="学生人数" width="100" align="center">
            <template #default="scope">
                <el-tag type="info">{{ scope.row.studentCount || 0 }} 人</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180" align="center" />
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="scope">
              <el-button size="small" type="primary" :icon="Edit" link @click="handleEdit(scope.row)">编辑</el-button>
              <el-button size="small" type="danger" :icon="Delete" link @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
    </div>

    <!-- Mobile View: Cards -->
    <div class="mobile-view">
        <div v-for="item in tableData" :key="item.id" class="mobile-card">
            <div class="m-card-header">
                <span class="m-title">{{ item.className }}</span>
                <el-tag size="small">{{ item.studentCount || 0 }}人</el-tag>
            </div>
            <div class="m-card-body">
                <p><span>专业：</span>{{ item.major || '-' }}</p>
                <p><span>年级：</span>{{ item.grade || '-' }}</p>
                <p><span>创建时间：</span>{{ item.createTime }}</p>
            </div>
            <div class="m-card-footer">
                <el-button size="small" type="primary" @click="handleEdit(item)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDelete(item)">删除</el-button>
            </div>
        </div>
    </div>

    <!-- Pagination -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.size"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="loadData"
        @current-change="loadData"
        small
      />
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="450px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="班级名称" prop="className">
          <el-input v-model="form.className" placeholder="请输入班级名称" />
        </el-form-item>
        <el-form-item label="专业" prop="major">
          <el-input v-model="form.major" placeholder="请输入专业" />
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-input v-model="form.grade" placeholder="请输入年级 (如: 2025级)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getClassList, addClass, updateClass, deleteClass } from '@/api/class'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)

const queryParams = reactive({
  page: 1,
  size: 10,
  className: ''
})

const form = reactive({
  id: null,
  className: '',
  major: '',
  grade: '',
  teacherId: ''
})

const rules = {
  className: [{ required: true, message: '请输入班级名称', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getClassList(queryParams)
    if (res) {
        tableData.value = res.records
        total.value = res.total
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

const handleReset = () => {
  queryParams.className = ''
  handleQuery()
}

const handleAdd = () => {
  dialogTitle.value = '新增班级'
  dialogVisible.value = true
  Object.assign(form, {
    id: null,
    className: '',
    major: '',
    grade: '',
    teacherId: ''
  })
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑班级'
  dialogVisible.value = true
  Object.assign(form, {
      id: row.id,
      className: row.className,
      major: row.major,
      grade: row.grade,
      teacherId: row.teacherId
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除班级【${row.name}】吗？`, '警告', {
    type: 'warning'
  }).then(async () => {
    await deleteClass(row.id)
    ElMessage.success('删除成功')
    loadData()
  })
}

const handleSubmit = async () => {
  await formRef.value.validate()
  try {
    if (form.id) {
      await updateClass(form)
      ElMessage.success('修改成功')
    } else {
      await addClass(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
.table-toolbar { margin-bottom: 15px; }
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }

/* Mobile View Styles */
.mobile-view { display: none; }
.pc-view { display: block; }

@media (max-width: 768px) {
    .pc-view { display: none; }
    .mobile-view { display: block; }
    .app-container { padding: 10px; }
    
    .mobile-card {
        background: #fff;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
    }
    .m-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 10px;
    }
    .m-title { font-weight: bold; color: #303133; }
    .m-card-body p { margin: 5px 0; font-size: 14px; color: #606266; }
    .m-card-footer {
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px solid #f0f0f0;
        text-align: right;
    }
}
</style>

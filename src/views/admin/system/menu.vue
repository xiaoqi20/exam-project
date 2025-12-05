<script setup>
import { ref, reactive, computed } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { Plus, Edit, Delete, QuestionFilled } from '@element-plus/icons-vue'
import * as Icons from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const menuStore = useMenuStore()

// 当前选中的角色 Tab
const activeRole = ref('admin')

// 角色选项
const roleOptions = [
  { label: '管理员 (Admin)', value: 'admin' },
  { label: '教师 (Teacher)', value: 'teacher' },
  { label: '学生 (Student)', value: 'student' }
]

// 获取当前角色的菜单数据
const tableData = computed(() => {
  return menuStore.getMenusByRole(activeRole.value)
})

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)

// 常用图标列表供选择
const iconList = [
  'User', 'Setting', 'Document', 'Edit', 'DataAnalysis', 'ChatDotRound', 
  'Monitor', 'Trophy', 'Avatar', 'HomeFilled', 'Menu', 'Star', 'Goods'
]

// 表单数据
const form = reactive({
  id: null,
  parentId: null,
  title: '',
  path: '',
  icon: ''
})

const rules = {
  title: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入路由路径', trigger: 'blur' }]
}

// 动态获取图标组件（用于列表显示）
const getIcon = (name) => {
  if (!name || !Icons[name]) return null
  return Icons[name]
}

// 切换 Tab
const handleTabChange = () => {
  // 这里的 tableData 是 computed，自动更新，无需手动操作
}

// 新增菜单 (parentId 为 null 表示顶级，否则为子菜单)
const handleAdd = (parentId = null) => {
  dialogTitle.value = parentId ? '新增子菜单' : '新增顶级菜单'
  dialogVisible.value = true
  
  // 重置表单
  Object.assign(form, {
    id: null,
    parentId: parentId,
    title: '',
    path: '',
    icon: ''
  })
  
  if (formRef.value) formRef.value.clearValidate()
}

// 编辑菜单
const handleEdit = (row) => {
  dialogTitle.value = '编辑菜单'
  dialogVisible.value = true
  
  // 回显数据
  Object.assign(form, {
    id: row.id,
    // 注意：这里简化了逻辑，实际编辑时通常不需要改 parentId，或者需要树形选择器
    // 我们这里假设编辑不改变层级结构
    parentId: null, 
    title: row.title,
    path: row.path,
    icon: row.icon
  })
  
  if (formRef.value) formRef.value.clearValidate()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      if (form.id) {
        // 编辑模式
        menuStore.updateMenu(activeRole.value, { ...form })
        ElMessage.success('更新成功')
      } else {
        // 新增模式
        menuStore.addMenu(activeRole.value, form.parentId, { ...form })
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
    }
  })
}

// 删除菜单
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除菜单 "${row.title}" 吗？如有子菜单也将一并删除。`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    menuStore.deleteMenu(activeRole.value, row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}
</script>

<template>
  <div class="app-container">
    <!-- 角色切换 -->
    <el-tabs v-model="activeRole" type="card" @tab-change="handleTabChange" class="role-tabs">
      <el-tab-pane v-for="role in roleOptions" :key="role.value" :label="role.label" :name="role.value" />
    </el-tabs>

    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="handleAdd(null)">新增顶级菜单</el-button>
      <el-alert title="注意：修改菜单后侧边栏会实时更新。" type="info" show-icon :closable="false" style="margin-left: 20px; display: inline-flex; width: auto;" />
    </div>

    <!-- 菜单表格 -->
    <el-table
      :data="tableData"
      style="width: 100%; margin-top: 20px;"
      row-key="id"
      border
      default-expand-all
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
    >
      <el-table-column prop="title" label="菜单名称" width="200" />
      
      <el-table-column label="图标" width="80" align="center">
        <template #default="scope">
          <el-icon v-if="scope.row.icon && getIcon(scope.row.icon)" :size="18">
            <component :is="getIcon(scope.row.icon)" />
          </el-icon>
        </template>
      </el-table-column>
      
      <el-table-column prop="path" label="路由路径" min-width="200" />
      
      <el-table-column label="操作" width="250" align="center">
        <template #default="scope">
          <el-button link type="primary" :icon="Plus" @click="handleAdd(scope.row.id)">新增子项</el-button>
          <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑/新增弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="菜单名称" prop="title">
          <el-input v-model="form.title" placeholder="例如：用户管理" />
        </el-form-item>
        
        <el-form-item label="路由路径" prop="path">
          <el-input v-model="form.path" placeholder="例如：/dashboard/admin/user" />
        </el-form-item>
        
        <el-form-item label="图标" prop="icon">
          <el-select v-model="form.icon" placeholder="请选择图标" clearable style="width: 100%">
            <el-option v-for="iconName in iconList" :key="iconName" :label="iconName" :value="iconName">
              <span style="float: left">
                 <el-icon style="vertical-align: middle; margin-right: 5px">
                   <component :is="getIcon(iconName)" />
                 </el-icon>
                 {{ iconName }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.toolbar { display: flex; align-items: center; }
</style>
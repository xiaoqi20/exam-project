<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Delete, Setting } from '@element-plus/icons-vue'

// 模拟角色数据
const tableData = ref([
  { id: 1, key: 'admin', name: '管理员', description: '系统超级管理员，拥有所有权限' },
  { id: 2, key: 'teacher', name: '教师', description: '负责题库管理、组卷、发布考试及阅卷' },
  { id: 3, key: 'student', name: '学生', description: '参加考试、查询成绩' }
])

const dialogVisible = ref(false)
const currentRole = ref({})
const menuTree = ref([])
const defaultCheckedKeys = ref([])

// 模拟菜单树数据 (简化版，实际应从 MenuStore 或 API 获取)
const allMenus = [
  {
    id: 1,
    label: '用户管理',
    children: [
      { id: 11, label: '学生信息管理' },
      { id: 12, label: '教师信息管理' }
    ]
  },
  {
    id: 2,
    label: '系统设置',
    children: [
      { id: 21, label: '菜单管理' },
      { id: 22, label: '角色权限' }
    ]
  },
  {
    id: 3,
    label: '题库管理',
    children: [
      { id: 31, label: '试题列表' }
    ]
  },
  {
    id: 4,
    label: '试卷管理',
    children: [
      { id: 41, label: '创建试卷' },
      { id: 42, label: '试卷发布' }
    ]
  },
  {
    id: 5,
    label: '成绩统计',
    children: [
      { id: 51, label: '成绩报表' }
    ]
  },
  {
    id: 6,
    label: '答疑管理',
    children: [
      { id: 61, label: '学生反馈' }
    ]
  },
  {
    id: 7,
    label: '在线考试',
    children: [
      { id: 71, label: '考试大厅' }
    ]
  },
  {
    id: 8,
    label: '我的成绩',
    children: [
      { id: 81, label: '历史记录' }
    ]
  },
  {
    id: 9,
    label: '个人信息',
    children: [
      { id: 91, label: '修改资料' }
    ]
  }
]

const treeRef = ref(null)

const handleEditPermission = (row) => {
  currentRole.value = row
  dialogVisible.value = true
  
  // 模拟回显权限
  // 这里简单根据角色 key 来预设一些选中的 ID
  menuTree.value = allMenus
  
  let checkedIds = []
  if (row.key === 'admin') {
    checkedIds = [11, 12, 21, 22]
  } else if (row.key === 'teacher') {
    checkedIds = [31, 41, 42, 51, 61]
  } else if (row.key === 'student') {
    checkedIds = [71, 81, 91]
  }
  
  defaultCheckedKeys.value = checkedIds
  
  // 延迟设置选中状态，等待 Tree 组件渲染
  setTimeout(() => {
    if (treeRef.value) {
      treeRef.value.setCheckedKeys(checkedIds)
    }
  }, 0)
}

const handleSubmit = () => {
  const checkedKeys = treeRef.value.getCheckedKeys()
  const halfCheckedKeys = treeRef.value.getHalfCheckedKeys()
  const finalKeys = [...checkedKeys, ...halfCheckedKeys]
  
  console.log(`Role [${currentRole.value.key}] updated permissions:`, finalKeys)
  ElMessage.success('权限配置保存成功 (模拟)')
  dialogVisible.value = false
}

const handleDelete = (row) => {
  ElMessage.warning('系统内置角色无法删除')
}
</script>

<template>
  <div class="app-container">
    <el-alert 
      title="角色权限说明：当前系统使用基于角色的静态路由权限控制。此处仅演示权限分配 UI，实际生效需对接后端动态路由。" 
      type="info" 
      show-icon 
      :closable="false" 
      class="mb-20"
    />
    
    <el-card shadow="never">
      <div class="toolbar mb-20">
        <el-button type="primary" :icon="Edit">新增角色</el-button>
      </div>
      
      <el-table :data="tableData" border stripe>
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="key" label="权限字符" width="150" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="250" align="center">
          <template #default="scope">
            <el-button link type="primary" :icon="Setting" @click="handleEditPermission(scope.row)">权限配置</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 权限配置弹窗 -->
    <el-dialog v-model="dialogVisible" :title="'配置权限 - ' + currentRole.name" width="500px">
      <el-tree
        ref="treeRef"
        :data="menuTree"
        show-checkbox
        node-key="id"
        :default-expand-all="true"
        :default-checked-keys="defaultCheckedKeys"
        :props="{ children: 'children', label: 'label' }"
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.mb-20 { margin-bottom: 20px; }
</style>
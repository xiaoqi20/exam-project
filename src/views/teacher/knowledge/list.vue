<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Folder, Document } from '@element-plus/icons-vue'
import { getKnowledgeTree, addKnowledge, updateKnowledge, deleteKnowledge } from '@/api/knowledge'

const treeData = ref([])
const loading = ref(false)
const filterText = ref('')
const treeRef = ref(null)

// Current Selection
const currentNode = ref(null)

// Dialog
const dialogVisible = ref(false)
const dialogType = ref('add') // 'add' | 'edit' | 'add_root'
const formRef = ref(null)
const formData = reactive({
  id: null,
  parentId: 0,
  name: ''
})
const rules = {
  name: [{ required: true, message: '请输入知识点名称', trigger: 'blur' }]
}

// 1. Load Tree
const loadTree = async () => {
  loading.value = true
  try {
    const res = await getKnowledgeTree()
    // Backend should return nested list. If flat, we need to convert.
    // Assuming nested for now based on previous discussions.
    // If res is array, use it. If wrapped in code/data, extract it.
    treeData.value = Array.isArray(res) ? res : (res.data || [])
  } catch (e) {
    console.error(e)
    ElMessage.error('加载知识点失败')
  } finally {
    loading.value = false
  }
}

// Filter
const filterNode = (value, data) => {
  if (!value) return true
  return data.name.includes(value)
}

// Handle Node Click
const handleNodeClick = (data) => {
  currentNode.value = data
}

// 2. Operations
const handleAddRoot = () => {
  dialogType.value = 'add_root'
  formData.id = null
  formData.parentId = 0
  formData.name = ''
  dialogVisible.value = true
}

const handleAddChild = () => {
  if (!currentNode.value) {
    ElMessage.warning('请先选择一个父节点')
    return
  }
  dialogType.value = 'add'
  formData.id = null
  formData.parentId = currentNode.value.id
  formData.name = ''
  dialogVisible.value = true
}

const handleEdit = () => {
  if (!currentNode.value) {
    ElMessage.warning('请先选择要修改的节点')
    return
  }
  dialogType.value = 'edit'
  formData.id = currentNode.value.id
  formData.parentId = currentNode.value.parentId // Keep parent
  formData.name = currentNode.value.name
  dialogVisible.value = true
}

const handleDelete = async () => {
  if (!currentNode.value) return
  
  // Check if has children (frontend check, backend should also check)
  if (currentNode.value.children && currentNode.value.children.length > 0) {
    ElMessage.warning('请先删除该节点下的子节点')
    return
  }

  try {
    await ElMessageBox.confirm(`确定删除“${currentNode.value.name}”吗？`, '警告', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    
    await deleteKnowledge(currentNode.value.id)
    ElMessage.success('删除成功')
    loadTree() // Reload
    currentNode.value = null
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

// Submit Form
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogType.value === 'edit') {
           await updateKnowledge({
             id: formData.id,
             name: formData.name
           })
        } else {
           // Add Root or Child
           await addKnowledge({
             parentId: formData.parentId,
             name: formData.name
           })
        }
        ElMessage.success('操作成功')
        dialogVisible.value = false
        loadTree()
      } catch (e) {
        ElMessage.error('操作失败')
      }
    }
  })
}

onMounted(() => {
  loadTree()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>知识点管理</span>
        </div>
      </template>
      
      <!-- Toolbar -->
      <div class="toolbar">
        <el-input 
          v-model="filterText" 
          placeholder="搜索知识点..." 
          style="width: 200px; margin-right: 15px;"
          prefix-icon="Search"
          clearable
        />
        <el-button type="primary" :icon="Plus" @click="handleAddRoot">新增根节点</el-button>
        <el-button type="success" :icon="Plus" @click="handleAddChild" :disabled="!currentNode">新增子节点</el-button>
        <el-button type="warning" :icon="Edit" @click="handleEdit" :disabled="!currentNode">修改</el-button>
        <el-button type="danger" :icon="Delete" @click="handleDelete" :disabled="!currentNode">删除</el-button>
      </div>

      <!-- Tree -->
      <div class="tree-container" v-loading="loading">
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="{ children: 'children', label: 'name' }"
          node-key="id"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          :filter-node-method="filterNode"
          @node-click="handleNodeClick"
        >
           <template #default="{ node, data }">
              <span class="custom-tree-node">
                <el-icon v-if="data.children && data.children.length > 0"><Folder /></el-icon>
                <el-icon v-else><Document /></el-icon>
                <span class="node-label">{{ node.label }}</span>
              </span>
           </template>
        </el-tree>
      </div>
    </el-card>

    <!-- Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'edit' ? '修改知识点' : (dialogType === 'add_root' ? '新增根节点' : '新增子节点')"
      width="400px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="父节点" v-if="dialogType === 'add'">
           <el-tag>{{ currentNode?.name }}</el-tag>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入知识点名称" />
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
.app-container { padding: 20px; }
.toolbar { margin-bottom: 20px; display: flex; align-items: center; }
.tree-container { 
    border: 1px solid #ebeef5; 
    border-radius: 4px; 
    padding: 10px; 
    min-height: 400px; 
    max-height: 70vh; 
    overflow-y: auto; 
}
.custom-tree-node {
    display: flex;
    align-items: center;
    font-size: 14px;
}
.custom-tree-node .el-icon { margin-right: 6px; color: #909399; }
.node-label { margin-left: 4px; }
</style>
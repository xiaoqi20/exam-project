<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { Search, Plus, Edit, Delete, Refresh, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as pdfjsLib from 'pdfjs-dist'
import { getQuestionList, addQuestion, updateQuestion, deleteQuestion } from '@/api/question'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

const tableData = ref([])
const total = ref(0)
const loading = ref(false)
const fileInputRef = ref(null)
const isImporting = ref(false)

const queryParams = reactive({
  page: 1,
  size: 10,
  content: '',
  type: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)

// 表单数据
const form = reactive({
  id: null,
  type: 'choice',
  content: '',
  score: 2,
  options: [
    { key: 'A', value: '' },
    { key: 'B', value: '' },
    { key: 'C', value: '' },
    { key: 'D', value: '' }
  ],
  answer: '', 
  answerArr: []
})

const rules = {
  type: [{ required: true, message: '请选择题型', trigger: 'change' }],
  content: [{ required: true, message: '请输入题目内容', trigger: 'blur' }],
  score: [{ required: true, message: '请输入分值', trigger: 'blur' }],
}

const typeOptions = [
  { label: '单选题', value: 'choice' },
  { label: '多选题', value: 'multiple_choice' },
  { label: '判断题', value: 'true_false' }
]

const formatOptions = (row) => {
  if (row.type === 'true_false') return '-'
  try {
    const opts = typeof row.options === 'string' ? JSON.parse(row.options) : row.options
    if (!opts) return '-'
    return Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join('; ')
  } catch (e) {
    return row.options || '-'
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getQuestionList(queryParams)
    if (res && res.records) {
        tableData.value = res.records
        total.value = res.total
    } else {
        tableData.value = []
        total.value = 0
    }
  } catch (error) {
    console.error('Failed to load questions:', error)
    ElMessage.error('加载试题失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

const handleReset = () => {
  queryParams.content = ''
  queryParams.type = ''
  handleQuery()
}

const handlePageChange = (page) => {
    queryParams.page = page
    loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '添加试题'
  dialogVisible.value = true
  Object.assign(form, {
    id: null,
    type: 'choice',
    content: '',
    score: 2,
    options: [
      { key: 'A', value: '' },
      { key: 'B', value: '' },
      { key: 'C', value: '' },
      { key: 'D', value: '' }
    ],
    answer: '',
    answerArr: []
  })
  if (formRef.value) formRef.value.clearValidate()
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑试题'
  dialogVisible.value = true
  
  let parsedOptions = [
    { key: 'A', value: '' },
    { key: 'B', value: '' },
    { key: 'C', value: '' },
    { key: 'D', value: '' }
  ]
  
  if ((row.type === 'choice' || row.type === 'multiple_choice') && row.options) {
    try {
      const opts = typeof row.options === 'string' ? JSON.parse(row.options) : row.options
      parsedOptions = Object.keys(opts).map(k => ({ key: k, value: opts[k] }))
    } catch (e) {
      console.error(e)
    }
  }

  let initialAnswerArr = []
  if (row.type === 'multiple_choice' && row.answer) {
      initialAnswerArr = row.answer.split('')
  }

  Object.assign(form, {
    ...row,
    options: parsedOptions,
    answerArr: initialAnswerArr
  })
  
  if (formRef.value) formRef.value.clearValidate()
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该试题吗？', '提示', { type: 'warning' })
    .then(async () => {
      await deleteQuestion(row.id)
      ElMessage.success('删除成功')
      loadData()
    })
    .catch(() => {}) // No-op on cancel
}

// 动态选项操作
const addOption = () => {
    const keys = ['A','B','C','D','E','F','G','H','I','J']
    const nextIdx = form.options.length
    if (nextIdx >= keys.length) return
    form.options.push({ key: keys[nextIdx], value: '' })
}

const removeOption = (index) => {
    if (form.options.length <= 2) return
    form.options.splice(index, 1)
    const keys = ['A','B','C','D','E','F','G','H','I','J']
    form.options.forEach((opt, idx) => { opt.key = keys[idx] })
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    let answerValid = true
    if (form.type === 'choice' || form.type === 'true_false') {
        if (!form.answer) answerValid = false
    } else if (form.type === 'multiple_choice') {
        if (!form.answerArr || form.answerArr.length === 0) answerValid = false
    }
    
    if (!answerValid) {
        ElMessage.error('请设置正确答案')
        return
    }

    if (valid) {
      let finalAnswer = form.answer
      if (form.type === 'multiple_choice') {
          finalAnswer = form.answerArr.sort().join('')
      }

      const saveData = {
        id: form.id, 
        type: form.type,
        content: form.content,
        score: form.score,
        answer: finalAnswer,
        options: (form.type === 'choice' || form.type === 'multiple_choice')
          ? JSON.stringify(form.options.reduce((acc, cur) => ({...acc, [cur.key]: cur.value}), {})) 
          : null
      }

      try {
          if (form.id) {
              await updateQuestion(saveData)
              ElMessage.success('修改成功')
          } else {
              await addQuestion(saveData)
              ElMessage.success('添加成功')
          }
          dialogVisible.value = false
          loadData()
      } catch (e) {
          ElMessage.error('操作失败')
      }
    }
  })
}

// PDF Import Logic (Simplified for now, needs real API integration later if needed)
const onFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    ElMessage.error('请上传 PDF 文件')
    return
  }

  isImporting.value = true
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      fullText += textContent.items.map(item => item.str).join('\n') + '\n'
    }
    
    // TODO: Parse text and call addQuestion API for each
    ElMessage.warning('PDF解析功能待升级对接后端')
    
  } catch (error) {
    console.error('Error reading PDF:', error)
    ElMessage.error('导入失败')
  } finally {
    isImporting.value = false
    event.target.value = ''
  }
}

const handleBatchImport = () => { if (fileInputRef.value) fileInputRef.value.click() }

onMounted(() => {
    loadData()
})
</script>

<template>
  <div class="app-container">
    <!-- 搜索 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="题目内容">
          <el-input v-model="queryParams.content" placeholder="关键词" clearable />
        </el-form-item>
        <el-form-item label="题型">
          <el-select v-model="queryParams.type" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <el-card class="table-container" shadow="never">
      <div class="table-toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增试题</el-button>
        <el-button type="success" :icon="Upload" plain :loading="isImporting" @click="handleBatchImport">批量导入 (PDF)</el-button>
        <input type="file" ref="fileInputRef" accept="application/pdf" style="display: none" @change="onFileChange" />
      </div>

      <el-table :data="tableData" border stripe v-loading="loading">
        <!-- Columns -->
        <el-table-column prop="id" label="编号" width="80" sortable />
        <el-table-column prop="type" label="题型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'choice' ? '' : (scope.row.type === 'multiple_choice' ? 'success' : 'warning')">
              {{ scope.row.type === 'choice' ? '单选题' : (scope.row.type === 'multiple_choice' ? '多选题' : '判断题') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="题目内容" show-overflow-tooltip min-width="200" />
        <el-table-column label="选项 (预览)" show-overflow-tooltip min-width="200">
          <template #default="scope">
            {{ formatOptions(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="score" label="分值" width="80" align="center" />
        <el-table-column prop="answer" label="答案" width="80" align="center">
             <template #default="scope">
                <span v-if="scope.row.type === 'true_false'">
                    <el-tag :type="scope.row.answer === 'True' || scope.row.answer === 'A' ? 'success' : 'danger'">
                         {{ (scope.row.answer === 'True' || scope.row.answer === 'A') ? '正确' : '错误' }}
                    </el-tag>
                </span>
                <span v-else>{{ scope.row.answer }}</span>
             </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
          <el-pagination
            v-model:current-page="queryParams.page"
            v-model:page-size="queryParams.size"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData"
            @current-change="handlePageChange"
            background
          />
      </div>
    </el-card>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="题型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="choice">单选题</el-radio>
            <el-radio label="multiple_choice">多选题</el-radio>
            <el-radio label="true_false">判断题</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="分值" prop="score">
          <el-input-number v-model="form.score" :min="1" :max="100" />
        </el-form-item>

        <el-form-item label="题目" prop="content">
          <el-input 
            v-model="form.content" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入题目内容（暂不支持富文本）" 
          />
        </el-form-item>

        <!-- 选择题/多选题选项 -->
        <template v-if="form.type === 'choice' || form.type === 'multiple_choice'">
          <el-divider content-position="left">选项设置</el-divider>
          <el-form-item 
            v-for="(item, index) in form.options" 
            :key="index" 
            :label="'选项 ' + item.key"
            :prop="'options.' + index + '.value'"
            :rules="{ required: true, message: '请输入选项内容', trigger: 'blur' }"
          >
            <div style="display: flex; width: 100%; gap: 10px;">
                <el-input v-model="item.value" placeholder="请输入选项内容">
                    <template #prepend>
                        <!-- 单选模式 -->
                        <el-radio v-if="form.type === 'choice'" key="radio-mode" v-model="form.answer" :label="item.key">{{ item.key }}</el-radio>
                        <!-- 多选模式 -->
                        <el-checkbox v-else key="checkbox-mode" v-model="form.answerArr" :label="item.key">{{ item.key }}</el-checkbox>
                    </template>
                </el-input>
                <el-button v-if="index > 1" type="danger" :icon="Delete" circle plain @click="removeOption(index)" />
            </div>
          </el-form-item>
          
          <el-form-item>
              <el-button type="primary" plain :icon="Plus" @click="addOption" size="small">添加选项</el-button>
          </el-form-item>
        </template>

        <!-- 判断题答案 -->
        <el-form-item v-if="form.type === 'true_false'" label="正确答案" prop="answer">
           <el-radio-group v-model="form.answer">
             <el-radio label="True">正确</el-radio>
             <el-radio label="False">错误</el-radio>
           </el-radio-group>
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
.filter-container { margin-bottom: 20px; }
.table-toolbar { margin-bottom: 15px; }
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
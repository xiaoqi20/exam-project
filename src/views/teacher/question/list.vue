<script setup>
import { reactive, ref, computed } from 'vue'
import { Search, Plus, Edit, Delete, Refresh, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker
// 使用 unpkg CDN 确保版本匹配
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

// 模拟试题数据源
const sourceData = [
  { id: 101, type: 'choice', content: 'HTML 是什么语言的缩写？', options: JSON.stringify({A:'超文本标记语言', B:'家庭工具标记语言', C:'高科技语言', D:'以上都不是'}), answer: 'A', score: 2 },
  { id: 102, type: 'true_false', content: 'Vue 3 使用 Options API 作为主要的 API 风格。', options: null, answer: 'False', score: 2 },
  { id: 103, type: 'choice', content: '以下哪个钩子函数在 Vue 3 中已被移除？', options: JSON.stringify({A:'created', B:'mounted', C:'beforeDestroy', D:'updated'}), answer: 'C', score: 5 },
]

// 响应式表格数据
const tableData = ref([...sourceData])
const fileInputRef = ref(null)
const isImporting = ref(false)

const queryParams = reactive({
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
  // 选项列表 (仅针对选择题)
  options: [
    { key: 'A', value: '' },
    { key: 'B', value: '' },
    { key: 'C', value: '' },
    { key: 'D', value: '' }
  ],
  answer: ''
})

const rules = {
  type: [{ required: true, message: '请选择题型', trigger: 'change' }],
  content: [{ required: true, message: '请输入题目内容', trigger: 'blur' }],
  score: [{ required: true, message: '请输入分值', trigger: 'blur' }],
  answer: [{ required: true, message: '请设置正确答案', trigger: 'change' }]
}

// 题型字典
const typeOptions = [
  { label: '单选题', value: 'choice' },
  { label: '判断题', value: 'true_false' }
]

// 格式化选项显示
const formatOptions = (row) => {
  if (row.type === 'true_false') return '-'
  try {
    const opts = JSON.parse(row.options)
    return Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join('; ')
  } catch (e) {
    return row.options
  }
}

// 查询
const handleQuery = () => {
  tableData.value = sourceData.filter(item => {
    const matchContent = !queryParams.content || item.content.toLowerCase().includes(queryParams.content.toLowerCase())
    const matchType = !queryParams.type || item.type === queryParams.type
    return matchContent && matchType
  })
  ElMessage.success('查询成功')
}

const handleReset = () => {
  queryParams.content = ''
  queryParams.type = ''
  handleQuery()
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
    answer: ''
  })
  if (formRef.value) formRef.value.clearValidate()
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑试题'
  dialogVisible.value = true
  
  // 解析 options
  let parsedOptions = [
    { key: 'A', value: '' },
    { key: 'B', value: '' },
    { key: 'C', value: '' },
    { key: 'D', value: '' }
  ]
  
  if (row.type === 'choice' && row.options) {
    try {
      const opts = JSON.parse(row.options)
      parsedOptions = Object.keys(opts).map(k => ({ key: k, value: opts[k] }))
    } catch (e) {
      console.error(e)
    }
  }

  Object.assign(form, {
    ...row,
    options: parsedOptions
  })
  
  if (formRef.value) formRef.value.clearValidate()
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该试题吗？', '提示', { type: 'warning' })
    .then(() => {
      tableData.value = tableData.value.filter(item => item.id !== row.id)
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}

// 提交
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      // 转换数据格式
      const saveData = {
        ...form,
        options: form.type === 'choice' 
          ? JSON.stringify(form.options.reduce((acc, cur) => ({...acc, [cur.key]: cur.value}), {})) 
          : null
      }

      if (form.id) {
        const index = tableData.value.findIndex(item => item.id === form.id)
        if (index !== -1) tableData.value[index] = saveData
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...tableData.value.map(item => item.id)) + 1
        tableData.value.push({ ...saveData, id: newId })
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
    }
  })
}

// 批量导入相关
const handleBatchImport = () => {
  console.log('Triggering file input click...')
  if (fileInputRef.value) {
    fileInputRef.value.click()
  } else {
    console.error('File input ref is null')
  }
}

const onFileChange = async (event) => {
  console.log('File selected:', event.target.files)
  const file = event.target.files[0]
  if (!file) return
  
  if (file.type !== 'application/pdf') {
    ElMessage.error('请上传 PDF 文件')
    return
  }

  isImporting.value = true
  try {
    console.log('Reading PDF file...')
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    console.log(`PDF loaded. Pages: ${pdf.numPages}`)
    
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join('\n')
      fullText += pageText + '\n'
    }

    console.log('Parsing text:', fullText.substring(0, 100) + '...')
    parseAndAddQuestions(fullText)
    ElMessage.success('批量导入成功')
  } catch (error) {
    console.error('Error reading PDF:', error)
    ElMessage.error('导入失败，请检查 PDF 文件格式或网络环境 (PDF Worker)')
  } finally {
    isImporting.value = false
    // Reset input
    event.target.value = ''
  }
}

const parseAndAddQuestions = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  let currentQuestion = null
  let newQuestions = []
  
  // 匹配题目开始：数字 + 点 + (可选的类型标识)
  // 兼容 "1.【单选题】（2分）" 或 "1. (2分)" 等格式
  const questionStartRegex = /^(\d+)\s*[.、．]?\s*(?:【(.*?)】)?(?:\（(\d+)分\）)?\s*(.*)/
  
  // 匹配选项：A/B/C/D 开头，或者 圆圈字符 (OCR有时会识别出)
  const optionRegex = /^([A-D])\s*[.、．]?\s*(.*)/
  
  // 匹配判断题选项 (对/错)
  const judgmentOptionRegex = /^(对|错|正确|错误)$/

  // 匹配答案（支持 "参考答案"、"答案"、"Answer" 等）
  const answerRegex = /^(?:参考答案|答案|Answer)\s*[:：]\s*([A-D]|True|False|对|错|√|×)/i

  lines.forEach((line, index) => {
    // 尝试匹配题目开始
    const qMatch = line.match(questionStartRegex)
    
    if (qMatch) {
      // 保存上一个题目
      if (currentQuestion) newQuestions.push(currentQuestion)
      
      // 提取题目内容
      let content = qMatch[4] || ''
      
      // 修正：如果这一行只有 "1.【单选题】（2分）"，内容其实在下一行
      // 简单的预读策略：如果 content 为空，且下一行不是选项，也不是答案，也不是新题目，则认为是内容
      if (!content && index + 1 < lines.length) {
         const nextLine = lines[index+1]
         if (!nextLine.match(optionRegex) && !nextLine.match(questionStartRegex) && !nextLine.match(answerRegex)) {
             // 这一行将在后续被 currentQuestion.content 捕获，或者这里直接处理？
             // 这里的逻辑是构造 currentQuestion 时读取 nextLine
         }
      }

      let type = 'choice'
      if (line.includes('判断题')) type = 'true_false'
      else if (line.includes('单选题') || line.includes('多选题')) type = 'choice'

      currentQuestion = {
        id: Date.now() + Math.random(),
        type: type,
        // 尝试获取内容：当前行内容 OR 下一行内容
        content: content || (lines[index+1] && !lines[index+1].match(optionRegex) && !lines[index+1].match(answerRegex) ? lines[index+1] : '题目内容解析失败'),
        options: {},
        answer: '', 
        score: qMatch[3] ? parseInt(qMatch[3]) : 2
      }
      return
    }

    if (!currentQuestion) return

    // 匹配选项
    const oMatch = line.match(optionRegex)
    if (oMatch && currentQuestion.type === 'choice') {
      currentQuestion.options[oMatch[1]] = oMatch[2]
      return
    }

    // 匹配判断题选项
    // 有些PDF会把 "A 对" "B 错" 当作选项列出，或者直接 "对" "错"
    if (judgmentOptionRegex.test(line) && currentQuestion.type === 'true_false') {
       return
    }

    // 匹配答案
    const aMatch = line.match(answerRegex)
    if (aMatch) {
      let ans = aMatch[1]
      if (ans === '对' || ans === '正确' || ans === '√') ans = 'True'
      if (ans === '错' || ans === '错误' || ans === '×') ans = 'False'
      currentQuestion.answer = ans
      return
    }
    
    // 拼接多行题目内容
    // 如果当前行不是题目开始、不是选项、不是答案，且上一行是题目（content可能不完整）
    // 并且当前行看起来不像是页眉页脚
    if (currentQuestion && !qMatch && !oMatch && !aMatch && !judgmentOptionRegex.test(line)) {
       // 排除常见页眉页脚和无关文本
       const ignoreKeywords = ['数据库系统原理', '导出时间', '阶段测试', '单选题', '多选题', '判断题', '页码', 'Page'];
       const isHeader = ignoreKeywords.some(kw => line.includes(kw));
       
       // 排除纯数字（可能是页码）
       const isPageNumber = /^\d+$/.test(line);

       if (!isHeader && !isPageNumber && line.length > 1) {
          // 如果已经有选项了，通常不再追加内容到 content (防止把页脚拼接到题目里)
          // 除非 PDF 排版非常乱，内容在选项之后（少见）
          // 但为了安全，如果 options 已经有值，我们停止拼接 content
          if (Object.keys(currentQuestion.options).length === 0) {
             currentQuestion.content += (currentQuestion.content ? '\n' : '') + line;
          }
       }
    }
  })

  if (currentQuestion) newQuestions.push(currentQuestion)

  // 过滤掉无效题目
  const validQuestions = newQuestions.filter(q => q.content && q.content !== '题目内容解析失败')

  // 添加到列表
  validQuestions.forEach(q => {
    if (q.type === 'choice') {
      q.options = JSON.stringify(q.options)
    } else {
      q.options = null
    }
    sourceData.push(q)
  })
  
  tableData.value = [...sourceData]
  if (validQuestions.length === 0) {
     ElMessage.warning('未识别到有效题目，请检查PDF格式')
  } else {
     ElMessage.success(`成功导入 ${validQuestions.length} 道题目`)
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="题目内容">
          <el-input v-model="queryParams.content" placeholder="关键词" clearable @keyup.enter="handleQuery"/>
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

      <el-table :data="tableData" border stripe>
        <el-table-column prop="id" label="编号" width="80" sortable />
        <el-table-column prop="type" label="题型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'choice' ? '' : 'warning'">
              {{ scope.row.type === 'choice' ? '单选题' : '判断题' }}
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
                    <el-tag :type="scope.row.answer === 'True' ? 'success' : 'danger'">
                         {{ scope.row.answer === 'True' ? '正确' : '错误' }}
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
    </el-card>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="题型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="choice">单选题</el-radio>
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

        <!-- 单选题选项 -->
        <template v-if="form.type === 'choice'">
          <el-divider content-position="left">选项设置</el-divider>
          <el-form-item 
            v-for="(item, index) in form.options" 
            :key="index" 
            :label="'选项 ' + item.key"
            :prop="'options.' + index + '.value'"
            :rules="{ required: true, message: '请输入选项内容', trigger: 'blur' }"
          >
            <el-input v-model="item.value" placeholder="请输入选项内容">
               <template #prepend>
                  <el-radio v-model="form.answer" :label="item.key">{{ item.key }}</el-radio>
               </template>
            </el-input>
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
</style>
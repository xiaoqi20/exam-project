<script setup>
import { reactive, ref } from 'vue'
import { Search, ChatDotRound, Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 模拟反馈数据
const tableData = ref([
  { 
    id: 1, 
    studentId: '2021001', 
    studentName: '张三', 
    examTitle: '计算机网络期中测试', 
    questionContent: 'OSI七层模型中，负责路径选择的是哪一层？', 
    content: '老师，我觉得这道题 B 选项也有道理，网络层不也负责寻址吗？', 
    time: '2025-11-10 16:00', 
    status: 'pending',
    reply: ''
  },
  { 
    id: 2, 
    studentId: '2021002', 
    studentName: '李四', 
    examTitle: 'Java 基础语法测验', 
    questionContent: 'String 类是基本数据类型吗？', 
    content: '书上说 String 是引用类型，为什么这里选 False？', 
    time: '2025-11-05 10:20', 
    status: 'replied',
    reply: '题目问的是“String 类是基本数据类型吗”，答案是 False，因为它是引用类型。你理解对了，但是可能看错题目选项了。'
  }
])

const queryParams = reactive({
  status: ''
})

const statusOptions = [
  { label: '待回复', value: 'pending' },
  { label: '已回复', value: 'replied' }
]

// 回复弹窗
const dialogVisible = ref(false)
const currentFeedback = ref({})
const replyContent = ref('')

const handleQuery = () => {
  console.log('Query:', queryParams)
}

const handleReset = () => {
  queryParams.status = ''
}

const handleReply = (row) => {
  currentFeedback.value = row
  replyContent.value = ''
  dialogVisible.value = true
}

const submitReply = () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  
  // 模拟提交
  const index = tableData.value.findIndex(item => item.id === currentFeedback.value.id)
  if (index !== -1) {
    tableData.value[index].status = 'replied'
    tableData.value[index].reply = replyContent.value
  }
  
  ElMessage.success('回复成功')
  dialogVisible.value = false
}

const handleViewReply = (row) => {
  ElMessageBox.alert(row.reply, '我的回复', {
    confirmButtonText: '确定'
  })
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索 -->
    <el-card class="filter-container" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-container" shadow="never">
      <el-table :data="tableData" border stripe style="width: 100%">
        <el-table-column prop="studentName" label="学生姓名" width="100" />
        <el-table-column prop="examTitle" label="来源试卷" width="180" show-overflow-tooltip />
        <el-table-column prop="questionContent" label="相关题目" min-width="150" show-overflow-tooltip />
        <el-table-column prop="content" label="疑问内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="time" label="提交时间" width="160" sortable />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'pending' ? 'warning' : 'success'">
              {{ scope.row.status === 'pending' ? '待回复' : '已回复' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="scope">
            <el-button 
              v-if="scope.row.status === 'pending'" 
              link 
              type="primary" 
              :icon="ChatDotRound" 
              @click="handleReply(scope.row)"
            >
              回复
            </el-button>
            <el-button 
              v-else 
              link 
              type="success" 
              :icon="Check" 
              @click="handleViewReply(scope.row)"
            >
              查看回复
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 回复弹窗 -->
    <el-dialog v-model="dialogVisible" title="回复学生疑问" width="500px">
      <div class="feedback-summary">
        <p><strong>学生：</strong> {{ currentFeedback.studentName }}</p>
        <p><strong>题目：</strong> {{ currentFeedback.questionContent }}</p>
        <p><strong>疑问：</strong> {{ currentFeedback.content }}</p>
      </div>
      <el-divider />
      <el-form>
        <el-form-item label="回复内容">
          <el-input 
            v-model="replyContent" 
            type="textarea" 
            rows="4" 
            placeholder="请输入解答内容..." 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply">发送回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { margin-bottom: 20px; }
.feedback-summary p { margin: 5px 0; color: #606266; font-size: 14px; }
</style>
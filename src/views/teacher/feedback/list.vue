<script setup>
import { reactive, ref, onMounted } from 'vue'
import { Search, ChatDotRound, Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getFeedbackList, replyFeedback } from '@/api/feedback'

// 真实反馈数据
const tableData = ref([])
const loading = ref(false)

const queryParams = reactive({
  status: '',
  page: 1,
  size: 10
})

const statusOptions = [
  { label: '待回复', value: 'pending' },
  { label: '已回复', value: 'replied' }
]

// 回复弹窗
const dialogVisible = ref(false)
const currentFeedback = ref({})
const replyContent = ref('')

const loadData = async () => {
    loading.value = true
    try {
        const res = await getFeedbackList(queryParams)
        if (res && res.records) {
            tableData.value = res.records
        } else {
            tableData.value = []
        }
    } catch (e) {
        ElMessage.error('加载反馈失败')
    } finally {
        loading.value = false
    }
}

const handleQuery = () => {
  queryParams.page = 1
  loadData()
}

const handleReset = () => {
  queryParams.status = ''
  handleQuery()
}

const handleReply = (row) => {
  currentFeedback.value = row
  // 如果是 AI 回复的，带出 AI 的内容供老师修改
  replyContent.value = row.status === 'ai_replied' ? (row.reply || '') : ''
  dialogVisible.value = true
}

const submitReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  
  try {
      await replyFeedback({
          id: currentFeedback.value.id,
          reply: replyContent.value
      })
      
      ElMessage.success('回复成功')
      dialogVisible.value = false
      loadData()
  } catch (e) {
      ElMessage.error('回复失败')
  }
}

const handleViewReply = (row) => {
  ElMessageBox.alert(row.reply, '我的回复', {
    confirmButtonText: '确定'
  })
}

onMounted(() => {
    loadData()
})
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
        <el-table-column prop="examTitle" label="来源试卷" width="180" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.examTitle || '自主练习' }}
          </template>
        </el-table-column>
        <el-table-column prop="questionContent" label="相关题目" min-width="150" show-overflow-tooltip />
        <el-table-column prop="content" label="疑问内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createTime" label="提交时间" width="160" sortable />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 'ai_replied'" type="primary" effect="light">
              AI 已回
            </el-tag>
            <el-tag v-else :type="scope.row.status === 'pending' ? 'warning' : 'success'">
              {{ scope.row.status === 'pending' ? '待回复' : '已回复' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="scope">
            <el-button 
              v-if="scope.row.status === 'pending' || scope.row.status === 'ai_replied'" 
              link 
              type="primary" 
              :icon="ChatDotRound" 
              @click="handleReply(scope.row)"
            >
              {{ scope.row.status === 'ai_replied' ? '修正回复' : '回复' }}
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
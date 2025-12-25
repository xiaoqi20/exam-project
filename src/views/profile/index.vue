<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getStudentDetail } from '@/api/student'
import { updateProfile, updatePassword } from '@/api/auth'
import { getScoreHistory } from '@/api/score'
import { getAllClasses } from '@/api/class'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Timer, Postcard, Iphone, Message, School } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const activeTab = ref('info')

// User Data: Map to backend fields (stuId, sname, sex, className, phone)
const userInfo = ref({
  stuId: '',
  username: '',
  sname: '', 
  sex: '',
  phone: '',
  email: '',
  classId: null,
  className: '',
  role: 'student'
})

// Activity Timeline
const activities = ref([])

// Class Options
const classOptions = ref([])

// Password Form
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const pwdRef = ref(null)

const loadClassOptions = async () => {
    try {
        const res = await getAllClasses()
        // 兼容多种返回结构
        if (Array.isArray(res)) {
            classOptions.value = res
        } else if (res && Array.isArray(res.list)) {
            classOptions.value = res.list
        } else if (res && Array.isArray(res.records)) {
            classOptions.value = res.records
        }
    } catch (e) {
        console.error('加载班级失败', e)
    }
}

// Load Data
const loadProfile = async () => {
  loading.value = true
  try {
    // 1. Load Classes First (Attempt silently)
    try {
        await loadClassOptions()
    } catch (ignore) {}

    // 2. Get Detail
    if (userStore.role === 'student' || userStore.role === '3') {
        try {
            const res = await getStudentDetail(userStore.userInfo.id)
            if (res) {
                userInfo.value = { ...userInfo.value, ...res }
                
                // 尝试修正 classId 类型以匹配下拉框
                if (userInfo.value.classId && classOptions.value.length > 0) {
                    const match = classOptions.value.find(c => (c.id == userInfo.value.classId || c.classId == userInfo.value.classId))
                    if (match) {
                        userInfo.value.classId = match.id || match.classId
                        // 顺便确保 className 是最新的
                        userInfo.value.className = match.name || match.className
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to fetch student detail, using local info:', e)
            // Fallback: use info from store
            userInfo.value.sname = userStore.userInfo.name || userStore.userInfo.sname
            userInfo.value.username = userStore.userInfo.username
        }
    } else {
        // Fallback for teacher/admin
        userInfo.value.sname = userStore.userInfo.name
        userInfo.value.username = userStore.userInfo.username || 'admin'
    }

    // 3. Get Activities (Exam History)
    if (userStore.role === 'student') {
        try {
            const scoreRes = await getScoreHistory(userStore.userInfo.id, { page: 1, size: 5 })
            if (scoreRes && scoreRes.records) {
                activities.value = scoreRes.records.map(item => {
                    // Mapping fields: Support various backend naming conventions
                    const title = item.title || item.paperName || item.examTitle || '未命名试卷'
                    const timeRaw = item.createTime || item.submitTime || item.examTime
                    const time = timeRaw ? timeRaw.replace('T', ' ') : '最近'
                    const score = item.score !== undefined ? item.score : (item.userScore !== undefined ? item.userScore : item.studentScore)

                    return {
                        content: `参加了考试《${title}》`,
                        timestamp: time,
                        score: score,
                        type: 'primary',
                        icon: Timer
                    }
                })
            }
        } catch(e) { console.warn('Fetch history failed', e) }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleClassChange = (val) => {
    const selected = classOptions.value.find(item => (item.id == val || item.classId == val))
    if (selected) {
        userInfo.value.className = selected.name || selected.className
        // 确保 ID 也是正确的格式
        userInfo.value.classId = selected.id || selected.classId
    }
}

// Update Info
const handleUpdateInfo = async () => {
  try {
    await updateProfile({
        sname: userInfo.value.sname,
        sex: userInfo.value.sex,
        phone: userInfo.value.phone,
        email: userInfo.value.email,
        classId: userInfo.value.classId,
        className: userInfo.value.className
    })
    ElMessage.success('资料更新成功')
    userStore.userInfo.name = userInfo.value.sname
    userStore.userInfo.className = userInfo.value.className
  } catch (e) {
    console.error(e)
    ElMessage.error('更新失败')
  }
}

// Update Password
const handleUpdatePwd = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
        ElMessage.warning('请输入完整密码信息')
        return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
        ElMessage.error('两次输入密码不一致')
        return
    }

    try {
        await ElMessageBox.confirm('修改密码后需要重新登录，是否继续？', '提示', { type: 'warning' })
        await updatePassword({
            oldPassword: pwdForm.oldPassword,
            newPassword: pwdForm.newPassword
        })
        ElMessage.success('密码修改成功，请重新登录')
        userStore.logout()
        router.push('/login')
    } catch (e) {
        if (e !== 'cancel') {
            ElMessage.error('密码修改失败')
        }
    }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- Left: Profile Card -->
      <el-col :span="8" :xs="24">
        <el-card v-loading="loading" class="box-card profile-card">
          <div class="avatar-wrapper">
            <el-avatar :size="100" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <div class="user-role-tag">
                <el-tag>{{ userStore.role === 'student' ? '学生' : '管理人员' }}</el-tag>
            </div>
          </div>
          <div class="user-header">
            <h3>{{ userInfo.sname || 'User' }}</h3>
            <p class="user-bio">学无止境，勤则可达。</p>
          </div>
          
          <div class="user-info-list">
            <div class="info-item" v-if="userInfo.stuId">
                <el-icon><Postcard /></el-icon>
                <span>学号：{{ userInfo.stuId }}</span>
            </div>
            <div class="info-item" v-if="userInfo.className">
                <el-icon><School /></el-icon>
                <span>班级：{{ userInfo.className }}</span>
            </div>
            <div class="info-item" v-if="userInfo.phone">
                <el-icon><Iphone /></el-icon>
                <span>电话：{{ userInfo.phone }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- Right: Tabs -->
      <el-col :span="16" :xs="24">
        <el-card class="box-card">
          <el-tabs v-model="activeTab">
            <!-- Tab 1: Basic Info Form -->
            <el-tab-pane label="基本资料" name="info">
              <el-form label-position="top" :model="userInfo">
                <el-form-item label="真实姓名">
                  <el-input v-model="userInfo.sname" />
                </el-form-item>
                <el-form-item label="所属班级" v-if="userStore.role === 'student'">
                  <el-select 
                    v-model="userInfo.classId" 
                    placeholder="请选择班级" 
                    style="width: 100%"
                    disabled
                  >
                    <el-option
                      v-for="item in classOptions"
                      :key="item.id || item.classId"
                      :label="item.name || item.className"
                      :value="item.id || item.classId"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="性别">
                  <el-radio-group v-model="userInfo.sex">
                    <el-radio label="男">男</el-radio>
                    <el-radio label="女">女</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="手机号码">
                  <el-input v-model="userInfo.phone" />
                </el-form-item>
                <el-form-item label="电子邮箱">
                  <el-input v-model="userInfo.email" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="handleUpdateInfo">保存修改</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <!-- Tab 2: Activity Timeline -->
            <el-tab-pane label="最近活动" name="activity">
              <div class="timeline-wrapper">
                  <el-timeline v-if="activities.length > 0">
                    <el-timeline-item
                      v-for="(activity, index) in activities"
                      :key="index"
                      :icon="activity.icon"
                      :type="activity.type"
                      :color="index === 0 ? '#0bbd87' : ''"
                      :timestamp="activity.timestamp?.replace('T', ' ')"
                    >
                      {{ activity.content }} 
                      <el-tag size="small" type="success" v-if="activity.score !== undefined" style="margin-left: 10px">
                        {{ activity.score }}分
                      </el-tag>
                    </el-timeline-item>
                  </el-timeline>
                  <el-empty v-else description="暂无活动记录" />
              </div>
            </el-tab-pane>

            <!-- Tab 3: Security -->
            <el-tab-pane label="账号安全" name="security">
               <el-form label-position="top" :model="pwdForm" ref="pwdRef">
                <el-form-item label="旧密码">
                  <el-input v-model="pwdForm.oldPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="新密码">
                  <el-input v-model="pwdForm.newPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="确认密码">
                  <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
                </el-form-item>
                <el-form-item>
                  <el-button type="danger" @click="handleUpdatePwd">修改密码</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.box-card { margin-bottom: 20px; }

.profile-card { text-align: center; }
.avatar-wrapper { position: relative; display: inline-block; margin-bottom: 15px; }
.user-role-tag { position: absolute; bottom: 0; right: 0; }

.user-header h3 { margin: 0 0 5px; color: #303133; }
.user-bio { color: #909399; font-size: 14px; margin-bottom: 20px; }

.user-info-list { text-align: left; padding: 0 20px; }
.info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    color: #606266;
    font-size: 14px;
}

.timeline-wrapper { padding: 10px; }

@media (max-width: 768px) {
    .app-container { padding: 10px; }
    .el-col { margin-bottom: 10px; }
}
</style>

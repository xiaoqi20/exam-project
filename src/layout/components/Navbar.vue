<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ArrowDown, User, SwitchButton, Fold, Expand } from '@element-plus/icons-vue'
import { ElMessageBox, ElNotification } from 'element-plus'
import { defineEmits, defineProps, onMounted, onUnmounted, ref } from 'vue'
import { getExamPaperList } from '@/api/examPaper'
import NotifyBell from '@/components/NotifyBell.vue'
import { useNotifyStore } from '@/stores/notify'

const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-sidebar'])

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

// Polling for new exams (Student only)
let pollingTimer = null
const knownExamIds = ref(new Set())
let isInitialized = false

const startPolling = () => {
  // Only for students (role 3)
  if (userStore.role !== 3) return

  const checkNewExams = async () => {
    try {
      const res = await getExamPaperList({ 
          page: 1, 
          size: 10, 
          _t: Date.now() 
      })
      
      if (res && res.records) {
        let hasNew = false
        const newExams = []

        res.records.forEach(exam => {
          const id = exam.id || exam.paperId
          
          if (!knownExamIds.value.has(id)) {
             knownExamIds.value.add(id)
             if (isInitialized) {
                newExams.push(exam.title)
                hasNew = true
             }
          }
        })
        
        // Notify
        if (hasNew && newExams.length > 0) {
           ElNotification.success({
             title: '新考试通知',
             message: `老师发布了: ${newExams.join(', ')}`,
             duration: 0, 
             position: 'bottom-right'
           })
        }
        isInitialized = true
      }
    } catch (e) {
      console.error('Polling error', e)
    }
  }

  // Initial check
  checkNewExams()
  // Poll every 60s
  pollingTimer = setInterval(checkNewExams, 60000)
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})

const toggleSidebar = () => {
  emit('toggle-sidebar')
}

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定注销并退出系统吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      router.push('/login')
    })
  } else if (command === 'profile') {
    router.push('/dashboard/profile')
  }
}
</script>

<template>
  <div class="navbar">
    <div class="left-side">
      <!-- Only show hamburger if sidebar is not globally hidden for this route -->
      <div v-if="!route.meta.hiddenSidebar" class="hamburger-container" @click="toggleSidebar">
        <el-icon :size="20">
          <Expand v-if="isCollapse" />
          <Fold v-else />
        </el-icon>
      </div>
      <div v-else class="logo-text-simple">智考后台系统</div>
    </div>

    <div class="right-side">
      <!-- 测试按钮 (仅供调试) -->
      <el-button size="small" link @click="useNotifyStore().mockReceive()" style="margin-right: 15px;">测试消息</el-button>
      
      <!-- 通知铃铛 -->
      <NotifyBell class="right-menu-item" style="margin-right: 20px;" />

      <el-dropdown class="avatar-container" @command="handleCommand" trigger="click">
        <div class="avatar-wrapper">
          <el-avatar :size="30" :src="userStore.userInfo.avatar || defaultAvatar" :icon="User" class="user-avatar" />
          <span class="username">{{ userStore.userInfo.name }}</span>
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile" :icon="User">个人中心</el-dropdown-item>
            <el-dropdown-item divided command="logout" :icon="SwitchButton">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style scoped>
.navbar {
  height: 50px;
  overflow: hidden;
  position: relative;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.left-side {
  display: flex;
  align-items: center;
}

.hamburger-container {
  line-height: 46px;
  height: 100%;
  float: left;
  cursor: pointer;
  transition: background .3s;
  -webkit-tap-highlight-color:transparent;
  display: flex;
  align-items: center;
}

.hamburger-container:hover {
  background: rgba(0, 0, 0, .025)
}

.logo-text-simple {
  font-weight: bold;
  font-size: 18px;
  color: #303133;
  margin-left: 10px;
}

.right-side {
  display: flex;
  align-items: center;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  outline: none;
}

.user-avatar {
  margin-right: 8px;
}

.username {
  margin-right: 4px;
  font-size: 14px;
}
</style>
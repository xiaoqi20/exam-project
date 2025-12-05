<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ArrowDown, User, SwitchButton, Fold, Expand } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { defineEmits, defineProps } from 'vue'

const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-sidebar'])

const router = useRouter()
const userStore = useUserStore()
const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

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
      <div class="hamburger-container" @click="toggleSidebar">
        <el-icon :size="20">
          <Expand v-if="isCollapse" />
          <Fold v-else />
        </el-icon>
      </div>
    </div>

    <div class="right-side">
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
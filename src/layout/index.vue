<script setup>
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import { ref, onMounted, onUnmounted, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useNotifyStore } from '@/stores/notify'

const route = useRoute()
const isCollapse = ref(false)
const isMobile = ref(false)
const drawerVisible = ref(false)
const notifyStore = useNotifyStore()

const checkMobile = () => {
  const w = window.innerWidth
  isMobile.value = w < 768
  if (isMobile.value) {
    // Force "collapsed" visual state for Navbar hamburger icon
    isCollapse.value = true 
  }
}

const toggleSidebar = () => {
  if (isMobile.value) {
    drawerVisible.value = !drawerVisible.value
  } else {
    isCollapse.value = !isCollapse.value
  }
}

// Close drawer when route changes (mobile only)
watch(route, () => {
  if (isMobile.value) {
    drawerVisible.value = false
  }
})

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  notifyStore.connect()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  // 页面销毁前断开
  notifyStore.disconnect()
})
</script>

<template>
  <el-container class="app-wrapper">
    <!-- Desktop Sidebar (Hidden on Mobile) -->
    <Sidebar v-if="!isMobile" :is-collapse="isCollapse" class="desktop-sidebar" />

    <!-- Mobile Drawer -->
    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      :with-header="false"
      size="220px"
      class="mobile-drawer"
    >
      <!-- Reuse Sidebar component inside Drawer -->
      <!-- Pass is-collapse=false because drawer is always full width -->
      <Sidebar :is-collapse="false" />
    </el-drawer>

    <el-container class="main-container">
      <el-header height="50px" style="padding: 0">
        <Navbar :is-collapse="isCollapse" :is-mobile="isMobile" @toggle-sidebar="toggleSidebar" />
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  width: 100%;
  height: 100vh;
}

.main-container {
  flex-direction: column;
  background-color: #f0f2f5;
  height: 100vh;
  overflow: hidden; /* Ensure scroll is handled by app-main */
}

.app-main {
  padding: 10px;
  overflow-y: auto; /* Scrollable content */
}

/* Ensure Drawer styles don't conflict */
:deep(.mobile-drawer .el-drawer__body) {
  padding: 0;
  background-color: #304156; /* Match sidebar color */
}
</style>
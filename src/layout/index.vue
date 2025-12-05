<script setup>
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import { ref } from 'vue'

const isCollapse = ref(false)

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}
</script>

<template>
  <el-container class="app-wrapper">
    <Sidebar :is-collapse="isCollapse" />
    <el-container class="main-container">
      <el-header height="50px" style="padding: 0">
        <Navbar :is-collapse="isCollapse" @toggle-sidebar="toggleSidebar" />
      </el-header>
      <el-main class="app-main">
        <!-- Breadcrumb could go here -->
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
}

.app-main {
  padding: 10px; /* Reduced from default 20px */
  /* If children have their own padding, consider 0 here or removing padding from children */
}
</style>
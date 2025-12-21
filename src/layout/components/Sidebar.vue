<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMenuStore } from '@/stores/menu'
import { useTrainingStore } from '@/stores/training'
import * as Icons from '@element-plus/icons-vue' 

const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['menu-click'])

const route = useRoute()
const userStore = useUserStore()
const menuStore = useMenuStore()
const trainingStore = useTrainingStore()

const activeMenu = computed(() => route.path)

const handleSelect = () => {
  emit('menu-click')
}

// 从 Store 获取当前角色的菜单
const currentMenus = computed(() => {
  return menuStore.getMenusByRole(userStore.role)
})

// 动态获取图标组件
const getIcon = (name) => {
  if (!name) return null
  return Icons[name]
}

console.log('Sidebar loaded, User Role:', userStore.role)
</script>

<template>
  <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar-container">
    <div class="logo-container">
      <img src="/logo.svg" alt="Logo" class="logo" />
      <span v-show="!isCollapse" class="system-name">在线考试系统</span>
    </div>
    <el-scrollbar>
      <!-- 每日特训快捷入口 (独立按钮，避免 router 冲突) -->
      <div v-if="userStore.role === 'student' || userStore.role === 3" class="special-menu-item" @click="trainingStore.openTraining">
          <el-icon><Icons.Star /></el-icon>
          <span v-show="!isCollapse">每日特训 🌟</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        :collapse="isCollapse"
        :collapse-transition="false"
        @select="handleSelect"
      >
        <template v-for="item in currentMenus" :key="item.path">
          <!-- 有子菜单的情况 -->
          <el-sub-menu v-if="item.children && item.children.length > 0" :index="item.path">
            <template #title>
              <el-icon v-if="item.icon && getIcon(item.icon)">
                <component :is="getIcon(item.icon)" />
              </el-icon>
              <span>{{ item.title }}</span>
            </template>
            
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
            >
              <el-icon v-if="child.icon && getIcon(child.icon)">
                <component :is="getIcon(child.icon)" />
              </el-icon>
              <span>{{ child.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          
          <!-- 无子菜单的情况 -->
          <el-menu-item v-else :index="item.path">
            <el-icon v-if="item.icon && getIcon(item.icon)">
              <component :is="getIcon(item.icon)" />
            </el-icon>
            <template #title>
              <span>{{ item.title }}</span>
            </template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </el-aside>
</template>

<style scoped>
.sidebar-container {
  height: 100%;
  background-color: #304156;
  overflow: hidden;
  transition: width 0.3s;
}

.el-menu-vertical {
  border-right: none;
}

:deep(.el-menu) {
  border-right: none;
}

.logo-container {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #764ba2;
  overflow: hidden;
}

.logo {
  width: 32px;
  height: 32px;
  margin-right: 12px;
}

.system-name {
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
}

.special-menu-item {
  height: 56px;
  line-height: 56px;
  font-size: 14px;
  color: #bfcbd9;
  padding: 0 20px;
  cursor: pointer;
  position: relative;
  transition: border-color .3s, background-color .3s, color .3s;
  box-sizing: border-box;
  white-space: nowrap;
  display: flex;
  align-items: center;
}
.special-menu-item:hover {
  background-color: #263445;
  color: #409EFF;
}
.special-menu-item .el-icon {
  margin-right: 5px;
  width: 24px;
  text-align: center;
  font-size: 18px;
  vertical-align: middle;
}
</style>
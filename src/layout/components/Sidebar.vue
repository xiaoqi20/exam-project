<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMenuStore } from '@/stores/menu'
import * as Icons from '@element-plus/icons-vue' // 引入所有图标以支持动态渲染

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

const activeMenu = computed(() => route.path)

const handleSelect = () => {
  emit('menu-click')
}

// 从 Store 获取当前角色的菜单
const currentMenus = computed(() => {
  return menuStore.getMenusByRole(userStore.role)
})

// 动态获取图标组件
// 如果 item.icon 是字符串 "User"，则返回 Icons["User"] 组件对象
const getIcon = (name) => {
  if (!name) return null
  return Icons[name]
}
</script>

<template>
  <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar-container">
    <div class="logo-container">
      <img src="/logo.svg" alt="Logo" class="logo" />
      <span v-show="!isCollapse" class="system-name">在线考试系统</span>
    </div>
    <el-scrollbar>
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
</style>
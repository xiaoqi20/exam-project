# 在线考试系统 - 菜单管理功能实现过程

本文档详细记录了在 Vue 3 + Element Plus + Pinia 技术栈下，实现动态菜单管理功能的完整过程。

## 1. 需求分析

目标是将原本硬编码在 `Sidebar.vue` 中的静态菜单数据提取出来，通过全局状态管理（Pinia）进行动态维护，并提供一个管理后台页面供管理员进行增删改查操作，实现侧边栏菜单的实时更新与持久化存储。

## 2. 实现步骤

### 第一步：创建菜单数据仓库 (Store)

创建 Pinia Store (`src/stores/menu.js`) 来集中管理菜单数据。

**核心逻辑：**
1.  **定义默认数据：** 将原有的静态菜单结构（Admin/Teacher/Student 三种角色）作为初始默认值。
2.  **持久化：** 使用 `localStorage` 存储菜单数据，防止页面刷新后丢失修改。
3.  **CRUD 操作：** 实现获取 (`getMenusByRole`)、新增 (`addMenu`)、更新 (`updateMenu`) 和删除 (`deleteMenu`) 方法。

```javascript
// src/stores/menu.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMenuStore = defineStore('menu', () => {
  // 1. 定义默认菜单结构 (代码省略，与之前 Sidebar 中的结构一致)
  const defaultMenus = { ... }

  // 2. 响应式状态：优先读取 localStorage，否则使用默认值
  const menus = ref(JSON.parse(localStorage.getItem('sys-menus')) || defaultMenus)

  // 3. 持久化保存函数
  function saveState() {
    localStorage.setItem('sys-menus', JSON.stringify(menus.value))
  }

  // 4. 定义 CRUD 方法
  function getMenusByRole(role) { return menus.value[role] || [] }
  
  function addMenu(role, parentId, menuData) {
    // 生成唯一ID，递归查找父节点并插入
    // ...
    saveState()
  }
  
  // updateMenu, deleteMenu (代码省略)

  return { menus, getMenusByRole, addMenu, updateMenu, deleteMenu }
})
```

### 第二步：改造侧边栏组件 (Sidebar)

修改 `src/layout/components/Sidebar.vue`，使其从 Store 获取数据而非读取本地常量。

**关键改动：**
1.  **引入 Store：** 使用 `useMenuStore`。
2.  **动态图标：** 数据库中存储的是图标名称字符串（如 `'User'`），需要动态解析为组件对象。
3.  **响应式更新：** 使用 `computed` 属性绑定 Store 数据，确保数据变更时视图自动刷新。

```vue
<!-- src/layout/components/Sidebar.vue -->
<script setup>
import { computed } from 'vue'
import { useMenuStore } from '@/stores/menu'
import * as Icons from '@element-plus/icons-vue' // 引入所有图标

const menuStore = useMenuStore()

// 从 Store 获取当前角色的菜单
const currentMenus = computed(() => {
  return menuStore.getMenusByRole(userStore.role)
})

// 动态获取图标组件辅助函数
const getIcon = (name) => {
  if (!name) return null
  return Icons[name]
}
</script>

<template>
  <!-- 模板中通过 v-for 遍历 currentMenus -->
  <!-- 使用 <component :is="getIcon(item.icon)" /> 渲染动态图标 -->
</template>
```

### 第三步：创建菜单管理页面

创建 `src/views/admin/system/menu.vue`，提供可视化的管理界面。

**页面功能：**
1.  **角色切换 (Tabs)：** 顶部使用 `el-tabs` 切换 Admin / Teacher / Student 角色的菜单配置。
2.  **树形表格 (Table)：** 使用 `el-table` 的 `row-key` 属性展示嵌套的菜单结构。
3.  **操作交互：**
    *   **新增/编辑：** 使用 `el-dialog` 弹窗表单，包含名称、路径、图标选择等字段。
    *   **图标选择器：** 使用 `el-select` 展示常用图标列表，支持预览。
    *   **实时反馈：** 操作成功后调用 Store 方法更新数据，左侧 Sidebar 会自动同步变化。

```vue
<!-- src/views/admin/system/menu.vue 部分代码 -->
<script setup>
// ... 引入 Store 和组件

const activeRole = ref('admin') // 当前选中的角色 Tab

// 表格数据依赖于 activeRole
const tableData = computed(() => menuStore.getMenusByRole(activeRole.value))

// 新增菜单逻辑
const handleAdd = (parentId) => {
  // 打开弹窗，调用 Store 的 addMenu 方法
}
</script>
```

### 第四步：配置路由

最后，在 `src/router/index.js` 中注册菜单管理页面的路由，使其可以被访问。

```javascript
// src/router/index.js
{
  path: 'admin/system/menu',
  name: 'MenuManage',
  component: () => import('../views/admin/system/menu.vue')
}
```

## 3. 总结

通过以上步骤，我们成功实现了菜单的**解耦**和**动态化**。

*   **解耦：** Sidebar 组件不再关心菜单的具体内容，只负责渲染 Store 中的数据。
*   **动态化：** 通过 Pinia 和 LocalStorage，实现了菜单数据的运行时修改和持久化，为后续对接后端 API 动态权限菜单打下了坚实基础。

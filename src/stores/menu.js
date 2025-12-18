import { defineStore } from 'pinia'
import { ref } from 'vue'

// 引入需要的图标名称（字符串形式），实际渲染时会通过组件动态解析
// 注意：这里只存字符串数据，不存组件对象，方便持久化存储

export const useMenuStore = defineStore('menu', () => {
  // 默认菜单数据 (模拟从后端获取的结构)
  const defaultMenus = {
    admin: [
      {
        id: 0,
        path: '/dashboard/welcome',
        title: '首页',
        icon: 'House',
        children: []
      },
      {
        id: 1,
        path: '/dashboard/admin/user',
        title: '用户管理',
        icon: 'User',
        children: [
          { id: 11, path: '/dashboard/admin/user/student', title: '学生信息管理', icon: '' },
          { id: 12, path: '/dashboard/admin/user/teacher', title: '教师信息管理', icon: '' }
        ]
      },
      {
        id: 2,
        path: '/dashboard/admin/system',
        title: '系统设置',
        icon: 'Setting',
        children: [
          { id: 21, path: '/dashboard/admin/system/menu', title: '菜单管理', icon: '' },
          { id: 22, path: '/dashboard/admin/system/role', title: '角色权限', icon: '' }
        ]
      }
    ],
    teacher: [
      {
        id: 0,
        path: '/dashboard/welcome',
        title: '首页',
        icon: 'House',
        children: []
      },
      {
        id: 3,
        path: '/dashboard/teacher/question',
        title: '题库管理',
        icon: 'Document',
        children: [
          { id: 30, path: '/dashboard/teacher/knowledge/list', title: '知识点管理', icon: '' },
          { id: 31, path: '/dashboard/teacher/question/list', title: '试题列表', icon: '' }
        ]
      },
      {
        id: 4,
        path: '/dashboard/teacher/exam',
        title: '试卷管理',
        icon: 'Edit',
        children: [
          { id: 41, path: '/dashboard/teacher/exam/create', title: '创建试卷', icon: '' },
          { id: 42, path: '/dashboard/teacher/exam/publish', title: '试卷发布', icon: '' }
        ]
      },
      {
        id: 5,
        path: '/dashboard/teacher/score',
        title: '成绩统计',
        icon: 'DataAnalysis',
        children: [
          { id: 51, path: '/dashboard/teacher/score/report', title: '成绩报表', icon: '' }
        ]
      },
      {
        id: 6,
        path: '/dashboard/teacher/feedback',
        title: '答疑管理',
        icon: 'ChatDotRound',
        children: [
          { id: 61, path: '/dashboard/teacher/feedback/list', title: '学生反馈', icon: '' }
        ]
      }
    ],
    student: [
      {
        id: 0,
        path: '/dashboard/welcome',
        title: '首页',
        icon: 'House',
        children: []
      },
      {
        id: 7,
        path: '/dashboard/student/exam',
        title: '在线考试',
        icon: 'Monitor',
        children: [
          { id: 71, path: '/dashboard/student/exam/hall', title: '考试大厅', icon: '' }
        ]
      },
      {
        id: 8,
        path: '/dashboard/student/score',
        title: '我的成绩',
        icon: 'Trophy',
        children: [
          { id: 81, path: '/dashboard/student/score/history', title: '历史记录', icon: '' }
        ]
      },
      {
        id: 10,
        path: '/dashboard/student/mistake',
        title: '错题本',
        icon: 'Notebook',
        children: []
      },
      {
        id: 11,
        path: '/dashboard/student/knowledge/graph',
        title: '知识图谱',
        icon: 'Connection',
        children: []
      },
      {
        id: 9,
        path: '/dashboard/student/profile',
        title: '个人信息',
        icon: 'Avatar',
        children: [
          { id: 91, path: '/dashboard/student/profile/info', title: '修改资料', icon: '' }
        ]
      }
    ]
  }

  // 响应式状态：尝试从 localStorage 读取，如果没有则使用默认值
  const menus = ref(JSON.parse(localStorage.getItem('sys-menus')) || defaultMenus)

  // 持久化保存
  function saveState() {
    localStorage.setItem('sys-menus', JSON.stringify(menus.value))
  }

  // 获取指定角色的菜单树
  function getMenusByRole(role) {
    return menus.value[role] || []
  }

  // 新增菜单
  function addMenu(role, parentId, menuData) {
    const roleMenus = menus.value[role]
    const newId = Date.now() // 简单生成唯一ID
    const newMenu = { ...menuData, id: newId, children: [] }

    if (!parentId) {
      // 顶级菜单
      roleMenus.push(newMenu)
    } else {
      // 子菜单，递归查找父节点
      const parent = findMenuById(roleMenus, parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(newMenu)
      }
    }
    saveState()
  }

  // 更新菜单
  function updateMenu(role, menuData) {
    const roleMenus = menus.value[role]
    const target = findMenuById(roleMenus, menuData.id)
    if (target) {
      Object.assign(target, menuData)
      saveState()
    }
  }

  // 删除菜单
  function deleteMenu(role, id) {
    const roleMenus = menus.value[role]
    // 如果是顶级菜单
    const index = roleMenus.findIndex(item => item.id === id)
    if (index !== -1) {
      roleMenus.splice(index, 1)
    } else {
      // 递归查找并删除
      removeMenuRecursive(roleMenus, id)
    }
    saveState()
  }

  // 辅助函数：递归查找
  function findMenuById(list, id) {
    for (const item of list) {
      if (item.id === id) return item
      if (item.children) {
        const found = findMenuById(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  // 辅助函数：递归删除
  function removeMenuRecursive(list, id) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      if (item.children) {
        const index = item.children.findIndex(child => child.id === id)
        if (index !== -1) {
          item.children.splice(index, 1)
          return true
        }
        if (removeMenuRecursive(item.children, id)) return true
      }
    }
    return false
  }

  return { menus, getMenusByRole, addMenu, updateMenu, deleteMenu }
})

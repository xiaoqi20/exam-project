import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Login from '../views/Login.vue'
import Layout from '../layout/index.vue'
import Welcome from '../views/Welcome.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { title: '登录' }
    },
    {
      path: '/403',
      name: 'Forbidden',
      component: () => import('../views/403.vue'),
      meta: { title: '无权限' }
    },
    {
      path: '/dashboard',
      component: Layout,
      redirect: '/dashboard/welcome',
      children: [
        {
          path: 'welcome',
          name: 'Welcome',
          component: Welcome,
          meta: { roles: ['admin', 'teacher', 'student'], title: '首页' }
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('../views/profile/index.vue'),
          meta: { roles: ['admin', 'teacher', 'student'], title: '个人中心' }
        },
        // Admin Routes
        {
          path: 'admin/user/student',
          name: 'StudentManage',
          component: () => import('../views/admin/user/student.vue'),
          meta: { roles: ['admin'], title: '学生管理' }
        },
        {
          path: 'admin/user/teacher',
          name: 'TeacherManage',
          component: () => import('../views/admin/user/teacher.vue'),
          meta: { roles: ['admin'], title: '教师管理' }
        },
        {
          path: 'admin/system/class',
          name: 'ClassManage',
          component: () => import('../views/admin/system/class.vue'),
          meta: { roles: ['admin'], title: '班级管理' }
        },
        {
          path: 'admin/system/menu',
          name: 'MenuManage',
          component: () => import('../views/admin/system/menu.vue'),
          meta: { roles: ['admin'], title: '菜单管理' }
        },
        {
          path: 'admin/system/role',
          name: 'RoleManage',
          component: () => import('../views/admin/system/role.vue'),
          meta: { roles: ['admin'], title: '角色权限' }
        },
        // Teacher Routes
        {
          path: 'teacher/knowledge/list',
          name: 'KnowledgeManage',
          component: () => import('../views/teacher/knowledge/list.vue'),
          meta: { roles: ['teacher'], title: '知识点管理' }
        },
        {
          path: 'teacher/question/list',
          name: 'QuestionList',
          component: () => import('../views/teacher/question/list.vue'),
          meta: { roles: ['teacher'], title: '试题题库' }
        },
        {
          path: 'teacher/exam/create',
          name: 'ExamCreate',
          component: () => import('../views/teacher/exam/create.vue'),
          meta: { roles: ['teacher'], title: '创建试卷' }
        },
        {
          path: 'teacher/exam/publish',
          name: 'ExamPublish',
          component: () => import('../views/teacher/exam/publish.vue'),
          meta: { roles: ['teacher'], title: '发布试卷' }
        },
        {
          path: 'teacher/feedback/list',
          name: 'FeedbackList',
          component: () => import('../views/teacher/feedback/list.vue'),
          meta: { roles: ['teacher'], title: '答疑管理' }
        },
        {
          path: 'teacher/score/report',
          name: 'ScoreReport',
          component: () => import('../views/teacher/score/report.vue'),
          meta: { roles: ['teacher'], title: '监考日志', hiddenSidebar: true } // Add hiddenSidebar
        },
        {
          path: 'teacher/ai-agent',
          name: 'AiAgent',
          component: () => import('../views/teacher/ai-agent/index.vue'),
          meta: { roles: ['teacher'], title: 'AI 智能出题' }
        },
        {
          path: 'teacher/exam/monitor/:id',
          name: 'ExamMonitor',
          component: () => import('../views/teacher/exam/monitor.vue'),
          meta: { roles: ['teacher'], title: '实时考试监控', hiddenSidebar: true } // Add hiddenSidebar
        },
        // Student Routes
        {
          path: 'student/exam/hall',
          name: 'ExamHall',
          component: () => import('../views/student/exam/hall.vue'),
          meta: { roles: ['student'], title: '考试大厅' }
        },
        {
          path: 'student/score/history',
          name: 'ScoreHistory',
          component: () => import('../views/student/score/history.vue'),
          meta: { roles: ['student'], title: '历史成绩' }
        },
        {
          path: 'student/score/detail/:id',
          name: 'ScoreDetail',
          component: () => import('../views/student/score/detail.vue'),
          meta: { roles: ['student'], title: '试卷详情' }
        },
        {
          path: 'student/mistake',
          name: 'StudentMistake',
          component: () => import('../views/student/mistake/index.vue'),
          meta: { roles: ['student'], title: '错题本' }
        },
        {
          path: 'student/knowledge/graph',
          name: 'KnowledgeGraph',
          component: () => import('../views/student/knowledge/graph.vue'),
          meta: { roles: ['student'], title: '知识图谱' }
        },
        {
          path: 'student/learning-path',
          name: 'LearningPathList',
          component: () => import('../views/student/learning-path/index.vue'),
          meta: { roles: ['student'], title: '学习路径中心' }
        },
        {
          path: 'student/profile/info',
          name: 'StudentProfileInfo',
          component: () => import('../views/profile/index.vue'),
          meta: { roles: ['student'], title: '个人资料' }
        },
        // 404 Fallback for dashboard routes
        {
          path: ':pathMatch(.*)*',
          redirect: '/dashboard/welcome'
        }
      ]
    },
    {
      path: '/learning-path/detail/:id',
      name: 'LearningPathDetail',
      component: () => import('../views/student/learning-path/detail.vue'),
      meta: { roles: ['student'], title: '学习计划详情' }
    },
    {
      path: '/exam/paper/:id',
      name: 'ExamPaper',
      component: () => import('../views/student/exam/paper.vue'),
      meta: { roles: ['student'], title: '在线考试中' }
    }
  ],
})

// Global Guard
router.beforeEach((to, from, next) => {
  const appTitle = import.meta.env.VITE_APP_TITLE || '在线考试系统'
  
  // 动态修改标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${appTitle}`
  } else {
    document.title = appTitle
  }

  const userStore = useUserStore()
  const hasToken = !!userStore.token
  const userRole = userStore.role

  if (to.path === '/login') {
    if (hasToken) {
      next({ path: '/dashboard' })
    } else {
      next()
    }
  } else {
    if (hasToken) {
      // Check roles
      if (to.meta.roles && to.meta.roles.length > 0) {
        if (to.meta.roles.includes(userRole)) {
          next()
        } else {
          next('/403')
        }
      } else {
        // No roles defined, assume public or allow
        next()
      }
    } else {
      next(`/login?redirect=${to.path}`)
    }
  }
})

export default router

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
      component: Login
    },
    {
      path: '/403',
      name: 'Forbidden',
      component: () => import('../views/403.vue')
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
          meta: { roles: ['admin', 'teacher', 'student'] }
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('../views/profile/index.vue'),
          meta: { roles: ['admin', 'teacher', 'student'] }
        },
        // Admin Routes
        {
          path: 'admin/user/student',
          name: 'StudentManage',
          component: () => import('../views/admin/user/student.vue'),
          meta: { roles: ['admin'] }
        },
        {
          path: 'admin/user/teacher',
          name: 'TeacherManage',
          component: () => import('../views/admin/user/teacher.vue'),
          meta: { roles: ['admin'] }
        },
        {
          path: 'admin/system/menu',
          name: 'MenuManage',
          component: () => import('../views/admin/system/menu.vue'),
          meta: { roles: ['admin'] }
        },
        {
          path: 'admin/system/role',
          name: 'RoleManage',
          component: () => import('../views/admin/system/role.vue'),
          meta: { roles: ['admin'] }
        },
        // Teacher Routes
        {
          path: 'teacher/question/list',
          name: 'QuestionList',
          component: () => import('../views/teacher/question/list.vue'),
          meta: { roles: ['teacher'] }
        },
        {
          path: 'teacher/exam/create',
          name: 'ExamCreate',
          component: () => import('../views/teacher/exam/create.vue'),
          meta: { roles: ['teacher'] }
        },
        {
          path: 'teacher/exam/publish',
          name: 'ExamPublish',
          component: () => import('../views/teacher/exam/publish.vue'),
          meta: { roles: ['teacher'] }
        },
        {
          path: 'teacher/feedback/list',
          name: 'FeedbackList',
          component: () => import('../views/teacher/feedback/list.vue'),
          meta: { roles: ['teacher'] }
        },
        {
          path: 'teacher/score/report',
          name: 'ScoreReport',
          component: () => import('../views/teacher/score/report.vue'),
          meta: { roles: ['teacher'] }
        },
        // Student Routes
        {
          path: 'student/exam/hall',
          name: 'ExamHall',
          component: () => import('../views/student/exam/hall.vue'),
          meta: { roles: ['student'] }
        },
        {
          path: 'student/score/history',
          name: 'ScoreHistory',
          component: () => import('../views/student/score/history.vue'),
          meta: { roles: ['student'] }
        },
        {
          path: 'student/score/detail/:id',
          name: 'ScoreDetail',
          component: () => import('../views/student/score/detail.vue'),
          meta: { roles: ['student'] }
        },
        {
          path: 'student/profile/info',
          name: 'StudentProfileInfo',
          component: () => import('../views/profile/index.vue'),
          meta: { roles: ['student'] }
        }
      ]
    },
    {
      path: '/exam/paper/:id',
      name: 'ExamPaper',
      component: () => import('../views/student/exam/paper.vue'),
      meta: { roles: ['student'] }
    }
  ],
})

// Global Guard
router.beforeEach((to, from, next) => {
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

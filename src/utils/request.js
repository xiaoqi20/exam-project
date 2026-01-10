import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'

// 创建 axios 实例
const service = axios.create({
  baseURL: '/api', // 使用代理
  timeout: 10000 // 稍微延长超时时间
})

// 是否正在刷新 Token 的标记
let isRefreshing = false
// 重试队列，每一项是一个函数
let requests = []

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers['token'] = userStore.token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    
    // 如果是二进制数据（如下载文件），直接返回
    if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
      return res
    }

    // 假设后端返回结构: { code: 200, msg: 'success', data: ... }
    // 兼容部分后端可能用 0 表示成功，或者直接返回数据的情况
    const code = res.code || 200

    if (code === 200) {
      return res.data
    } 
    
    // 处理 Token 过期
    if (code === 401) {
        // 如果没有 refreshToken，或者已经是刷新请求报错，直接退出
        const config = response.config
        if (config.__isRefreshToken || !useUserStore().refreshToken) {
             handleLogout()
             return Promise.reject(new Error('Token expired'))
        }
        
        return handleRefreshToken(config)
    }

    ElMessage.error(res.msg || '系统错误')
    return Promise.reject(new Error(res.msg || 'Error'))
  },
  async (error) => {
    // 处理 HTTP 状态码为非 2xx 的情况
    const { response, config } = error

    // 如果响应存在
    if (response) {
        // 401 Unauthorized
        if (response.status === 401) {
             // 如果是刷新接口本身报错，或者没有配置刷新逻辑，直接退出
             if (config.__isRefreshToken || !useUserStore().refreshToken) {
                 handleLogout()
                 return Promise.reject(error)
             }
             return handleRefreshToken(config)
        }
        
        // 403 Forbidden - 有时也表示 Token 无效
        if (response.status === 403) {
            // 如果是特定错误码，也可以视为过期
            if (response.data && response.data.code === 401) {
                handleLogout()
                return Promise.reject(error)
            }
            ElMessage.warning('您没有权限执行此操作')
            return Promise.reject(error)
        }
        
        const msg = response.data && response.data.msg ? response.data.msg : '请求失败'
        ElMessage.error(msg)
    } else {
        // 网络错误或超时
        ElMessage.error(error.message || '网络连接异常')
    }
    
    return Promise.reject(error)
  }
)

// 处理 Token 刷新的逻辑
async function handleRefreshToken(config) {
    const userStore = useUserStore()
    
    if (!userStore.refreshToken) {
        handleLogout()
        return Promise.reject(new Error('No refresh token'))
    }

    if (!isRefreshing) {
        isRefreshing = true
        
        try {
            // 这里为了避免循环引用，我们直接使用 axios 实例或者 fetch，或者小心地引入 api
            // 为了简单，我们手动构造一个请求，避免使用 service 实例（因为 service 实例会被拦截）
            // 但为了复用配置，我们还是用 axios.create 一个新的临时实例
            const refreshRes = await axios.post('/api/refresh', {
                refreshToken: userStore.refreshToken
            })
            
            // 假设返回结构 { code: 200, data: { token: 'new_token', refreshToken: 'new_refresh_token' } }
            // 或者直接是 data
            const data = refreshRes.data
            
            if (data.code === 200) {
                const newToken = data.data.token
                // 如果后端同时也更新了 refreshToken
                const newRefreshToken = data.data.refreshToken
                
                // 更新 Store
                userStore.setLoginState({
                    ...userStore.userInfo,
                    token: newToken,
                    refreshToken: newRefreshToken || userStore.refreshToken,
                    role: userStore.role === 'admin' ? 1 : (userStore.role === 'teacher' ? 2 : 3) // Hacky mapping back
                })
                
                // 执行队列中的请求
                requests.forEach(cb => cb(newToken))
                requests = []
                
                // 重试当前请求
                config.headers['token'] = newToken
                return service(config)
            } else {
                throw new Error('Refresh failed')
            }

        } catch (e) {
            console.error('Token refresh failed:', e)
            handleLogout()
            return Promise.reject(e)
        } finally {
            isRefreshing = false
        }
    } else {
        // 正在刷新中，将当前请求挂起
        return new Promise((resolve) => {
            requests.push((newToken) => {
                config.headers['token'] = newToken
                resolve(service(config))
            })
        })
    }
}

function handleLogout() {
    const userStore = useUserStore()
    const currentPath = router.currentRoute.value.path
    
    // 如果是在考试页面，不强制跳转，只提示（防止考生丢失进度）
    if (currentPath.includes('/exam/paper')) {
        import('element-plus').then(({ ElNotification }) => {
            ElNotification({
                title: '登录过期',
                message: '您的登录状态已失效。为防止数据丢失，请勿刷新页面，尝试在新窗口重新登录后再回来提交。',
                type: 'error',
                duration: 0
            })
        })
        return
    }

    // 其他常规页面，直接强制退出并跳转
    userStore.logout()
    if (currentPath !== '/login') {
        ElMessage.error('登录状态已过期，请重新登录')
        router.push(`/login?redirect=${router.currentRoute.value.fullPath}`)
    }
}

export default service
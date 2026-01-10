import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // Initialize from localStorage if available
  const token = ref(localStorage.getItem('exam-token') || '')
  const refreshToken = ref(localStorage.getItem('exam-refresh-token') || '')
  const role = ref(localStorage.getItem('user-role') || '') 
  const userInfo = ref(JSON.parse(localStorage.getItem('user-info') || '{}'))

  const roleMap = {
    1: 'admin',
    2: 'teacher',
    3: 'student'
  }

  // 纯粹的状态更新，不涉及 API 调用
  function setLoginState(data) {
    token.value = data.token
    // 如果后端返回了 refreshToken 则保存，否则尝试用 token (视后端具体实现而定)
    // 假设后端返回字段为 refreshToken
    if (data.refreshToken) {
        refreshToken.value = data.refreshToken
        localStorage.setItem('exam-refresh-token', data.refreshToken)
    }

    // Map integer role from backend to string role for frontend
    const roleStr = roleMap[data.role] || 'student' 
    role.value = roleStr
    
    userInfo.value = {
      name: data.name,
      id: data.id
    }
    
    // Save to localStorage
    localStorage.setItem('exam-token', data.token)
    localStorage.setItem('user-role', roleStr)
    localStorage.setItem('user-info', JSON.stringify(userInfo.value))
  }

  function logout() {
    token.value = ''
    refreshToken.value = ''
    role.value = ''
    userInfo.value = {}
    
    // Clear localStorage
    localStorage.removeItem('exam-token')
    localStorage.removeItem('exam-refresh-token')
    localStorage.removeItem('user-role')
    localStorage.removeItem('user-info')
  }

  return { token, refreshToken, role, userInfo, setLoginState, logout }
})
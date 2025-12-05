import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // Initialize from localStorage if available
  const token = ref(localStorage.getItem('exam-token') || '')
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
    role.value = ''
    userInfo.value = {}
    
    // Clear localStorage
    localStorage.removeItem('exam-token')
    localStorage.removeItem('user-role')
    localStorage.removeItem('user-info')
  }

  return { token, role, userInfo, setLoginState, logout }
})
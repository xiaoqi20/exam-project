import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // Initialize from localStorage if available
  const token = ref(localStorage.getItem('exam-token') || '')
  const role = ref(localStorage.getItem('user-role') || '') 
  const userInfo = ref(JSON.parse(localStorage.getItem('user-info') || '{"name":"User","avatar":""}'))

  function login(userRole, userData) {
    const mockToken = 'mock-token-' + Date.now()
    token.value = mockToken
    role.value = userRole
    userInfo.value = userData
    
    // Save to localStorage
    localStorage.setItem('exam-token', mockToken)
    localStorage.setItem('user-role', userRole)
    localStorage.setItem('user-info', JSON.stringify(userData))
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

  return { token, role, userInfo, login, logout }
})
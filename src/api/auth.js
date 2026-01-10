import request from '@/utils/request'

export function login(data) {
  return request({
    url: '/login',
    method: 'post',
    data
  })
}

// 修改个人资料 (邮箱等)
export function updateProfile(data) {
  return request({
    url: '/user/profile',
    method: 'put',
    data
  })
}

// 修改密码
export function updatePassword(data) {
  return request({
    url: '/user/password',
    method: 'put',
    data
  })
}

// 刷新 Token
export function refreshToken(token) {
  return request({
    url: '/refresh',
    method: 'post',
    data: {
      refreshToken: token
    },
    // 特殊标记：避免刷新接口本身401时死循环
    __isRefreshToken: true 
  })
}

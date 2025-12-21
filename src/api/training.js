import request from '@/utils/request'

// 获取每日特训题目
export function getDailyTraining() {
  return request({
    url: '/training/daily',
    method: 'get'
  })
}

// 提交特训记录 (可选)
export function recordTraining(data) {
  return request({
    url: '/training/record',
    method: 'post',
    data
  })
}

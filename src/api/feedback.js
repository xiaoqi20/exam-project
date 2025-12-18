import request from '@/utils/request'

// 学生提交疑问
export function addFeedback(data) {
  return request({
    url: '/feedback',
    method: 'post',
    data
  })
}

// 获取反馈列表 (教师用)
export function getFeedbackList(params) {
  return request({
    url: '/feedback/list',
    method: 'get',
    params
  })
}

// 教师回复
export function replyFeedback(data) {
  return request({
    url: '/feedback/reply',
    method: 'put',
    data
  })
}

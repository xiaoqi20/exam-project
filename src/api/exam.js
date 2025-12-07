import request from '@/utils/request'

export function getExamPaper(id) {
  return request({
    url: `/examPaper/preview/${id}`,
    method: 'get'
  })
}

export function enterExam(id) {
  return request({
    url: `/examPaper/enter/${id}`,
    method: 'get'
  })
}

export function submitExam(data) {
  // 预留提交接口
  return request({
    url: '/examPaper/submit', 
    method: 'post',
    data
  })
}

export function getScoreHistory(studentId, params) {
  return request({
    url: `/student/score/${studentId}`,
    method: 'get',
    params
  })
}

export function getScoreDetail(scoreId) {
  return request({
    url: `/student/exam/detail/${scoreId}`,
    method: 'get'
  })
}
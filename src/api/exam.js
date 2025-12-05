import request from '@/utils/request'

export function getExamPaper(id) {
  return request({
    url: `/examPaper/preview/${id}`,
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

import request from '@/utils/request'

// 创建试卷基本信息
export function createExamPaper(data) {
  return request({
    url: '/examPaper',
    method: 'post',
    data // { title, duration, totalMark, status }
  })
}

// 向试卷添加题目 (已存在接口)
export function addQuestionsToPaper(data) {
  return request({
    url: '/examPaper/addQuestions',
    method: 'post',
    data // { paperId, questionIds: [] }
  })
}

// 修改试卷基本信息
export function updateExamPaper(data) {
  return request({
    url: '/examPaper',
    method: 'put',
    data
  })
}

// 删除试卷
export function deleteExamPaper(id) {
  return request({
    url: `/examPaper/${id}`,
    method: 'delete'
  })
}

// 修改试卷状态 (status: 0=Draft, 1=Published, 2=Ended)
export function updateExamPaperStatus(id, status) {
  return request({
    url: `/examPaper/status/${id}`,
    method: 'put',
    params: { status }
  })
}

// 获发布试卷
export function publishExamPaper(id, data) {
  return request({
    url: `/examPaper/publish/${id}`,
    method: 'put',
    data
  })
}

// 获取试卷列表 (学生大厅/管理端用)
export function getExamPaperList(params) {
  return request({
    url: '/examPaper/list',
    method: 'get',
    params
  })
}

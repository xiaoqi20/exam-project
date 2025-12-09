import request from '@/utils/request'

// 创建试卷基本信息 (待后端实现)
export function createExamPaper(data) {
  return request({
    url: '/examPaper', // 假设的接口
    method: 'post',
    data // { title, duration }
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

// 获发布试卷
export function publishExamPaper(id) {
  return request({
    url: `/examPaper/publish/${id}`,
    method: 'put'
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

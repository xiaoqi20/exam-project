import request from '@/utils/request'

export function getQuestionList(params) {
  return request({
    url: '/question/list',
    method: 'get',
    params
  })
}

// 预留其他接口，待后端实现
export function addQuestion(data) {
  return request({
    url: '/question/add',
    method: 'post',
    data
  })
}

export function updateQuestion(data) {
  return request({
    url: '/question/update',
    method: 'put',
    data
  })
}

export function deleteQuestion(id) {
  return request({
    url: `/question/delete/${id}`,
    method: 'delete'
  })
}

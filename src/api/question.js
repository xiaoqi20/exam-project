import request from '@/utils/request'

export function getQuestionList(params) {
  return request({
    url: '/question/list',
    method: 'get',
    params
  })
}

export function addQuestion(data) {
  return request({
    url: '/question',
    method: 'post',
    data
  })
}

export function updateQuestion(data) {
  return request({
    url: '/question',
    method: 'put',
    data
  })
}

export function deleteQuestion(id) {
  return request({
    url: `/question/${id}`,
    method: 'delete'
  })
}

// Excel 批量导入
export function importQuestions(formData) {
  return request({
    url: '/question/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
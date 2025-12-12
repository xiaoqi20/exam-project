import request from '@/utils/request'

// 获取学生列表
export function getStudentList(params) {
  return request({
    url: '/student/list',
    method: 'get',
    params
  })
}

// 新增学生
export function addStudent(data) {
  return request({
    url: '/student',
    method: 'post',
    data
  })
}

// 修改学生
export function updateStudent(data) {
  return request({
    url: '/student',
    method: 'put',
    data
  })
}

// 删除学生
export function deleteStudent(id) {
  return request({
    url: `/student/${id}`,
    method: 'delete'
  })
}

// 获取学生详情
export function getStudentDetail(id) {
  return request({
    url: `/student/${id}`,
    method: 'get'
  })
}

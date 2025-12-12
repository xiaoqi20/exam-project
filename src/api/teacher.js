import request from '@/utils/request'

// 获取教师列表
export function getTeacherList(params) {
  return request({
    url: '/teacher/list',
    method: 'get',
    params
  })
}

// 新增教师
export function addTeacher(data) {
  return request({
    url: '/teacher',
    method: 'post',
    data
  })
}

// 修改教师
export function updateTeacher(data) {
  return request({
    url: '/teacher',
    method: 'put',
    data
  })
}

// 删除教师
export function deleteTeacher(id) {
  return request({
    url: `/teacher/${id}`,
    method: 'delete'
  })
}

// 获取教师详情
export function getTeacherDetail(id) {
  return request({
    url: `/teacher/${id}`,
    method: 'get'
  })
}

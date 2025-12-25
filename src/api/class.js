import request from '@/utils/request'

// 1. 分页获取班级列表
export function getClassList(params) {
  return request({
    url: '/admin/class/list',
    method: 'get',
    params
  })
}

// 2. 获取所有班级（用于下拉框选择）
export function getAllClasses() {
  return request({
    url: '/admin/class/all',
    method: 'get'
  })
}

// 3. 新增班级
export function addClass(data) {
  return request({
    url: '/admin/class',
    method: 'post',
    data
  })
}

// 4. 修改班级
export function updateClass(data) {
  return request({
    url: '/admin/class',
    method: 'put',
    data
  })
}

// 5. 删除班级
export function deleteClass(id) {
  return request({
    url: `/admin/class/${id}`,
    method: 'delete'
  })
}

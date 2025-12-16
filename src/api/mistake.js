import request from '@/utils/request'

// 获取错题列表
export function getMistakeList(params) {
  return request({
    url: '/mistake/list',
    method: 'get',
    params
  })
}

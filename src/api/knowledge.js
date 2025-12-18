import request from '@/utils/request'

// --- 学生端 ---

// 获取个人知识图谱分析数据
export function getKnowledgeAnalysis() {
  return request({
    url: '/knowledge/analysis/my',
    method: 'get'
  })
}

// --- 教师端 ---

// 获取知识点树
export function getKnowledgeTree() {
  return request({
    url: '/knowledge/tree',
    method: 'get'
  })
}

// 新增知识点
export function addKnowledge(data) {
  return request({
    url: '/knowledge',
    method: 'post',
    data
  })
}

// 修改知识点
export function updateKnowledge(data) {
  return request({
    url: '/knowledge',
    method: 'put',
    data
  })
}

// 删除知识点
export function deleteKnowledge(id) {
  return request({
    url: `/knowledge/${id}`,
    method: 'delete'
  })
}

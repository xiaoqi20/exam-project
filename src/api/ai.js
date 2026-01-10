import request from '@/utils/request'

// AI 题目解析 (流式，已存在)
export function getAiAnalysisStream(params) {
  return request({
    url: '/ai/analyze/stream',
    method: 'get',
    params,
    responseType: 'stream'
  })
}

// AI 变式题生成 (新功能)
// Payload: { questionId: 123, count: 3 }
export function generateSimilarQuestions(data) {
  return request({
    url: '/ai/generate/questions', // 假设的后端接口
    method: 'post',
    data,
    timeout: 30000 // AI 生成较慢，延长超时
  })
}

// AI 判分 (用于简答题，已存在)
export function gradeSubjectiveQuestion(data) {
  return request({
    url: '/ai/grade',
    method: 'post',
    data
  })
}

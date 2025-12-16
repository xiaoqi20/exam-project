import request from '@/utils/request'

export function getRecommendedQuestions() {
  return request({
    url: '/student/exam/recommend',
    method: 'get',
    timeout: 60000 // Set timeout to 60 seconds for AI generation
  })
}
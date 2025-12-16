import request from '@/utils/request'

export function getStatsSummary() {
  return request({
    url: '/admin/stats/summary',
    method: 'get'
  })
}

export function getDailyActivity() {
  return request({
    url: '/admin/stats/daily-activity',
    method: 'get'
  })
}

export function getQuestionDistribution() {
  return request({
    url: '/admin/stats/question-distribution',
    method: 'get'
  })
}
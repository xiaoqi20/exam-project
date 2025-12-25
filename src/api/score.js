import request from '@/utils/request'

// 查询某试卷的所有学生成绩 (教师用)
export function getPaperScoreList(paperId) {
  return request({
    url: `/score/paper/${paperId}`,
    method: 'get'
  })
}

// 获取学生历史成绩 (学生用)
export function getScoreHistory(studentId, params) {
  return request({
    url: `/student/score/${studentId}`,
    method: 'get',
    params
  })
}

// 获取成绩详情 (答卷回顾)
export function getScoreDetail(id) {
  return request({
    url: `/student/exam/detail/${id}`,
    method: 'get'
  })
}

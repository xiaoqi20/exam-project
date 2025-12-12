import request from '@/utils/request'

// 查询某试卷的所有学生成绩
export function getPaperScoreList(paperId) {
  return request({
    url: `/score/paper/${paperId}`,
    method: 'get'
  })
}

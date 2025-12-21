import request from '@/utils/request'

// 获取评论列表
export function getCommentList(questionId) {
  return request({
    url: '/comment/list',
    method: 'get',
    params: { questionId }
  })
}

// 发表评论
export function addComment(data) {
  // data: { questionId, content }
  return request({
    url: '/comment',
    method: 'post',
    data
  })
}

// 点赞评论
export function likeComment(commentId) {
  return request({
    url: `/comment/like/${commentId}`,
    method: 'post'
  })
}
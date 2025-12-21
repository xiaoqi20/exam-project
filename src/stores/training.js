import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDailyTraining } from '@/api/training'
import { ElMessage } from 'element-plus'

export const useTrainingStore = defineStore('training', () => {
  const visible = ref(false)
  const loading = ref(false)
  const questions = ref([])

  // 打开特训弹窗并加载数据
  const openTraining = async () => {
    visible.value = true
    loading.value = true
    try {
      const res = await getDailyTraining()
      // 适配数据格式，处理 options 字符串
      const data = res.data || res
      questions.value = data.map(q => {
        let parsedOptions = {}
        
        if (typeof q.options === 'object' && q.options !== null) {
            parsedOptions = q.options
        } else if (typeof q.options === 'string') {
            const raw = q.options
            
            // 1. 预处理：转义换行符
            const sanitized = raw.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
            
            try {
                // 尝试 1: 标准 JSON
                parsedOptions = JSON.parse(sanitized)
            } catch (e1) {
                try {
                    // 尝试 2: 宽松 JS 对象
                    const looseParse = new Function("return " + sanitized)
                    parsedOptions = looseParse()
                } catch (e2) {
                    // 尝试 3: 正则暴力提取 (针对损坏的 JSON)
                    // 匹配 "A":"xxx" 或 A: "xxx" 或 A: xxx
                    const regex = /["']?([A-E])["']?\s*[:：]\s*["']?((?:[^"'}]+|\\.)*)["']?/g
                    let match
                    let extracted = {}
                    let hasMatch = false
                    while ((match = regex.exec(raw)) !== null) {
                        hasMatch = true
                        extracted[match[1]] = match[2].trim()
                    }
                    
                    if (hasMatch) {
                        parsedOptions = extracted
                    } else {
                        // 尝试 4 (最终兜底): 直接显示原始字符串，死活也要显示出来
                        console.error('Options 解析失败，降级显示原始文本:', raw)
                        // 清洗一下首尾括号
                        const cleanRaw = raw.replace(/^[{'"]+|[}'"]+$/g, '')
                        parsedOptions = { '选项': cleanRaw }
                    }
                }
            }
        }

        let type = q.type || 'choice'
        // 中文映射
        if (type === '单选题') type = 'choice'
        else if (type === '多选题') type = 'multiple_choice'
        else if (type === '判断题') type = 'true_false'

        return {
          ...q,
          type,
          options: parsedOptions,
          // 多选初始化为空数组，单选/判断为空字符串
          userAnswer: type === 'multiple_choice' ? [] : '',
          showAnalysis: false,
          isCorrect: null
        }
      })
    } catch (e) {
      console.error('加载特训题目失败', e)
      ElMessage.error('加载特训题目失败，请稍后再试')
      visible.value = false
    } finally {
      loading.value = false
    }
  }

  const closeTraining = () => {
    visible.value = false
    questions.value = []
  }

  return {
    visible,
    loading,
    questions,
    openTraining,
    closeTraining
  }
})

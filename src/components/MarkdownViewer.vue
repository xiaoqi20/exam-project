<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const htmlContent = computed(() => {
  if (!props.content) return ''
  return marked.parse(props.content)
})
</script>

<template>
  <div class="ai-result-content" v-html="htmlContent"></div>
</template>

<style scoped>
/* AI 解析结果容器 */
.ai-result-content {
    background: transparent; 
    line-height: 1.8;
    color: #333333;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 15px;
}

/* -----------------------------------
   Markdown 内部元素样式 (适配 marked.js)
   ----------------------------------- */

/* 加粗文字 (用于高亮 "正确答案" 等关键词) */
.ai-result-content :deep(strong) {
    color: #d63384; 
    font-weight: 600;
}

/* 无序列表 (用于选项分析) */
.ai-result-content :deep(ul) {
    padding-left: 20px;
    margin-top: 16px; /* Increased */
    margin-bottom: 16px;
    display: block;
}

/* 列表项 */
.ai-result-content :deep(li) {
    margin-bottom: 12px;
    display: list-item;
}

/* 段落 */
.ai-result-content :deep(p) {
    margin-bottom: 16px; /* Increased spacing between paragraphs */
}

/* 标题 (H3, H4 used for sections like "Error Analysis") */
.ai-result-content :deep(h1), 
.ai-result-content :deep(h2), 
.ai-result-content :deep(h3),
.ai-result-content :deep(h4) {
    margin-top: 30px; /* Force large separation */
    margin-bottom: 16px;
    font-weight: 600;
    color: #333;
    line-height: 1.4;
    border-bottom: none; /* Clean look */
}

/* 分割线 */
.ai-result-content :deep(hr) {
    margin: 24px 0;
    border: 0;
    border-top: 1px solid #eee;
}

/* 光标样式 */
.cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background: #333;
    vertical-align: text-bottom;
    margin-left: 2px;
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
</style>

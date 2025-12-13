# AI 解析结果样式指南

这是后端调试台使用的样式配置，请前端参考此样式进行渲染。

## 1. 核心 CSS 样式

建议为显示解析结果的容器添加类名 `.ai-result-content`。

```css
/* AI 解析结果容器 */
.ai-result-content {
    background: #ffffff;
    border: 1px solid #dddddd;
    border-radius: 4px;
    padding: 20px;
    min-height: 100px;
    
    /* 核心排版参数 */
    line-height: 1.8;       /* 较大的行高，阅读舒适 */
    color: #333333;         /* 深灰字体，比纯黑更柔和 */
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* 现代无衬线字体 */
    font-size: 15px;
}

/* -----------------------------------
   Markdown 内部元素样式 (适配 marked.js)
   ----------------------------------- */

/* 加粗文字 (用于高亮 "正确答案" 等关键词) */
.ai-result-content strong {
    color: #d63384;         /* 亮粉紫色，醒目但不刺眼 */
    font-weight: 600;
}

/* 无序列表 (用于选项分析) */
.ai-result-content ul {
    padding-left: 20px;
    margin-top: 10px;
    margin-bottom: 10px;
    display: block;
}

/* 列表项 (确保选项之间有呼吸感) */
.ai-result-content li {
    margin-bottom: 12px;    /* 列表项之间的间距 */
    display: list-item;
}

/* 段落 */
.ai-result-content p {
    margin-bottom: 10px;
}

/* -----------------------------------
   光标闪烁动画 (打字机效果必备)
   ----------------------------------- */
.cursor {
    display: inline-block;
    width: 2px;
    height: 1em;            /* 跟随当前字号 */
    background: #333;
    vertical-align: text-bottom;
    margin-left: 2px;
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
```

## 2. Vue 组件集成示例

```vue
<template>
  <div class="ai-result-content">
    <!-- 使用 v-html 渲染 Markdown 转换后的 HTML -->
    <div v-html="renderedHtml"></div>
    <!-- 正在生成时显示光标 -->
    <span v-if="loading" class="cursor"></span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked'; // 需 npm install marked

const props = defineProps(['rawText', 'loading']);

const renderedHtml = computed(() => {
  return marked.parse(props.rawText || '');
});
</script>

<!-- 引入上面的 CSS -->
<style scoped>
@import './ai-result.css'; 
</style>
```

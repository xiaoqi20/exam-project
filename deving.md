# 项目开发进度报告 (Dev Progress)

**更新日期:** 2025-12-18
**当前状态:** 🟢 开发中 (In Progress)

## 1. 核心模块进展 (Core Modules)

### 🎓 学生端 - 考试模块 (Student Exam)
*   **试卷答题 (`src/views/student/exam/paper.vue`)**
    *   ✅ **全流程闭环**: 完成“进入考试 -> 答题 -> 提交”全流程。
    *   ✨ **练习模式**: 支持 `id='practice'` 的临时组卷模式，不依赖后端发卷接口，直接渲染 Store 中的题目，提交时不调用后端接口。
*   **错题本 (`src/views/student/mistake/index.vue`)**
    *   ✅ **列表展示**: 分页展示错题，支持正确/错误答案对比高亮。
    *   ✨ **AI 智能解析**: 集成 SSE 流式接口，实时生成题目解析，支持 Markdown 渲染。
*   **成绩详情 (`src/views/student/score/detail.vue`)**
    *   ✅ **解析折叠**: 过长解析自动收起，支持一键展开。
    *   ✨ **答疑互动**: 支持针对单题提交疑问，并展示老师的回复。

### 🧠 知识图谱 (Knowledge Graph)
*   **学生端 (`src/views/student/knowledge/graph.vue`)**:
    *   ✨ **可视化图表**: 使用 ECharts 树图展示个人知识体系。
    *   🎨 **状态感知**: 节点颜色根据掌握度自动变化（红/黄/绿）。
*   **教师端 (`src/views/teacher/knowledge/list.vue`)**:
    *   ✅ **知识点管理**: 支持树形结构的增删改查。
    *   🔗 **题目关联**: 新增试题时支持关联知识点，并在弹窗中集成了 `el-tree-select`。

### 💬 答疑管理与实时互动 (Feedback & Interaction)
*   **学生端**: 在试卷详情页提交疑问，自动关联试卷和题目。
*   **教师端 (`src/views/teacher/feedback/list.vue`)**:
    *   ✅ **反馈列表**: 查看待处理和已回复的疑问。
    *   💬 **回复功能**: 支持对学生的疑问进行文本回复。
*   **实时通知 (`src/stores/notify.js`, `src/components/NotifyBell.vue`)**:
    *   🚀 **WebSocket 集成**: 实现全链路实时消息推送，老师回复后学生端秒级收到提醒。
    *   🔔 **UI 交互**: 右上角铃铛红点、下拉消息列表及全局通知浮窗。

### 🤖 AI 智能化 (AI Features)
*   **个性化推题**: 首页每日一练入口。
*   **AI 识别**: 教师录题时支持 AI 自动识别题目知识点（接口预留）。

## 2. 最近变更 (Recent Changes)
1.  **Feat (Knowledge)**: 完成知识图谱模块，前后端打通。
2.  **Feat (Feedback)**: 完成答疑反馈闭环，支持学生提问、老师回复。
3.  **Refactor (UI)**: 优化试卷详情页 UI，增加解析折叠和答疑卡片；优化教师端录题弹窗宽度。

## 3. 待办事项 (To-Do List)

### 🚀 进阶功能 (Advanced Features)
- [ ] **防作弊**: 增加切屏检测与强制全屏。
- [ ] **邮件系统扩展**:
    - [ ] **找回密码**: 集成 SMTP 服务，支持通过邮箱验证码重置密码。
    - [ ] **成绩推送**: 考试完成后自动将成绩报告发送至学生邮箱。
    - [ ] **考试提醒**: 考试开始前发送邮件提醒学生。

### 📦 系统/公共模块 (System)
- [ ] **权限与安全**: 进一步加固路由守卫。

## 4. 系统环境
- **OS**: win32
- **Project Path**: `C:\Users\Administrator\Desktop\exam\exam-project`
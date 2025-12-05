<template>
  <div class="error-container">
    <div class="error-content">
      <h1 class="error-code">403</h1>
      <div class="error-desc">抱歉，您无权访问该页面</div>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<style scoped>
.error-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f2f5;
}
.error-content {
  text-align: center;
}
.error-code {
  font-size: 120px;
  font-weight: bold;
  color: #606266;
  margin: 0;
}
.error-desc {
  font-size: 24px;
  color: #909399;
  margin: 20px 0 30px;
}
</style>
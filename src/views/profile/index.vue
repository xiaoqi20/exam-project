<script setup>
import { reactive, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { User, Iphone, Lock } from '@element-plus/icons-vue'

const userStore = useUserStore()
const activeTab = ref('info')

// 模拟当前用户信息（实际应从 store 或 API 获取完整信息）
const userInfoForm = reactive({
  username: userStore.userInfo.name,
  phone: '13800138000', // 示例数据
  avatar: userStore.userInfo.avatar || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordFormRef = ref(null)

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleUpdateInfo = () => {
  // TODO: 调用更新用户信息 API
  userStore.userInfo.name = userInfoForm.username
  userStore.userInfo.avatar = userInfoForm.avatar
  ElMessage.success('个人信息修改成功')
}

const handleChangePassword = async (formEl) => {
  if (!formEl) return
  await formEl.validate((valid) => {
    if (valid) {
      // TODO: 调用修改密码 API
      ElMessage.success('密码修改成功，请重新登录')
      // 实际场景可能需要登出
      // userStore.logout()
      // router.push('/login')
    }
  })
}
</script>

<template>
  <div class="app-container">
    <el-row :gutter="20">
      <el-col :span="8" :xs="24">
        <el-card class="box-card">
          <template #header>
            <div class="clearfix">
              <span>个人信息</span>
            </div>
          </template>
          <div class="text-center user-profile-header">
            <el-avatar :size="100" :src="userInfoForm.avatar" class="user-avatar" />
            <div class="user-name">{{ userStore.userInfo.name }}</div>
            <div class="user-role">{{ userStore.role === 'admin' ? '管理员' : userStore.role === 'teacher' ? '教师' : '学生' }}</div>
          </div>
          <div class="user-info-section">
            <div class="user-info-item">
              <div class="label">
                <el-icon><User /></el-icon>
                <span>登录账号</span>
              </div>
              <div class="value">{{ userInfoForm.username }}</div>
            </div>
            <div class="user-info-item">
              <div class="label">
                <el-icon><Iphone /></el-icon>
                <span>手机号码</span>
              </div>
              <div class="value">{{ userInfoForm.phone }}</div>
            </div>
            <div class="user-info-item">
              <div class="label">
                <el-icon><Lock /></el-icon>
                <span>安全状态</span>
              </div>
              <div class="value"><el-tag type="success" size="small">安全</el-tag></div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="16" :xs="24">
        <el-card>
          <template #header>
            <div class="clearfix">
              <span>基本资料</span>
            </div>
          </template>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本资料" name="info">
              <el-form :model="userInfoForm" label-width="80px">
                <el-form-item label="用户昵称">
                  <el-input v-model="userInfoForm.username" />
                </el-form-item>
                <el-form-item label="手机号码">
                  <el-input v-model="userInfoForm.phone" maxlength="11" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="handleUpdateInfo">保存配置</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="修改密码" name="password">
              <el-form 
                ref="passwordFormRef" 
                :model="passwordForm" 
                :rules="passwordRules" 
                label-width="80px"
              >
                <el-form-item label="旧密码" prop="oldPassword">
                  <el-input v-model="passwordForm.oldPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input v-model="passwordForm.newPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="handleChangePassword(passwordFormRef)">保存</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.app-container {
  padding: 10px;
}

.user-profile-header {
  padding: 20px 0;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 20px;
}

.user-avatar {
  border: 4px solid #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}
.user-avatar:hover {
  transform: scale(1.05);
}

.user-name {
  font-size: 24px;
  font-weight: 600;
  margin-top: 15px;
  color: #303133;
}

.user-role {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.user-info-section {
  padding: 0 10px;
}

.user-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #f0f2f5;
  font-size: 14px;
}

.user-info-item:last-child {
  border-bottom: none;
}

.user-info-item .label {
  display: flex;
  align-items: center;
  color: #606266;
}

.user-info-item .label .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

.user-info-item .value {
  color: #303133;
  font-weight: 500;
}
</style>
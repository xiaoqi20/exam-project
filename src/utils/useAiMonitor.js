import * as faceapi from 'face-api.js'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request' 

export function useAiMonitor() {
    const videoEl = ref(null)
    const isMonitoring = ref(false)
    const stream = ref(null)
    const status = ref('INIT') 
    const warningMsg = ref('')
    let onWarningCallback = null 
    let lastAlertTime = 0 // 记录上次报警时间
    
    let checkInterval = null
    let config = {
        interval: 1000, 
        faceCountLimit: 1,
        allowBlur: false,
        alertCooldown: 20000 // 冷却时间 20秒
    }

    const loadModels = async () => {
        status.value = 'LOADING'
        try {
            const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights'
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ])
            console.log('AI Models Loaded')
        } catch (e) {
            console.error('模型加载失败:', e)
            status.value = 'ERROR'
            ElMessage.error('AI 组件加载失败')
        }
    }

    const startCamera = async (videoRefArg) => {
        isMonitoring.value = true 
        let el = videoRefArg.value
        if (!el) {
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 100))
                el = videoRefArg.value
                if (el) break
            }
        }
        
        videoEl.value = el
        try {
            stream.value = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
            if (el) {
                el.srcObject = stream.value
                el.onloadedmetadata = () => { el.play() }
            }
            status.value = 'ACTIVE'
            startDetectionLoop()
        } catch (e) {
            console.error('摄像头权限拒绝:', e)
            isMonitoring.value = false
            status.value = 'ERROR'
        }
    }

    const startDetectionLoop = () => {
        const options = new faceapi.TinyFaceDetectorOptions()
        checkInterval = setInterval(async () => {
            if (!videoEl.value || videoEl.value.paused || videoEl.value.ended) return
            const detections = await faceapi.detectAllFaces(videoEl.value, options).withFaceLandmarks()
            const faceCount = detections.length
            
            if (faceCount === 0) {
                handleWarning('MISSING', '检测不到考生，请回到座位')
            } else if (faceCount > config.faceCountLimit) {
                handleWarning('MULTIPLE', '检测到多张人脸，疑似作弊')
            } else {
                if (config.allowBlur && faceCount === 1) {
                    const pose = estimateHeadPose(detections[0].landmarks)
                    if (pose.turn) {
                        handleWarning('POSE', '请注视屏幕，不要左顾右盼')
                        return
                    }
                }
                clearWarning()
            }
        }, config.interval)
    }

    const estimateHeadPose = (landmarks) => {
        const nose = landmarks.getNose()[3]
        const jaw = landmarks.getJawOutline()
        const leftJaw = jaw[0], rightJaw = jaw[16]
        const faceWidth = rightJaw.x - leftJaw.x
        const noseX = nose.x - leftJaw.x
        const ratioX = noseX / faceWidth
        return { turn: ratioX < 0.35 || ratioX > 0.65 }
    }

    let warningTimer = null
    const handleWarning = (type, msg) => {
        const now = Date.now()
        // 1. 如果正在 5秒防抖倒计时，不重复触发
        if (warningTimer) return 
        
        // 2. 冷却检查：如果已经报过警，且距离上次抓拍不足 20秒
        if (warningMsg.value === msg && (now - lastAlertTime < config.alertCooldown)) return

        warningTimer = setTimeout(() => {
            warningMsg.value = msg
            lastAlertTime = Date.now()
            if (onWarningCallback) {
                onWarningCallback({ type, msg, timestamp: lastAlertTime })
            }
            warningTimer = null 
        }, 5000) // 5秒确认时间
    }

    const clearWarning = () => {
        if (warningTimer) { clearTimeout(warningTimer); warningTimer = null }
        if (warningMsg.value) { warningMsg.value = ''; lastAlertTime = 0 } // 清除报警状态，但不重置冷却时间，这符合逻辑
    }

    const stopMonitor = () => {
        isMonitoring.value = false
        if (checkInterval) clearInterval(checkInterval)
        if (stream.value) stream.value.getTracks().forEach(track => track.stop())
    }

    const takeSnapshot = async (examId, studentId, alertType) => {
        if (!videoEl.value) return null
        const canvas = document.createElement('canvas')
        canvas.width = videoEl.value.videoWidth
        canvas.height = videoEl.value.videoHeight
        canvas.getContext('2d').drawImage(videoEl.value, 0, 0)
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                const formData = new FormData()
                formData.append('file', blob, `snap_${Date.now()}.jpg`)
                formData.append('examId', examId); formData.append('studentId', studentId); formData.append('type', alertType)
                try {
                    const res = await request.post('/exam/monitor/upload-snapshot', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    })
                    resolve(res) 
                } catch (e) { resolve(null) }
            }, 'image/jpeg', 0.7)
        })
    }

    return {
        videoEl, isMonitoring, status, warningMsg,
        loadModels, startCamera, stopMonitor, takeSnapshot,
        updateConfig: (cfg) => { Object.assign(config, cfg) },
        onWarning: (cb) => { onWarningCallback = cb }
    }
}

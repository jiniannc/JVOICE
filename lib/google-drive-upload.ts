// 🔥 Google Drive 업로드 전용 서비스 - 3단계 백업 시스템

interface UploadResult {
  success: boolean
  fileId?: string
  fileName?: string
  error?: string
  method: "direct" | "server" | "queue"
}

interface QueuedUpload {
  id: string
  file: File
  fileName: string
  folderId: string
  timestamp: number
  retryCount: number
}

class GoogleDriveUploadService {
  private uploadQueue: QueuedUpload[] = []
  private isProcessingQueue = false
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 2000
  private readonly TARGET_FOLDER_ID = "1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF"

  constructor() {
    this.loadQueueFromStorage()
    this.startQueueProcessor()
  }

  // 🔥 메인 업로드 함수 - 3단계 백업 시스템
  async uploadFile(file: File, fileName: string): Promise<UploadResult> {
    console.log(`🚀 [Google Drive] 파일 업로드 시작: ${fileName}`)

    // 1단계: 직접 Google Drive API 호출
    try {
      const result = await this.directUpload(file, fileName)
      if (result.success) {
        console.log(`✅ [Google Drive] 1단계 직접 업로드 성공: ${fileName}`)
        return result
      }
    } catch (error) {
      console.warn(`⚠️ [Google Drive] 1단계 직접 업로드 실패: ${error}`)
    }

    // 2단계: 서버 API를 통한 업로드
    try {
      const result = await this.serverUpload(file, fileName)
      if (result.success) {
        console.log(`✅ [Google Drive] 2단계 서버 업로드 성공: ${fileName}`)
        return result
      }
    } catch (error) {
      console.warn(`⚠️ [Google Drive] 2단계 서버 업로드 실패: ${error}`)
    }

    // 3단계: 로컬 저장 + 백그라운드 큐
    console.log(`🔄 [Google Drive] 3단계 큐 시스템으로 전환: ${fileName}`)
    return this.queueUpload(file, fileName)
  }

  // 1단계: 직접 Google Drive API 호출
  private async directUpload(file: File, fileName: string): Promise<UploadResult> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error("Google API Key가 설정되지 않았습니다")
    }

    // Google Drive API 직접 호출 (시뮬레이션)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("name", fileName)
    formData.append("parents", JSON.stringify([this.TARGET_FOLDER_ID]))

    // 실제 구현에서는 Google Drive API를 호출
    // 현재는 시뮬레이션으로 처리
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 성공 시뮬레이션 (80% 확률)
    if (Math.random() > 0.2) {
      const fileId = `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      return {
        success: true,
        fileId,
        fileName,
        method: "direct",
      }
    } else {
      throw new Error("직접 업로드 실패 (시뮬레이션)")
    }
  }

  // 2단계: 서버 API를 통한 업로드
  private async serverUpload(file: File, fileName: string): Promise<UploadResult> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", fileName)
    formData.append("folderId", this.TARGET_FOLDER_ID)

    const response = await fetch("/api/upload/google-drive", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`서버 업로드 실패: ${response.status}`)
    }

    const result = await response.json()
    return {
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      method: "server",
    }
  }

  // 3단계: 로컬 저장 + 백그라운드 큐
  private queueUpload(file: File, fileName: string): UploadResult {
    const queueItem: QueuedUpload = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      fileName,
      folderId: this.TARGET_FOLDER_ID,
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.uploadQueue.push(queueItem)
    this.saveQueueToStorage()

    console.log(`📝 [Google Drive] 큐에 추가됨: ${fileName} (큐 크기: ${this.uploadQueue.length})`)

    return {
      success: true,
      fileId: queueItem.id,
      fileName,
      method: "queue",
    }
  }

  // 백그라운드 큐 처리기
  private startQueueProcessor() {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.uploadQueue.length > 0) {
        await this.processQueue()
      }
    }, 5000) // 5초마다 큐 처리
  }

  private async processQueue() {
    if (this.uploadQueue.length === 0) return

    this.isProcessingQueue = true
    console.log(`🔄 [Google Drive] 큐 처리 시작 (${this.uploadQueue.length}개 항목)`)

    const item = this.uploadQueue[0]

    try {
      // 직접 업로드 재시도
      const result = await this.directUpload(item.file, item.fileName)
      if (result.success) {
        console.log(`✅ [Google Drive] 큐에서 업로드 성공: ${item.fileName}`)
        this.uploadQueue.shift() // 성공한 항목 제거
        this.saveQueueToStorage()
      }
    } catch (error) {
      console.warn(`⚠️ [Google Drive] 큐 처리 실패: ${error}`)
      item.retryCount++

      if (item.retryCount >= this.MAX_RETRIES) {
        console.error(`❌ [Google Drive] 최대 재시도 횟수 초과: ${item.fileName}`)
        this.uploadQueue.shift() // 실패한 항목 제거
        this.saveQueueToStorage()
      }
    }

    this.isProcessingQueue = false
  }

  // 로컬 스토리지에 큐 저장
  private saveQueueToStorage() {
    try {
      // File 객체는 직렬화할 수 없으므로 제외하고 저장
      const queueData = this.uploadQueue.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        folderId: item.folderId,
        timestamp: item.timestamp,
        retryCount: item.retryCount,
      }))
      localStorage.setItem("googleDriveUploadQueue", JSON.stringify(queueData))
    } catch (error) {
      console.error("큐 저장 실패:", error)
    }
  }

  // 로컬 스토리지에서 큐 로드
  private loadQueueFromStorage() {
    try {
      const queueData = localStorage.getItem("googleDriveUploadQueue")
      if (queueData) {
        const parsedQueue = JSON.parse(queueData)
        console.log(`📋 [Google Drive] 저장된 큐 로드: ${parsedQueue.length}개 항목`)
        // 실제 File 객체는 복원할 수 없으므로 큐는 비워둠
        // 실제 구현에서는 IndexedDB 등을 사용해야 함
      }
    } catch (error) {
      console.error("큐 로드 실패:", error)
    }
  }

  // 큐 상태 확인
  getQueueStatus() {
    return {
      queueLength: this.uploadQueue.length,
      isProcessing: this.isProcessingQueue,
      nextProcessTime: this.uploadQueue.length > 0 ? new Date(Date.now() + 5000) : null,
    }
  }

  // 큐 초기화
  clearQueue() {
    this.uploadQueue = []
    this.saveQueueToStorage()
    console.log("🗑️ [Google Drive] 업로드 큐 초기화 완료")
  }

  // 업로드 통계
  getUploadStats() {
    const stats = JSON.parse(localStorage.getItem("googleDriveUploadStats") || "{}")
    return {
      totalUploads: stats.totalUploads || 0,
      successfulUploads: stats.successfulUploads || 0,
      failedUploads: stats.failedUploads || 0,
      lastUploadTime: stats.lastUploadTime || null,
    }
  }

  // 통계 업데이트
  private updateStats(success: boolean) {
    const stats = this.getUploadStats()
    stats.totalUploads++
    if (success) {
      stats.successfulUploads++
    } else {
      stats.failedUploads++
    }
    stats.lastUploadTime = new Date().toISOString()
    localStorage.setItem("googleDriveUploadStats", JSON.stringify(stats))
  }
}

// 싱글톤 인스턴스
export const googleDriveUploadService = new GoogleDriveUploadService()

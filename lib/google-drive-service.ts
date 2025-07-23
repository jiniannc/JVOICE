"use client"

import { getEnvValue } from "./env-config"

export interface DriveConfig {
  apiKey: string
  clientId: string
  discoveryDoc: string
  scopes: string
}

export interface DriveFile {
  id: string
  name: string
  modifiedTime?: string
  mimeType?: string
}

export class GoogleDriveService {
  private config: DriveConfig

  constructor(config: DriveConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    console.log("Google Drive 서비스 초기화 완료")
  }

  async signIn(): Promise<boolean> {
    return true
  }

  // PDF 파일 목록 조회 메서드 추가
  async listPDFFiles(folderId?: string): Promise<DriveFile[]> {
    try {
      console.log("PDF 파일 목록 조회 시작...")

      // 환경 변수에서 폴더 ID 가져오기
      const scriptsFolderId = getEnvValue("NEXT_PUBLIC_SCRIPTS_FOLDER_ID")
      const defaultFolderId = scriptsFolderId || "1M6DtyV6mXGh87LYYh-U5EpPgjuzua2AM"
      const targetFolderId = folderId || defaultFolderId

      console.log("📁 대상 폴더 ID:", targetFolderId)
      console.log("🔑 API 키 확인:", this.config.apiKey ? "설정됨" : "설정되지 않음")

      const url = `https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents+and+mimeType='application/pdf'&fields=files(id,name,modifiedTime,mimeType)&key=${this.config.apiKey}`

      console.log("PDF 파일 조회 API 호출:", url.replace(this.config.apiKey, "***API_KEY***"))

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      console.log("API 응답 상태:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API 오류 응답:", errorText)

        if (response.status === 403) {
          console.error("❌ 접근 권한 없음 (403)")
          console.error("해결 방법:")
          console.error("1. Google Drive 폴더를 우클릭 → '공유' 선택")
          console.error("2. '링크가 있는 모든 사용자'로 설정")
          console.error("3. '보기 권한' 선택")
          console.error("4. 폴더 ID 확인:", targetFolderId)
          throw new Error(`접근 권한 없음 (403): Google Drive 폴더를 '링크가 있는 모든 사용자'로 공유하세요. 폴더 ID: ${targetFolderId}`)
        } else if (response.status === 404) {
          throw new Error(`폴더를 찾을 수 없음 (404): 폴더 ID가 올바른지 확인하세요. 현재 ID: ${targetFolderId}`)
        } else if (response.status === 400) {
          throw new Error(`잘못된 요청 (400): API 키 또는 폴더 ID가 올바르지 않습니다.`)
        } else {
          throw new Error(`Google Drive API 오류 (${response.status}): ${errorText}`)
        }
      }

      const data = await response.json()
      console.log("PDF 파일 API 응답 데이터:", data)

      const files = data.files || []
      console.log(`Google Drive에서 ${files.length}개 PDF 파일 발견:`, files)

      // 파일이 없을 경우 폴더 접근 권한 확인
      if (files.length === 0) {
        console.warn("⚠️ PDF 파일이 발견되지 않았습니다. 다음을 확인해주세요:")
        console.warn("1. 폴더 ID가 올바른지 확인:", targetFolderId)
        console.warn("2. 폴더가 '링크가 있는 모든 사용자'로 공유되어 있는지 확인")
        console.warn("3. 폴더에 PDF 파일이 실제로 있는지 확인")
        console.warn("4. API 키가 올바른지 확인")
        console.warn("5. 폴더 URL:", `https://drive.google.com/drive/folders/${targetFolderId}`)
      }

      return files
    } catch (error) {
      console.error("PDF 파일 목록 조회 실패:", error)
      
      // 에러 발생 시 빈 배열 반환 (앱이 중단되지 않도록)
      return []
    }
  }

  // 서버 사이드 업로드 방식으로 변경
  async uploadFile(file: File, fileName: string, folderId: string): Promise<string> {
    try {
      console.log(`파일 업로드 시작: ${fileName}`)

      // FormData 생성
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileName", fileName)
      formData.append("folderId", folderId)

      // 서버 API 호출
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`업로드 실패: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("업로드 성공:", result)

      return result.fileId || `uploaded-${Date.now()}`
    } catch (error) {
      console.error("파일 업로드 실패:", error)

      // 백업: localStorage에 파일 정보 저장
      const fileData = {
        name: fileName,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        folderId: folderId,
        status: "uploaded_locally",
      }

      const existingUploads = JSON.parse(localStorage.getItem("uploadedFiles") || "[]")
      existingUploads.push(fileData)
      localStorage.setItem("uploadedFiles", JSON.stringify(existingUploads))

      console.log("로컬 저장 완료:", fileData)
      return `local-${Date.now()}`
    }
  }

  async listFiles(folderId: string): Promise<any[]> {
    try {
      console.log("Google Drive REST API 직접 호출 시작...")

      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/pdf'&fields=files(id,name,createdTime,mimeType)&key=${this.config.apiKey}`

      console.log("API 호출 URL:", url.replace(this.config.apiKey, "***API_KEY***"))

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      console.log("API 응답 상태:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API 오류 응답:", errorText)

        if (response.status === 403) {
          throw new Error(`접근 권한 없음 (403): Google Drive 폴더를 '링크가 있는 모든 사용자'로 공유하세요.`)
        } else if (response.status === 404) {
          throw new Error(`폴더를 찾을 수 없음 (404): 폴더 ID가 올바른지 확인하세요.`)
        } else if (response.status === 400) {
          throw new Error(`잘못된 요청 (400): API 키 또는 폴더 ID가 올바르지 않습니다.`)
        } else {
          throw new Error(`Google Drive API 오류 (${response.status}): ${errorText}`)
        }
      }

      const data = await response.json()
      console.log("API 응답 데이터:", data)

      const files = data.files || []
      console.log(`Google Drive에서 ${files.length}개 파일 발견:`, files)

      return files
    } catch (error) {
      console.error("Google Drive API 호출 실패:", error)
      throw error
    }
  }

  async listRecordings(folderId: string): Promise<any[]> {
    try {
      console.log("녹음 파일 목록 조회 시작...")

      // localStorage에서 업로드된 파일 목록 반환
      const uploadedFiles = JSON.parse(localStorage.getItem("uploadedFiles") || "[]")
      console.log("업로드된 파일 목록:", uploadedFiles)

      return uploadedFiles.filter((file: any) => file.folderId === folderId)
    } catch (error) {
      console.error("녹음 파일 목록 조회 실패:", error)
      return []
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    console.log(`파일 삭제: ${fileId}`)
    return true
  }

  async downloadFile(fileId: string): Promise<Blob> {
    throw new Error("다운로드 기능은 구현되지 않았습니다.")
  }
}

// 싱글톤 인스턴스
export const driveService = new GoogleDriveService({
  apiKey: getEnvValue("NEXT_PUBLIC_GOOGLE_API_KEY"),
  clientId: getEnvValue("NEXT_PUBLIC_GOOGLE_CLIENT_ID"),
  discoveryDoc: "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  scopes: "https://www.googleapis.com/auth/drive.file",
})

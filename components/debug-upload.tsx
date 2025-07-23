"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react"

interface DebugLog {
  timestamp: string
  level: "info" | "success" | "warning" | "error"
  message: string
  data?: any
}

export function DebugUpload() {
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [isTestingUpload, setIsTestingUpload] = useState(false)

  const addLog = (level: DebugLog["level"], message: string, data?: any) => {
    const newLog: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }
    setLogs((prev) => [newLog, ...prev].slice(0, 50)) // 최대 50개 로그 유지
  }

  const testUpload = async () => {
    setIsTestingUpload(true)
    addLog("info", "🧪 업로드 테스트 시작")

    try {
      // 1. 환경 변수 확인
      addLog("info", "🔍 환경 변수 확인 중...")

      const envCheck = {
        hasGoogleApiKey: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        hasFolderId: !!process.env.NEXT_PUBLIC_RECORDINGS_FOLDER_ID,
      }

      addLog("info", "📋 환경 변수 상태", envCheck)

      // 2. 테스트 파일 생성
      addLog("info", "📄 테스트 파일 생성 중...")

      const testBlob = new Blob(["Test audio data"], { type: "audio/wav" })
      const testFile = new File([testBlob], "test-recording.wav", { type: "audio/wav" })

      addLog("success", "✅ 테스트 파일 생성 완료", {
        name: testFile.name,
        size: testFile.size,
        type: testFile.type,
      })

      // 3. 업로드 API 테스트
      addLog("info", "🚀 업로드 API 테스트 중...")

      const formData = new FormData()
      formData.append("file", testFile)
      formData.append(
        "metadata",
        JSON.stringify({
          employeeName: "테스트 사용자",
          employeeId: "TEST001",
          department: "테스트 부서",
          language: "korean-english",
          category: "신규",
          scriptNumber: "TEST-001",
        }),
      )

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        addLog("success", "🎉 업로드 테스트 성공!", result)
      } else {
        addLog("error", "❌ 업로드 테스트 실패", result)
      }

      // 4. Google Drive 연결 테스트
      addLog("info", "🔗 Google Drive 연결 테스트 중...")

      try {
        const driveTestResponse = await fetch("/api/google-drive-upload", {
          method: "POST",
          body: formData,
        })

        const driveResult = await driveTestResponse.json()

        if (driveTestResponse.ok) {
          addLog("success", "✅ Google Drive 연결 성공", driveResult)
        } else {
          addLog("warning", "⚠️ Google Drive 직접 연결 실패, 대체 방법 사용", driveResult)
        }
      } catch (driveError) {
        addLog("warning", "⚠️ Google Drive API 테스트 실패", driveError)
      }

      // 5. 로컬 저장소 테스트
      addLog("info", "💾 로컬 저장소 테스트 중...")

      try {
        const testData = { test: "data", timestamp: Date.now() }
        localStorage.setItem("upload_test", JSON.stringify(testData))
        const retrieved = JSON.parse(localStorage.getItem("upload_test") || "{}")

        if (retrieved.test === "data") {
          addLog("success", "✅ 로컬 저장소 정상 작동")
          localStorage.removeItem("upload_test")
        } else {
          addLog("error", "❌ 로컬 저장소 오류")
        }
      } catch (storageError) {
        addLog("error", "❌ 로컬 저장소 접근 실패", storageError)
      }
    } catch (error) {
      addLog("error", "💥 테스트 중 예외 발생", error)
    } finally {
      setIsTestingUpload(false)
      addLog("info", "🏁 업로드 테스트 완료")
    }
  }

  const clearLogs = () => {
    setLogs([])
    addLog("info", "🧹 로그 초기화됨")
  }

  const getLogIcon = (level: DebugLog["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "warning":
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <RefreshCw className="w-4 h-4 text-blue-600" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>디버그 업로드</CardTitle>
        <CardDescription>업로드 테스트 및 로그 확인</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={testUpload} disabled={isTestingUpload}>
          {isTestingUpload ? "테스트 중..." : "업로드 테스트 실행"}
        </Button>
        <Separator className="my-4" />
        <ScrollArea className="h-[300px]">
          <ul className="space-y-2">
            {logs.map((log, index) => (
              <li key={index} className="flex items-center space-x-2">
                {getLogIcon(log.level)}
                <span className="text-sm font-medium">{log.timestamp}</span>
                <span className="text-sm">{log.message}</span>
                {log.data && (
                  <pre className="mt-2 text-xs bg-muted p-2 rounded">{JSON.stringify(log.data, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <Button onClick={clearLogs} className="mt-4">
          로그 초기화
        </Button>
      </CardContent>
    </Card>
  )
}

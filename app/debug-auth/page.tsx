"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"

export default function DebugAuthPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [clientId, setClientId] = useState("")

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  useEffect(() => {
    const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
    setClientId(envClientId)
    addLog(`환경변수 클라이언트 ID: ${envClientId ? "✅ 설정됨" : "❌ 미설정"}`)

    loadGoogleScript()
  }, [])

  const loadGoogleScript = () => {
    addLog("🔄 Google Identity Services 스크립트 로딩 시작...")

    // 기존 스크립트 제거
    const existingScript = document.querySelector('script[src*="accounts.google.com"]')
    if (existingScript) {
      existingScript.remove()
      addLog("기존 Google 스크립트 제거됨")
    }

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true

    script.onload = () => {
      addLog("✅ Google 스크립트 로드 성공!")

      setTimeout(() => {
        if (typeof window !== "undefined" && (window as any).google) {
          addLog("✅ window.google 객체 확인됨")
          setGoogleLoaded(true)
          initializeGoogle()
        } else {
          addLog("❌ window.google 객체를 찾을 수 없음")
        }
      }, 1000)
    }

    script.onerror = (error) => {
      addLog(`❌ Google 스크립트 로드 실패: ${error}`)
    }

    document.head.appendChild(script)
  }

  const initializeGoogle = () => {
    try {
      addLog("🔄 Google Identity Services 초기화 중...")

      if (!(window as any).google?.accounts?.id) {
        addLog("❌ google.accounts.id가 없음")
        return
      }
      ;(window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
      })

      addLog("✅ Google Identity Services 초기화 완료!")
    } catch (error) {
      addLog(`❌ Google 초기화 실패: ${error}`)
    }
  }

  const handleCredentialResponse = (response: any) => {
    addLog("🎉 Google 로그인 콜백 호출됨!")
    addLog(`토큰 길이: ${response.credential?.length || 0}`)

    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]))
      addLog(`✅ 로그인 성공: ${payload.email}`)
      addLog(`사용자 이름: ${payload.name}`)
    } catch (error) {
      addLog(`❌ 토큰 파싱 실패: ${error}`)
    }
  }

  const testGoogleLogin = () => {
    addLog("🔄 Google 로그인 시도...")

    try {
      if (!(window as any).google?.accounts?.id) {
        addLog("❌ Google Identity Services가 초기화되지 않음")
        return
      }
      ;(window as any).google.accounts.id.prompt((notification: any) => {
        addLog(`Google 프롬프트 알림: ${notification.getNotDisplayedReason?.() || "알림 없음"}`)
      })

      addLog("✅ Google 프롬프트 호출됨")
    } catch (error) {
      addLog(`❌ Google 로그인 실패: ${error}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const reloadScript = () => {
    setGoogleLoaded(false)
    setLogs([])
    loadGoogleScript()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">🔍 Google 인증 디버그</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 상태 확인 */}
          <Card>
            <CardHeader>
              <CardTitle>현재 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {clientId ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">클라이언트 ID: {clientId ? "설정됨" : "미설정"}</span>
                </div>

                <div className="flex items-center gap-2">
                  {googleLoaded ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">Google 스크립트: {googleLoaded ? "로드됨" : "로딩중/실패"}</span>
                </div>
              </div>

              {clientId && (
                <Alert>
                  <AlertDescription className="text-xs font-mono break-all">{clientId}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button onClick={testGoogleLogin} disabled={!googleLoaded} className="w-full">
                  🧪 Google 로그인 테스트
                </Button>

                <div className="flex gap-2">
                  <Button onClick={reloadScript} variant="outline" size="sm" className="flex-1 bg-transparent">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    스크립트 재로드
                  </Button>
                  <Button onClick={clearLogs} variant="outline" size="sm" className="flex-1 bg-transparent">
                    로그 지우기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 로그 */}
          <Card>
            <CardHeader>
              <CardTitle>실시간 로그</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">로그가 없습니다...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 해결책 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>문제 해결 체크리스트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold text-yellow-800 mb-2">1. Google Cloud Console 확인</h4>
                <ul className="text-yellow-700 space-y-1">
                  <li>• OAuth 클라이언트 ID의 "승인된 JavaScript 원본"에 http://localhost:3000 추가</li>
                  <li>• "승인된 리디렉션 URI"에 http://localhost:3000 추가</li>
                </ul>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-semibold text-blue-800 mb-2">2. 브라우저 확인</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• F12 → Console 탭에서 에러 메시지 확인</li>
                  <li>• 시크릿 모드에서 테스트</li>
                  <li>• 브라우저 캐시 삭제</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

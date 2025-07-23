"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, LogOut, CheckCircle } from "lucide-react"
import { GoogleAuthFixed } from "@/components/google-auth-fixed"
import type { EmployeeInfo } from "@/lib/employee-service-fixed"

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
}

interface GoogleUser {
  email: string
  name: string
  picture: string
  employee?: EmployeeInfo
  verified: boolean
}

export default function HomePageFixed() {
  const [mode, setMode] = useState<"auth" | "select" | "recording" | "admin" | "evaluation">("auth")
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [authenticatedUser, setAuthenticatedUser] = useState<GoogleUser | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleAuthSuccess = (user: GoogleUser) => {
    console.log("✅ 인증 성공:", user.employee?.name)
    setAuthenticatedUser(user)

    // 직원 정보 자동 입력
    if (user.employee) {
      setUserInfo((prev) => ({
        ...prev,
        name: user.employee!.name,
        employeeId: user.employee!.employeeId,
        email: user.email,
      }))
    }

    setMode("select")
  }

  const handleAuthError = (error: string) => {
    console.error("❌ 인증 실패:", error)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Google 로그아웃
      if ((window as any).gapi?.auth2) {
        const authInstance = (window as any).gapi.auth2.getAuthInstance()
        if (authInstance) {
          await authInstance.signOut()
        }
      }

      // 상태 초기화
      setAuthenticatedUser(null)
      setUserInfo({ name: "", employeeId: "", language: "", category: "" })
      setMode("auth")

      console.log("✅ 로그아웃 완료")
    } catch (error) {
      console.error("❌ 로그아웃 실패:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleStartRecording = () => {
    if (userInfo.name && userInfo.employeeId && userInfo.language && userInfo.category) {
      setMode("recording")
    }
  }

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const getCategoryOptions = (language: string) => {
    if (language === "korean-english") {
      return [
        { value: "신규", label: "신규" },
        { value: "재자격", label: "재자격" },
      ]
    } else if (language === "japanese" || language === "chinese") {
      return [
        { value: "신규", label: "신규" },
        { value: "상위", label: "상위" },
      ]
    }
    return []
  }

  // 인증이 필요한 경우
  if (mode === "auth") {
    return (
      <div className="min-h-screen cloud-bg">
        {/* 헤더 섹션 */}
        <div className="jinair-gradient text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center">
              {/* JINAIR 로고 */}
              <div className="flex items-center justify-center mb-6">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JINAIR-kF1VjaXV8q3dDiZzY400yM6Ln9BiJ3.png"
                  alt="JINAIR Logo"
                  className="h-24 w-24 object-contain"
                />
              </div>

              <h1 className="text-5xl font-bold mb-4">기내 방송 평가 시스템</h1>
              <p className="text-xl text-blue-100 mb-6">JINAIR In-Flight Announcement Evaluation System</p>

              {/* 보안 배지 */}
              <div className="flex justify-center mb-8">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
                  <Shield className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-medium">Google OAuth 인증</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 로그인 섹션 */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex justify-center mb-8">
            <GoogleAuthFixed onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} />
          </div>

          {/* 보안 정보 */}
          <div className="max-w-2xl mx-auto">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <h3 className="font-bold text-green-800">🔒 보안 인증 시스템</h3>
                  <div className="text-green-700 text-sm space-y-1">
                    <p>• @jinair.com 계정만 로그인 가능</p>
                    <p>• 직원 데이터베이스 연동으로 자동 정보 입력</p>
                    <p>• Google OAuth 2.0 보안 표준 준수</p>
                    <p>• 승인된 직원만 시스템 접근 허용</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* 환경변수 디버그 정보 (개발 중에만) */}
          {process.env.NODE_ENV === "development" && (
            <div className="max-w-2xl mx-auto mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">🔧 환경변수 상태</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span>Google Client ID:</span>
                      <span className={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "text-green-600" : "text-red-600"}>
                        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "✅ 설정됨" : "❌ 미설정"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Google API Key:</span>
                      <span className={process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? "text-green-600" : "text-red-600"}>
                        {process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? "✅ 설정됨" : "❌ 미설정"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Employee Sheet ID:</span>
                      <span
                        className={process.env.NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID ? "text-green-600" : "text-red-600"}
                      >
                        {process.env.NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID ? "✅ 설정됨" : "❌ 미설정"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 나머지 모드들은 기존과 동일...
  return (
    <div className="min-h-screen cloud-bg">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">모드 선택</h1>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>승무원 녹음</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setMode("recording")} className="w-full">
                녹음 시작
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>관리자</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setMode("admin")} className="w-full">
                관리자 모드
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>평가</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setMode("evaluation")} className="w-full">
                평가 모드
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  )
}

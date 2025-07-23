"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, LogOut, CheckCircle, Plane, Star, Headphones } from "lucide-react"
import { GoogleAuthGIS } from "@/components/google-auth-gis"
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

export default function HomePageGIS() {
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
      // Google Identity Services 로그아웃
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect()
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
                  <span className="text-sm font-medium">Google Identity Services</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 로그인 섹션 */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex justify-center mb-8">
            <GoogleAuthGIS onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} />
          </div>

          {/* 보안 정보 */}
          <div className="max-w-2xl mx-auto">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <h3 className="font-bold text-green-800">🔒 최신 보안 인증 시스템</h3>
                  <div className="text-green-700 text-sm space-y-1">
                    <p>• Google Identity Services (GIS) 최신 버전 사용</p>
                    <p>• @jinair.com 계정만 로그인 가능</p>
                    <p>• 직원 데이터베이스 연동으로 자동 정보 입력</p>
                    <p>• 향상된 보안 및 사용자 경험</p>
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

  // 메인 선택 화면
  return (
    <div className="min-h-screen cloud-bg">
      {/* 헤더 섹션 */}
      <div className="jinair-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
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

              {/* 플라잉 아이콘 */}
              <div className="flex justify-center mb-8">
                <Plane className="w-8 h-8 text-yellow-300 flight-animation" />
              </div>

              <div className="grid md:grid-cols-3 gap-2 max-w-md mx-auto text-sm">
                <div className="flex items-center justify-center gap-1 text-blue-200">
                  <Star className="w-4 h-4" />
                  <span>전문 평가</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-blue-200">
                  <Headphones className="w-4 h-4" />
                  <span>실시간 녹음</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-blue-200">
                  <Plane className="w-4 h-4" />
                  <span>항공 표준</span>
                </div>
              </div>
            </div>

            {/* 사용자 정보 및 로그아웃 */}
            {authenticatedUser && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[280px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
                    <img
                      src={authenticatedUser.picture || "/placeholder.svg?height=48&width=48&text=User"}
                      alt={authenticatedUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {authenticatedUser.employee?.name || authenticatedUser.name}
                    </p>
                    <p className="text-xs text-blue-200">{authenticatedUser.email}</p>
                    {authenticatedUser.employee && (
                      <div className="flex gap-1 mt-1">
                        <span className="bg-white/20 text-white text-xs px-2 py-0 rounded">
                          {authenticatedUser.employee.employeeId}
                        </span>
                        <span className="bg-white/20 text-white text-xs px-2 py-0 rounded">
                          {authenticatedUser.employee.department}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      로그아웃 중...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      로그아웃
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 모드 선택 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">시스템 모드 선택</h2>
          <p className="text-gray-600">원하는 기능을 선택하세요</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 승무원 녹음 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 jinair-card border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 via-transparent to-blue-500/5"></div>
            <CardHeader className="text-center relative z-10 pb-6">
              <div className="w-20 h-20 jinair-gradient rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Headphones className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">승무원 녹음</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <Button onClick={() => setMode("recording")} className="w-full jinair-button h-12 text-lg font-semibold">
                녹음 시작하기
              </Button>
            </CardContent>
          </Card>

          {/* 관리자 모드 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 jinair-card border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5"></div>
            <CardHeader className="text-center relative z-10 pb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Star className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">시스템 관리</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <Button
                onClick={() => setMode("admin")}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 text-lg font-semibold"
              >
                관리자 모드
              </Button>
            </CardContent>
          </Card>

          {/* 평가 모드 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 jinair-card border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
            <CardHeader className="text-center relative z-10 pb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Plane className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">평가 시스템</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <Button
                onClick={() => setMode("evaluation")}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white h-12 text-lg font-semibold"
              >
                교관 모드
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

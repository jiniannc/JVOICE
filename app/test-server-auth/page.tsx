"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, RefreshCw, Home } from "lucide-react"
import { ServerSideGoogleAuth } from "@/components/server-side-google-auth"

interface GoogleUser {
  email: string
  name: string
  picture: string
  employee?: any
  verified: boolean
  authenticatedAt: string
}

export default function TestServerAuthPage() {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/server/status")
      const data = await response.json()

      if (data.authenticated && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Auth status check failed:", error)
      setError("인증 상태 확인 실패")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/server/logout", { method: "POST" })
      if (response.ok) {
        setUser(null)
        setError(null)
      }
    } catch (error) {
      console.error("Logout failed:", error)
      setError("로그아웃 실패")
    }
  }

  const handleAuthSuccess = (userData: GoogleUser) => {
    setUser(userData)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">서버사이드 OAuth 테스트</h1>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            <Home className="w-4 h-4 mr-2" />
            홈으로
          </Button>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* 인증 섹션 */}
          <div>
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">인증 상태 확인 중...</p>
                </CardContent>
              </Card>
            ) : user ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    인증 성공!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-green-200">
                      <img
                        src={user.picture || "/placeholder.svg?height=64&width=64&text=User"}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  {user.employee && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">직원 정보</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>이름:</strong> {user.employee.name}
                        </p>
                        <p>
                          <strong>사번:</strong> {user.employee.employeeId}
                        </p>
                        <p>
                          <strong>부서:</strong> {user.employee.department}
                        </p>
                        <p>
                          <strong>직급:</strong> {user.employee.position}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleLogout} variant="outline" className="flex-1 bg-transparent">
                      로그아웃
                    </Button>
                    <Button onClick={checkAuthStatus} variant="outline">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ServerSideGoogleAuth onAuthSuccess={handleAuthSuccess} />
            )}
          </div>

          {/* 디버그 정보 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>디버그 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">인증 상태:</span>
                    <Badge className={user ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {user ? "인증됨" : "미인증"}
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Client ID:</span>
                    <span className="text-xs text-gray-600">
                      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "설정됨" : "미설정"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm font-medium">직원 DB 연동:</span>
                    <Badge className={user?.employee ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                      {user?.employee ? "연동됨" : "미연동"}
                    </Badge>
                  </div>

                  {user && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">인증 시간:</span>
                      <span className="text-xs text-gray-600">
                        {new Date(user.authenticatedAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">환경 정보</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>• 서버사이드 OAuth 방식</p>
                    <p>• HttpOnly 쿠키 세션</p>
                    <p>• FedCM 정책 우회</p>
                    <p>• 직원 DB 자동 연동</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 테스트 결과 */}
        {user && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>인증 데이터 (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

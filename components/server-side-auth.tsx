"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, XCircle } from "lucide-react"

interface AuthUser {
  id: string
  email: string
  name: string
  picture: string
}

interface AuthState {
  authenticated: boolean
  user: AuthUser | null
  loading: boolean
  error: string | null
}

export default function ServerSideAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
    error: null,
  })

  // 인증 상태 확인
  const checkAuthStatus = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }))

      const response = await fetch("/api/auth/user")
      const data = await response.json()

      setAuthState({
        authenticated: data.authenticated,
        user: data.user,
        loading: false,
        error: null,
      })

      console.log("🔍 [Server Auth] 인증 상태:", data.authenticated ? "로그인됨" : "로그인 안됨")
      if (data.user) {
        console.log("🔍 [Server Auth] 사용자:", data.user.email)
      }
    } catch (error) {
      console.error("Auth status check failed:", error)
      setAuthState({
        authenticated: false,
        user: null,
        loading: false,
        error: "인증 상태 확인 실패",
      })
    }
  }

  // 로그인 처리
  const handleLogin = () => {
    console.log("🔍 [Server Auth] 서버사이드 OAuth 로그인 시작...")
    window.location.href = "/api/auth/google"
  }

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      console.log("🔍 [Server Auth] 로그아웃 중...")

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        setAuthState({
          authenticated: false,
          user: null,
          loading: false,
          error: null,
        })
        console.log("✅ [Server Auth] 로그아웃 완료")

        // 페이지 새로고침으로 상태 완전 초기화
        window.location.reload()
      } else {
        throw new Error("Logout failed")
      }
    } catch (error) {
      console.error("Logout error:", error)
      setAuthState((prev) => ({ ...prev, error: "로그아웃 실패" }))
    }
  }

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus()

    // URL 파라미터에서 로그인 결과 확인
    const urlParams = new URLSearchParams(window.location.search)
    const loginResult = urlParams.get("login")
    const error = urlParams.get("error")

    if (loginResult === "success") {
      console.log("✅ [Server Auth] OAuth 로그인 성공!")
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname)
      // 인증 상태 다시 확인
      setTimeout(checkAuthStatus, 100)
    }

    if (error) {
      console.error("❌ [Server Auth] OAuth 오류:", error)
      setAuthState((prev) => ({ ...prev, error: `로그인 오류: ${error}` }))
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  if (authState.loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">인증 상태 확인 중...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* 오류 메시지 */}
      {authState.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{authState.error}</AlertDescription>
        </Alert>
      )}

      {/* 인증 상태 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            서버사이드 OAuth 인증
          </CardTitle>
          <CardDescription>Next.js API Routes를 사용한 안전한 서버사이드 인증</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 인증 상태 표시 */}
          <div className="flex items-center gap-2">
            {authState.authenticated ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">인증됨</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-600 font-medium">인증 안됨</span>
              </>
            )}
          </div>

          {/* 사용자 정보 */}
          {authState.authenticated && authState.user && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Avatar>
                <AvatarImage src={authState.user.picture || "/placeholder.svg"} alt={authState.user.name} />
                <AvatarFallback>{authState.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{authState.user.name}</p>
                <p className="text-sm text-gray-600">{authState.user.email}</p>
              </div>
            </div>
          )}

          {/* 로그인/로그아웃 버튼 */}
          <div className="flex gap-2">
            {authState.authenticated ? (
              <Button onClick={handleLogout} variant="outline" className="flex-1 bg-transparent">
                <CheckCircle className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            ) : (
              <Button onClick={handleLogin} className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                Google로 로그인
              </Button>
            )}

            <Button onClick={checkAuthStatus} variant="outline">
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 기술 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">🔧 서버사이드 OAuth 특징</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>CSP 문제 없음</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>서버에서 토큰 관리</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>안전한 쿠키 기반 세션</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>자동 토큰 갱신 지원</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

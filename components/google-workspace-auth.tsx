"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Building, CheckCircle, AlertTriangle } from "lucide-react"

interface GoogleUser {
  email: string
  name: string
  picture: string
  domain: string
  verified_email: boolean
}

interface GoogleWorkspaceAuthProps {
  onAuthSuccess: (user: GoogleUser) => void
  allowedDomains?: string[]
}

export function GoogleWorkspaceAuth({ onAuthSuccess, allowedDomains = ["jinair.com"] }: GoogleWorkspaceAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<GoogleUser | null>(null)

  useEffect(() => {
    // Google API 스크립트 로드
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      initializeGoogleAuth()
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const initializeGoogleAuth = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      ;(window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
      })
    }
  }

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true)
    setError(null)

    try {
      // JWT 토큰 디코딩 (실제로는 서버에서 검증해야 함)
      const payload = JSON.parse(atob(response.credential.split(".")[1]))

      const userInfo: GoogleUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        domain: payload.email.split("@")[1],
        verified_email: payload.email_verified,
      }

      // 도메인 검증
      if (!allowedDomains.includes(userInfo.domain)) {
        throw new Error(`허용되지 않은 도메인입니다. 회사 이메일(${allowedDomains.join(", ")})로 로그인해주세요.`)
      }

      // 이메일 인증 확인
      if (!userInfo.verified_email) {
        throw new Error("인증되지 않은 이메일입니다.")
      }

      setUser(userInfo)
      onAuthSuccess(userInfo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      ;(window as any).google.accounts.id.prompt()
    }
  }

  const handleLogout = () => {
    setUser(null)
    setError(null)
    if (typeof window !== "undefined" && (window as any).google) {
      ;(window as any).google.accounts.id.disableAutoSelect()
    }
  }

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto jinair-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border-4 border-green-200">
            <img src={user.picture || "/placeholder.svg"} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            로그인 성공
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="font-semibold text-lg">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <Badge className="bg-green-100 text-green-800">
              <Building className="w-3 h-3 mr-1" />
              {user.domain}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => onAuthSuccess(user)} className="flex-1 jinair-button">
              계속하기
            </Button>
            <Button onClick={handleLogout} variant="outline" className="bg-transparent">
              로그아웃
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto jinair-card">
      <CardHeader className="text-center">
        <div className="w-16 h-16 jinair-gradient rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle>회사 계정으로 로그인</CardTitle>
        <p className="text-sm text-gray-600">Google Workspace 계정이 필요합니다</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 보안 정보 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">보안 로그인</p>
              <p className="text-xs text-blue-700">Google Workspace SSO</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Building className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">허용 도메인</p>
              <p className="text-xs text-green-700">{allowedDomains.join(", ")}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">로그인 실패</p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-12 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              로그인 중...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </div>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-gray-500">회사에서 승인된 Google Workspace 계정만 사용 가능합니다</p>
        </div>
      </CardContent>
    </Card>
  )
}

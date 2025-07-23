"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Shield, CheckCircle } from "lucide-react"

interface ServerSideGoogleAuthProps {
  onAuthSuccess?: (user: any) => void
}

export function ServerSideGoogleAuth({ onAuthSuccess }: ServerSideGoogleAuthProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleServerSideLogin = () => {
    setIsLoading(true)

    // OAuth URL 생성
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/server/callback`
    const scope = "openid email profile"
    const responseType = "code"
    const accessType = "offline"
    const prompt = "select_account"

    // 상태값 생성 (CSRF 보호)
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // OAuth URL 구성
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    authUrl.searchParams.set("client_id", clientId!)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", scope)
    authUrl.searchParams.set("response_type", responseType)
    authUrl.searchParams.set("access_type", accessType)
    authUrl.searchParams.set("prompt", prompt)
    authUrl.searchParams.set("state", state)

    console.log("🔄 Redirecting to Google OAuth:", authUrl.toString())

    // 전체 페이지 리다이렉트
    window.location.href = authUrl.toString()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-xl font-bold">Google 계정으로 로그인</CardTitle>
        <CardDescription>안전한 서버사이드 OAuth 인증</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>FedCM 정책 문제 해결</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>모든 브라우저 지원</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>기업 보안 정책 준수</span>
          </div>
        </div>

        <Button
          onClick={handleServerSideLogin}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 text-lg font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Google로 이동 중...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

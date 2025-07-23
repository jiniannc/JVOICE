"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Building, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react"
import type { Employee } from "@/lib/employee-database"

interface WorkspaceUser {
  email: string
  name: string
  picture: string
  domain: string
  employee?: Employee
  verified: boolean
  hd: string // Hosted domain
}

interface GoogleWorkspaceSSOProps {
  onAuthSuccess: (user: WorkspaceUser) => void
  allowedDomains?: string[]
}

export function GoogleWorkspaceSSO({ onAuthSuccess, allowedDomains = ["jinair.com"] }: GoogleWorkspaceSSOProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<WorkspaceUser | null>(null)
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null)

  useEffect(() => {
    checkWorkspaceStatus()
  }, [])

  const checkWorkspaceStatus = async () => {
    try {
      const response = await fetch("/api/auth/workspace/status")
      if (response.ok) {
        const data = await response.json()
        setWorkspaceInfo(data)
      }
    } catch (error) {
      console.error("Workspace status check failed:", error)
    }
  }

  const handleWorkspaceSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Google Workspace SSO는 서버 사이드 리다이렉트 방식 사용
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID
      const domain = allowedDomains[0] // 주 도메인 사용

      if (!clientId) {
        throw new Error("Google Workspace Client ID가 설정되지 않았습니다.")
      }

      // Workspace-specific OAuth URL 생성
      const authUrl = new URL("https://accounts.google.com/oauth/authorize")
      authUrl.searchParams.set("client_id", clientId)
      authUrl.searchParams.set("redirect_uri", `${window.location.origin}/api/auth/workspace/callback`)
      authUrl.searchParams.set("response_type", "code")
      authUrl.searchParams.set("scope", "openid email profile")
      authUrl.searchParams.set("access_type", "offline")
      authUrl.searchParams.set("prompt", "select_account")

      // Workspace 도메인 힌트 추가 (중요!)
      authUrl.searchParams.set("hd", domain)

      // 보안을 위한 state 파라미터
      const state = generateRandomState()
      authUrl.searchParams.set("state", state)
      sessionStorage.setItem("oauth_state", state)

      // 전체 페이지 리다이렉트 (팝업 대신)
      window.location.href = authUrl.toString()
    } catch (error) {
      setError(error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다.")
      setIsLoading(false)
    }
  }

  const generateRandomState = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleContinue = () => {
    if (user) {
      onAuthSuccess(user)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/workspace/logout", { method: "POST" })
      setUser(null)
      setError(null)
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // 로그인 성공 후 사용자 정보 표시
  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto jinair-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border-4 border-green-200">
            <img
              src={user.picture || "/placeholder.svg?height=64&width=64&text=User"}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Workspace 인증 완료
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 직원 정보 */}
          <div className="text-center space-y-2">
            <p className="font-semibold text-lg">{user.employee?.name || user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <div className="flex justify-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                <Building className="w-3 h-3 mr-1" />
                {user.domain}
              </Badge>
              {user.employee && (
                <>
                  <Badge className="bg-green-100 text-green-800">{user.employee.department}</Badge>
                  <Badge className="bg-purple-100 text-purple-800">{user.employee.position}</Badge>
                </>
              )}
            </div>
          </div>

          {/* Workspace 정보 */}
          <Alert className="border-blue-200 bg-blue-50">
            <Building className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-1">
                <p className="font-semibold">Google Workspace 계정</p>
                <p className="text-sm">도메인: {user.hd}</p>
                <p className="text-sm">인증됨: {user.verified ? "예" : "아니오"}</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={handleContinue} className="flex-1 jinair-button">
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
          <Building className="w-8 h-8 text-white" />
        </div>
        <CardTitle>JINAIR Workspace 로그인</CardTitle>
        <p className="text-sm text-gray-600">회사 Google Workspace 계정으로 로그인</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workspace 정보 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Google Workspace SSO</p>
              <p className="text-xs text-blue-700">기업용 통합 인증 시스템</p>
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
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Workspace 상태 정보 */}
        {workspaceInfo && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">Workspace 연결 확인됨</p>
                <p>도메인: {workspaceInfo.domain}</p>
                <p>상태: {workspaceInfo.status}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleWorkspaceSignIn} disabled={isLoading} className="w-full h-12 jinair-button">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Workspace 로그인 중...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5" />
              JINAIR Workspace로 로그인
            </div>
          )}
        </Button>

        {/* 관리자 링크 */}
        <div className="text-center space-y-2">
          <Button
            onClick={() => window.open("https://admin.google.com", "_blank")}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Google Admin Console
          </Button>

          <p className="text-xs text-gray-500">
            Workspace 관리자만 접근 가능
            <br />
            문제 발생 시 IT 부서에 문의하세요
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

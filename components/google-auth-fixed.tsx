"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { LogOut, User, Loader2 } from "lucide-react"

interface GoogleAuthProps {
  onAuthSuccess?: (user: any) => void
}

interface AuthenticatedUser {
  email: string
  name: string
  picture: string
  role: string
  broadcastCode: string
  teamNumber: string
  isTestAccount?: boolean
}

export function GoogleAuth({ onAuthSuccess }: GoogleAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isTestLogin, setIsTestLogin] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)

  // 구글 로그인 시뮬레이션
  const handleGoogleLogin = async () => {
    setIsLoading(true)

    try {
      // 실제 환경에서는 NextAuth signIn 사용
      // await signIn("google")

      // 시뮬레이션: 3초 후 로그인 성공
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const mockUser = {
        email: "test.user@jinair.com",
        name: "김진에어",
        picture: "/placeholder.svg?height=64&width=64&text=JA",
        role: "crew",
        broadcastCode: "ABC",
        teamNumber: "001",
        isTestAccount: false,
      }

      setAuthenticatedUser(mockUser)
      if (onAuthSuccess) {
        onAuthSuccess(mockUser)
      }
    } catch (error) {
      console.error("구글 로그인 실패:", error)
      alert("로그인에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  // 테스트 로그인
  const handleTestLogin = () => {
    setIsTestLogin(true)

    const testUser = {
      email: "test@jinair.com",
      name: "테스트 사용자",
      picture: "/placeholder.svg?height=64&width=64&text=Test",
      role: "instructor", // 교관으로 설정
      broadcastCode: "TST",
      teamNumber: "999",
      isTestAccount: true,
    }

    setAuthenticatedUser(testUser)
    if (onAuthSuccess) {
      onAuthSuccess(testUser)
    }
  }

  // 로그아웃
  const handleLogout = () => {
    setAuthenticatedUser(null)
    setIsTestLogin(false)
    // 실제 환경에서는 NextAuth signOut 사용
    // await signOut({ callbackUrl: "/" })
  }

  // 로그인된 상태
  if (authenticatedUser) {
    return (
      <div className="modern-clean-card border-green-100">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden modern-clean-card mx-auto mb-4">
            <img
              src={authenticatedUser.picture || "/placeholder.svg"}
              alt={authenticatedUser.name}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">{authenticatedUser.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{authenticatedUser.email}</p>
          <div className="flex justify-center gap-2 mb-4">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">코드: {authenticatedUser.broadcastCode}</Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">팀: {authenticatedUser.teamNumber}</Badge>
            {authenticatedUser.role === "instructor" && (
              <Badge className="bg-green-50 text-green-700 border-green-200">교관</Badge>
            )}
            {authenticatedUser.isTestAccount && (
              <Badge className="bg-orange-50 text-orange-700 border-orange-200">테스트</Badge>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full clean-button bg-red-500 hover:bg-red-600 py-2 px-4 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 구글 로그인 버튼 */}
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full clean-button py-3 px-4 flex items-center justify-center gap-3 text-sm font-medium"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            구글 로그인 중...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
      </button>

      {/* 구분선 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">또는</span>
        </div>
      </div>

      {/* 테스트 로그인 버튼 */}
      <button
        onClick={handleTestLogin}
        className="w-full clean-button-light py-3 px-4 flex items-center justify-center gap-3 text-sm font-medium"
      >
        <User className="w-4 h-4" />
        테스트 로그인
      </button>

      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">💡 개발 환경에서는 테스트 로그인을 사용하세요</p>
        <p className="text-xs text-gray-400">실제 운영 환경에서는 Google 계정으로만 로그인 가능합니다</p>
      </div>
    </div>
  )
}

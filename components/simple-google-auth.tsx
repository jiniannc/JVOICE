"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle, AlertTriangle, Monitor, Smartphone } from "lucide-react"
import type { Employee } from "@/lib/employee-database"
import { deviceDetector } from "@/lib/device-detector"

interface GoogleUser {
  email: string
  name: string
  picture: string
  employee?: Employee
}

interface SimpleGoogleAuthProps {
  onAuthSuccess: (user: GoogleUser, deviceInfo: any) => void
  requireCompanyDevice?: boolean
}

export function SimpleGoogleAuth({ onAuthSuccess, requireCompanyDevice = false }: SimpleGoogleAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [isCheckingDevice, setIsCheckingDevice] = useState(false)
  const [showManualLogin, setShowManualLogin] = useState(false)

  // 수동 로그인용 테스트 계정들
  const TEST_ACCOUNTS = [
    {
      email: "kim.seungmu@jinair.com",
      name: "김승무",
      picture: "https://via.placeholder.com/100x100/4285f4/ffffff?text=김승무",
      employee: {
        email: "kim.seungmu@jinair.com",
        name: "김승무",
        employeeId: "CA001",
        department: "객실승무",
        position: "승무원",
        isActive: true,
      },
    },
    {
      email: "park.hanggong@jinair.com",
      name: "박항공",
      picture: "https://via.placeholder.com/100x100/34a853/ffffff?text=박항공",
      employee: {
        email: "park.hanggong@jinair.com",
        name: "박항공",
        employeeId: "CA002",
        department: "객실승무",
        position: "수석승무원",
        isActive: true,
      },
    },
    {
      email: "test@gmail.com",
      name: "테스트승무원",
      picture: "https://via.placeholder.com/100x100/ea4335/ffffff?text=테스트",
      employee: {
        email: "test@gmail.com",
        name: "테스트승무원",
        employeeId: "TEST001",
        department: "객실승무",
        position: "승무원",
        isActive: true,
      },
    },
    {
      email: "admin@jinair.com",
      name: "관리자",
      picture: "https://via.placeholder.com/100x100/fbbc05/ffffff?text=관리자",
      employee: {
        email: "admin@jinair.com",
        name: "관리자",
        employeeId: "ADMIN001",
        department: "운항관리",
        position: "관리자",
        isActive: true,
      },
    },
  ]

  useEffect(() => {
    // 자동으로 수동 로그인 모드 활성화 (Google OAuth 문제 우회)
    setTimeout(() => {
      setShowManualLogin(true)
      setError("Google OAuth 정책 변경으로 인해 임시 로그인 시스템을 사용합니다.")
    }, 2000)
  }, [])

  const handleManualLogin = async (testAccount: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const googleUser: GoogleUser = {
        email: testAccount.email,
        name: testAccount.name,
        picture: testAccount.picture,
        employee: testAccount.employee,
      }

      // 디바이스 확인 (회사 컴퓨터 필수인 경우)
      if (requireCompanyDevice) {
        setIsCheckingDevice(true)
        const deviceCheck = await deviceDetector.isCompanyDevice()
        setDeviceInfo(deviceCheck)

        if (!deviceCheck.isCompany) {
          console.warn("개인 디바이스에서 접속:", deviceCheck.reason)
        }
      }

      setUser(googleUser)
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
      setIsCheckingDevice(false)
    }
  }

  const handleContinue = () => {
    if (user) {
      onAuthSuccess(user, deviceInfo)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setError(null)
    setDeviceInfo(null)
  }

  const openGoogleOAuthDirect = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError("Google 클라이언트 ID가 설정되지 않았습니다.")
      return
    }

    const redirectUri = window.location.origin
    const oauthUrl =
      `https://accounts.google.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid email profile&` +
      `access_type=offline`

    window.open(oauthUrl, "google-oauth", "width=500,height=600,scrollbars=yes,resizable=yes")
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
            인증 완료
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 직원 정보 */}
          <div className="text-center space-y-2">
            <p className="font-semibold text-lg">{user.employee?.name}</p>
            <p className="text-sm text-gray-600">{user.employee?.employeeId}</p>
            <div className="flex justify-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">{user.employee?.department}</Badge>
              <Badge className="bg-green-100 text-green-800">{user.employee?.position}</Badge>
            </div>
          </div>

          {/* 디바이스 정보 */}
          {requireCompanyDevice && deviceInfo && (
            <Alert className={deviceInfo.isCompany ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
              <div className="flex items-center gap-2">
                {deviceInfo.isCompany ? (
                  <Monitor className="w-4 h-4 text-green-600" />
                ) : (
                  <Smartphone className="w-4 h-4 text-yellow-600" />
                )}
                <AlertDescription className={deviceInfo.isCompany ? "text-green-800" : "text-yellow-800"}>
                  {deviceInfo.reason}
                  {!deviceInfo.isCompany && <div className="mt-1 text-xs">녹음은 회사 컴퓨터에서만 가능합니다.</div>}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={handleContinue} className="flex-1 jinair-button">
              계속하기
            </Button>
            <Button onClick={handleLogout} variant="outline" className="bg-transparent">
              다시 로그인
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
        <CardTitle>직원 로그인</CardTitle>
        <p className="text-sm text-gray-600">Google 계정으로 로그인하세요</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google OAuth 문제 안내 */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 text-sm">
            <div className="space-y-2">
              <p className="font-semibold">🚧 Google OAuth 정책 변경</p>
              <p>Google의 새로운 FedCM 정책으로 인해 임시 로그인 시스템을 사용합니다.</p>
              <p className="text-xs">실제 운영 시에는 Google Workspace SSO로 교체됩니다.</p>
            </div>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* 수동 로그인 (테스트용) */}
        {showManualLogin && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-3">테스트 계정 선택</p>
            </div>

            <div className="space-y-2">
              {TEST_ACCOUNTS.map((account, index) => (
                <Button
                  key={index}
                  onClick={() => handleManualLogin(account)}
                  disabled={isLoading || isCheckingDevice}
                  variant="outline"
                  className="w-full h-auto p-3 bg-white hover:bg-gray-50 border-gray-200"
                >
                  <div className="flex items-center gap-3 w-full">
                    <img
                      src={account.picture || "/placeholder.svg"}
                      alt={account.name}
                      className="w-8 h-8 rounded-full border border-gray-200"
                    />
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.employee?.employeeId}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {account.employee?.position}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 실제 Google OAuth 시도 (참고용) */}
        <div className="border-t pt-4">
          <Button
            onClick={openGoogleOAuthDirect}
            variant="outline"
            className="w-full h-12 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
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
              실제 Google 로그인 시도 (실험용)
            </div>
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">⚠️ 현재 FedCM 정책으로 인해 작동하지 않을 수 있습니다</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            {isCheckingDevice ? "디바이스 확인 중..." : "로그인 중..."}
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            🧪 임시 테스트 시스템
            <br />
            Google OAuth 문제 해결 후 정식 인증으로 교체 예정
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

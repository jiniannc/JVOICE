"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Mic, Settings, Users, Plane, Star, Headphones, Shield, LogOut, Home, Loader2 } from "lucide-react"
import { GoogleAuth } from "@/components/google-auth-fixed"

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
}

interface AuthenticatedUser {
  email: string
  name: string
  picture: string
  role: string
  isTestAccount?: boolean
}

export default function HomePage() {
  const [mode, setMode] = useState<"auth" | "select" | "recording" | "admin" | "evaluation">("auth")
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleAuthSuccess = (user: AuthenticatedUser) => {
    console.log("✅ [HomePage] 인증 성공:", user.name)
    setAuthenticatedUser(user)

    // 사용자 정보 자동 입력
    setUserInfo((prev) => ({
      ...prev,
      name: user.name,
      employeeId: user.isTestAccount ? "TEST001" : "",
      email: user.email,
    }))

    setMode("select")
  }

  const handleLogout = async () => {
    console.log("🚨 [HomePage] 로그아웃 시작")
    setIsLoggingOut(true)

    try {
      setAuthenticatedUser(null)
      setUserInfo({ name: "", employeeId: "", language: "", category: "" })
      setMode("auth")
    } catch (error) {
      console.error("❌ [HomePage] 로그아웃 실패:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleGoHome = () => {
    console.log("🏠 [HomePage] 홈으로 이동")
    setMode("select")
  }

  const handleStartRecording = () => {
    if (userInfo.name && userInfo.employeeId && userInfo.language && userInfo.category) {
      alert("녹음 기능은 NextAuth 설치 후 활성화됩니다!")
    }
  }

  const handleAdminLogin = () => {
    alert("관리자 기능은 NextAuth 설치 후 활성화됩니다!")
  }

  const handleEvaluationLogin = () => {
    alert("평가 기능은 NextAuth 설치 후 활성화됩니다!")
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
                  <span className="text-sm font-medium">서버사이드 OAuth 2.0 (설치 중)</span>
                </div>
              </div>

              {/* 설치 안내 */}
              <div className="max-w-2xl mx-auto bg-yellow-100 border border-yellow-300 rounded-lg p-6 text-gray-800">
                <h3 className="font-bold text-lg mb-3">🔧 NextAuth 설치가 필요합니다</h3>
                <div className="text-left space-y-2 text-sm">
                  <p>
                    <strong>1단계:</strong> 터미널에서 다음 명령어 실행:
                  </p>
                  <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-xs">
                    npm install next-auth@4.24.5 --legacy-peer-deps
                  </div>
                  <p>
                    <strong>2단계:</strong> 페이지 새로고침
                  </p>
                  <p className="text-blue-600">💡 현재는 테스트 로그인만 사용 가능합니다</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 로그인 섹션 */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <GoogleAuth onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    )
  }

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
                      src={authenticatedUser.picture || "/placeholder.svg"}
                      alt={authenticatedUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{authenticatedUser.name}</p>
                    <p className="text-xs text-blue-200">{authenticatedUser.email}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge className="bg-white/20 text-white text-xs px-2 py-0">
                        {authenticatedUser.role === "admin"
                          ? "관리자"
                          : authenticatedUser.role === "instructor"
                            ? "교관"
                            : "승무원"}
                      </Badge>
                      {authenticatedUser.isTestAccount && (
                        <Badge className="bg-yellow-500/80 text-white text-xs px-2 py-0">테스트</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGoHome}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
                    type="button"
                  >
                    <Home className="w-4 h-4 mr-1" />홈
                  </Button>
                  <Button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30 disabled:opacity-50"
                    type="button"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        로그아웃 중...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-1" />
                        로그아웃
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 승무원 녹음 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 jinair-card border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 via-transparent to-blue-500/5"></div>
            <CardHeader className="text-center relative z-10 pb-6">
              <div className="w-20 h-20 jinair-gradient rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Mic className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">승무원 녹음</CardTitle>
              <CardDescription className="text-gray-600">기내 방송 음성 녹음 및 제출</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                    이름
                  </Label>
                  <Input
                    id="name"
                    value={userInfo.name}
                    onChange={(e) => setUserInfo((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="성명을 입력하세요"
                    className="mt-1 border-gray-200 focus:border-red-800 focus:ring-red-800/20"
                    disabled={!!authenticatedUser}
                  />
                  {authenticatedUser && <p className="text-xs text-green-600 mt-1">✓ 로그인 정보에서 자동 입력됨</p>}
                </div>
                <div>
                  <Label htmlFor="employeeId" className="text-sm font-semibold text-gray-700">
                    사번
                  </Label>
                  <Input
                    id="employeeId"
                    value={userInfo.employeeId}
                    onChange={(e) => setUserInfo((prev) => ({ ...prev, employeeId: e.target.value }))}
                    placeholder="직원번호를 입력하세요"
                    className="mt-1 border-gray-200 focus:border-red-800 focus:ring-red-800/20"
                  />
                </div>
                <div>
                  <Label htmlFor="language" className="text-sm font-semibold text-gray-700">
                    언어 선택
                  </Label>
                  <Select
                    value={userInfo.language}
                    onValueChange={(value) => setUserInfo((prev) => ({ ...prev, language: value, category: "" }))}
                  >
                    <SelectTrigger className="mt-1 border-gray-200 focus:border-red-800 focus:ring-red-800/20">
                      <SelectValue placeholder="평가 언어를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="korean-english">🇰🇷🇺🇸 한국어/영어</SelectItem>
                      <SelectItem value="japanese">🇯🇵 일본어</SelectItem>
                      <SelectItem value="chinese">🇨🇳 중국어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {userInfo.language && (
                  <div>
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                      평가 구분
                    </Label>
                    <Select
                      value={userInfo.category}
                      onValueChange={(value) => setUserInfo((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="mt-1 border-gray-200 focus:border-red-800 focus:ring-red-800/20">
                        <SelectValue placeholder="평가 유형을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoryOptions(userInfo.language).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button
                onClick={handleStartRecording}
                className="w-full jinair-button h-12 text-lg font-semibold shadow-lg"
                disabled={!userInfo.name || !userInfo.employeeId || !userInfo.language || !userInfo.category}
              >
                <Mic className="w-5 h-5 mr-2" />
                녹음 시작하기
              </Button>
            </CardContent>
          </Card>

          {/* 관리자 모드 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 jinair-card border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5"></div>
            <CardHeader className="text-center relative z-10 pb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Settings className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">시스템 관리</CardTitle>
              <CardDescription className="text-gray-600">PDF 문안 관리 및 데이터 분석</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-semibold text-blue-900 mb-2">관리 기능</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• PDF 문안 동기화</li>
                    <li>• 월별 평가 데이터 추출</li>
                    <li>• 시스템 현황 모니터링</li>
                  </ul>
                </div>
              </div>
              <Button
                onClick={handleAdminLogin}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 text-lg font-semibold shadow-lg"
              >
                <Settings className="w-5 h-5 mr-2" />
                관리자 로그인
              </Button>
            </CardContent>
          </Card>

          {/* 평가 모드 */}
          <Card className="group hover:shadow-2xl transition-all duration-300 jinair-card border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
            <CardHeader className="text-center relative z-10 pb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">평가 시스템</CardTitle>
              <CardDescription className="text-gray-600">전문 교관 평가 및 피드백</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <h4 className="font-semibold text-purple-900 mb-2">평가 기능</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• 실시간 음성 재생</li>
                    <li>• 상세 평가 기준 적용</li>
                    <li>• PDF 결과서 생성</li>
                  </ul>
                </div>
              </div>
              <Button
                onClick={handleEvaluationLogin}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white h-12 text-lg font-semibold shadow-lg"
              >
                <Users className="w-5 h-5 mr-2" />
                교관 로그인
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* NextAuth 설치 안내 */}
        <div className="mt-16 text-center">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-4">🔧 NextAuth 설치 안내</h2>
            <div className="text-left space-y-4">
              <div className="bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm">
                <p># 1. 기존 의존성 정리</p>
                <p>rm -rf node_modules package-lock.json</p>
                <p></p>
                <p># 2. NextAuth 설치</p>
                <p>npm install next-auth@4.24.5 --legacy-peer-deps</p>
                <p></p>
                <p># 3. 전체 의존성 재설치</p>
                <p>npm install --legacy-peer-deps</p>
              </div>
              <p className="text-blue-700 text-center">
                💡 설치 완료 후 페이지를 새로고침하면 완전한 OAuth 로그인이 활성화됩니다!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

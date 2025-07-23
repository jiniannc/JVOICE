"use client"

import React, { useState, useEffect, useRef } from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Mic,
  Settings,
  LogOut,
  Loader2,
  RefreshCw,
  X,
  FileText,
  User,
  Home,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Eye,
  ClipboardCheck,
  LogIn,
} from "lucide-react"
import { PDFViewer } from "@/components/pdf-viewer"
import { AudioRecorder } from "@/components/audio-recorder"
import { FinalConfirmation } from "@/components/final-confirmation"
import { EvaluationDashboard } from "@/components/evaluation-dashboard"
import { EvaluationSummary } from "@/components/evaluation-summary"
import { GoogleAuth } from "@/components/google-auth"
import { TypographyAnimation } from "@/components/typography-animation"
import HeroLottie from "@/components/hero-lottie"
import ScrollDownLottie from "@/components/scroll-down-lottie"
import { pdfSyncService } from "@/lib/pdf-sync-service"
import { employeeDB } from "@/lib/employee-database"
import Image from "next/image"
import dynamic from "next/dynamic";
import MyRecordingsTable from "@/components/my-recordings-table"

// Typography2Lottie 컴포넌트 추가
const Typography2Lottie = dynamic(
  () => import("@lottiefiles/react-lottie-player").then(mod => ({ default: mod.Player })),
  { ssr: false }
);

// Typography2Once component: play once on first scroll into view
function Typography2Once({ style }: { style?: React.CSSProperties }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const playerRef = React.useRef<any>(null)
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  React.useEffect(() => {
    if (!isClient || !containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          if (playerRef.current) {
            // play once
            try {
              playerRef.current.play()
            } catch (e) {
              console.warn('Lottie play error', e)
            }
          }
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isClient])

  if (!isClient) return null

  const setPlayerRef = (inst: any): void => {
    playerRef.current = inst
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {React.createElement(Typography2Lottie as any, {
        ref: setPlayerRef,
        src: '/typography2.json',
        autoplay: false,
        loop: false,
        style: style,
        keepLastFrame: true,
      })}
    </div>
  )
}

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
  broadcastCode?: string
  teamNumber?: string
  role?: string
  broadcastGrade?: string
  department?: string
  position?: string
  isInstructor?: boolean
}

interface AuthenticatedUser {
  email: string
  name: string
  picture: string
  role: string
  broadcastCode: string
  teamNumber: string
  broadcastGrade: string
  isTestAccount?: boolean
}

export default function HomePage() {
  const [mode, setModeState] = useState<"select" | "recording" | "review" | "evaluation" | "admin">("select")
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null | undefined>(undefined)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAdminAuth, setShowAdminAuth] = useState(false)
  const [showEvaluationAuth, setShowEvaluationAuth] = useState(false)
  const [showMyPage, setShowMyPage] = useState(false)
  const [showRecordingSetup, setShowRecordingSetup] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [heroVisible, setHeroVisible] = useState(false);
  const [heroZoomActive, setHeroZoomActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setHeroVisible(true);
    // 0.2초 후 blur 해제
    const timer = setTimeout(() => setHeroZoomActive(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // 🔥 앱 시작시 자동 문안 동기화
  useEffect(() => {
    const autoSyncPDFs = async () => {
      const lastSync = pdfSyncService.getLastSyncTime()
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      if (!lastSync || new Date(lastSync) < oneDayAgo) {
        console.log("🔄 자동 문안 동기화 시작...")
        setIsAutoSyncing(true)

        try {
          await pdfSyncService.syncPDFFiles()
          console.log("✅ 자동 문안 동기화 완료")
        } catch (error) {
          console.error("❌ 자동 문안 동기화 실패:", error)
        } finally {
          setIsAutoSyncing(false)
        }
      }
    }

    autoSyncPDFs()
  }, [])

  // 서버사이드 인증 상태 확인
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/user")
        const data = await res.json()
        if (data.authenticated && data.user) {
          setAuthenticatedUser(data.user)
          // 직원 정보 불러오기 및 로그
          const employeeInfo = await employeeDB.findEmployeeByEmail(data.user.email)
          console.log("[useEffect] employeeInfo for setUserInfo:", employeeInfo)
          if (employeeInfo) {
            setUserInfo((prev) => ({
              ...prev,
              name: employeeInfo.name,
              employeeId: employeeInfo.employeeId,
              department: employeeInfo.department,
              position: employeeInfo.position,
              email: data.user.email,
              isInstructor: employeeInfo.isInstructor, // 교관 여부 전달
            }))
          } else {
            setUserInfo((prev) => ({
              ...prev,
              name: data.user.name,
              employeeId: "",
              email: data.user.email,
              isInstructor: false,
            }))
          }
        } else {
      setAuthenticatedUser(null)
    }
      } catch (e) {
        setAuthenticatedUser(null)
      }
    }
    fetchUser()
  }, [])

  // authenticatedUser가 있으면 스프레드시트에서 이름/사번 자동 입력
  useEffect(() => {
    const fetchEmployeeInfo = async () => {
      if (authenticatedUser?.email) {
        const employeeInfo = await employeeDB.findEmployeeByEmail(authenticatedUser.email)
        if (employeeInfo) {
          setUserInfo((prev) => ({
            ...prev,
            name: employeeInfo.name,
            employeeId: employeeInfo.employeeId,
          }))
        }
      }
    }
    fetchEmployeeInfo()
  }, [authenticatedUser])

  const handleAuthSuccess = async (user: AuthenticatedUser) => {
    setAuthenticatedUser(user)

    // 콘솔 로그 추가
    console.log("[handleAuthSuccess] user.email:", user.email)

    // 직원 정보 불러오기
    const employeeInfo = await employeeDB.findEmployeeByEmail(user.email)
    console.log("[handleAuthSuccess] employeeInfo for setUserInfo:", employeeInfo)

    if (employeeInfo) {
      setUserInfo((prev) => ({
        ...prev,
        name: employeeInfo.name,
        employeeId: employeeInfo.employeeId,
        department: employeeInfo.department,
        position: employeeInfo.position,
        email: user.email,
        isInstructor: employeeInfo.isInstructor, // 교관 여부 전달
      }))
    } else {
    setUserInfo((prev) => ({
      ...prev,
      name: user.name,
        employeeId: "",
      email: user.email,
        isInstructor: false,
    }))
    }
    setShowLoginModal(false)

    // 로그인 후 대기 중인 액션 실행
    if (pendingAction) {
      handleNavigation(pendingAction)
      setPendingAction(null)
    }
  }

  const handleLogout = async () => {
    console.log("🚨 [HomePage] 로그아웃 시작")
    setIsLoggingOut(true)

    try {
      localStorage.clear()
      sessionStorage.clear()

      setAuthenticatedUser(null)
      setUserInfo({ name: "", employeeId: "", language: "", category: "" })
      setModeState("select")

      if (authenticatedUser) {
        try {
          await fetch("/api/auth/signout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          })
        } catch (error) {
          console.log("NextAuth 로그아웃 실패, 강제 진행:", error)
        }
      }

      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
      })

      console.log("✅ [HomePage] 로그아웃 완료")
    } catch (error) {
      console.error("❌ [HomePage] 로그아웃 실패:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleNavigation = (newMode: string) => {
    // 로그인이 필요한 기능들
    if (!authenticatedUser) {
      setPendingAction(newMode)
      setShowLoginModal(true)
      return
    }

    if (newMode === "admin") {
      setShowAdminAuth(true)
    } else if (newMode === "evaluation") {
      setShowEvaluationAuth(true)
    } else if (newMode === "recording") {
      setShowRecordingSetup(true)
    } else {
      setModeState(newMode as any)
    }
  }

  const handleAdminAuthSuccess = () => {
    setShowAdminAuth(false)
    setModeState("admin")
  }

  const handleEvaluationAuthSuccess = () => {
    setShowEvaluationAuth(false)
    setModeState("evaluation")
  }

  const handleRecordingSetupComplete = (setupInfo: UserInfo) => {
    setUserInfo(setupInfo)
    setShowRecordingSetup(false)
    setModeState("recording")
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

  // userInfo 변경 시 콘솔 로그
  useEffect(() => {
    console.log("[userInfo changed]", userInfo)
  }, [userInfo])

  // 로딩 중
  if (authenticatedUser === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">시스템 로딩 중...</p>
          {isAutoSyncing && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs text-blue-700 font-medium">최신 문안 동기화 중...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (mode === "recording") {
    return <RecordingMode userInfo={userInfo} />
  }

  if (mode === "review") {
    return (
      <ReviewMode
        userInfo={userInfo}
        authenticatedUser={authenticatedUser}
        onNavigate={handleNavigation}
        onModeChange={setModeState}
        showMyPage={showMyPage}
        setShowMyPage={setShowMyPage}
        handleLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
    )
  }

  if (mode === "admin") {
    return (
      <AdminMode
        onBack={() => setModeState("select")}
        onNavigate={handleNavigation}
        onModeChange={setModeState}
        showMyPage={showMyPage}
        setShowMyPage={setShowMyPage}
        authenticatedUser={authenticatedUser}
        userInfo={userInfo}
        handleLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
    )
  }

  if (mode === "evaluation") {
    return (
      <EvaluationMode
        onBack={() => setModeState("select")}
        onNavigate={(m) => setModeState(m as any)}
        onModeChange={setModeState}
        showAdminAuth={showAdminAuth}
        setShowAdminAuth={setShowAdminAuth}
        showEvaluationAuth={showEvaluationAuth}
        setShowEvaluationAuth={setShowEvaluationAuth}
        showRecordingSetup={showRecordingSetup}
        setShowRecordingSetup={setShowRecordingSetup}
        showMyPage={showMyPage}
        setShowMyPage={setShowMyPage}
        authenticatedUser={authenticatedUser}
        userInfo={userInfo}
        handleLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
    )
  }

  return (
    <div className="min-h-screen">
      {/* 사이드바 네비게이션 */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* JVOICE 브랜드명 */}
        <div className="p-6 border-b border-gray-100">
          <div className="text-left">
            <h1 className="text-gray-900 font-bold text-lg">JVOICE</h1>
          </div>
        </div>

        {/* 메인 네비게이션 */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setModeState("select")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                mode === "select" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>

            <button
              onClick={() => handleNavigation("recording")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Record
            </button>

            <button
              onClick={() => handleNavigation("review")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Review
            </button>

            <button
              onClick={() => handleNavigation("evaluation")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              Evaluate
            </button>

            <button
              onClick={() => handleNavigation("admin")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </nav>
        </div>

        {/* 하단 메뉴 */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Bell className="w-4 h-4" />
            Updates
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>

          {authenticatedUser && (
            <button
              onClick={() => setShowMyPage(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4" />
              My Account
              <ChevronDown className="w-3 h-3 ml-auto" />
            </button>
          )}

          {authenticatedUser ? (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  로그아웃 중...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Logout
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="ml-64 p-8 main-scroll-container" style={{height: '100vh', overflowY: 'auto', scrollSnapType: 'y mandatory'}}>
        {/* hero 이미지 섹션 */}
        <section className="flex flex-col mb-0 -mx-8 section-snap" style={{height: '1020px', scrollSnapAlign: 'start'}}>
          {/* 컨텐츠 영역 전체 : ml-64 로 이미 사이드바 만큼 밀려 있음 */}
          <div className="relative w-full" style={{ height: '1020px' }}>
            {/* 배경 비디오 영역 */}
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'33.6rem',height:'33.6rem',zIndex:1}}>
              <div className="w-[33.6rem] h-[33.6rem] rounded-full overflow-hidden shadow-2xl flex items-center justify-center bg-white/10">
              <video
                autoPlay
                loop
                muted
                playsInline
                className={`object-cover w-full h-full transition-opacity duration-1000 hero-zoom-in${heroZoomActive ? ' hero-zoom-in-active' : ''} ${heroVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{
                  animation: heroVisible
                      ? 'hero-zoom-in 1s cubic-bezier(0.4,0,0.2,1) forwards'
                    : undefined
                }}
              >
                <source src="/video/main-hero.webm" type="video/webm" />
                <source src="/video/main-hero.mp4" type="video/mp4" />
              </video>
              </div>
            </div>
            {/* 그라데이션 오버레이 */}
            <div className="gradient-overlay"></div>
            {/* 구름층 */}
            <div className="cloud-layer">
              <div className="cloud cloud-1"></div>
              <div className="cloud cloud-2"></div>
              <div className="cloud cloud-3"></div>
            </div>
            {/* 안개층 */}
            <div className="fog-layer"></div>
            {/* 로티 애니메이션 오버레이 - 상단 중앙 */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
              <HeroLottie />
            </div>
            {/* 스크롤 다운 애니메이션 오버레이 - 하단 중앙 */}
            <div className="absolute" style={{ bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              <ScrollDownLottie />
            </div>
          </div>
        </section>

        {/* 로티+텍스트+카드 section */}
        <section className="section-snap flex flex-col items-center" style={{minHeight: '100vh', scrollSnapAlign: 'start', paddingTop: 0, marginTop: 0}}>
          <div className="w-full max-w-6xl flex flex-col items-center" style={{gap: 0, marginTop: 0, paddingTop: 0}}>
            <Typography2Once
              style={{ width: '80%', height: 360, display: 'block', padding: 0, marginTop: 0, marginBottom: '-80px', transform: 'translateY(-50px)' }}
            />
          </div>
          <div
            className="grid lg:grid-cols-3 gap-8 max-w-6xl w-full mx-auto items-start"
            style={{ marginTop: '-40px', paddingTop: 0 }}
          >
            {/* 3개 카드 - Record, Review, Evaluate */}
            {/* Record 카드 - RECORD.mp4 동영상 */}
            <div
              className="bg-white rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => handleNavigation("recording")}
              onMouseEnter={(e) => {
                const video = e.currentTarget.querySelector('video') as HTMLVideoElement
                if (video) {
                  video.currentTime = 0
                  video.play()
                }
              }}
              onMouseLeave={(e) => {
                const video = e.currentTarget.querySelector('video') as HTMLVideoElement
                if (video) {
                  video.pause()
                  video.currentTime = 0
                }
              }}
            >
              <div className="relative overflow-hidden rounded-t-2xl">
                <video
                  muted
                  playsInline
                  className="w-full h-84 object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    console.log("Video failed to load:", e)
                    // 동영상 로드 실패시 플레이스홀더 이미지로 대체
                    const target = e.target as HTMLVideoElement
                    target.style.display = "none"
                    const placeholder = document.createElement("div")
                    placeholder.className = "w-full h-84 bg-blue-100 flex items-center justify-center"
                    placeholder.innerHTML =
                      '<div class="text-blue-600 text-center"><div class="text-4xl mb-2">🎤</div><div class="text-sm">Record Video</div></div>'
                    target.parentNode?.appendChild(placeholder)
                  }}
                >
                  <source src="/video/RECORD.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors duration-300"></div>
              </div>
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-bold text-gray-900 mb-2">Record</CardTitle>
                <CardDescription className="text-gray-500">기내 방송 음성 녹음 및 제출</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigation("recording")
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-sm font-medium"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  녹음 시작하기
                </Button>
              </CardContent>
            </div>

            {/* Review 카드 - REVIEW.mp4 동영상 */}
            <div
              className="bg-white rounded-2xl shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => handleNavigation("review")}
              onMouseEnter={(e) => {
                const video = e.currentTarget.querySelector('video') as HTMLVideoElement
                if (video) {
                  video.currentTime = 0
                  video.play()
                }
              }}
              onMouseLeave={(e) => {
                const video = e.currentTarget.querySelector('video') as HTMLVideoElement
                if (video) {
                  video.pause()
                  video.currentTime = 0
                }
              }}
            >
              <div className="relative overflow-hidden rounded-t-2xl">
                <video
                  muted
                  playsInline
                  className="w-full h-84 object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    console.log("Video failed to load:", e)
                    const target = e.target as HTMLVideoElement
                    target.style.display = "none"
                    const placeholder = document.createElement("div")
                    placeholder.className = "w-full h-84 bg-green-100 flex items-center justify-center"
                    placeholder.innerHTML =
                      '<div class="text-green-600 text-center"><div class="text-4xl mb-2">👁️</div><div class="text-sm">Review Video</div></div>'
                    target.parentNode?.appendChild(placeholder)
                  }}
                >
                  <source src="/video/REVIEW.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-green-600/10 group-hover:bg-green-600/20 transition-colors duration-300"></div>
              </div>
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-bold text-gray-900 mb-2">Review</CardTitle>
                <CardDescription className="text-gray-500">내 녹음 내역 및 평가 결과 확인</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigation("review")
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-sm font-medium"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  결과 확인하기
                </Button>
              </CardContent>
            </div>

            {/* Evaluate 카드 - EVALUATE.mp4 동영상 */}
            <div
              className="bg-white rounded-2xl shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => handleNavigation("evaluation")}
              onMouseEnter={(e) => {
                const video = e.currentTarget.querySelector('video') as HTMLVideoElement
                if (video) {
                  video.currentTime = 0
                  video.play()
                }
              }}
              onMouseLeave={(e) => {
                const video = e.currentTarget.querySelector('video') as HTMLVideoElement
                if (video) {
                  video.pause()
                  video.currentTime = 0
                }
              }}
            >
              <div className="relative overflow-hidden rounded-t-2xl">
                <video
                  muted
                  playsInline
                  className="w-full h-84 object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    console.log("Video failed to load:", e)
                    const target = e.target as HTMLVideoElement
                    target.style.display = "none"
                    const placeholder = document.createElement("div")
                    placeholder.innerHTML =
                      '<div class="text-purple-600 text-center"><div class="text-4xl mb-2">📋</div><div class="text-sm">Evaluate Video</div></div>'
                    target.parentNode?.appendChild(placeholder)
                  }}
                >
                  <source src="/video/EVALUATE.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-purple-600/10 group-hover:bg-purple-600/20 transition-colors duration-300"></div>
              </div>
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-bold text-gray-900 mb-2">Evaluate</CardTitle>
                <CardDescription className="text-gray-500">전문 교관 평가 및 피드백</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigation("evaluation")
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-sm font-medium"
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  평가 시작하기
                </Button>
              </CardContent>
            </div>
          </div>
        </section>
        <div className="flex flex-col items-center justify-center w-full mt-[-48px] mb-4">
          <div className="text-gray-700 text-xs leading-relaxed font-normal text-center" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
            <div>J-VOICE v1.0 | © 2025 Jin Air Cabin Training Group</div>
            <div>This system supports the qualification and evaluation of cabin crew in-flight announcements.</div>
          </div>
        </div>
      </div>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") {
              setShowLoginModal(false);
              setPendingAction(null);
            }
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">로그인이 필요합니다</h2>
                <button
                  onClick={() => {
                    setShowLoginModal(false)
                    setPendingAction(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <GoogleAuth onAuthSuccess={setAuthenticatedUser} />
          </div>
        </div>
      )}

      {/* My Page 모달 */}
      {showMyPage && (
        <MyPageModal
          user={authenticatedUser}
          userInfo={userInfo}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      )}

      {/* 녹음 설정 모달 */}
      {showRecordingSetup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowRecordingSetup(false);
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">녹음 설정</h2>
                <button onClick={() => setShowRecordingSetup(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={authenticatedUser} />
            </div>
          </div>
        </div>
      )}

      {/* 관리자 인증 모달 */}
      {showAdminAuth && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowAdminAuth(false);
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">관리자 인증</h2>
                <button onClick={() => setShowAdminAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AdminAuth onSuccess={handleAdminAuthSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* 평가 인증 모달 */}
      {showEvaluationAuth && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowEvaluationAuth(false);
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">교관 인증</h2>
                <button onClick={() => setShowEvaluationAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <EvaluationAuth onSuccess={handleEvaluationAuthSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* 사용자 정보 - 상단 우측 */}
      {authenticatedUser && (
        <div
          style={{ position: "fixed", top: 20, right: 32, zIndex: 50 }}
          className="flex items-center gap-3 bg-white/80 shadow px-3 py-2 rounded-full border border-gray-200 backdrop-blur-sm"
        >
          <img
            src={authenticatedUser.picture || "/placeholder.svg?height=32&width=32&text=User"}
            alt={authenticatedUser.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-300"
          />
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-gray-800 leading-tight">{authenticatedUser.name}</span>
            <span className="text-[11px] text-gray-500 leading-tight">{authenticatedUser.email}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// 녹음 설정 컴포넌트
function RecordingSetup({
  onComplete,
  authenticatedUser,
}: { onComplete: (UserInfo: any) => void; authenticatedUser: AuthenticatedUser | null }) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    employeeId: "",
    language: "",
    category: "",
    email: authenticatedUser?.email,
    broadcastCode: authenticatedUser?.broadcastCode,
    teamNumber: authenticatedUser?.teamNumber,
    role: authenticatedUser?.role,
    broadcastGrade: authenticatedUser?.broadcastGrade,
  })

  // authenticatedUser가 있으면 스프레드시트에서 이름/사번 자동 입력
  useEffect(() => {
    const fetchEmployeeInfo = async () => {
      if (authenticatedUser?.email) {
        const employeeInfo = await employeeDB.findEmployeeByEmail(authenticatedUser.email)
        if (employeeInfo) {
          setUserInfo((prev) => ({
            ...prev,
            name: employeeInfo.name,
            employeeId: employeeInfo.employeeId,
          }))
        }
      }
    }
    fetchEmployeeInfo()
  }, [authenticatedUser])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInfo.name && userInfo.employeeId && userInfo.language && userInfo.category) {
      onComplete(userInfo)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
          이름
        </Label>
        <Input
          id="name"
          value={userInfo.name}
          onChange={(e) => setUserInfo((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="성명을 입력하세요"
          className="border-blue-200 focus:border-blue-400"
          disabled
          required
        />
        {authenticatedUser && <p className="text-xs text-green-600 mt-1">✓ 로그인 정보에서 자동 입력됨</p>}
      </div>

      <div>
        <Label htmlFor="employeeId" className="text-sm font-medium text-gray-700 mb-2 block">
          사번
        </Label>
        <Input
          id="employeeId"
          value={userInfo.employeeId}
          onChange={(e) => setUserInfo((prev) => ({ ...prev, employeeId: e.target.value }))}
          placeholder="직원번호를 입력하세요"
          className="border-blue-200 focus:border-blue-400"
          disabled
          required
        />
      </div>

      <div>
        <Label htmlFor="language" className="text-sm font-medium text-gray-700 mb-2 block">
          언어 선택
        </Label>
        <Select
          value={userInfo.language}
          onValueChange={(value) => setUserInfo((prev) => ({ ...prev, language: value, category: "" }))}
          required
        >
          <SelectTrigger className="border-blue-200 focus:border-blue-400">
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
          <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-2 block">
            평가 구분
          </Label>
          <Select
            value={userInfo.category}
            onValueChange={(value) => setUserInfo((prev) => ({ ...prev, category: value }))}
            required
          >
            <SelectTrigger className="border-blue-200 focus:border-blue-400">
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

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-sm font-medium"
        disabled={!userInfo.name || !userInfo.employeeId || !userInfo.language || !userInfo.category}
      >
        <Mic className="w-4 h-4 mr-2" />
        녹음 시작하기
      </Button>
    </form>
  )
}

// My Page 모달 컴포넌트
function MyPageModal({
  user,
  userInfo,
  onClose,
  onLogout,
  isLoggingOut,
}: {
  user: AuthenticatedUser | null
  userInfo: UserInfo
  onClose: () => void
  onLogout: () => void
  isLoggingOut: boolean
}) {
  // 탭 상태 제거 (평가 내역, 녹음 기록 삭제)
  // const [activeTab, setActiveTab] = useState("profile")

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* 사이드바 */}
          <div className="w-64 bg-gray-50 p-6 border-r border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">My Account</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 프로필 정보만 남김 */}
            <nav className="space-y-2">
              <button
                className="w-full text-left px-3 py-2 rounded-lg bg-blue-100 text-blue-700 cursor-default"
                disabled
              >
                프로필 정보
              </button>
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button onClick={onLogout} disabled={isLoggingOut} variant="outline" className="w-full bg-transparent">
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
          </div>

          {/* 메인 컨텐츠 - 프로필 정보만 */}
          <div className="flex-1 p-10 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-md w-full mx-auto bg-white/90 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-blue-100">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg bg-white flex items-center justify-center">
                  <img
                    src={user?.picture || "/placeholder.svg?height=96&width=96&text=User"}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {userInfo.isInstructor && (
                  <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold px-4 py-1 rounded-full shadow-lg text-base tracking-widest border-2 border-blue-300 animate-pulse flex items-center gap-1">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/></svg>
                    교관
                  </span>
                )}
              </div>
              <div className="w-full text-center mb-4">
                <h4 className="text-2xl font-extrabold text-gray-900 mb-1">{user?.name}</h4>
                <p className="text-base text-gray-500 mb-2">{user?.email}</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-4 mb-2">
                <div className="text-right pr-2 text-gray-600 font-semibold">사번</div>
                <div className="text-left pl-2 text-gray-900 font-bold">{userInfo.employeeId || user?.broadcastCode}</div>
                <div className="text-right pr-2 text-gray-600 font-semibold">라인팀</div>
                <div className="text-left pl-2 text-gray-900 font-bold">{userInfo.department || '-'}</div>
                <div className="text-right pr-2 text-gray-600 font-semibold">방송코드</div>
                <div className="text-left pl-2 text-gray-900 font-bold">{userInfo.position || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Review 모드 컴포넌트 - 일관된 그레이 배경 + 그린 포인트 컬러
function ReviewMode({
  userInfo,
  authenticatedUser,
  onNavigate,
  onModeChange,
  showMyPage,
  setShowMyPage,
  handleLogout,
  isLoggingOut,
}: {
  userInfo: UserInfo
  authenticatedUser: AuthenticatedUser | null
  onNavigate: (mode: string) => void
  onModeChange: (mode: "select" | "recording" | "review" | "evaluation" | "admin") => void
  showMyPage: boolean
  setShowMyPage: (v: boolean) => void
  handleLogout: () => void
  isLoggingOut: boolean
}) {
  const [showAdminAuth, setShowAdminAuth] = useState(false)
  const [showEvaluationAuth, setShowEvaluationAuth] = useState(false)
  const [showRecordingSetup, setShowRecordingSetup] = useState(false)
  const [searchTerm, setSearchTerm] = useState("");

  const handleNavigation = (newMode: string) => {
    if (newMode === "admin") {
      setShowAdminAuth(true)
    } else if (newMode === "evaluation") {
      setShowEvaluationAuth(true)
    } else if (newMode === "recording") {
      setShowRecordingSetup(true)
    } else {
      onNavigate(newMode)
    }
  }

  const handleAdminAuthSuccess = () => {
    setShowAdminAuth(false)
    onModeChange("admin")
  }
  const handleEvaluationAuthSuccess = () => {
    setShowEvaluationAuth(false)
    onModeChange("evaluation")
  }
  const handleRecordingSetupComplete = () => {
    setShowRecordingSetup(false)
    onModeChange("recording")
  }

  return (
    <div className="min-h-screen">
      {/* 사이드바 네비게이션 */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* JVOICE 브랜드명 */}
        <div className="p-6 border-b border-gray-100">
          <div className="text-left">
            <h1 className="text-gray-900 font-bold text-lg">JVOICE</h1>
          </div>
        </div>
        {/* 메인 네비게이션 */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <button
              onClick={() => onNavigate("select")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => handleNavigation("recording")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Record
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left bg-green-100 text-green-700">
              <Eye className="w-4 h-4" />
              Review
            </button>
            <button
              onClick={() => handleNavigation("evaluation")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              Evaluate
            </button>
            <button
              onClick={() => handleNavigation("admin")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </nav>
        </div>
        {/* 하단 메뉴 */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Bell className="w-4 h-4" />
            Updates
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Moon className="w-4 h-4" />
            Dark Mode
          </button>
          <button
            onClick={() => setShowMyPage(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <User className="w-4 h-4" />
            My Account
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
      {/* 메인 컨텐츠 */}
      <div className="ml-64 p-8 main-scroll-container flex justify-center" style={{ height: "100vh", overflowY: "auto" }}>
        <div className="max-w-[80vw] w-full mx-auto">
          <MyRecordingsTable employeeId={authenticatedUser?.broadcastCode || userInfo.employeeId} />
        </div>
      </div>
      {/* 모달들 재사용 */}
      {showRecordingSetup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <button onClick={() => setShowRecordingSetup(false)} className="p-2 hover:bg-gray-100 rounded-lg absolute top-4 right-4">
              <X className="w-4 h-4" />
            </button>
            <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={authenticatedUser} />
          </div>
        </div>
      )}
      {showAdminAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <button onClick={() => setShowAdminAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg absolute top-4 right-4">
              <X className="w-4 h-4" />
            </button>
            <AdminAuth onSuccess={handleAdminAuthSuccess} />
          </div>
        </div>
      )}
      {showEvaluationAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <button onClick={() => setShowEvaluationAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg absolute top-4 right-4">
              <X className="w-4 h-4" />
            </button>
            <EvaluationAuth onSuccess={handleEvaluationAuthSuccess} />
          </div>
        </div>
      )}
      {showMyPage && (
        <MyPageModal
          user={authenticatedUser}
          userInfo={userInfo}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      )}
    </div>
  )
}

// 관리자 인증 컴포넌트
function AdminAuth({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setTimeout(() => {
        onSuccess()
        setIsLoading(false)
      }, 1000)
    } else {
      setTimeout(() => {
        alert("잘못된 비밀번호입니다.")
        setIsLoading(false)
      }, 1000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="admin-password" className="text-sm font-medium text-gray-700 mb-2 block">
          관리자 비밀번호
        </Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="관리자 비밀번호를 입력하세요"
          className="border-orange-200 focus:border-orange-400"
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 h-12">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            인증 중...
          </>
        ) : (
          <>
            <Settings className="w-4 h-4 mr-2" />
            관리자 로그인
          </>
        )}
      </Button>
      <p className="text-xs text-gray-400 text-center">💡 비밀번호는 관리자에게 문의하세요.</p>
    </form>
  )
}

// 평가 인증 컴포넌트
function EvaluationAuth({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password === process.env.NEXT_PUBLIC_INSTRUCTOR_PASSWORD) {
      setTimeout(() => {
        onSuccess()
        setIsLoading(false)
      }, 1000)
    } else {
      setTimeout(() => {
        alert("잘못된 비밀번호입니다.")
        setIsLoading(false)
      }, 1000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="instructor-password" className="text-sm font-medium text-gray-700 mb-2 block">
          교관 비밀번호
        </Label>
        <Input
          id="instructor-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="교관 비밀번호를 입력하세요"
          className="border-purple-200 focus:border-purple-400"
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 h-12">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            인증 중...
          </>
        ) : (
          <>
            <ClipboardCheck className="w-4 h-4 mr-2" />
            교관 로그인
          </>
        )}
      </Button>
      <p className="text-xs text-gray-400 text-center">💡 비밀번호는 관리자에게 문의하세요.</p>
    </form>
  )
}

// RecordingMode 컴포넌트 - 기존 기능 유지 + 경고창 추가
function RecordingMode({ userInfo }: { userInfo: UserInfo }) {
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [timeLimit] = useState(50 * 60)
  const [currentScript, setCurrentScript] = useState(1)
  const [recordings, setRecordings] = useState<{ [key: string]: Blob | null }>({})
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false)
  const [availableScripts, setAvailableScripts] = useState<number[]>([])
  const [currentLanguageMode, setCurrentLanguageMode] = useState<"korean" | "english">("korean")

  // 녹음 중 페이지 이탈 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "녹음을 완료하세요. 페이지를 떠나면 녹음 데이터가 손실될 수 있습니다."
      return e.returnValue
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    if (!startTime) {
      setStartTime(new Date())
    }
  }, [])

  useEffect(() => {
    if (!startTime) return

    const timer = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getRemainingTime = () => {
    return Math.max(0, timeLimit - elapsedTime)
  }

  useEffect(() => {
    const scripts = pdfSyncService.getRandomScripts(userInfo.language, 5)
    setAvailableScripts(scripts)
    if (scripts.length > 0) {
      setCurrentScript(scripts[0])
    }
  }, [userInfo.language])

  const getCurrentScriptIndex = () => {
    return availableScripts.indexOf(currentScript)
  }

  const nextScript = () => {
    const currentIndex = getCurrentScriptIndex()
    if (currentIndex < availableScripts.length - 1) {
      setCurrentScript(availableScripts[currentIndex + 1])
      setCurrentLanguageMode("korean")
    } else {
      setShowFinalConfirmation(true)
    }
  }

  const handleFinalSubmit = async () => {
    console.log("🚀 녹음 제출 시작...")

    // FinalConfirmation에서 이미 제출이 완료되었으므로 여기서는 페이지 새로고침만 수행
    console.log("✅ FinalConfirmation에서 제출 완료됨, 페이지 새로고침")
    window.location.reload()
  }

  const getRecordingKey = (scriptNum: number, lang: "korean" | "english" | "japanese" | "chinese") => {
    return `${scriptNum}-${lang}`
  }

  const isCurrentScriptComplete = () => {
    if (userInfo.language === "korean-english") {
      return (
        recordings[getRecordingKey(currentScript, "korean")] && recordings[getRecordingKey(currentScript, "english")]
      )
    } else {
      // 일본어, 중국어는 해당 언어 키로 확인
      return recordings[getRecordingKey(currentScript, userInfo.language as "japanese" | "chinese")]
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

  const handleGoHome = () => {
    if (confirm("녹음을 완료하세요. 정말로 나가시겠습니까? 녹음 데이터가 손실될 수 있습니다.")) {
      window.location.reload()
    }
  }

  if (showFinalConfirmation) {
    return (
      <FinalConfirmation
        userInfo={userInfo}
        recordings={recordings}
        availableScripts={availableScripts}
        onSubmit={handleFinalSubmit}
      />
    )
  }

  if (availableScripts.length === 0) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-gray-600 mb-4">해당 언어의 문안을 찾을 수 없습니다.</p>
          <p className="text-sm text-gray-500 mb-4">시스템이 자동으로 문안을 동기화합니다.</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-blue-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button onClick={handleGoHome} variant="outline" className="border-blue-200 bg-transparent">
              <div className="text-gray-900 font-bold text-lg">JVOICE</div>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">기내 방송 녹음</h1>
              <p className="text-gray-500 text-sm">
                {userInfo.name} ({userInfo.employeeId}) - {getLanguageDisplay(userInfo.language)}
              </p>
            </div>
          </div>

          {/* 타이머 */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-900 mb-1">{formatTime(getRemainingTime())}</div>
              <div className="text-xs text-blue-700">남은 시간</div>
              <div className="mt-1 text-xs text-blue-600">
                진행: {getCurrentScriptIndex() + 1}/{availableScripts.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* PDF 뷰어 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                문안 {currentScript}번 - {getLanguageDisplay(userInfo.language)}
              </h2>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                {getCurrentScriptIndex() + 1} / {availableScripts.length}
              </Badge>
            </div>
            <PDFViewer
              language={userInfo.language}
              scriptNumber={currentScript}
              currentLanguageMode={currentLanguageMode}
            />
          </div>

          {/* 녹음 컨트롤 */}
          <div className="space-y-6">
            {/* 사용자 정보 카드 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="font-bold text-gray-900 mb-4">녹음 정보</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">이름:</span>
                  <span className="ml-2 font-medium">{userInfo.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">사번:</span>
                  <span className="ml-2 font-medium">{userInfo.employeeId}</span>
                </div>
                <div>
                  <span className="text-gray-500">언어:</span>
                  <span className="ml-2 font-medium">{getLanguageDisplay(userInfo.language)}</span>
                </div>
                <div>
                  <span className="text-gray-500">구분:</span>
                  <span className="ml-2 font-medium">{userInfo.category}</span>
                </div>
              </div>
            </div>

            {/* 언어 모드 선택 */}
            {userInfo.language === "korean-english" && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-4">언어 모드</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentLanguageMode("korean")}
                    className={`flex-1 ${
                      currentLanguageMode === "korean"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    한국어
                  </Button>
                  <Button
                    onClick={() => setCurrentLanguageMode("english")}
                    className={`flex-1 ${
                      currentLanguageMode === "english"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    English
                  </Button>
                </div>
              </div>
            )}

            {/* 녹음 컨트롤 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <AudioRecorder
                onRecordingComplete={(blob) => {
                  // 언어별로 올바른 키 생성
                  let recordingKey: string
                  if (userInfo.language === "korean-english") {
                    recordingKey = getRecordingKey(currentScript, currentLanguageMode)
                  } else {
                    // 일본어, 중국어는 해당 언어 키 사용
                    recordingKey = getRecordingKey(currentScript, userInfo.language as "japanese" | "chinese")
                  }
                  console.log("📌 녹음 키 생성:", recordingKey, "언어:", userInfo.language)
                  setRecordings((prev) => ({ ...prev, [recordingKey]: blob }))
                }}
                existingRecording={recordings[getRecordingKey(currentScript, currentLanguageMode)]}
              />
            </div>

            {/* 진행 상태 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="font-bold text-gray-900 mb-4">진행 상태</h3>
              <div className="space-y-2">
                {availableScripts.map((scriptNum, index) => {
                  const isCompleted =
                    userInfo.language === "korean-english"
                      ? recordings[getRecordingKey(scriptNum, "korean")] &&
                        recordings[getRecordingKey(scriptNum, "english")]
                      : recordings[getRecordingKey(scriptNum, userInfo.language as "japanese" | "chinese")]

                  return (
                    <div key={scriptNum} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          scriptNum === currentScript
                            ? "bg-blue-600 text-white"
                            : isCompleted
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`text-sm ${
                          scriptNum === currentScript ? "font-bold text-blue-600" : "text-gray-600"
                        }`}
                      >
                        문안 {scriptNum}번
                      </span>
                      {isCompleted && <span className="text-green-500 text-xs">✓</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 다음 버튼 */}
            <Button
              onClick={nextScript}
              disabled={!isCurrentScriptComplete()}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-sm font-medium"
            >
              {getCurrentScriptIndex() === availableScripts.length - 1 ? "제출하기" : "다음 문안"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// AdminMode 컴포넌트 - 일관된 그레이 배경 + 오렌지 포인트 컬러
function AdminMode({
  onBack,
  onNavigate,
  onModeChange,
  showMyPage,
  setShowMyPage,
  authenticatedUser,
  userInfo,
  handleLogout,
  isLoggingOut,
}: {
  onBack: () => void
  onNavigate: (mode: string) => void
  onModeChange: (mode: "select" | "recording" | "review" | "evaluation" | "admin") => void
  showMyPage: boolean
  setShowMyPage: (v: boolean) => void
  authenticatedUser: AuthenticatedUser | null
  userInfo: UserInfo
  handleLogout: () => void
  isLoggingOut: boolean
}) {
  const [showAdminAuth, setShowAdminAuth] = useState(false)
  const [showEvaluationAuth, setShowEvaluationAuth] = useState(false)
  const [showRecordingSetup, setShowRecordingSetup] = useState(false)

  const handleNavigation = (newMode: string) => {
    if (newMode === "admin") {
      // 이미 admin 모드이므로 아무것도 하지 않음
      return
    } else if (newMode === "evaluation") {
      setShowEvaluationAuth(true)
    } else if (newMode === "recording") {
      setShowRecordingSetup(true)
    } else {
      onNavigate(newMode)
    }
  }

  const handleEvaluationAuthSuccess = () => {
    setShowEvaluationAuth(false)
    onModeChange("evaluation")
  }

  const handleRecordingSetupComplete = (setupInfo: UserInfo) => {
    setShowRecordingSetup(false)
    onModeChange("recording")
  }

  return (
    <div className="min-h-screen">
      {/* 사이드바 네비게이션 */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* JVOICE 브랜드명 */}
        <div className="p-6 border-b border-gray-100">
          <div className="text-left">
            <h1 className="text-gray-900 font-bold text-lg">JVOICE</h1>
          </div>
        </div>

        {/* 메인 네비게이션 */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <button
              onClick={onBack}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>

            <button
              onClick={() => handleNavigation("recording")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Record
            </button>

            <button
              onClick={() => handleNavigation("review")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Review
            </button>

            <button
              onClick={() => handleNavigation("evaluation")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              Evaluate
            </button>

            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left bg-orange-100 text-orange-700">
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </nav>
        </div>

        {/* 하단 메뉴 */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Bell className="w-4 h-4" />
            Updates
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Moon className="w-4 h-4" />
            Dark Mode
          </button>

          <button
            onClick={() => setShowMyPage(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <User className="w-4 h-4" />
            My Account
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 - ver150 관리자 대시보드 */}
      <div className="ml-64">
        <iframe src="/admin" className="w-full h-screen border-0" title="관리자 대시보드" />
      </div>

      {/* 녹음 설정 모달 */}
      {showRecordingSetup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowRecordingSetup(false);
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">녹음 설정</h2>
                <button onClick={() => setShowRecordingSetup(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={null} />
            </div>
          </div>
        </div>
      )}

      {/* 평가 인증 모달 */}
      {showEvaluationAuth && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowEvaluationAuth(false);
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">교관 인증</h2>
                <button onClick={() => setShowEvaluationAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <EvaluationAuth onSuccess={handleEvaluationAuthSuccess} />
            </div>
          </div>
        </div>
      )}
      {showMyPage && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowMyPage(false);
          }}
          autoFocus
        >
        <MyPageModal
          user={authenticatedUser}
          userInfo={userInfo}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
        </div>
      )}
    </div>
  )
}

// EvaluationMode 컴포넌트 - 일관된 그레이 배경 + 퍼플 포인트 컬러
function EvaluationMode({
  onBack,
  onNavigate,
  onModeChange,
  showAdminAuth,
  setShowAdminAuth,
  showEvaluationAuth,
  setShowEvaluationAuth,
  showRecordingSetup,
  setShowRecordingSetup,
  showMyPage,
  setShowMyPage,
  authenticatedUser,
  userInfo,
  handleLogout,
  isLoggingOut,
}: {
  onBack: () => void
  onNavigate: (mode: string) => void
  onModeChange: (mode: "select" | "recording" | "review" | "evaluation" | "admin") => void
  showAdminAuth: boolean
  setShowAdminAuth: (v: boolean) => void
  showEvaluationAuth: boolean
  setShowEvaluationAuth: (v: boolean) => void
  showRecordingSetup: boolean
  setShowRecordingSetup: (v: boolean) => void
  showMyPage: boolean
  setShowMyPage: (v: boolean) => void
  authenticatedUser: AuthenticatedUser | null
  userInfo: UserInfo
  handleLogout: () => void
  isLoggingOut: boolean
}) {
  const handleNavigation = (newMode: string) => {
    if (newMode === "evaluation") {
      // 이미 evaluation 모드이므로 아무것도 하지 않음
      return
    } else if (newMode === "admin") {
      setShowAdminAuth(true)
    } else if (newMode === "recording") {
      setShowRecordingSetup(true)
    } else {
      onNavigate(newMode)
    }
  }

  const handleAdminAuthSuccess = () => {
    setShowAdminAuth(false)
    onModeChange("admin")
  }

  const handleRecordingSetupComplete = (setupInfo: UserInfo) => {
    setShowRecordingSetup(false)
    onModeChange("recording")
  }

  return (
    <div className="min-h-screen">
      {/* 사이드바 네비게이션 */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* JVOICE 브랜드명 */}
        <div className="p-6 border-b border-gray-100">
          <div className="text-left">
            <h1 className="text-gray-900 font-bold text-lg">JVOICE</h1>
          </div>
        </div>
        {/* 메인 네비게이션 */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <button
              onClick={onBack}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => handleNavigation("recording")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Record
            </button>
            <button
              onClick={() => handleNavigation("review")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Review
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left bg-purple-100 text-purple-700">
              <ClipboardCheck className="w-4 h-4" />
              Evaluate
            </button>
            <button
              onClick={() => handleNavigation("admin")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </nav>
        </div>
        {/* 하단 메뉴 */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Bell className="w-4 h-4" />
            Updates
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Moon className="w-4 h-4" />
            Dark Mode
          </button>
          <button
            onClick={() => setShowMyPage(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <User className="w-4 h-4" />
            My Account
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
      {/* 메인 컨텐츠 */}
      <div className="ml-64 p-8 main-scroll-container" style={{height: '100vh', overflowY: 'auto', scrollSnapType: 'y mandatory'}}>
        <EvaluationDashboard onBack={onBack} authenticatedUser={undefined} />
      </div>
      {/* 녹음 설정 모달 */}
      {showRecordingSetup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowRecordingSetup(false);
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">녹음 설정</h2>
                <button onClick={() => setShowRecordingSetup(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={null} />
            </div>
          </div>
        </div>
      )}
      {/* 관리자 인증 모달 */}
      {showAdminAuth && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowAdminAuth(false);
          }}
          autoFocus
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">관리자 인증</h2>
                <button onClick={() => setShowAdminAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AdminAuth onSuccess={handleAdminAuthSuccess} />
            </div>
          </div>
        </div>
      )}
      {showMyPage && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Escape") setShowMyPage(false);
          }}
          autoFocus
        >
        <MyPageModal
          user={authenticatedUser}
          userInfo={userInfo}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
        </div>
      )}
    </div>
  )
}

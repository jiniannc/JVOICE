"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Building,
  Moon,
  Sun,
  ChevronDown,
  Eye,
  ClipboardCheck,
  LogIn,
  Globe,
  Upload,
  Menu,
  Calendar,
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
import { RecordingWaitingPage } from "@/components/recording-waiting-page"
import { FileUploadEvaluation } from "@/components/file-upload-evaluation"
import { pdfSyncService } from "@/lib/pdf-sync-service"
import { employeeDB } from "@/lib/employee-database"
import { FullscreenLoadingOverlay } from "@/components/fullscreen-loading-overlay"
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
  isAdmin?: boolean
  roles?: string[]
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
  const [mode, setModeState] = useState<"select" | "recording" | "review" | "evaluation" | "admin" | "request">("select")
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null | undefined>(undefined)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAdminAuth, setShowAdminAuth] = useState(false)
  const [showEvaluationAuth, setShowEvaluationAuth] = useState(false)
  const [showMyPage, setShowMyPage] = useState(false)
  const [showRecordingSetup, setShowRecordingSetup] = useState(false)
  const [showRecordingWaiting, setShowRecordingWaiting] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("");
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // URL 파라미터 및 localStorage 기반 자동 모드 설정
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlMode = urlParams.get('mode')
    const showMyPageParam = urlParams.get('mypage')
    const logoutParam = urlParams.get('logout')
    
    // localStorage에서 pending 액션 확인 (Request 페이지에서 설정됨)
    const pendingMode = localStorage.getItem('jvoice_pending_mode')
    const pendingAction = localStorage.getItem('jvoice_pending_action')
    
    if (pendingMode && ['recording', 'review', 'evaluation', 'admin', 'request'].includes(pendingMode)) {
      setModeState(pendingMode as any)
      localStorage.removeItem('jvoice_pending_mode') // 사용 후 제거
      return // localStorage 모드가 우선
    }
    
    if (pendingAction === 'mypage') {
      setShowMyPage(true)
      localStorage.removeItem('jvoice_pending_action')
      return
    }
    
    if (pendingAction === 'logout') {
      setIsLoggingOut(true)
      localStorage.removeItem('jvoice_pending_action')
      return
    }
    
    if (urlMode && ['recording', 'review', 'evaluation', 'admin', 'request'].includes(urlMode)) {
      setModeState(urlMode as any)
      // URL 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (showMyPageParam === 'true') {
      setShowMyPage(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (logoutParam === 'true') {
      // 로그아웃 함수는 아래에서 정의되므로 여기서는 상태만 설정
      setIsLoggingOut(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // 로그아웃 파라미터 처리
  useEffect(() => {
    if (isLoggingOut) {
      const doLogout = async () => {
        try {
          const response = await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
          
          if (response.ok) {
            setAuthenticatedUser(null)
            setUserInfo({ name: "", employeeId: "", language: "", category: "" })
            setModeState("select")
          }
        } catch (error) {
          console.error("로그아웃 중 오류:", error)
        } finally {
          setIsLoggingOut(false)
        }
      }
      doLogout()
    }
  }, [isLoggingOut])

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

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileViewport = window.innerWidth <= 768;
      
      if (isMobileDevice || isMobileViewport) {
        setIsMobile(true);
        // 모바일 페이지로 리다이렉트
        window.location.href = '/mobile';
      }
    };

    checkMobile();
    
    // 화면 크기 변경 시 재확인
    const handleResize = () => {
      checkMobile();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
              isAdmin: employeeInfo.isAdmin, // 관리자 여부 전달
              roles: employeeInfo.roles, // 역할 목록 전달
            }))
          } else {
            setUserInfo((prev) => ({
              ...prev,
              name: data.user.name,
              employeeId: "",
              email: data.user.email,
              isInstructor: false,
              isAdmin: false,
              roles: [],
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
            department: employeeInfo.department,
            position: employeeInfo.position,
            isInstructor: employeeInfo.isInstructor,
            isAdmin: employeeInfo.isAdmin,
            roles: employeeInfo.roles,
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
        isAdmin: employeeInfo.isAdmin, // 관리자 여부 전달
        roles: employeeInfo.roles, // 역할 목록 전달
      }))
    } else {
    setUserInfo((prev) => ({
      ...prev,
      name: user.name,
        employeeId: "",
      email: user.email,
        isInstructor: false,
        isAdmin: false,
        roles: [],
    }))
    }
    setShowLoginModal(false)

    // 로그인 후 대기 중인 액션 실행
    if (pendingAction) {
      if (pendingAction === "fileUpload") {
        setShowFileUpload(true)
      } else {
        handleNavigation(pendingAction)
      }
      setPendingAction(null)
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

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
      // 관리자인 경우 자동으로 관리자 모드 진입
      if (userInfo.isAdmin) {
        console.log("👑 관리자 자동 인증: 관리자 모드 진입")
        setModeState("admin")
      } else {
        setShowAdminAuth(true)
      }
    } else if (newMode === "evaluation") {
      // 교관 또는 관리자면 평가 모드 자동 진입
      if (userInfo.isInstructor || userInfo.isAdmin) {
        console.log("🎓 교관 자동 인증: 평가 모드 진입")
        setModeState("evaluation")
      } else {
        setShowEvaluationAuth(true)
      }
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

  const handleRecordingSetupComplete = async (setupInfo: UserInfo) => {
    // 로딩 상태 시작
    setIsCheckingDevice(true);
    
    // IP 허용 여부 확인: 허용되지 않으면 진입 차단하고 메인으로 복귀
    try {
      const res = await fetch('/api/devices/allowlist?mode=check', { cache: 'no-store' })
      const data = await res.json()
      if (!data?.allowed) {
        alert('등록된 컴퓨터에서만 실시간 녹음이 가능합니다. 관리자에게 등록을 요청하세요.')
        setShowRecordingSetup(false)
        setModeState('select')
        return
      }
    } catch (e) {
      alert('네트워크 오류로 녹음 시작을 진행할 수 없습니다. 잠시 후 다시 시도하세요.')
      setShowRecordingSetup(false)
      setModeState('select')
      return
    } finally {
      // 로딩 상태 종료
      setIsCheckingDevice(false);
    }

    setUserInfo(setupInfo)
    setShowRecordingSetup(false)
    setShowRecordingWaiting(true)
  }

  const handleRecordingStart = () => {
    try {
      setShowRecordingWaiting(false)
      setModeState("recording")
    } catch (error) {
      console.error("녹음 모드 전환 중 오류:", error)
      // 오류 발생 시 대기 페이지로 되돌리기
      setShowRecordingWaiting(true)
    }
  }

  const handleFileUploadComplete = (result: any) => {
    console.log("파일 업로드 완료:", result)
    setShowFileUpload(false)
    // 성공 메시지나 다른 처리를 여기에 추가할 수 있습니다
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

  // 사용자의 역할을 표시하는 헬퍼 함수 (우선순위: 관리자 > 교관)
  const getUserRoleBadges = () => {
    if (userInfo.isAdmin) {
      return (
        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
          관리자
        </span>
      )
    }
    if (userInfo.isInstructor) {
      return (
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
          교관
        </span>
      )
    }
    return null
  }

  // 사용자의 주요 역할을 반환하는 함수 (우선순위: 관리자 > 교관)
  const getUserMainRole = () => {
    if (userInfo.isAdmin) return "관리자"
    if (userInfo.isInstructor) return "교관"
    return null
  }

  // userInfo 변경 시 콘솔 로그
  useEffect(() => {
    console.log("[userInfo changed]", userInfo)
  }, [userInfo])

  // ESC 키 이벤트 처리
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRecordingSetup) setShowRecordingSetup(false);
        if (showAdminAuth) setShowAdminAuth(false);
        if (showEvaluationAuth) setShowEvaluationAuth(false);
        if (showMyPage) setShowMyPage(false);
        if (showFileUpload) setShowFileUpload(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showRecordingSetup, showAdminAuth, showEvaluationAuth, showMyPage, showFileUpload]);

  // 로딩 중
  if (authenticatedUser === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
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

  if (showRecordingWaiting) {
    // userInfo가 유효하지 않으면 녹음 설정으로 돌아가기
    if (!userInfo?.name || !userInfo?.employeeId || !userInfo?.language || !userInfo?.category) {
      setShowRecordingWaiting(false)
      setShowRecordingSetup(true)
      return null
    }
    
    return (
      <div className="min-h-screen">
        <RecordingWaitingPage
          userInfo={userInfo}
          onStart={handleRecordingStart}
          onBack={() => {
            setShowRecordingWaiting(false)
            setShowRecordingSetup(true)
          }}
        />
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

  if (mode === "request") {
    return (
      <RequestMode
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
        toggleMobileMenu={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
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

            {/* Request 메뉴: Home 과 Record 사이 */}
            <button
              onClick={() => setModeState("request")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                mode === "request" ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Request
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
              <div className="flex-1 flex items-center justify-between">
                <span>Evaluate</span>
                {getUserRoleBadges()}
              </div>
            </button>

            <button
              onClick={() => handleNavigation("admin")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <div className="flex-1 flex items-center justify-between">
                <span>Manage</span>
                {userInfo.isAdmin && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    관리자
                  </span>
                )}
              </div>
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
      <div className="ml-64 p-8 main-scroll-container bg-blue-50" style={{
        height: '100vh', 
        overflowY: 'auto', 
        scrollSnapType: 'y mandatory',
        backgroundColor: 'rgba(220, 235, 255, 1) !important',
        background: `
          rgba(220, 235, 255, 1) center / 100% 100%,
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 4px
          ) center / 4px 4px,
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 4px
          ) center / 4px 4px,
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 100%) center / 100% 100%
        `,
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 4px
          ),
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 100%)
        `,
        backgroundSize: '4px 4px, 4px 4px, 100% 100%',
        backgroundPosition: 'center, center, center'
      }}>
        {/* hero 이미지 섹션 */}
        <section className="flex flex-col mb-0 -mx-8 section-snap" style={{height: '1020px', scrollSnapAlign: 'start'}}>
          {/* 페이퍼 텍스처 배경 */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="w-full h-full" style={{
              background: `
                rgba(235, 245, 255, 1) center / 100% 100%,
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 1px,
                  rgba(0,0,0,0.015) 1px,
                  rgba(0,0,0,0.015) 2px
                ) center / 2px 2px,
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 1px,
                  rgba(0,0,0,0.015) 1px,
                  rgba(0,0,0,0.015) 2px
                ) center / 2px 2px,
                radial-gradient(circle at 30% 70%, rgba(59, 130, 246, 0.08) 0%, transparent 50%) 30% 70% / 300px 300px,
                radial-gradient(circle at 70% 30%, rgba(147, 51, 234, 0.06) 0%, transparent 50%) 70% 30% / 400px 400px
              `
            }}></div>
            {/* 기하학적 패턴 */}
            <div className="absolute inset-0 opacity-[0.04]">
              <div className="absolute top-20 left-20 w-32 h-32 border border-slate-300 rounded-full"></div>
              <div className="absolute top-40 right-32 w-24 h-24 border border-slate-300 rounded-full"></div>
              <div className="absolute bottom-32 left-1/4 w-16 h-16 border border-slate-300 rounded-full"></div>
              <div className="absolute bottom-20 right-1/3 w-20 h-20 border border-slate-300 rounded-full"></div>
              <div className="absolute top-1/3 left-1/2 w-12 h-12 border border-slate-300 rounded-full"></div>
            </div>
            {/* 미묘한 그리드 패턴 */}
            <div className="absolute inset-0 opacity-[0.03]">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </div>
          {/* 컨텐츠 영역 전체 : ml-64 로 이미 사이드바 만큼 밀려 있음 */}
          <div className="relative w-full" style={{ height: '1020px' }}>
            {/* 배경 비디오 영역 */}
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'33.6rem',height:'33.6rem',zIndex:1}}>
              <div className="w-[33.6rem] h-[33.6rem] rounded-full overflow-hidden shadow-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="object-cover w-full h-full animate-hero-video"
              >
                <source src="/video/main-hero.webm" type="video/webm" />
                <source src="/video/main-hero.mp4" type="video/mp4" />
              </video>
              </div>
            </div>
            {/* 미묘한 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/30 pointer-events-none"></div>
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
        <section className="section-snap flex flex-col items-center relative" style={{minHeight: '100vh', scrollSnapAlign: 'start', paddingTop: 0, marginTop: 0}}>
          {/* 페이퍼 텍스처 배경 */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="w-full h-full" style={{
              background: `
                rgba(245, 250, 255, 1) center / 100% 100%,
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 1px,
                  rgba(0,0,0,0.01) 1px,
                  rgba(0,0,0,0.01) 2px
                ) center / 2px 2px,
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 1px,
                  rgba(0,0,0,0.01) 1px,
                  rgba(0,0,0,0.01) 2px
                ) center / 2px 2px,
                radial-gradient(circle at 25% 75%, rgba(59, 130, 246, 0.05) 0%, transparent 50%) 25% 75% / 350px 350px,
                radial-gradient(circle at 75% 25%, rgba(147, 51, 234, 0.04) 0%, transparent 50%) 75% 25% / 400px 400px
              `
            }}></div>
            {/* 미묘한 점 패턴 */}
            <div className="absolute inset-0 opacity-[0.02]">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
                    <circle cx="30" cy="30" r="1" fill="currentColor"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>
          </div>
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
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 hover:shadow-2xl hover:border-slate-300/50 transition-all duration-500 group cursor-pointer overflow-hidden"
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
              <div className="relative overflow-hidden rounded-t-3xl">
                <video
                  muted
                  playsInline
                  className="w-full h-84 object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    console.log("Video failed to load:", e)
                    // 동영상 로드 실패시 플레이스홀더 이미지로 대체
                    const target = e.target as HTMLVideoElement
                    target.style.display = "none"
                    const placeholder = document.createElement("div")
                    placeholder.className = "w-full h-84 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center"
                    placeholder.innerHTML =
                      '<div class="text-blue-600 text-center"><div class="text-4xl mb-2">🎤</div><div class="text-sm font-medium">Record Video</div></div>'
                    target.parentNode?.appendChild(placeholder)
                  }}
                >
                  <source src="/video/RECORD.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent group-hover:from-blue-600/10 transition-all duration-500"></div>
              </div>
              <CardHeader className="text-center pb-6 px-8">
                <CardTitle className="text-xl font-bold text-slate-800 mb-2">Record</CardTitle>
                <CardDescription className="text-slate-600">기내 방송 음성 녹음 및 제출</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 relative overflow-hidden group-hover:pb-24 transition-all duration-300">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigation("recording")
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  녹음 시작하기
                </Button>
                
                {/* 호버 시 나타나는 추가 버튼들 */}
                <div className="absolute left-8 right-8 top-14 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                  {/* 구분선 */}
                  <div className="relative mb-1.5 flex items-center">
                    <div className="flex-1 border-t border-gray-200"></div>
                    <span className="px-3 text-xs uppercase text-gray-400 font-medium">OR</span>
                    <div className="flex-1 border-t border-gray-200"></div>
                  </div>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log("녹음 제출하기 버튼 클릭됨")
                      if (!authenticatedUser) {
                        setPendingAction("fileUpload")
                        setShowLoginModal(true)
                        return
                      }
                      setShowFileUpload(true)
                    }}
                    variant="outline"
                    className="w-full h-12 text-sm font-medium rounded-xl border border-blue-400 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-blue-700 hover:text-blue-800"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    녹음 제출하기 (PUS)
                  </Button>
                </div>
              </CardContent>
            </div>

            {/* Review 카드 - REVIEW.mp4 동영상 */}
            <div
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 hover:shadow-2xl hover:border-slate-300/50 transition-all duration-500 group cursor-pointer overflow-hidden"
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
              <div className="relative overflow-hidden rounded-t-3xl">
                <video
                  muted
                  playsInline
                  className="w-full h-84 object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    console.log("Video failed to load:", e)
                    const target = e.target as HTMLVideoElement
                    target.style.display = "none"
                    const placeholder = document.createElement("div")
                    placeholder.className = "w-full h-84 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center"
                    placeholder.innerHTML =
                      '<div class="text-emerald-600 text-center"><div class="text-4xl mb-2">👁️</div><div class="text-sm font-medium">Review Video</div></div>'
                    target.parentNode?.appendChild(placeholder)
                  }}
                >
                  <source src="/video/REVIEW.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/5 to-transparent group-hover:from-emerald-600/10 transition-all duration-500"></div>
              </div>
              <CardHeader className="text-center pb-6 px-8">
                <CardTitle className="text-xl font-bold text-slate-800 mb-2">Review</CardTitle>
                <CardDescription className="text-slate-600">내 녹음 내역 및 평가 결과 확인</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigation("review")
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  결과 확인하기
                </Button>
              </CardContent>
            </div>

            {/* Evaluate 카드 - EVALUATE.mp4 동영상 */}
            <div
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 hover:shadow-2xl hover:border-slate-300/50 transition-all duration-500 group cursor-pointer overflow-hidden"
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
              <div className="relative overflow-hidden rounded-t-3xl">
                <video
                  muted
                  playsInline
                  className="w-full h-84 object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    console.log("Video failed to load:", e)
                    const target = e.target as HTMLVideoElement
                    target.style.display = "none"
                    const placeholder = document.createElement("div")
                    placeholder.className = "w-full h-84 bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center"
                    placeholder.innerHTML =
                      '<div class="text-violet-600 text-center"><div class="text-4xl mb-2">📋</div><div class="text-sm font-medium">Evaluate Video</div></div>'
                    target.parentNode?.appendChild(placeholder)
                  }}
                >
                  <source src="/video/EVALUATE.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-violet-600/5 to-transparent group-hover:from-violet-600/10 transition-all duration-500"></div>
              </div>
              <CardHeader className="text-center pb-6 px-8">
                <CardTitle className="text-xl font-bold text-slate-800 mb-2">Evaluate</CardTitle>
                <CardDescription className="text-slate-600">전문 교관 평가 및 피드백</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigation("evaluation")
                  }}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-12 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  평가 시작하기
                </Button>
              </CardContent>
            </div>
          </div>
        </section>
        <div className="flex flex-col items-center justify-center w-full mt-[-48px] mb-8">
          <div className="text-slate-500 text-xs leading-relaxed font-medium text-center tracking-wide" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div className="mb-1">J-VOICE v1.0 | © 2025 Jin Air Cabin Training Group</div>
            <div className="text-slate-400">This system supports the qualification and evaluation of cabin crew in-flight announcements.</div>
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
              <GoogleAuth onAuthSuccess={handleAuthSuccess} />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">녹음 설정</h2>
                <button onClick={() => setShowRecordingSetup(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={authenticatedUser} isCheckingDevice={isCheckingDevice} />
            </div>
          </div>
        </div>
      )}

      {/* 관리자 인증 모달 */}
      {showAdminAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
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
          style={{ position: "fixed", top: 20, right: 32, zIndex: 50, opacity: 0.5 }}
          className="flex items-center gap-3 bg-white/80 shadow px-3 py-2 rounded-full border border-gray-200 backdrop-blur-sm"
        >
          <img
            src={authenticatedUser.picture || "/placeholder.svg?height=32&width=32&text=User"}
            alt={authenticatedUser.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-300"
          />
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-semibold text-gray-800 leading-tight">{authenticatedUser.name}</span>
              {getUserMainRole() && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  getUserMainRole() === "관리자" 
                    ? "bg-orange-100 text-orange-700" 
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {getUserMainRole()}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 leading-tight">{authenticatedUser.email}</span>
          </div>
        </div>
      )}

      {/* 파일 업로드 모달 */}
      {showFileUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-[85%] max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <FileUploadEvaluation 
              onComplete={handleFileUploadComplete}
              onBack={() => setShowFileUpload(false)}
              authenticatedUser={authenticatedUser}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// RequestMode 컴포넌트
function RequestMode({
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
  onModeChange: (mode: "select" | "recording" | "review" | "evaluation" | "admin" | "request") => void
  showMyPage: boolean
  setShowMyPage: (v: boolean) => void
  handleLogout: () => void
  isLoggingOut: boolean
}) {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState<"education"|"recording">("education")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showMyRequests, setShowMyRequests] = useState(false)
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [myRequestsLoading, setMyRequestsLoading] = useState(false)
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, any>>({})
  const [userLanguageRestrictions, setUserLanguageRestrictions] = useState<Record<string, boolean>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  type SessionSlot = 1|2|3|4|5|6|7|8

  useEffect(()=>{
    (async()=>{
      setLoading(true)
      try{
        // 먼저 현재 선택된 월로 시도
        let currentMonth = month
        let res = await fetch(`/api/schedules?month=${currentMonth}`,{ cache: "no-store" })
        let json = await res.json()
        
        // 만약 현재 월이 실패하면 (시트가 없음) 다음 몇 개월을 순차적으로 시도
        if (!json.success && res.status === 500) {
          console.log(`❌ ${currentMonth} 시트가 존재하지 않음, 다음 월 찾는 중...`)
          
          const currentDate = new Date(currentMonth + "-01")
          let foundValidMonth = false
          
          // 현재 월부터 6개월까지 확인
          for (let i = 0; i < 6; i++) {
            const testDate = new Date(currentDate)
            testDate.setMonth(testDate.getMonth() + i)
            const testMonth = testDate.toISOString().slice(0, 7)
            
            console.log(`🔍 ${testMonth} 시트 확인 중...`)
            
            try {
              res = await fetch(`/api/schedules?month=${testMonth}`,{ cache: "no-store" })
              json = await res.json()
              
              if (json.success) {
                console.log(`✅ ${testMonth} 시트 발견!`)
                currentMonth = testMonth
                setMonth(testMonth) // 자동으로 월 변경
                foundValidMonth = true
                break
              }
            } catch (e) {
              console.log(`⚠️ ${testMonth} 확인 중 오류:`, e)
              continue
            }
          }
          
          if (!foundValidMonth) {
            console.error("❌ 6개월 내에 유효한 스케줄 시트를 찾을 수 없습니다.")
            setData(null)
            setLoading(false)
            return
          }
        }
        
        if(json.success) {
          setData(json.data)
          console.log(`📅 ${currentMonth} 스케줄 로드 완료`)
          
          // 스케줄 로드 후 신청 내역도 함께 로드
          if (authenticatedUser) {
            loadMyRequests()
          }
        }
        else throw new Error(json.error)
      }catch(e){
        console.error(e)
      }finally{
        setLoading(false)
      }
    })()
  },[month])

  // authenticatedUser가 로드되면 신청 내역 로드
  useEffect(() => {
    if (authenticatedUser && data) {
      loadMyRequests()
    }
  }, [authenticatedUser, data])

      const dayCards = useMemo(()=>{
    if(!data) return []
    // 임시로 visible 체크 무시 (테스트용)
    const items = data.days.map((d:any)=>{
      // date 필드가 없으면 생성
      let dateKey = d.date
      if (!dateKey && d.day) {
        // day가 있으면 YYYY-MM-DD 형식으로 변환
        const year = parseInt(data.month.split('-')[0])
        const month = parseInt(data.month.split('-')[1])
        dateKey = `${year}-${month.toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}`
      }
      
      return {
        date: dateKey,
        day: d.day,
        recording: d.recording,
        education: d.education,
        resultAnnouncement: d.resultAnnouncement,
        classroomInfo: d.classroomInfo,
      }
    })
    console.log("📊 dayCards 생성:", items.length, "개, data.visible:", data.visible)
    console.log("📅 첫 번째 dayCard:", items[0])
    console.log("📅 data.days[0]:", data.days[0])
    console.log("📅 data.month:", data.month)
    return items
  },[data, myRequests])

  const loadMyRequests = async () => {
    if (!authenticatedUser) return
    
    setMyRequestsLoading(true)
    try {
      const employeeId = authenticatedUser.employeeId || authenticatedUser.id || 'TEMP001'
      console.log('🔍 신청 내역 조회 - employeeId:', employeeId)
      
      const res = await fetch(`/api/requests/dropbox?employeeId=${employeeId}&email=${authenticatedUser.email}`)
      const data = await res.json()
      console.log('📄 신청 내역 응답:', data)
      
      if (data.requests) {
        setMyRequests(data.requests)
        console.log('✅ 신청 내역 로드 완료:', data.requests.length, '개')
      }
    } catch (error) {
      console.error('신청 내역 조회 실패:', error)
      setMyRequests([])
    } finally {
      setMyRequestsLoading(false)
    }
  }

  // 날짜별 가용성 확인
  const checkAvailability = async (date: string) => {
    if (!authenticatedUser) return null
    
    const cacheKey = date
    if (availabilityCache[cacheKey]) {
      console.log(`📋 ${date} 가용성 캐시 사용`)
      return availabilityCache[cacheKey]
    }
    
    // 진행 중인 요청이 있으면 기다림
    if (availabilityCache[`${date}_loading`]) {
      console.log(`⏳ ${date} 가용성 체크 진행 중, 대기...`)
      return null
    }
    
    // 로딩 상태 표시
    setAvailabilityCache(prev => ({ ...prev, [`${date}_loading`]: true }))

    try {
      // date 형식 검증 및 변환
      let currentMonth: string
      if (date && typeof date === 'string') {
        if (date.includes('-')) {
          // YYYY-MM-DD 형식
          currentMonth = date.slice(0, 7)
        } else {
          // 다른 형식이면 Date 객체로 변환 시도
          const dateObj = new Date(date)
          if (isNaN(dateObj.getTime())) {
            console.error('유효하지 않은 날짜 형식:', date)
            return null
          }
          currentMonth = dateObj.toISOString().slice(0, 7)
        }
      } else {
        console.error('날짜가 없거나 문자열이 아님:', date)
        return null
      }
      
      const employeeId = authenticatedUser.employeeId || authenticatedUser.id || 'TEMP001'
      
      const response = await fetch(
        `/api/requests/availability?month=${currentMonth}&date=${date}&employeeId=${employeeId}&email=${authenticatedUser.email}`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log(`🔍 ${date} 가용성 확인:`, data)
        
        // 캐시에 저장 (로딩 상태 제거)
        setAvailabilityCache(prev => {
          const newCache = { ...prev }
          delete newCache[`${date}_loading`] // 로딩 상태 제거
          newCache[cacheKey] = data
          return newCache
        })
        
        // 언어별 제한 업데이트
        const restrictions: Record<string, boolean> = {}
        data.languageRestrictions?.forEach((restriction: any) => {
          restrictions[restriction.language] = restriction.hasExistingApplication
        })
        setUserLanguageRestrictions(restrictions)
        
        return data
      }
    } catch (error) {
      console.error('가용성 확인 실패:', error)
      // 에러 시에도 로딩 상태 제거
      setAvailabilityCache(prev => {
        const newCache = { ...prev }
        delete newCache[`${date}_loading`]
        return newCache
      })
    }
    
    return null
  }

  // 특정 차수가 신청 가능한지 확인
  const getCurrentApplicants = (date: string, slot: number, language: string, educationType: string) => {
    if (!myRequests || myRequests.length === 0) {
      return 0
    }
    
    return myRequests.filter((request: any) => {
      return request.date === date && 
             request.slot === slot &&
             request.details?.language === language &&
             request.details?.educationType === educationType &&
             request.status === 'ACTIVE'
    }).length
  }

  const isRecordingSlotAvailable = (date: string, slot: number, language: string) => {
    // Dropbox JSON에서 신청 내역을 확인하여 가용성 판단
    if (!myRequests || myRequests.length === 0) {
      console.log('🔍 isRecordingSlotAvailable: 신청 내역 없음, 모든 차수 활성화')
      return true // 신청 내역이 없으면 모든 차수 활성화
    }
    
    console.log('🔍 isRecordingSlotAvailable 호출:', { date, slot, language })
    
    // 해당 날짜, 언어에 대한 신청이 있는지 확인 (언어별 한 차수만 신청 가능)
    const hasExistingApplication = myRequests.some((request: any) => {
      return request.date === date && 
             request.details?.language === language &&
             request.type === 'recording' &&
             request.status === 'ACTIVE'
    })
    
    if (hasExistingApplication) {
      console.log('❌ 녹음 신청된 언어 발견:', language)
      return false // 이미 해당 언어로 신청했으면 비활성화
    }
    
    // 해당 차수의 현재 신청 인원 확인 (8명 제한)
    const currentApplicants = myRequests.filter((request: any) => {
      return request.date === date && 
             request.slot === slot &&
             request.type === 'recording' &&
             request.status === 'ACTIVE'
    }).length
    
    console.log('🔍 녹음 현재 신청 인원:', currentApplicants, '/ 8')
    return currentApplicants < 8
  }

  const getRecordingCurrentApplicants = (date: string, slot: number) => {
    if (!myRequests || myRequests.length === 0) {
      return 0
    }
    
    return myRequests.filter((request: any) => {
      return request.date === date && 
             request.slot === slot &&
             request.type === 'recording' &&
             request.status === 'ACTIVE'
    }).length
  }

  const isSlotAvailable = (date: string, slot: number, language: string, educationType: string) => {
    // Dropbox JSON에서 신청 내역을 확인하여 가용성 판단
    if (!myRequests || myRequests.length === 0) {
      console.log('🔍 isSlotAvailable: 신청 내역 없음, 모든 차수 활성화')
      return true // 신청 내역이 없으면 모든 차수 활성화
    }
    
    console.log('🔍 isSlotAvailable 호출:', { date, slot, language, educationType })
    console.log('🔍 myRequests:', JSON.stringify(myRequests, null, 2))
    
    // 1:1 교육인 경우 - 한 명이라도 신청하면 비활성화
    if (educationType === '1:1') {
      const hasExistingApplication = myRequests.some((request: any) => {
        const matches = request.date === date && 
               request.slot === slot &&
               request.details?.language === language &&
               request.details?.educationType === educationType &&
               request.status === 'ACTIVE'
        
        if (matches) {
          console.log('❌ 1:1 신청된 차수 발견:', request)
        }
        
        return matches
      })
      
      console.log('🔍 1:1 가용성 결과:', !hasExistingApplication)
      return !hasExistingApplication
    }
    
    // 소규모 교육인 경우 - 4명 미만일 때만 활성화
    if (educationType === 'small-group') {
      const currentApplicants = myRequests.filter((request: any) => {
        return request.date === date && 
               request.slot === slot &&
               request.details?.language === language &&
               request.details?.educationType === educationType &&
               request.status === 'ACTIVE'
      }).length
      
      console.log('🔍 소규모 현재 신청 인원:', currentApplicants, '/ 4')
      return currentApplicants < 4
    }
    
    return true
  }

  const handleCancelRequest = async (recordId: string) => {
    if (!confirm('정말 취소하시겠습니까?')) return
    
    try {
      const res = await fetch('/api/requests/cancel-dropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          employeeId: authenticatedUser?.employeeId || authenticatedUser?.id || 'TEMP001',
          email: authenticatedUser?.email
        })
      })
      const data = await res.json()
      
      if (data.success) {
        alert('신청이 취소되었습니다.')
        // 신청 내역 새로고침하여 UI 업데이트
        loadMyRequests()
        
        // 현재 표시된 날짜의 가용성 즉시 재확인
        if (selectedDate) {
          const availabilityData = await checkAvailability(selectedDate)
          if (availabilityData) {
            // 언어별 제한 업데이트
            const restrictions: Record<string, boolean> = {}
            availabilityData.languageRestrictions?.forEach((restriction: any) => {
              restrictions[restriction.language] = restriction.hasExistingApplication
            })
            setUserLanguageRestrictions(restrictions)
          }
        }
      } else {
        alert(`취소 실패: ${data.error}`)
      }
    } catch (error) {
      console.error('취소 실패:', error)
      alert('취소 처리 중 오류가 발생했습니다.')
    }
  }

  const handleApplyEducation = async (date: string, slot: SessionSlot, type: any) => {
    if (!authenticatedUser) {
      alert("로그인이 필요합니다.")
      return
    }
    
    // 클라이언트 측 사전 검증
    const language = type.lang
    if (userLanguageRestrictions[language]) {
      const languageName = language === 'korean-english' ? '한/영' : 
                          language === 'japanese' ? '일본어' : '중국어'
      alert(`${languageName} 교육은 이미 신청하셨습니다. 언어별로 1개씩만 신청 가능합니다.`)
      return
    }
    
    // 차수 가용성 확인은 서버에서 처리
    const educationType = type.mode === '1:1' ? '1:1' : 'small-group'
    
    console.log('👤 authenticatedUser 전체:', authenticatedUser)
    
    const requestData = { 
      employeeId: authenticatedUser.employeeId || authenticatedUser.id || 'TEMP001',
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      department: authenticatedUser.department || '승무원',
      type: 'education',
      date, 
      slot, 
      details: {
        language: type.lang,
        educationType: type.mode === '1:1' ? '1:1' : 'small-group',
        mode: type.mode,
        category: type.category
      }
    }
    
    console.log('📝 교육 신청 데이터:', requestData)
    
    const res = await fetch("/api/requests/dropbox",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(requestData)
    })
    const json = await res.json()
    console.log('📝 서버 응답:', json)
    if(json.success) {
            alert("신청이 완료되었습니다.")
      // 신청 내역 즉시 새로고침하여 UI 업데이트
      loadMyRequests()
    } else {
      // 서버에서 반환된 구체적인 오류 메시지 표시
      if (json.error.includes('이미 신청')) {
        alert(`신청 실패: ${json.error}`)
      } else if (json.error.includes('정원이 마감')) {
        alert(`신청 실패: ${json.error}`)
      } else {
        alert(`신청 실패: ${json.error}`)
      }
    }
  }

  const handleApplyRecording = async (date: string, slot: SessionSlot, lang: "korean-english"|"japanese"|"chinese") => {
    if (!authenticatedUser) {
      alert("로그인이 필요합니다.")
      return
    }
    
    console.log('👤 authenticatedUser 전체:', authenticatedUser)
    
    const requestData = { 
      employeeId: authenticatedUser.employeeId || authenticatedUser.id || 'TEMP001',
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      department: authenticatedUser.department || '승무원',
      type: 'recording',
      date, 
      slot, 
      details: {
        recordingLanguage: lang
      }
    }
    
    console.log('📝 녹음 신청 데이터:', requestData)
    
    const res = await fetch("/api/requests/dropbox",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(requestData)
    })
    const json = await res.json()
    console.log('📝 서버 응답:', json)
    if(json.success) {
      alert("신청이 완료되었습니다.")
      // 신청 내역 즉시 새로고침하여 UI 업데이트
      loadMyRequests()
    } else {
      alert(`신청 실패: ${json.error}`)
    }
  }

  function renderEduLabel(type: any){
    if(type.lang === 'korean-english' && type.mode === '1:1') return '한/영 1:1'
    if(type.lang === 'korean-english' && type.mode === 'small') return `한/영 소규모 (${type.category})`
    if(type.lang === 'japanese' && type.mode === '1:1') return '일본어 1:1'
    if(type.lang === 'japanese' && type.mode === 'small') return '일본어 소규모'
    if(type.lang === 'chinese' && type.mode === '1:1') return '중국어 1:1'
    if(type.lang === 'chinese' && type.mode === 'small') return '중국어 소규모'
    return '교육'
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
              onClick={() => onModeChange("select")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>

            <button
              onClick={() => onModeChange("request")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left bg-indigo-100 text-indigo-700"
            >
              <Calendar className="w-4 h-4" />
              Request
            </button>

            <button
              onClick={() => onNavigate("recording")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Record
            </button>

            <button
              onClick={() => onNavigate("review")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Review
            </button>

            <button
              onClick={() => onNavigate("evaluation")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              Evaluate
            </button>

            <button
              onClick={() => onNavigate("admin")}
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
            <Button
              onClick={() => {}}
              className="w-full bg-blue-600 hover:bg-blue-700 h-10"
            >
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </Button>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 영역 - 다른 모드와 동일한 배경과 스타일 적용 */}
      <div className="ml-64 p-8 main-scroll-container bg-blue-50" style={{
        height: '100vh', 
        overflowY: 'auto', 
        scrollSnapType: 'y mandatory',
        backgroundColor: 'rgba(220, 235, 255, 1) !important',
        background: `
          rgba(220, 235, 255, 1) center / 100% 100%,
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 4px
          ) center / 4px 4px,
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 4px
          ) center / 4px 4px,
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 100%) center / 100% 100%
        `
      }}>
        {/* 헤더 섹션 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 -m-8 mb-8 p-6 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">기내 방송 교육/녹음 신청</h1>
                <p className="text-gray-600 text-sm">원하는 교육 또는 녹음 세션을 신청하세요</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button 
                  variant={tab==='education'?"default":"outline"} 
                  onClick={()=>setTab('education')}
                  className={tab==='education' 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    : "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                  }
                >
                  교육 신청
                </Button>
                <Button 
                  variant={tab==='recording'?"default":"outline"} 
                  onClick={()=>setTab('recording')}
                  className={tab==='recording' 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    : "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                  }
                >
                  녹음 신청
                </Button>
                {authenticatedUser && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMyRequests(true)
                      loadMyRequests()
                    }}
                    className="hover:bg-green-50 hover:text-green-700 hover:border-green-200 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    내 신청 내역
                  </Button>
                )}
              </div>
              
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-40 h-10 bg-white/80 backdrop-blur-sm border-gray-200/60 hover:bg-white transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[-1,0,1,2].map(delta=>{
                    const d = new Date()
                    d.setMonth(d.getMonth()+delta)
                    const ym = d.toISOString().slice(0,7)
                    const label = d.toLocaleDateString("ko-KR",{year:"numeric", month:"long"})
                    return <SelectItem key={ym} value={ym}>{label}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-center">스케줄을 불러오는 중...</p>
              </div>
            </div>
          )}
          
          {!loading && (!data || dayCards.length === 0) && (
            <div className="max-w-2xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-gray-200/60">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">스케줄 준비 중</h3>
                  <p className="text-gray-600">해당 월의 스케줄은 아직 공개되지 않았습니다. (Config 시트에서 ON으로 설정하세요)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {!loading && data && (
            <>
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200/60 backdrop-blur-sm">
                <p className="text-sm text-amber-800">
                  <strong>📅 결과 공지:</strong> 매월말 기준 4영업일 전에 게시됩니다. 스케줄 표기: "결 과 공 지"
                </p>
              </div>

              {/* 캘린더 뷰 */}
              <RequestCalendar 
                year={parseInt(month.split('-')[0])}
                monthIndex={parseInt(month.split('-')[1]) - 1}
                dayCards={dayCards}
                tab={tab}
                onApplyRecording={handleApplyRecording}
                onApplyEducation={handleApplyEducation}
                renderEduLabel={renderEduLabel}
                isSlotAvailable={isSlotAvailable}
                isRecordingSlotAvailable={isRecordingSlotAvailable}
                getCurrentApplicants={getCurrentApplicants}
                getRecordingCurrentApplicants={getRecordingCurrentApplicants}
                availabilityCache={availabilityCache}
                userLanguageRestrictions={userLanguageRestrictions}
                onDateSelect={setSelectedDate}
              />
            </>
          )}
        </div>
      </div>

      {/* MyPage 모달 */}
      {showMyPage && (
        <MyPageModal
          user={authenticatedUser}
          userInfo={userInfo}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      )}

      {/* 내 신청 내역 모달 */}
      {showMyRequests && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">내 신청 내역</h2>
              <button
                onClick={() => setShowMyRequests(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {myRequestsLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">신청 내역을 불러오는 중...</h3>
                  <p className="text-gray-600">잠시만 기다려주세요.</p>
                </div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">신청 내역이 없습니다</h3>
                  <p className="text-gray-600">교육이나 녹음을 신청해보세요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myRequests.map((request) => {
                    const canCancel = () => {
                      if (request.status !== 'ACTIVE') return false
                      
                      // 교육/녹음 시작 시간 계산
                      const slotTimes: Record<number, string> = {
                        1: '08:30', 2: '09:30', 3: '10:30', 4: '11:30',
                        5: '13:40', 6: '14:40', 7: '15:40', 8: '16:40'
                      }
                      
                      // 교육이면 슬롯별 시간이 다를 수 있으므로 기본 시간 사용
                      const timeStr = slotTimes[request.slot] || '08:30'
                      const classDateTime = new Date(`${request.date}T${timeStr}:00+09:00`)
                      const now = new Date()
                      const hoursDiff = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                      
                      return hoursDiff >= 48
                    }

                    return (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={`${
                                request.type === 'education' 
                                  ? 'bg-indigo-100 text-indigo-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {request.type === 'education' ? '교육' : '녹음'}
                              </Badge>
                              <Badge className={`${
                                request.status === 'ACTIVE' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status === 'ACTIVE' ? '활성' : '취소됨'}
                              </Badge>
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 mb-2">
                              {request.date} - {request.slot}차수
                            </h3>
                            
                            {request.type === 'education' && (
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>언어: {
                                  request.details.language === 'korean-english' ? '한/영' :
                                  request.details.language === 'japanese' ? '일본어' :
                                  request.details.language === 'chinese' ? '중국어' : request.details.language
                                }</p>
                                <p>유형: {request.details.mode === '1:1' ? '1:1' : '소규모'}</p>
                                {request.details.category && (
                                  <p>분류: {request.details.category}</p>
                                )}
                              </div>
                            )}
                            
                            {request.type === 'recording' && (
                              <div className="text-sm text-gray-600">
                                <p>언어: {
                                  request.details.recordingLanguage === 'korean-english' ? '한/영' :
                                  request.details.recordingLanguage === 'japanese' ? '일본어' :
                                  request.details.recordingLanguage === 'chinese' ? '중국어' : request.details.recordingLanguage
                                }</p>
                              </div>
                            )}
                            
                            <p className="text-xs text-gray-500 mt-2">
                              신청일: {new Date(request.applicationTime).toLocaleDateString('ko-KR')} {new Date(request.applicationTime).toLocaleTimeString('ko-KR')}
                            </p>
                            
                            {request.notes && (
                              <p className="text-xs text-gray-500 mt-1">
                                {request.notes}
                              </p>
                            )}
                          </div>
                          
                          <div className="ml-4 flex flex-col items-end gap-1">
                            {(() => {
                              const slotTimes: Record<number, string> = {
                                1: '08:30', 2: '09:30', 3: '10:30', 4: '11:30',
                                5: '13:40', 6: '14:40', 7: '15:40', 8: '16:40'
                              }
                              const timeStr = slotTimes[request.slot] || '08:30'
                              const classDateTime = new Date(`${request.date}T${timeStr}:00+09:00`)
                              const now = new Date()
                              const hoursDiff = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                              const isExpired = hoursDiff < 0
                              
                              if (isExpired) {
                                return (
                                  <div className="text-xs text-gray-500 text-right">
                                    <div>교육/녹음 종료</div>
                                  </div>
                                )
                              }
                              
                              if (canCancel()) {
                                return (
                                  <>
                                    <div className="text-xs text-green-600 text-right">
                                      취소 가능 ({Math.floor(hoursDiff)}시간 남음)
                                    </div>
                                    <button
                                      onClick={() => handleCancelRequest(request.id)}
                                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                    >
                                      취소
                                    </button>
                                  </>
                                )
                              } else {
                                return (
                                  <>
                                    <div className="text-xs text-red-600 text-right">
                                      취소 불가 (48시간 미만)
                                    </div>
                                    <button
                                      onClick={() => alert('교육/녹음 시작 48시간 전까지만 취소할 수 있습니다.\n취소가 필요한 경우 담당자에게 연락해주세요.')}
                                      className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded cursor-not-allowed"
                                    >
                                      취소 불가
                                    </button>
                                  </>
                                )
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 캘린더 뷰 컴포넌트
function RequestCalendar({ 
  year, 
  monthIndex, 
  dayCards, 
  tab, 
  onApplyRecording, 
  onApplyEducation, 
  renderEduLabel,
  isSlotAvailable,
  isRecordingSlotAvailable,
  getCurrentApplicants,
  getRecordingCurrentApplicants,
  availabilityCache,
  userLanguageRestrictions,
  onDateSelect
}: {
  year: number
  monthIndex: number
  dayCards: any[]
  tab: string
  onApplyRecording: (date: string, slot: number, lang: any) => void
  onApplyEducation: (date: string, slot: number, type: any) => void
  renderEduLabel: (type: any) => string
  isSlotAvailable: (date: string, slot: number, language: string, educationType: string) => boolean
  isRecordingSlotAvailable: (date: string, slot: number, language: string) => boolean
  getCurrentApplicants: (date: string, slot: number, language: string, educationType: string) => number
  getRecordingCurrentApplicants: (date: string, slot: number) => number
  availabilityCache: Record<string, any>
  userLanguageRestrictions: Record<string, boolean>
  onDateSelect: (date: string | null) => void
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // selectedDate가 변경될 때 부모에게 알림
  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date)
    onDateSelect(date)
  }
  
  // availabilityCache나 userLanguageRestrictions가 변경될 때 강제 리렌더링
  useEffect(() => {
    setForceUpdate(prev => prev + 1)
  }, [availabilityCache, userLanguageRestrictions])
  // 해당 월의 첫째 날과 마지막 날 계산
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)
  
  // 달력 시작일 (이전 달의 마지막 주 포함)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  // 달력 종료일 (다음 달의 첫 주 포함)
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
  
  // 달력에 표시할 모든 날짜 생성
  const calendarDays = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    calendarDays.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // 날짜별 데이터 매핑
  const dayDataMap = useMemo(() => {
    const map: Record<string, any> = {}
    dayCards.forEach(day => {
      map[day.date] = day
    })
    return map
  }, [dayCards])
  
  const formatDateKey = (date: Date) => {
    // 시간대 차이로 인한 날짜 밀림 방지
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === monthIndex
  }
  
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }
  
  const getDayData = (date: Date) => {
    return dayDataMap[formatDateKey(date)]
  }

  // 녹음용 차수별 시간 정보 (1시간 단위)
  const getRecordingSlotTime = (slot: number) => {
    const times = {
      1: "08:30-09:20",
      2: "09:30-10:20", 
      3: "10:30-11:20",
      4: "11:30-12:20",
      5: "13:40-14:30",
      6: "14:40-15:30",
      7: "15:40-16:30",
      8: "16:40-17:30"
    }
    return times[slot as keyof typeof times] || ""
  }

  // 1:1 교육용 차수별 시간 정보 (25분 단위, 총 16차수)
  const getOneOnOneSlotTime = (slot: number) => {
    const times = {
      1: "08:30-08:55",
      2: "09:00-09:25", 
      3: "09:30-09:55",
      4: "10:00-10:25",
      5: "10:30-10:55",
      6: "11:00-11:25",
      7: "11:30-11:55",
      8: "12:00-12:25",
      9: "13:35-14:00",
      10: "14:05-14:30",
      11: "14:35-15:00",
      12: "15:05-15:30",
      13: "15:35-16:00",
      14: "16:05-16:30",
      15: "16:35-17:00",
      16: "17:05-17:30"
    }
    return times[slot as keyof typeof times] || ""
  }

  // 소규모 교육용 차수별 시간 정보 (2시간 단위)
  const getSmallGroupSlotTime = (slot: number) => {
    const times = {
      1: "08:30-10:20",
      2: "10:30-12:20",
      3: "13:40-15:30",
      4: "15:40-17:30"
    }
    return times[slot as keyof typeof times] || ""
  }

  // 교육 타입과 차수에 따른 시간 반환
  const getEducationSlotTime = (type: any, slot: number) => {
    if (type.mode === '1:1') {
      return getOneOnOneSlotTime(slot)
    } else if (type.mode === 'small') {
      return getSmallGroupSlotTime(slot)
    }
    return ""
  }

  // 스프레드시트 "녹음 단위" 차수를 "교육 단위" 차수로 변환 (가용성 체크 포함)
  const convertToEducationSlots = (recordingSlots: number[], educationType: any, date?: string, availabilityChecker?: (date: string, slot: number, language: string, educationType: string) => boolean) => {
    console.log(`🔄 변환 시작: 녹음슬롯=[${recordingSlots.join(',')}], 타입=${educationType.lang} ${educationType.mode}`)
    
    if (educationType.mode === '1:1') {
      // 1:1 교육: 총 16차수 존재, 녹음 1차수당 교육 4차수씩 매핑
      // 녹음 1,2차수 → 교육 1,2,3,4차수
      // 녹음 3,4차수 → 교육 5,6,7,8차수
      // 녹음 5,6차수 → 교육 9,10,11,12차수
      // 녹음 7,8차수 → 교육 13,14,15,16차수
      const educationSlots = []
      for (const recordingSlot of recordingSlots) {
        if (recordingSlot === 1) {
          educationSlots.push(1, 2, 3, 4)
        } else if (recordingSlot === 2) {
          educationSlots.push(1, 2, 3, 4)
        } else if (recordingSlot === 3) {
          educationSlots.push(5, 6, 7, 8)
        } else if (recordingSlot === 4) {
          educationSlots.push(5, 6, 7, 8)
        } else if (recordingSlot === 5) {
          educationSlots.push(9, 10, 11, 12)
        } else if (recordingSlot === 6) {
          educationSlots.push(9, 10, 11, 12)
        } else if (recordingSlot === 7) {
          educationSlots.push(13, 14, 15, 16)
        } else if (recordingSlot === 8) {
          educationSlots.push(13, 14, 15, 16)
        }
      }
      let result = [...new Set(educationSlots)]
        .filter(slot => slot <= 16) // 16차수까지만 허용
        .sort((a, b) => a - b) // 정렬
      
      // 가용성 체크는 UI에서 처리하므로 여기서는 모든 차수 표시
      console.log(`🔍 1:1 모든 차수 표시: ${date}, 언어: ${educationType.lang}`)
      
      console.log(`🔄 1:1 변환 결과: [${result.join(',')}] ${date ? '(가용성 체크 적용)' : ''}`)
      return result
    } else if (educationType.mode === 'small') {
      // 소규모 교육: 녹음 2차수 = 교육 1차수 (2시간)
      // 예) 녹음 1,2차수 => 교육 1차수, 녹음 3,4차수 => 교육 2차수
      const educationSlots = []
      for (const recordingSlot of recordingSlots) {
        if (recordingSlot <= 2) {
          educationSlots.push(1) // 08:30-10:20
        } else if (recordingSlot <= 4) {
          educationSlots.push(2) // 10:30-12:20
        } else if (recordingSlot <= 6) {
          educationSlots.push(3) // 13:40-15:30
        } else if (recordingSlot <= 8) {
          educationSlots.push(4) // 15:40-17:30
        }
      }
      let result = [...new Set(educationSlots)] // 중복 제거
      
      // 가용성 체크는 UI에서 처리하므로 여기서는 모든 차수 표시
      console.log(`🔍 소규모 모든 차수 표시: ${date}, 언어: ${educationType.lang}`)
      
      console.log(`🔄 소규모 변환 결과: [${result.join(',')}] ${date ? '(가용성 체크 적용)' : ''}`)
      return result
    }
    return recordingSlots
  }

  // 언어별 색상
  const getLanguageColor = (lang: string) => {
    switch(lang) {
      case 'korean-english': return 'bg-blue-500 hover:bg-blue-600'
      case 'japanese': return 'bg-green-500 hover:bg-green-600'
      case 'chinese': return 'bg-purple-500 hover:bg-purple-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  // 교육 타입별 색상
  const getEducationColor = (type: any) => {
    if (type.lang === 'korean-english' && type.mode === '1:1') return 'bg-indigo-500 hover:bg-indigo-600'
    if (type.lang === 'korean-english' && type.mode === 'small') return 'bg-blue-500 hover:bg-blue-600'
    if (type.lang === 'japanese' && type.mode === '1:1') return 'bg-green-500 hover:bg-green-600'
    if (type.lang === 'japanese' && type.mode === 'small') return 'bg-emerald-500 hover:bg-emerald-600'
    if (type.lang === 'chinese' && type.mode === '1:1') return 'bg-purple-500 hover:bg-purple-600'
    if (type.lang === 'chinese' && type.mode === 'small') return 'bg-violet-500 hover:bg-violet-600'
    return 'bg-gray-500 hover:bg-gray-600'
  }

  const selectedDayData = selectedDate ? dayDataMap[selectedDate] : null

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden border-gray-200/60">
      <CardHeader className="bg-gradient-to-r from-gray-50/80 to-slate-50/80 border-b border-gray-100/60">
        <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold text-gray-800">
          <Calendar className="w-6 h-6 text-indigo-600" />
          {year}년 {monthIndex + 1}월 {tab === 'education' ? '교육' : '녹음'} 신청 캘린더
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div 
              key={day} 
              className={`text-center font-semibold text-sm py-2 ${
                idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const dayData = getDayData(date)
            const isCurrentMonthDay = isCurrentMonth(date)
            const isTodayDay = isToday(date)
            const hasData = dayData && (
              (tab === 'recording' && dayData.recording?.slots?.length > 0) ||
              (tab === 'education' && dayData.education?.length > 0) ||
              dayData.resultAnnouncement
            )
            
            return (
              <div
                key={index}
                className={`
                  min-h-[120px] border rounded-lg p-2 transition-all duration-200
                  ${isCurrentMonthDay ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}
                  ${isTodayDay ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                  ${hasData ? 'hover:shadow-md cursor-pointer' : ''}
                `}
                onClick={() => hasData ? handleDateSelect(formatDateKey(date)) : null}
              >
                {/* 날짜 헤더 */}
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className={`
                      text-sm font-semibold
                      ${!isCurrentMonthDay ? 'text-gray-400' : 
                        isTodayDay ? 'text-blue-600' : 
                        date.getDay() === 0 ? 'text-red-600' : 
                        date.getDay() === 6 ? 'text-blue-600' : 'text-gray-900'}
                    `}
                  >
                    {date.getDate()}
                  </span>
                  
                  {dayData?.resultAnnouncement && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                      공지
                    </Badge>
                  )}
                </div>
                
                {/* 일정 미리보기 */}
                {isCurrentMonthDay && dayData && (
                  <div className="space-y-1">
                    {tab === 'recording' && dayData.recording?.slots?.length > 0 && (
                      <div className="space-y-1">
                        {dayData.recording.slots.slice(0, 2).map((slot: number) => (
                          <div key={`rec-${formatDateKey(date)}-${slot}`} className="text-xs">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded px-2 py-1 border border-blue-200">
                              <div className="font-semibold text-blue-800 mb-1">
                                {slot}차수 · {getRecordingSlotTime(slot)}
                              </div>
                              <div className="flex gap-0.5">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {dayData.recording.slots.length > 2 && (
                          <div className="text-xs text-blue-600 font-medium text-center cursor-pointer hover:text-blue-700">
                            +{dayData.recording.slots.length - 2}개 차수 더보기
                          </div>
                        )}
                      </div>
                    )}
                    
                    {tab === 'education' && dayData.education?.length > 0 && (
                      <div className="space-y-1">
                        {/* 학과장 정보 (교육이 있는 날에만) */}
                        {dayData.classroomInfo && (
                          <div className="text-xs bg-amber-50 rounded px-2 py-1 border border-amber-200">
                            <div className="font-semibold text-amber-700">📍 학과장 {dayData.classroomInfo}</div>
                          </div>
                        )}
                        
                        {dayData.education.slice(0, 2).map((edu: any, idx: number) => {
                          // 가용성 데이터가 변경될 때마다 실시간으로 재계산 (forceUpdate로 리렌더링 트리거)
                          const convertedSlots = convertToEducationSlots(edu.slots, edu.type, formatDateKey(date), isSlotAvailable)
                          // forceUpdate를 사용하여 의존성 추가 (실제로는 사용하지 않지만 리렌더링을 위해)
                          const _ = forceUpdate
                          return (
                            <div key={`edu-${formatDateKey(date)}-${idx}`} className="text-xs">
                              <div className={`rounded px-2 py-1 border ${
                                edu.type.lang === 'korean-english' ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200' :
                                edu.type.lang === 'japanese' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
                                edu.type.lang === 'chinese' ? 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200' :
                                'bg-gray-50 border-gray-200'
                              }`}>
                                <div className={`font-semibold mb-1 ${
                                  edu.type.lang === 'korean-english' ? 'text-indigo-800' :
                                  edu.type.lang === 'japanese' ? 'text-green-800' :
                                  edu.type.lang === 'chinese' ? 'text-purple-800' :
                                  'text-gray-800'
                                }`}>
                                  {renderEduLabel(edu.type)}
                                </div>

                                <div className="flex gap-0.5">
                                  {convertedSlots.slice(0, 6).map((slot: number) => (
                                    <div
                                      key={slot}
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        edu.type.lang === 'korean-english' ? 'bg-indigo-500' :
                                        edu.type.lang === 'japanese' ? 'bg-green-500' :
                                        edu.type.lang === 'chinese' ? 'bg-purple-500' :
                                        'bg-gray-500'
                                      }`}
                                    ></div>
                                  ))}
                                  {convertedSlots.length > 6 && <span className="text-xs">...</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {dayData.education.length > 2 && (
                          <div className="text-xs text-indigo-600 font-medium text-center cursor-pointer hover:text-indigo-700">
                            +{dayData.education.length - 2}개 교육 더보기
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* 범례 */}
        <div className="mt-6 p-4 bg-gray-50/50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">범례</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>한/영 녹음</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>일본어 녹음/교육</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>중국어 녹음/교육</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span>한/영 교육</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
              <span>결과 공지</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 ring-2 ring-blue-400 ring-opacity-50 rounded"></div>
              <span>오늘</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 border-2 border-gray-400 rounded"></div>
              <span>클릭하여 상세보기</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* 상세 일정 모달 */}
      {selectedDate && selectedDayData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {new Date(selectedDate).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long", 
                      day: "numeric",
                      weekday: "long"
                    })}
                  </h3>
                  <p className="text-indigo-100 mt-1">상세 일정 및 신청</p>
                </div>
                <button
                  onClick={() => handleDateSelect(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedDayData.resultAnnouncement && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
                    <Bell className="w-5 h-5" />
                    결과 공지일
                  </div>
                  <p className="text-amber-700 text-sm mt-1">이 날짜에 신청 결과가 발표됩니다.</p>
                </div>
              )}

              {tab === 'education' && selectedDayData.classroomInfo && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
                    <Building className="w-5 h-5" />
                    📍 학과장 {selectedDayData.classroomInfo}
                  </div>
                </div>
              )}

              {tab === 'recording' && selectedDayData.recording?.slots?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-blue-600" />
                    녹음 가능 차수
                  </h4>
                  <div className="space-y-3">
                    {selectedDayData.recording.slots.map((slot: number) => (
                      <div key={`modal-rec-${slot}`} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-semibold">
                              {slot}차수
                            </Badge>
                            <span className="text-sm font-medium text-gray-600">
                              {getRecordingSlotTime(slot)}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {["korean-english", "japanese", "chinese"].map((lang) => {
                            const isAvailable = isRecordingSlotAvailable(selectedDate, slot, lang)
                            const currentApplicants = getRecordingCurrentApplicants(selectedDate, slot)
                            
                            return (
                              <button
                                key={lang}
                                onClick={() => {
                                  if (isAvailable) {
                                    onApplyRecording(selectedDate, slot, lang)
                                    setSelectedDate(null)
                                  }
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  isAvailable 
                                    ? `text-white ${getLanguageColor(lang)}`
                                    : 'text-gray-400 bg-gray-200 cursor-not-allowed opacity-60'
                                }`}
                                disabled={!isAvailable}
                              >
                                <div>
                                  {lang === 'korean-english' ? '한국어/영어' : lang === 'japanese' ? '일본어' : '중국어'} 신청
                                </div>
                                <div className="text-xs mt-1">
                                  {currentApplicants}/8명
                                </div>
                                {!isAvailable && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {currentApplicants >= 8 ? '정원 마감' : '이미 신청한 언어'}
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'education' && selectedDayData.education?.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    교육 가능 과정
                  </h4>
                  <div className="space-y-4">
                    {selectedDayData.education.map((edu: any, idx: number) => {
                      // 가용성 데이터가 변경될 때마다 실시간으로 재계산 (forceUpdate로 리렌더링 트리거)
                      const convertedSlots = convertToEducationSlots(edu.slots, edu.type, selectedDate, isSlotAvailable)
                      // forceUpdate를 사용하여 의존성 추가 (실제로는 사용하지 않지만 리렌더링을 위해)
                      const _ = forceUpdate
                      return (
                        <div key={`modal-edu-${idx}`} className="border border-gray-200 rounded-lg p-4">
                          <div className="mb-3">
                            <Badge className={`font-semibold ${
                              edu.type.lang === 'korean-english' ? 'bg-indigo-100 text-indigo-800' :
                              edu.type.lang === 'japanese' ? 'bg-green-100 text-green-800' :
                              edu.type.lang === 'chinese' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {renderEduLabel(edu.type)}
                            </Badge>
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>시간:</strong> {edu.type.mode === '1:1' ? '25분 단위' : '2시간 단위'} · 총 {convertedSlots.length}개 차수</p>
                            </div>
                            {edu.type.lang === 'korean-english' && edu.type.mode === 'small' && (
                              <div className="mt-2 text-sm text-gray-600">
                                <p><strong>신규:</strong> 기내방송 자격이 없는 분들</p>
                                <p><strong>재자격:</strong> 자격 갱신 또는 상위 등급 취득</p>
                                <p><strong>공통:</strong> 일반 교정교육</p>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {convertedSlots.map((slot: number) => {
                              // 가용성 확인
                              const educationType = edu.type.mode === '1:1' ? '1:1' : 'small-group'
                              console.log('🔍 모달에서 isSlotAvailable 호출:', { selectedDate, slot, language: edu.type.lang, educationType })
                              const isAvailable = isSlotAvailable(selectedDate, slot, edu.type.lang, educationType)
                              const currentApplicants = getCurrentApplicants(selectedDate, slot, edu.type.lang, educationType)
                              
                              return (
                                <button
                                  key={slot}
                                                                      onClick={() => {
                                      if (isAvailable) {
                                        // 변환된 차수로 신청하지만, 원본 슬롯 정보도 함께 전달
                                        onApplyEducation(selectedDate, slot, edu.type)
                                        handleDateSelect(null)
                                      }
                                    }}
                                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                                    isAvailable 
                                      ? `text-white ${getEducationColor(edu.type)}`
                                      : 'text-gray-400 bg-gray-200 cursor-not-allowed opacity-60'
                                  }`}
                                  disabled={!isAvailable}
                                >
                                  {slot}차수
                                  <div className={`text-xs ${isAvailable ? 'opacity-90' : 'opacity-50'}`}>
                                    {getEducationSlotTime(edu.type, slot)}
                                  </div>
                                  {edu.type.mode === 'small' && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {currentApplicants}/4명
                                    </div>
                                  )}
                                  {!isAvailable && edu.type.mode === '1:1' && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      신청 완료
                                    </div>
                                  )}
                                  {!isAvailable && edu.type.mode === 'small' && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      정원 마감
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {(!selectedDayData.recording?.slots?.length && !selectedDayData.education?.length && !selectedDayData.resultAnnouncement) && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>이 날짜에는 예정된 일정이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// 녹음 설정 컴포넌트
function RecordingSetup({
  onComplete,
  authenticatedUser,
  isCheckingDevice = false,
}: { onComplete: (UserInfo: any) => void; authenticatedUser: AuthenticatedUser | null; isCheckingDevice?: boolean }) {
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
        disabled={!userInfo.name || !userInfo.employeeId || !userInfo.language || !userInfo.category || isCheckingDevice}
      >
        {isCheckingDevice ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            컴퓨터 등록 확인 중...
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            녹음 시작하기
          </>
        )}
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
  const [activeTab, setActiveTab] = useState<"profile" | "qualifications" | "requests">("profile")
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [loadingReq, setLoadingReq] = useState(false)

  // 직원 자격 정보 불러오기
  useEffect(() => {
    const loadEmployeeQualifications = async () => {
      if (user?.email) {
        setLoading(true)
        try {
          // 캐시를 무시하고 새로운 데이터를 강제로 불러오기
          await employeeDB.refreshEmployeeData()
          const employeeInfo = await employeeDB.findEmployeeByEmail(user.email)
          console.log("🔍 [MyPageModal] 직원 정보 로드:", employeeInfo)
          console.log("🔍 [MyPageModal] 한영 자격:", employeeInfo?.koreanEnglishGrade)
          console.log("🔍 [MyPageModal] 한영 유효기간:", employeeInfo?.koreanEnglishExpiry)
          setEmployeeData(employeeInfo)
        } catch (error) {
          console.error("직원 자격 정보 로드 실패:", error)
        } finally {
          setLoading(false)
        }
      }
    }
    loadEmployeeQualifications()
  }, [user?.email])

  useEffect(()=>{
    const loadRequests = async () => {
      if (!userInfo?.employeeId) return
      setLoadingReq(true)
      try {
        const res = await fetch(`/api/requests/list?employeeId=${encodeURIComponent(userInfo.employeeId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (json.success) setRequests(json.items || [])
      } finally {
        setLoadingReq(false)
      }
    }
    if (activeTab === 'requests') loadRequests()
  }, [activeTab, userInfo?.employeeId])

  // 자격 등급에서 알파벳만 추출하는 함수
  const extractGrade = (gradeString: string) => {
    if (!gradeString) return "-"
    // ANNC_X, JP_X, CN_X 형태에서 X 부분만 추출
    const match = gradeString.match(/(?:ANNC_|JP_|CN_)?([A-Z])/)
    return match ? match[1] : gradeString
  }

  // 자격 등급별 스타일 함수
  const getGradeStyle = (grade: string) => {
    const cleanGrade = extractGrade(grade)
    switch (cleanGrade) {
      case "S":
        return "bg-yellow-500 text-white font-bold"
      case "A":
        return "bg-blue-500 text-white font-bold"
      case "B":
        return "bg-green-500 text-white font-semibold"
      default:
        return "bg-gray-300 text-gray-700"
    }
  }

  // 사용자의 주요 역할을 반환하는 함수 (우선순위: 관리자 > 교관)
  const getUserMainRole = () => {
    if (userInfo.isAdmin) return "관리자"
    if (userInfo.isInstructor) return "교관"
    return null
  }
  // 탭 상태 제거 (평가 내역, 녹음 기록 삭제)
  // const [activeTab, setActiveTab] = useState("profile")

  // ESC 키 이벤트 처리
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Escape") onClose();
      }}
      autoFocus
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden relative">
        <div className="flex">
          {/* 사이드바 */}
          <div className="w-64 bg-gray-50 p-6 border-r border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">My Account</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 프로필 / 자격 / 신청 내역 */}
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === "profile"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                프로필 정보
              </button>
              <button
                onClick={() => setActiveTab("qualifications")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === "qualifications"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                나의 방송 자격
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === "requests"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                신청 내역
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

          {/* 메인 컨텐츠 - 탭에 따라 다른 내용 표시 */}
          <div className="flex-1 p-10 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {activeTab === "profile" && (
              <div className="max-w-md w-full mx-auto bg-white/90 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-blue-100">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg bg-white flex items-center justify-center">
                    <img
                      src={user?.picture || "/placeholder.svg?height=96&width=96&text=User"}
                      alt={user?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {getUserMainRole() && (
                    <span className={`absolute -bottom-2 -right-2 text-white font-bold px-4 py-1 rounded-full shadow-lg text-base tracking-widest border-2 animate-pulse flex items-center gap-1 whitespace-nowrap ${
                      getUserMainRole() === "관리자"
                        ? "bg-gradient-to-r from-orange-400 to-red-500 border-orange-300"
                        : "bg-gradient-to-r from-green-400 to-blue-500 border-blue-300"
                    }`}>
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        {getUserMainRole() === "관리자" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/>
                        )}
                      </svg>
                      {getUserMainRole()}
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
            )}
            
            {activeTab === "qualifications" && (
              <div className="max-w-3xl w-full mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{userInfo.name}({userInfo.employeeId}) 방송 자격 현황</h3>
                  <p className="text-gray-600">{new Date().toLocaleString('ko-KR', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}</p>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-600">자격 정보를 불러오는 중입니다...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 한/영 자격 */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-lg text-white">🇰🇷🇺🇸</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">한국어/영어</h4>
                            <p className="text-sm text-gray-600">
                              {employeeData?.koreanEnglishExpiry ? `유효기간: ${employeeData.koreanEnglishExpiry}` : "유효기간 정보 없음"}
                            </p>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-lg font-bold shadow-md ${getGradeStyle(employeeData?.koreanEnglishGrade || "")}`}>
                          {extractGrade(employeeData?.koreanEnglishGrade || "")}
                        </div>
                      </div>
                    </div>

                    {/* 일본어 자격 */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-lg text-white">🇯🇵</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">일본어</h4>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-lg font-bold shadow-md ${getGradeStyle(employeeData?.japaneseGrade || "")}`}>
                          {extractGrade(employeeData?.japaneseGrade || "")}
                        </div>
                      </div>
                    </div>

                    {/* 중국어 자격 */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-lg text-white">🇨🇳</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">중국어</h4>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-lg font-bold shadow-md ${getGradeStyle(employeeData?.chineseGrade || "")}`}>
                          {extractGrade(employeeData?.chineseGrade || "")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="max-w-3xl w-full mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">신청 내역</h3>
                  <p className="text-gray-600">교육/녹음 신청을 확인하고 48시간 전까지 취소할 수 있습니다.</p>
                </div>
                {/* 목록 */}
                {/* 본문에서 상태 관리됨: requests, loadingReq */}
                {/* @ts-ignore-next-line */}
                {loadingReq ? (
                  <div className="text-center py-12">불러오는 중...</div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">신청 내역이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {/* @ts-ignore-next-line */}
                    {requests.map((it: any, idx: number)=> (
                      <div key={idx} className="flex items-center justify-between bg-white rounded-lg border p-4">
                        <div className="text-sm">
                          <div className="font-semibold">
                            {new Date(it.date).toLocaleDateString('ko-KR',{month:'long', day:'numeric', weekday:'short'})} · {it.slot}차수
                          </div>
                          <div className="text-gray-600">
                            {it.type === 'education' ? `교육: ${it.detail}` : `녹음: ${langLabel(it.detail)}`}
                          </div>
                        </div>
                        {/* @ts-ignore-next-line */}
                        <CancelButton employeeId={userInfo.employeeId} item={it} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function langLabel(v: string){
  if (v === 'korean-english') return '한/영'
  if (v === 'japanese') return '일본어'
  if (v === 'chinese') return '중국어'
  return v
}

function CancelButton({ employeeId, item }: { employeeId: string, item: any }){
  const [busy, setBusy] = React.useState(false)
  const canCancel = React.useMemo(()=>{
    const slotTimes: Record<number, string> = {1:'08:30',2:'09:30',3:'10:30',4:'11:30',5:'13:40',6:'14:40',7:'15:40',8:'16:40'}
    const t = new Date(`${item.date}T${slotTimes[item.slot]}:00+09:00`)
    return t.getTime() - Date.now() >= 48*60*60*1000
  },[item])
  const onCancel = async () => {
    if (!confirm('정말로 취소하시겠습니까? 교육/녹음 시작 48시간 전까지만 취소할 수 있습니다.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/requests/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: item.type, date: item.date, slot: item.slot, employeeId }) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error||'취소 실패')
      alert('취소되었습니다.')
      // 새로고침
      window.location.reload()
    } catch (e: any) {
      alert(e?.message||String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button size="sm" variant="outline" onClick={onCancel} disabled={!canCancel || busy} className="min-w-24">
      {busy ? '처리 중...' : (canCancel ? '취소' : '취소 불가')}
    </Button>
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
      // 관리자인 경우 자동으로 관리자 모드 진입
      if (userInfo.isAdmin) {
        console.log("👑 관리자 자동 인증: 관리자 모드 진입")
        onModeChange("admin")
      } else {
        setShowAdminAuth(true)
      }
    } else if (newMode === "evaluation") {
      // 교관인 경우 자동으로 평가 모드 진입
      if (userInfo.isInstructor) {
        console.log("🎓 교관 자동 인증: 평가 모드 진입")
        onModeChange("evaluation")
      } else {
        setShowEvaluationAuth(true)
      }
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

  // 사용자의 주요 역할을 반환하는 함수 (우선순위: 관리자 > 교관)
  const getUserMainRole = () => {
    if (userInfo.isAdmin) return "관리자"
    if (userInfo.isInstructor) return "교관"
    return null
  }

  // ESC 키 이벤트 처리
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRecordingSetup) setShowRecordingSetup(false);
        if (showAdminAuth) setShowAdminAuth(false);
        if (showEvaluationAuth) setShowEvaluationAuth(false);
        if (showMyPage) setShowMyPage(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showRecordingSetup, showAdminAuth, showEvaluationAuth, showMyPage]);

  return (
    <div className="min-h-screen">
      {/* 사용자 정보 - 상단 우측 */}
      {authenticatedUser && (
        <div
          style={{ position: "fixed", top: 20, right: 32, zIndex: 50, opacity: 0.5 }}
          className="flex items-center gap-3 bg-white/80 shadow px-3 py-2 rounded-full border border-gray-200 backdrop-blur-sm"
        >
          <img
            src={authenticatedUser.picture || "/placeholder.svg?height=32&width=32&text=User"}
            alt={authenticatedUser.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-300"
          />
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-semibold text-gray-800 leading-tight">{authenticatedUser.name}</span>
              {getUserMainRole() && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  getUserMainRole() === "관리자" 
                    ? "bg-orange-100 text-orange-700" 
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {getUserMainRole()}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 leading-tight">{authenticatedUser.email}</span>
          </div>
        </div>
      )}

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
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Logout
              </>
            )}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button onClick={() => setShowRecordingSetup(false)} className="p-2 hover:bg-gray-100 rounded-lg absolute top-2 right-2">
              <X className="w-4 h-4" />
            </button>
                          <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={authenticatedUser} />
          </div>
        </div>
      )}
      {showAdminAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button onClick={() => setShowAdminAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg absolute top-2 right-2">
              <X className="w-4 h-4" />
            </button>
            <AdminAuth onSuccess={handleAdminAuthSuccess} />
          </div>
        </div>
      )}
      {showEvaluationAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button onClick={() => setShowEvaluationAuth(false)} className="p-2 hover:bg-gray-100 rounded-lg absolute top-2 right-2">
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

    try {
      const response = await fetch('/api/auth/admin-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
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
    } catch (error) {
      console.error('인증 오류:', error)
      setTimeout(() => {
        alert("인증 중 오류가 발생했습니다.")
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
          autoFocus
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

    try {
      const response = await fetch('/api/auth/instructor-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
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
    } catch (error) {
      console.error('인증 오류:', error)
      setTimeout(() => {
        alert("인증 중 오류가 발생했습니다.")
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
          autoFocus
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
  // const [isLoadingScript, setIsLoadingScript] = useState(true)

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

  // 시간 제한 체크
  useEffect(() => {
    const remainingTime = getRemainingTime()
    if (remainingTime <= 0 && !showFinalConfirmation) {
      console.log("⏰ 시간 제한 도달! 자동으로 최종 확인 페이지로 이동")
      setShowFinalConfirmation(true)
    }
  }, [elapsedTime, showFinalConfirmation])

  useEffect(() => {
    const scripts = pdfSyncService.getRandomScripts(userInfo.language, 5)
    setAvailableScripts(scripts)
    if (scripts.length > 0) {
      setCurrentScript(scripts[0])
    }
    // 문안 로딩 완료
    // setIsLoadingScript(false)
  }, [userInfo.language])

  const getCurrentScriptIndex = () => {
    return availableScripts.indexOf(currentScript)
  }

  const nextScript = () => {
    const currentIndex = getCurrentScriptIndex()
    if (currentIndex < availableScripts.length - 1) {
      // setIsLoadingScript(true) // 새 문안 로딩 시작
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      {/* 전체 화면 로딩 오버레이 - 녹음 진행 중에는 비활성화 */}
      {/* <FullscreenLoadingOverlay 
        isVisible={isLoadingScript} 
        message="문안을 불러오는 중입니다..."
        subMessage={`${userInfo.language} ${currentScript}번 문안`}
      /> */}
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">기내 방송 녹음</h1>
              <p className="text-gray-600 text-sm">
                {userInfo.name} ({userInfo.employeeId}) - {getLanguageDisplay(userInfo.language)}
              </p>
            </div>
          </div>

          {/* 타이머 */}
          <div className={`rounded-2xl p-4 border shadow-sm transition-all duration-300 ${
            getRemainingTime() <= 300 
              ? 'bg-gradient-to-r from-red-100 to-orange-100 border-red-200/50 animate-pulse' 
              : getRemainingTime() <= 600 
                ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-200/50' 
                : 'bg-gradient-to-r from-slate-100 to-gray-100 border-gray-200/50'
          }`}>
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${
                getRemainingTime() <= 300 
                  ? 'text-red-800' 
                  : getRemainingTime() <= 600 
                    ? 'text-orange-800' 
                    : 'text-gray-900'
              }`}>
                {formatTime(getRemainingTime())}
              </div>
              <div className={`text-xs font-medium ${
                getRemainingTime() <= 300 
                  ? 'text-red-700' 
                  : getRemainingTime() <= 600 
                    ? 'text-orange-700' 
                    : 'text-gray-600'
              }`}>
                {getRemainingTime() <= 0 ? '시간 종료!' : '남은 시간'}
              </div>
              <div className="mt-2 text-xs text-gray-500 bg-white/60 rounded-full px-3 py-1">
                진행: {getCurrentScriptIndex() + 1}/{availableScripts.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* PDF 뷰어 */}
          <div className="lg:col-span-3">
            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/80">
                              <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-800">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span>문안 {currentScript}번 - {getLanguageDisplay(userInfo.language)}</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {getCurrentScriptIndex() + 1} / {availableScripts.length}
                </Badge>
              </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <PDFViewer
                  language={userInfo.language}
                  scriptNumber={currentScript}
                  currentLanguageMode={currentLanguageMode}
                  onLoadComplete={() => {/* setIsLoadingScript(false) */}}
                />
              </CardContent>
            </Card>
          </div>

          {/* 녹음 컨트롤 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 사용자 정보 카드 */}
            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/80">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                  <User className="w-6 h-6 text-blue-600" />
                  녹음 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
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
              </CardContent>
            </Card>

            {/* 언어 모드 선택 */}
            {userInfo.language === "korean-english" && (
              <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/80">
                                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                  <Globe className="w-6 h-6 text-purple-600" />
                  언어 모드
                </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
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
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      English
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 녹음 컨트롤 */}
            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/80">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                  <Mic className="w-6 h-6 text-red-600" />
                  녹음 컨트롤
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
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
              </CardContent>
            </Card>

            {/* 진행 상태 */}
            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/80">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                  <ClipboardCheck className="w-6 h-6 text-green-600" />
                  진행 상태
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
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
              </CardContent>
            </Card>

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
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [showAdminAuth, setShowAdminAuth] = useState(false)
  const [showEvaluationAuth, setShowEvaluationAuth] = useState(false)
  const [showRecordingSetup, setShowRecordingSetup] = useState(false)

  const handleNavigation = (newMode: string) => {
    if (newMode === "admin") {
      // 이미 admin 모드일 때는 iframe만 리프레시
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src
      }
      return
    } else if (newMode === "evaluation") {
      // 교관인 경우 자동으로 평가 모드 진입
      if (userInfo.isInstructor) {
        console.log("🎓 교관 자동 인증: 평가 모드 진입")
        onModeChange("evaluation")
      } else {
        setShowEvaluationAuth(true)
      }
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

  // 사용자의 주요 역할을 반환하는 함수 (우선순위: 관리자 > 교관)
  const getUserMainRole = () => {
    if (userInfo.isAdmin) return "관리자"
    if (userInfo.isInstructor) return "교관"
    return null
  }

  // ESC 키 이벤트 처리
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRecordingSetup) setShowRecordingSetup(false);
        if (showEvaluationAuth) setShowEvaluationAuth(false);
        if (showMyPage) setShowMyPage(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showRecordingSetup, showEvaluationAuth, showMyPage]);

  return (
    <div className="min-h-screen">
      {/* 사용자 정보 - 상단 우측 */}
      {authenticatedUser && (
        <div
          style={{ position: "fixed", top: 20, right: 32, zIndex: 50, opacity: 0.5 }}
          className="flex items-center gap-3 bg-white/80 shadow px-3 py-2 rounded-full border border-gray-200 backdrop-blur-sm"
        >
          <img
            src={authenticatedUser.picture || "/placeholder.svg?height=32&width=32&text=User"}
            alt={authenticatedUser.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-300"
          />
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-semibold text-gray-800 leading-tight">{authenticatedUser.name}</span>
              {getUserMainRole() && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  getUserMainRole() === "관리자" 
                    ? "bg-orange-100 text-orange-700" 
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {getUserMainRole()}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 leading-tight">{authenticatedUser.email}</span>
          </div>
        </div>
      )}

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

            <button onClick={() => handleNavigation("admin")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left bg-orange-100 text-orange-700">
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

          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Logout
              </>
            )}
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 - ver150 관리자 대시보드 */}
      <div className="ml-64">
        <iframe ref={iframeRef} src="/admin" className="w-full h-screen border-0" title="관리자 대시보드" />
      </div>

      {/* 녹음 설정 모달 */}
      {showRecordingSetup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">녹음 설정</h2>
                <button onClick={() => setShowRecordingSetup(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={null} isCheckingDevice={false} />
            </div>
          </div>
        </div>
      )}

      {/* 평가 인증 모달 */}
      {showEvaluationAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
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
  toggleMobileMenu,
  isMobileMenuOpen,
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
  toggleMobileMenu: () => void
  isMobileMenuOpen: boolean
}) {
  const [refreshKey, setRefreshKey] = useState(0)
  const handleNavigation = (newMode: string) => {
    if (newMode === "evaluation") {
      // 이미 evaluation 모드일 때는 데이터 리프레시만 수행
      setRefreshKey((k) => k + 1)
      return
    } else if (newMode === "admin") {
      // 관리자인 경우 자동으로 관리자 모드 진입
      if (userInfo.isAdmin) {
        console.log("👑 관리자 자동 인증: 관리자 모드 진입")
        onModeChange("admin")
      } else {
        setShowAdminAuth(true)
      }
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

  // 사용자의 주요 역할을 반환하는 함수 (우선순위: 관리자 > 교관)
  const getUserMainRole = () => {
    if (userInfo.isAdmin) return "관리자"
    if (userInfo.isInstructor) return "교관"
    return null
  }

  // ESC 키 이벤트 처리
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRecordingSetup) setShowRecordingSetup(false);
        if (showAdminAuth) setShowAdminAuth(false);
        if (showEvaluationAuth) setShowEvaluationAuth(false);
        if (showMyPage) setShowMyPage(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showRecordingSetup, showAdminAuth, showEvaluationAuth, showMyPage]);

  return (
    <div className="min-h-screen">
      {/* 모바일 헤더 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileMenu}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-gray-900 font-bold text-lg">JVOICE</h1>
        </div>
        {authenticatedUser && (
          <div className="flex items-center gap-2">
            <img
              src={authenticatedUser.picture || "/placeholder.svg?height=32&width=32&text=User"}
              alt={authenticatedUser.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-300"
            />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-800 leading-tight">{authenticatedUser.name}</span>
              {getUserMainRole() && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  getUserMainRole() === "관리자" 
                    ? "bg-orange-100 text-orange-700" 
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {getUserMainRole()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 데스크톱 사용자 정보 - 상단 우측 (evaluate 모드에서는 숨김) */}
      {/* {authenticatedUser && (
        <div
          style={{ position: "fixed", top: 20, right: 32, zIndex: 50, opacity: 0.5 }}
          className="hidden lg:flex items-center gap-3 bg-white/80 shadow px-3 py-2 rounded-full border border-gray-200 backdrop-blur-sm"
        >
          <img
            src={authenticatedUser.picture || "/placeholder.svg?height=32&width=32&text=User"}
            alt={authenticatedUser.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-300"
          />
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-semibold text-gray-800 leading-tight">{authenticatedUser.name}</span>
              {getUserMainRole() && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  getUserMainRole() === "관리자" 
                    ? "bg-orange-100 text-orange-700" 
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {getUserMainRole()}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 leading-tight">{authenticatedUser.email}</span>
          </div>
        </div>
      )} */}

      {/* 모바일 메뉴 오버레이 */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 모바일 사이드바 */}
      <div className={`lg:hidden fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* 모바일 헤더 */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-gray-900 font-bold text-lg">JVOICE</h1>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* 모바일 네비게이션 */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <button
              onClick={() => { onBack(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-base">Home</span>
            </button>
            <button
              onClick={() => { handleNavigation("recording"); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Mic className="w-5 h-5" />
              <span className="text-base">Record</span>
            </button>
            <button
              onClick={() => { handleNavigation("review"); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Eye className="w-5 h-5" />
              <span className="text-base">Review</span>
            </button>
            <button 
              onClick={() => { handleNavigation("evaluation"); setIsMobileMenuOpen(false); }} 
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left bg-purple-100 text-purple-700"
            >
              <ClipboardCheck className="w-5 h-5" />
              <span className="text-base">Evaluate</span>
            </button>
            <button
              onClick={() => { handleNavigation("admin"); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-base">Manage</span>
            </button>
          </nav>
        </div>
        {/* 모바일 하단 메뉴 */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="text-base">Updates</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors">
            <Moon className="w-5 h-5" />
            <span className="text-base">Dark Mode</span>
          </button>
          <button
            onClick={() => { setShowMyPage(true); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-base">My Account</span>
            <ChevronDown className="w-4 h-4 ml-auto" />
          </button>
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-base">Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span className="text-base">Logout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 데스크톱 사이드바 네비게이션 */}
      <div className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col">
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
            <button onClick={() => handleNavigation("evaluation")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left bg-purple-100 text-purple-700">
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
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Logout
              </>
            )}
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="lg:ml-64 pt-16 lg:pt-0 p-4 lg:p-8 main-scroll-container" style={{height: '100vh', overflowY: 'auto', scrollSnapType: 'y mandatory'}}>
        <EvaluationDashboard onBack={onBack} authenticatedUser={authenticatedUser} userInfo={userInfo} refreshKey={refreshKey} />
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
              <RecordingSetup onComplete={handleRecordingSetupComplete} authenticatedUser={null} isCheckingDevice={false} />
            </div>
          </div>
        </div>
      )}
      {/* 관리자 인증 모달 */}
      {showAdminAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
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

"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
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
  GraduationCap,
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
        setIsMobileMenuOpen={setIsMobileMenuOpen}
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
                String(mode) === "request" ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
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
      <div className="ml-64 p-8 main-scroll-container bg-white" style={{
        height: '100vh', 
        overflowY: 'auto', 
        scrollSnapType: 'y mandatory'
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
  const [myRequestsFilter, setMyRequestsFilter] = useState<'all' | 'recording' | 'education'>('all')
  const filteredMyRequests = myRequests.filter((r: any) => myRequestsFilter === 'all' || r.type === myRequestsFilter)
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, any>>({})
  const [userLanguageRestrictions, setUserLanguageRestrictions] = useState<Record<string, boolean>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [syncedMonths, setSyncedMonths] = useState<string[]>([])
  const [syncedMonthsLoading, setSyncedMonthsLoading] = useState(false)
  const [classroomInfoMap, setClassroomInfoMap] = useState<Map<string, string>>(new Map())
  
  // 언어 선택 팝업 상태
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const [selectedRecordingSlot, setSelectedRecordingSlot] = useState<{date: string, slot: number} | null>(null)

  // selectedDate가 변경될 때마다 가용성을 강제로 새로고침
  useEffect(() => {
    if (selectedDate && authenticatedUser) {
      console.log('🔄 [데스크톱] 모달 열림, 가용성 강제 새로고침:', selectedDate)
      checkAvailability(selectedDate, true) // forceRefresh = true
    }
  }, [selectedDate, authenticatedUser])

  // 해당 월의 모든 날짜 가용성 미리 로드 (Bulk API 사용)
  const preloadMonthAvailability = async (scheduleData: any[]) => {
    console.log('🔥 [DEBUG] preloadMonthAvailability 함수 실행됨!!!', {
      timestamp: new Date().toISOString(),
      authenticatedUser: !!authenticatedUser,
      scheduleData: scheduleData,
      scheduleDataLength: scheduleData?.length,
      userInfo: userInfo
    })

    if (!authenticatedUser) {
      console.log('❌ [DEBUG] 인증되지 않은 사용자 - 함수 종료')
      return
    }

    console.log('🚀 [데스크톱] 월 가용성 미리 로드 시작 (Bulk API)', {
      scheduleDataLength: scheduleData.length,
      authenticatedUser: !!authenticatedUser,
      userInfo: userInfo
    })


    // 스케줄 데이터 유효성 검사
    if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
      console.warn('⚠️ [데스크톱] 스케줄 데이터가 유효하지 않음:', scheduleData)
      return
    }

    try {
      // Bulk API로 모든 가용성 데이터 한 번에 조회
      const employeeId = userInfo?.employeeId || 'TEMP001'
      console.log('📡 [데스크톱] Bulk API 호출 준비:', { employeeId, scheduleDataLength: scheduleData.length })

      const bulkApiUrl = `/api/requests/bulk-availability?employeeId=${employeeId}`
      console.log('🔗 [DEBUG] Bulk API URL:', bulkApiUrl)

      console.log('📡 [데스크톱] Bulk API 호출 시작...')
      const response = await fetch(bulkApiUrl)
      console.log('📡 [데스크톱] Bulk API 응답 상태:', response.status, response.statusText)

      const bulkData = await response.json()
      console.log('📡 [데스크톱] Bulk API 응답 데이터:', {
        success: bulkData.success,
        dataKeys: bulkData.data ? Object.keys(bulkData.data) : 'no data',
        error: bulkData.error
      })

      if (bulkData.success && bulkData.data) {
        console.log(`✅ [데스크톱] Bulk API 성공! ${Object.keys(bulkData.data).length}개 날짜 데이터`)

        // Bulk 데이터를 기존 캐시 형식으로 변환
        const transformedData: Record<string, any> = {}

        Object.entries(bulkData.data).forEach(([date, dateData]: [string, any]) => {
          transformedData[date] = {
            // 교육 가용성 변환
            slotAvailability: dateData.education?.slots || [],
            educationHasExistingApplication: dateData.education?.hasExistingApplication || false,

            // 녹음 가용성 변환
            recordingSlotAvailability: dateData.recording?.slots || [],
            recordingHasExistingApplication: dateData.recording?.hasExistingApplication || false,

            // 추가 메타데이터
            lastUpdated: dateData.lastUpdated,
            fromBulkApi: true
          }
        })

        console.log('🔄 [데스크톱] Bulk 데이터 변환 완료:', Object.keys(transformedData))

        // 변환된 데이터를 캐시에 저장
        setAvailabilityCache(prev => ({
          ...prev,
          ...transformedData
        }))

        console.log('💾 [데스크톱] Bulk 데이터 캐시 저장 완료 - 이제 개별 API 호출 없음!')
        return // 성공했으므로 여기서 종료
      } else {
        console.warn('⚠️ [데스크톱] Bulk API 실패, 기존 방식으로 폴백:', bulkData.error)
        // 기존 방식으로 폴백
        await loadAvailabilityFallback(scheduleData)
      }
    } catch (error) {
      console.error('❌ [데스크톱] Bulk API 에러 상세:', error)
      console.warn('⚠️ [데스크톱] Bulk API 에러로 기존 방식으로 폴백')
      // 기존 방식으로 폴백
      await loadAvailabilityFallback(scheduleData)
    }

    console.log('✅ [데스크톱] 월 가용성 미리 로드 완료')
  }

  // 폴백: 기존 방식으로 가용성 로드
  const loadAvailabilityFallback = async (scheduleData: any[]) => {
    const uniqueDates = [...new Set(scheduleData.map((item: any) => item.date).filter(Boolean))]
    console.log(`📅 [데스크톱] 폴백 모드: ${uniqueDates.length}개 날짜 처리`)

    // 각 날짜의 가용성을 병렬로 로드 (최대 5개씩 배치 처리)
    const batchSize = 5
    for (let i = 0; i < uniqueDates.length; i += batchSize) {
      const batch = uniqueDates.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (date: string) => {
          try {
            await checkAvailability(date, false) // forceRefresh = false (캐시 활용)
          } catch (error) {
            console.warn(`⚠️ [데스크톱] ${date} 가용성 로드 실패:`, error)
          }
        })
      )

      // 배치 간 짧은 딜레이 (서버 부하 방지)
      if (i + batchSize < uniqueDates.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  // 신청 기한 체크 함수 (2일 전 14:00 기준)
  const isApplicationDeadlinePassed = (date: string): boolean => {
    const scheduleDate = new Date(date)
    const twoDaysBefore = new Date(scheduleDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
    twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
    
    const now = new Date()
    return now > twoDaysBefore
  }

  // 동기화된 월 목록 가져오기
  const fetchSyncedMonths = async () => {
    setSyncedMonthsLoading(true)
    try {
      const response = await fetch('/api/schedules/sync-from-sheets')
      const result = await response.json()
      
      if (result.success && result.schedules) {
        const months = result.schedules
          .filter((s: any) => s.active === true) // 활성화된 스케줄만 필터링
          .map((s: any) => s.month)
          .sort()
          .reverse() // 최신순
        setSyncedMonths(months)
        
        // 현재 선택된 월이 동기화된 월 목록에 없으면 첫 번째 월로 변경
        if (months.length > 0 && !months.includes(month)) {
          setMonth(months[0])
        }
        
        console.log('✅ 동기화된 월 목록:', months)
      } else {
        console.error('❌ 동기화된 월 목록 가져오기 실패:', result)
        setSyncedMonths([])
      }
    } catch (error) {
      console.error('❌ 동기화된 월 목록 가져오기 에러:', error)
      setSyncedMonths([])
    } finally {
      setSyncedMonthsLoading(false)
    }
  }

  type SessionSlot = 1|2|3|4|5|6|7|8

  // 컴포넌트 마운트 시 동기화된 월 목록을 가져옴
  useEffect(()=>{
    fetchSyncedMonths()
  }, [])

  // 동기화된 월 목록이나 선택된 월이 변경될 때 데이터 로드
  useEffect(()=>{
    (async()=>{
      // 동기화된 월이 없으면 데이터 로드하지 않음
      if (syncedMonths.length === 0 && !syncedMonthsLoading) {
        setData(null)
        setLoading(false)
        return
      }
      
      // 아직 동기화된 월 목록을 로딩 중이면 대기
      if (syncedMonthsLoading) {
        return
      }
      
      // 현재 선택된 월이 동기화된 월 목록에 없으면 스킵
      if (!syncedMonths.includes(month)) {
        console.log(`⚠️ 선택된 월 ${month}이 동기화된 월 목록에 없음: [${syncedMonths.join(', ')}]`)
        setData(null)
        setLoading(false)
        return
      }
      
      setLoading(true)
      try{
        // 선택된 월의 스케줄 데이터 로드
        let res = await fetch(`/api/schedules?month=${month}`,{ cache: "no-store" })
        let json = await res.json()
        
        if (!json.success) {
          console.error(`❌ ${month} 스케줄 로드 실패:`, json)
            setData(null)
            setLoading(false)
            return
        }
        
        if(json.success) {
          setData(json.data)
          console.log(`📅 ${month} 스케줄 로드 완료`)
          
          // 스케줄 로드 후 신청 내역도 함께 로드
          console.log('🔥 [DEBUG] 스케줄 로드 완료 - 인증 상태 확인:', {
            authenticatedUser: !!authenticatedUser,
            userInfo: userInfo,
            hasData: !!json.data,
            hasDays: !!json.data?.days,
            daysLength: json.data?.days?.length
          })

          if (authenticatedUser) {
            console.log('✅ [DEBUG] 인증됨 - 신청 내역 로드 시작')
            loadMyRequests()

            // 🚀 해당 월의 모든 날짜 가용성 미리 로드
            console.log('🚀 [스케줄 로드 완료] 가용성 미리 로드 시작:', {
              hasData: !!json.data,
              hasDays: !!json.data?.days,
              daysLength: json.data?.days?.length,
              authenticatedUser: !!authenticatedUser
            })

            // 함수가 존재하는지 확인
            if (typeof preloadMonthAvailability === 'function') {
              console.log('✅ [DEBUG] preloadMonthAvailability 함수 존재 확인')
              preloadMonthAvailability(json.data?.days || [])
            } else {
              console.error('❌ [DEBUG] preloadMonthAvailability 함수가 존재하지 않음!')
            }
          } else {
            console.log('❌ [DEBUG] 인증되지 않음 - 가용성 로드 건너뜀')
          }
        }
        else throw new Error(json.error)
      }catch(e){
        console.error(e)
      }finally{
        setLoading(false)
      }
    })()
  },[month, syncedMonths, syncedMonthsLoading])

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

  // 스케줄 데이터 리프레시 함수
  const refreshScheduleData = async () => {
    console.log('🔄 [Schedule] 스케줄 데이터 리프레시 시작')
    setLoading(true)
    try {
      const res = await fetch(`/api/schedules?month=${month}`, { cache: "no-store" })
      const json = await res.json()

      if (json.success) {
        setData(json.data)
        console.log(`📅 ${month} 스케줄 리프레시 완료`)

        // 리프레시 후 가용성 데이터도 갱신
        if (json.data?.days && Array.isArray(json.data.days)) {
          await preloadMonthAvailability(json.data.days)
        }
      } else {
        console.error(`❌ ${month} 스케줄 리프레시 실패:`, json)
      }
    } catch (error) {
      console.error('❌ [Schedule] 리프레시 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMyRequests = async () => {
    if (!authenticatedUser) return
    
    setMyRequestsLoading(true)
    try {
      const employeeId = userInfo.employeeId || 'TEMP001'
      console.log('🔍 [Database] 신청 내역 조회 - employeeId:', employeeId)
      
      // Database API 우선 시도
      const res = await fetch(`/api/requests/database?employeeId=${employeeId}`)
      const data = await res.json()
      console.log('📄 [Database] 신청 내역 응답:', data)
      
      if (data.success && data.items) {
        // Database API 응답을 기존 형식으로 변환
        const convertedRequests = data.items.map((item: any) => ({
          id: item.id,
          employeeId: employeeId,
          name: authenticatedUser.name,
          department: userInfo.department || '' || '승무원',
          type: item.type,
          date: item.date,
          slot: item.slot,
          details: item.details,
          applicationTime: item.appliedAt,
          status: item.status
        }))
        
        setMyRequests(convertedRequests)
        
        // 교육별 교실 정보 로드
        const uniqueDates = new Set<string>()
        convertedRequests.forEach((req: any) => {
          if (req.type === 'education') {
            uniqueDates.add(req.date)
          }
        })
        
        // 교육별 교실 정보 로드
        if (uniqueDates.size > 0) {
          const months = Array.from(uniqueDates).map(date => date.slice(0, 7))
          const uniqueMonths = [...new Set(months)]
          
          const educationClassroomMap = new Map<string, string>() // key: date_slot_language_type_category, value: classroom
          
          for (const month of uniqueMonths) {
            try {
              console.log(`🔍 [Request mode] ${month} 월 스케줄 로드 중...`)
              const scheduleRes = await fetch(`/api/schedules?month=${month}`, { cache: 'no-store' })
              const scheduleData = await scheduleRes.json()
              console.log(`📅 [Request mode] ${month} 스케줄 응답:`, scheduleData)
              
              if (scheduleData.success && scheduleData.data?.days) {
                scheduleData.data.days.forEach((day: any) => {
                  console.log(`🔍 [Request mode] 날짜 ${day.date} 교육 데이터:`, day.education)
                  
                  // 교육별로 교실 정보 매핑 (카테고리 포함)
                  if (day.education && Array.isArray(day.education)) {
                    day.education.forEach((edu: any) => {
                      console.log(`🔍 [Request mode] 교육 객체:`, edu)
                      if (edu.classroomInfo && edu.type && edu.slots) {
                        // 모든 slots에 대해 매핑 (카테고리별)
                        edu.slots.forEach((slot: number) => {
                          // 카테고리가 있는 경우와 없는 경우 모두 처리
                          if (edu.type.category) {
                            // 카테고리별 키 (한/영 소규모)
                            const categoryKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}_${edu.type.category}`
                            educationClassroomMap.set(categoryKey, edu.classroomInfo)
                            console.log(`✅ [Request mode] 교육별 교실 정보 추가 (카테고리): ${categoryKey} → ${edu.classroomInfo}`)
                          }
                          
                          // 기본 키 (모든 교육)
                          const baseKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}`
                          educationClassroomMap.set(baseKey, edu.classroomInfo)
                          console.log(`✅ [Request mode] 교육별 교실 정보 추가 (기본): ${baseKey} → ${edu.classroomInfo}`)
                        })
                      }
                    })
                  }
                })
              } else {
                console.log(`❌ [Request mode] ${month} 스케줄 로드 실패:`, scheduleData)
              }
            } catch (error) {
              console.error(`Failed to load classroom info for ${month}:`, error)
            }
          }
          
          setClassroomInfoMap(educationClassroomMap)
          console.log('🏫 [Request mode] 교육별 교실 정보:', Object.fromEntries(educationClassroomMap))
          
          // 교실 정보를 포함한 enriched 데이터 생성 (모바일과 동일한 로직)
          const enrichedItems = convertedRequests.map((item: any) => {
            if (item.type !== 'education') {
              return { ...item, classroomInfo: '' }
            }
            
            const language = item.details?.language || 'korean-english'
            const mode = item.details?.mode || item.details?.educationType || '1:1'
            const category = item.details?.category || '공통'
            const normalizedMode = mode === 'small' || mode === 'small-group' ? 'small' : '1:1'
            
            let classroom = ''
            
            // 1. 카테고리별 키 시도 (한/영 소규모만)
            if (category && language === 'korean-english' && normalizedMode === 'small') {
              const categoryKey = `${item.date}_${item.slot}_${language}_${normalizedMode}_${category}`
              classroom = educationClassroomMap.get(categoryKey) || ''
              console.log(`🔍 [Request mode] 카테고리 키 시도: ${categoryKey} → ${classroom}`)
            }
            
            // 2. 기본 키 시도 (모든 교육)
            if (!classroom) {
              const baseKey = `${item.date}_${item.slot}_${language}_${normalizedMode}`
              classroom = educationClassroomMap.get(baseKey) || ''
              console.log(`🔍 [Request mode] 기본 키 시도: ${baseKey} → ${classroom}`)
            }
            
            const formattedClassroom = classroom ? (classroom.includes('학과장') ? classroom : `${classroom} 학과장`) : ''
            console.log(`🔍 [Request mode] 교실 매칭: ${item.date}_${item.slot}_${language}_${normalizedMode} (카테고리: ${category}) → ${classroom} → ${formattedClassroom}`)
            
            return {
              ...item,
              classroomInfo: formattedClassroom
            }
          })
          
          console.log('📊 [Request mode] 교육 신청 내역 (클래스룸 정보 포함):', enrichedItems)
          setMyRequests(enrichedItems)
        } else {
          setMyRequests(convertedRequests)
        }
        console.log('✅ [Database] 신청 내역 로드 완료:', convertedRequests.length, '개')
      } else {
        // Database API 실패시 Dropbox API로 fallback
        console.log('🔄 [Database] 실패, Dropbox API로 fallback')
        const fallbackRes = await fetch(`/api/requests/dropbox?employeeId=${employeeId}&email=${authenticatedUser.email}`)
        const fallbackData = await fallbackRes.json()
        
        if (fallbackData.requests) {
          setMyRequests(fallbackData.requests)
          console.log('✅ [Dropbox] 신청 내역 로드 완료:', fallbackData.requests.length, '개')
        }
      }
    } catch (error) {
      console.error('신청 내역 조회 실패:', error)
      setMyRequests([])
    } finally {
      setMyRequestsLoading(false)
    }
  }

  // 날짜별 가용성 확인
  const checkAvailability = async (date: string, forceRefresh = false) => {
    if (!authenticatedUser) return null
    
    const cacheKey = date
    if (availabilityCache[cacheKey] && !forceRefresh) {
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
      
      const employeeId = userInfo.employeeId || 'TEMP001'
      
      // 간단한 가용성 API 사용 (교육 + 녹음 통합)
      // 교육 가용성 API 호출 (녹음처럼 기존 API 사용)
      const educationResponse = await fetch(
        `/api/requests/availability?month=${currentMonth}&date=${date}&employeeId=${employeeId}&email=${authenticatedUser.email}`
      )
      
      // 녹음 가용성 API 호출
      const recordingResponse = await fetch(`/api/requests/recording-availability?date=${date}&employeeId=${employeeId}`)
      
      if (educationResponse.ok && recordingResponse.ok) {
        const educationData = await educationResponse.json()
        const recordingData = await recordingResponse.json()
        
        console.log(`🔍 ${date} 교육 가용성:`, educationData)
        console.log(`🔍 ${date} 녹음 가용성:`, recordingData)
        
        const combinedData = {
          success: true,
          date,
          slotAvailability: educationData.slotAvailability,
          recordingSlotAvailability: recordingData.slotAvailability,
          languageRestrictions: educationData.languageRestrictions || [],
          totalApplications: (educationData.totalApplications || 0) + (recordingData.totalApplications || 0)
        }
        
        // 캐시에 저장 (로딩 상태 제거)
        setAvailabilityCache(prev => {
          const newCache = { ...prev }
          delete newCache[`${date}_loading`] // 로딩 상태 제거
          newCache[cacheKey] = combinedData
          return newCache
        })
        
        // 언어별 제한 업데이트
        const restrictions: Record<string, boolean> = {}
        combinedData.languageRestrictions.forEach((restriction: any) => {
          restrictions[restriction.language] = restriction.hasExistingApplication
        })
        setUserLanguageRestrictions(restrictions)
        
        return combinedData
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
  const getCurrentApplicants = useCallback((date: string, slot: number, language: string, educationType: string, category?: string) => {
    // availability-simple API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]
    if (availabilityData?.slotAvailability) {
      const normalizedType = educationType === 'small-group' ? 'small' : educationType
      
      // 🔧 [FIX] 카테고리별 분리 처리
      let matchingSlots = availabilityData.slotAvailability.filter((s: any) => 
        s.slot === slot && s.language === language && s.educationType === normalizedType
      )
      
      // 한/영 소규모의 경우 카테고리별로 분리
      if (language === 'korean-english' && normalizedType === 'small' && category) {
        matchingSlots = matchingSlots.filter((s: any) => s.category === category)
      }
      
      if (matchingSlots.length > 0) {
        const totalCount = matchingSlots.reduce((sum: number, slot: any) => sum + (slot.currentCount || 0), 0)
        
        if (process.env.NODE_ENV === 'development') {
          const categoryInfo = category ? `-${category}` : ''
          console.log(`👥 [데스크톱] ${language}-${normalizedType}${categoryInfo} 차수${slot}: ${totalCount}명 (카테고리별: ${matchingSlots.map((s: any) => `${s.category}:${s.currentCount}`).join(', ')})`)
        }
        
        return totalCount
      }
    }

    // API 데이터가 없으면 0 반환 (fallback)
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [데스크톱 교육] API 데이터 없음:', { date, slot, language, educationType, category })
    }
    return 0
  }, [availabilityCache])

  const isRecordingSlotAvailable = useCallback((date: string, slot: number, language: string) => {
    // 신청 기한 체크 - 기한이 지나면 무조건 비활성화
    if (isApplicationDeadlinePassed(date)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [데스크톱 녹음] 신청 기한 경과로 비활성화:', { date, slot, language })
      }
      return false
    }

    // 새로운 recording-availability API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]
    if (availabilityData?.recordingSlotAvailability) {
      const slotInfo = availabilityData.recordingSlotAvailability.find((s: any) => s.slot === slot)

      if (slotInfo) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [데스크톱 녹음] API 기반 가용성:', { date, slot, available: slotInfo.available })
        }

        // 사용자가 이미 해당 날짜에 녹음 신청했는지 확인
        if (availabilityData.recordingHasExistingApplication) {
          if (process.env.NODE_ENV === 'development') {
            console.log('❌ [데스크톱 녹음] 사용자가 이미 해당 날짜에 녹음 신청함')
          }
          return false
        }

        return slotInfo.available
      }
    }

    // API 데이터가 없으면 기본적으로 활성화 (fallback)
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [데스크톱 녹음] API 데이터 없음, 기본 활성화:', { date, slot, language })
    }
    return true
  }, [availabilityCache])

  const getRecordingCurrentApplicants = useCallback((date: string, slot: number) => {
    // recording-availability API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]
    if (availabilityData?.recordingSlotAvailability) {
      const slotInfo = availabilityData.recordingSlotAvailability.find((s: any) => s.slot === slot)

      if (slotInfo) {
        // 디버그 로그는 한 번만 출력 (중복 방지)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [데스크톱 녹음] API 기반 신청자 수:', { date, slot, currentCount: slotInfo.currentCount })
        }
        return slotInfo.currentCount
      }
    }

    // API 데이터가 없으면 0 반환 (fallback)
    // 디버그 로그는 한 번만 출력 (중복 방지)
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [데스크톱 녹음] API 데이터 없음:', { date, slot })
    }
    return 0
  }, [availabilityCache])

  const isSlotAvailable = useCallback((date: string, slot: number, language: string, educationType: string) => {
    // 신청 기한 체크 - 기한이 지나면 무조건 비활성화
    if (isApplicationDeadlinePassed(date)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [데스크톱 교육] 신청 기한 경과로 비활성화:', { date, slot, language, educationType })
      }
      return false
    }

    // availability-simple API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]

    if (availabilityData?.slotAvailability) {
      const normalizedType = educationType === 'small-group' ? 'small' : educationType
      
      // 해당 언어/타입/차수의 모든 카테고리 가용성 확인
      const matchingSlots = availabilityData.slotAvailability.filter((s: any) => 
        s.slot === slot && s.language === language && (s.educationType === normalizedType || s.educationType === educationType)
      )
      
      if (matchingSlots.length > 0) {
        // 하나라도 가용하면 신청 가능
        const hasAvailable = matchingSlots.some((s: any) => s.available)
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [데스크톱] ${language}-${normalizedType} 차수${slot} 가용성: ${hasAvailable} (카테고리별: ${matchingSlots.map((s: any) => `${s.category}:${s.available}`).join(', ')})`)
        }
        
        return hasAvailable
      }
    }

    // API 데이터가 없으면 기본적으로 활성화 (fallback)
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [데스크톱 교육] API 데이터 없음, 기본 활성화:', { date, slot, language, educationType })
    }
    return true
  }, [availabilityCache])

  const handleCancelRequest = async (recordId: string) => {
    if (!confirm('정말 취소하시겠습니까?')) return
    
    try {
      // Database 우선 시도: /api/requests/database DELETE
      console.log('🗑️ [취소] Database DELETE 시도:', recordId)
      
      let res = await fetch(`/api/requests/database?id=${recordId}&employeeId=${userInfo.employeeId || 'TEMP001'}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      let data = await res.json()
      
      // Database에서 실패하면 Dropbox fallback
      if (!res.ok || !data.success) {
        console.log('🔄 [취소] Database 실패, Dropbox로 fallback:', data.error)
        
        res = await fetch('/api/requests/cancel-dropbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId,
            employeeId: userInfo.employeeId || 'TEMP001',
            email: authenticatedUser?.email
          })
        })
        data = await res.json()
      }
      
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
        // 취소 기간 만료 시 안내 팝업 표시
        if (data.error === '기간만료' || data.contactRequired) {
          const scheduleDate = new Date(data.scheduleDate || '').toLocaleDateString('ko-KR')
          const deadline = new Date(data.deadline || '').toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          alert(`취소 기간이 만료되었습니다.

📅 교육/녹음 날짜: ${scheduleDate}
⏰ 취소 가능 기한: ${deadline}까지

🏢 취소를 원하시면 담당자에게 연락하여 취소 사유를 말씀해 주세요.

⚠️ 합당하지 않은 사유로 취소할 경우, 다음 달의 녹음/교육 신청이 제한될 수 있습니다.`)
        } else {
          alert(`취소 실패: ${data.error}`)
        }
      }
    } catch (error) {
      console.error('취소 실패:', error)
      alert('취소 처리 중 오류가 발생했습니다.')
    }
  }

  // 간결한 안내사항 생성 함수들 (모바일과 통일)
  const getEducationGuidance = (type: any): string => {
    if (type.mode === '1:1') {
      return `💻 온라인 교육 준비사항
• 장비: 태블릿/휴대폰/노트북 중 택 1
• 이어폰 (마이크 기능 포함) 필수
• Google Meet 앱 미리 설치

📝 참여 방법
• 교육 5분 전 '교육 체크인' 클릭
• 체크인 버튼 클릭 후 Google Meet 입장
• 교관에게 학습 희망 부분 요청

❓ 문의: 객실기내방송(selufst_annc@jinair.com)`
    } else if (type.mode === 'small') {
      return `🏫 소규모 교육 안내
• 교육 10분 전까지 지정 교실 입실
• 교관에게 학습 희망 부분 요청

❓ 문의: 객실기내방송(selufst_annc@jinair.com)`
    }
    return ''
  }

  const getRecordingGuidance = (): string => {
    return `⏰ 신청 취소
• 녹음일 기준 2일 전 14:00까지 가능

📍 녹음 당일
• ID 카드 지참하여 10분 전 Show Up
• JRF: 비행 준하는 용모 복장

📧 미참석 시 연락처: 객실기내방송(selufst_annc@jinair.com)`
  }

  const handleApplyEducation = async (date: string, slot: number, type: any) => {
    if (!authenticatedUser) {
      alert("로그인이 필요합니다.")
      return
    }
    
    // 신청 기한 체크
    if (isApplicationDeadlinePassed(date)) {
      const scheduleDate = new Date(date).toLocaleDateString('ko-KR')
      const twoDaysBefore = new Date(date)
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
      twoDaysBefore.setHours(14, 0, 0, 0)
      const deadline = twoDaysBefore.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      alert(`신청 기간이 만료되었습니다.

📅 교육 날짜: ${scheduleDate}
⏰ 신청 가능 기한: ${deadline}까지

신청은 교육일 기준 2일 전 오후 2시까지만 가능합니다.`)
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
      employeeId: userInfo.employeeId || 'TEMP001',
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      department: userInfo.department || '' || '승무원',
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
    
    console.log('📝 [Database] 교육 신청 데이터:', requestData)
    
    const res = await fetch("/api/requests/database",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(requestData)
    })
    const json = await res.json()
    console.log('📝 [Database] 서버 응답:', json)
    if(json.success) {
      const guidance = getEducationGuidance(type)
      console.log('🎉 [교육 신청 성공] alert() 호출 직전')
      alert(`🎉 교육 신청 완료!

교육 신청이 성공적으로 완료되었습니다!

${guidance}`)
      console.log('🎉 [교육 신청 성공] alert() 호출 완료')
      // 신청 내역 즉시 새로고침 및 즉시 UI 반영(낙관적 업데이트)
      loadMyRequests()
      setAvailabilityCache(prev => {
        const prevEntry = prev[date] || {}
        const prevSlots = prevEntry.recordingSlotAvailability || []
        const updatedSlots = prevSlots.map((s: any) => s.slot === slot ? {
          ...s,
          currentCount: (s.currentCount || 0) + 1,
          available: ((s.currentCount || 0) + 1) < 8
        } : s)
        return { ...prev, [date]: { ...prevEntry, recordingSlotAvailability: updatedSlots } }
      })
      // 서버 데이터로 재동기화 (강제)
      await checkAvailability(date, true)
      // 월 단위 가용성도 갱신하여 캘린더 전체 동기화
      if (data?.days && Array.isArray(data.days)) {
        await preloadMonthAvailability(data.days)
      }
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


  const handleApplyRecording = async (date: string, slot: number, lang: "korean-english"|"japanese"|"chinese" | "language-select") => {
    if (!authenticatedUser) {
      alert("로그인이 필요합니다.")
      return
    }

    // 언어 선택이 필요한 경우
    if (lang === 'language-select') {
      setSelectedRecordingSlot({ date, slot })
      setShowLanguageSelection(true)
      return
    }

    // 신청 기한 체크
    if (isApplicationDeadlinePassed(date)) {
      const scheduleDate = new Date(date).toLocaleDateString('ko-KR')
      const twoDaysBefore = new Date(date)
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
      twoDaysBefore.setHours(14, 0, 0, 0)
      const deadline = twoDaysBefore.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      alert(`신청 기간이 만료되었습니다.

📅 녹음 날짜: ${scheduleDate}
⏰ 신청 가능 기한: ${deadline}까지

신청은 녹음일 기준 2일 전 오후 2시까지만 가능합니다.`)
      return
    }
    
    console.log('👤 authenticatedUser 전체:', authenticatedUser)
    
    const requestData = { 
      employeeId: userInfo.employeeId || 'TEMP001',
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      department: userInfo.department || '' || '승무원',
      type: 'recording',
      date, 
      slot, 
      details: {
        recordingLanguage: lang
      }
    }
    
    console.log('📝 [Database] 녹음 신청 데이터:', requestData)
    
    const res = await fetch("/api/requests/database",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(requestData)
    })
    const json = await res.json()
    console.log('📝 [Database] 서버 응답:', json)
    if(json.success) {
      const guidance = getRecordingGuidance()
      console.log('🎉 [녹음 신청 성공] alert() 호출 직전')
      alert(`🎉 녹음 신청 완료!

녹음 신청이 성공적으로 완료되었습니다!

${guidance}`)
      console.log('🎉 [녹음 신청 성공] alert() 호출 완료')

      // 신청 내역 즉시 새로고침
      loadMyRequests()

      // 해당 날짜 가용성 강제 갱신 (캐시 무시)
      await checkAvailability(date, true)

      // 전체 캘린더 리프레시
      await refreshScheduleData()

      // 모달 닫기
      setShowLanguageSelection(false)
      setSelectedRecordingSlot(null)
      setSelectedDate(null)
    } else {
      // 신청 기간 만료나 기타 오류 처리
      if (json.error === '신청기간만료') {
        const scheduleDate = new Date(json.scheduleDate || date).toLocaleDateString('ko-KR')
        const deadline = new Date(json.deadline || '').toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        
        alert(`신청 기간이 만료되었습니다.

📅 녹음 날짜: ${scheduleDate}
⏰ 신청 가능 기한: ${deadline}까지

신청은 녹음일 기준 2일 전 오후 2시까지만 가능합니다.`)
      } else {
        alert(`신청 실패: ${json.error}`)
      }
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

  function getLanguageColor(language: string): string {
    const colorMap: { [key: string]: string } = {
      "korean-english": "bg-blue-600 hover:bg-blue-700",
      "japanese": "bg-purple-600 hover:bg-purple-700", 
      "chinese": "bg-red-600 hover:bg-red-700"
    }
    return colorMap[language] || "bg-gray-600 hover:bg-gray-700"
  }

  function getSlotTimeInfo(type: string, slot: number, educationMode?: string): string {
    if (type === 'recording') {
      // 녹음용 시간표 - 데스크톱 녹음 캘린더와 완전히 동일
      const times: Record<number, string> = {
        1: "08:30-09:20",
        2: "09:30-10:20", 
        3: "10:30-11:20",
        4: "11:30-12:20",
        5: "13:40-14:30",
        6: "14:40-15:30",
        7: "15:40-16:30",
        8: "16:40-17:30"
      }
      return times[slot] || ""
    } else if (type === 'education') {
      if (educationMode === '1:1') {
        // 1:1 교육용 시간표 (25분 단위, 총 16차수)
        const times: Record<number, string> = {
          // 오전 세션 (1-8차수)
          1: "08:30-08:55",
          2: "09:00-09:25",
          3: "09:30-09:55",
          4: "10:00-10:25",
          5: "10:30-10:55",
          6: "11:00-11:25",
          7: "11:30-11:55",
          8: "12:00-12:25",
          // 오후 세션 (9-16차수, 13:35부터 시작)
          9: "13:35-14:00",
          10: "14:05-14:30",
          11: "14:35-15:00",
          12: "15:05-15:30",
          13: "15:35-16:00",
          14: "16:05-16:30",
          15: "16:35-17:00",
          16: "17:05-17:30"
        }
        return times[slot] || ""
      } else {
        // 소규모 교육용 시간표 (2시간 단위)
        const times: Record<number, string> = {
          1: "08:30-10:20",
          2: "10:30-12:20", 
          3: "13:40-15:30",
          4: "15:40-17:30"
        }
        return times[slot] || ""
      }
    }
    return ""
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
                  <div className="bg-gradient-to-b from-white to-gray-50/50 -m-8 mb-0 p-6 border-b border-gray-100">
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
                  {syncedMonthsLoading ? (
                    <SelectItem value="loading" disabled>
                      로딩 중...
                    </SelectItem>
                  ) : syncedMonths.length === 0 ? (
                    <SelectItem value="no-data" disabled>
                      동기화된 월이 없습니다
                    </SelectItem>
                  ) : (
                    syncedMonths.map(ym => {
                      const date = new Date(ym + '-01')
                      const label = date.toLocaleDateString("ko-KR", {year:"numeric", month:"long"})
                    return <SelectItem key={ym} value={ym}>{label}</SelectItem>
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {(loading || syncedMonthsLoading) && (
            <div className="flex items-center justify-center py-16">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-center">
                  {syncedMonthsLoading ? '동기화된 월 확인 중...' : '스케줄을 불러오는 중...'}
                </p>
              </div>
            </div>
          )}
          
          {!loading && !syncedMonthsLoading && syncedMonths.length === 0 && (
            <div className="max-w-2xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-gray-200/60">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">동기화된 스케줄이 없습니다</h3>
                  <p className="text-gray-600">관리자가 스프레드시트에서 스케줄을 동기화해야 합니다.</p>
                </CardContent>
              </Card>
            </div>
          )}
          
          {!loading && !syncedMonthsLoading && (!data || dayCards.length === 0) && syncedMonths.length > 0 && (
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMyRequestsFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${myRequestsFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      전체
                    </button>
                    <button
                      onClick={() => setMyRequestsFilter('recording')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${myRequestsFilter === 'recording' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      녹음
                    </button>
                    <button
                      onClick={() => setMyRequestsFilter('education')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${myRequestsFilter === 'education' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      교육
                    </button>
                  </div>

                  {filteredMyRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">해당 필터의 신청 내역이 없습니다.</div>
                  ) : filteredMyRequests.map((request) => {
                    const canCancel = () => {
                      if (request.status !== 'ACTIVE') return false
                      
                      // 취소 가능 시간: 해당 날짜 기준  오후 2시까지
                      const scheduleDate = new Date(request.date)
                      const twoDaysBefore = new Date(scheduleDate)
                      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
                      twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
                      
                      const now = new Date()
                      
                      return now <= twoDaysBefore
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
                              {request.date} - {request.slot}차수 ({getSlotTimeInfo(request.type, request.slot, request.details?.mode)})
                            </h3>
                            
                            <div className="text-gray-600 mb-2">
                              {getRequestDetailLabel(request, classroomInfoMap)}
                            </div>
                            
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
                            {/* Google Meet 링크 버튼 (1:1 교육, 24시간 전부터 표시) */}
                            {request.type === 'education' && 
                             request.details?.mode === '1:1' && 
                             request.details?.googleMeetLink && 
                             request.status === 'ACTIVE' && (() => {
                               const timeInfo = getSlotTimeInfo(request.type, request.slot, request.details?.mode)
                               const startTime = timeInfo.split('-')[0]
                               const classDateTime = new Date(`${request.date}T${startTime}:00+09:00`)
                               const now = new Date()
                               const hoursDiff = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                               
                               // 🔥 [DEBUG] Meet 버튼 조건 디버깅
                               console.log(`🔍 [MEET DEBUG] ${request.details?.googleMeetLink ? '링크 있음' : '링크 없음'}`)
                               console.log(`🔍 [MEET DEBUG] 교육 날짜: ${request.date}, 시간: ${startTime}`)
                               console.log(`🔍 [MEET DEBUG] classDateTime: ${classDateTime.toISOString()}`)
                               console.log(`🔍 [MEET DEBUG] now: ${now.toISOString()}`)
                               console.log(`🔍 [MEET DEBUG] hoursDiff: ${hoursDiff.toFixed(2)}시간`)
                               console.log(`🔍 [MEET DEBUG] 24시간 조건: ${hoursDiff <= 24} && ${hoursDiff >= -1} = ${hoursDiff <= 24 && hoursDiff >= -1}`)
                               
                               // 🚨 테스트용: 조건 완화 (모든 1:1 교육에 Meet 버튼 표시)
                               return true // 임시로 항상 표시
                               // return hoursDiff <= 24 && hoursDiff >= -1 // 원래 조건
                             })() && (
                              <Button
                                onClick={() => window.open(request.details.googleMeetLink, '_blank')}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-7 mb-1"
                              >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M15 12h2c0-1.1.9-2 2-2V8c0-1.1-.9-2-2-2h-2v6zM9 12V6H7c-1.1 0-2 .9-2 2v2c1.1 0 2 .9 2 2z"/>
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                </svg>
                                Google Meet 참가
                              </Button>
                            )}
                            
                            {(() => {
                              // getSlotTimeInfo 함수를 사용하여 정확한 시간 정보 가져오기
                              const timeInfo = getSlotTimeInfo(request.type, request.slot, request.details?.mode)
                              const startTime = timeInfo.split('-')[0] // "08:30-09:30"에서 "08:30" 추출
                              const classDateTime = new Date(`${request.date}T${startTime}:00+09:00`)
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
                                      취소 불가 (2일 전 14:00 이후)
                                    </div>
                                    <button
                                      onClick={() => alert('교육/녹음일 기준 2일 전 오후 2시까지만 취소할 수 있습니다.\n취소가 필요한 경우 담당자에게 연락해주세요.')}
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

      {/* 언어 선택 팝업 */}
      {showLanguageSelection && selectedRecordingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              녹음 언어 선택
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="text-center text-gray-600 mb-4">
                📅 {selectedRecordingSlot.date} • {selectedRecordingSlot.slot}차수
              </div>
              
              {["korean-english", "japanese", "chinese"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    handleApplyRecording(selectedRecordingSlot.date, selectedRecordingSlot.slot, lang as any)
                  }}
                  className={`w-full px-6 py-4 rounded-lg font-medium transition-colors text-white ${getLanguageColor(lang)}`}
                >
                  {lang === 'korean-english' ? '한국어/영어' : lang === 'japanese' ? '일본어' : '중국어'} 선택
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                setShowLanguageSelection(false)
                setSelectedRecordingSlot(null)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// 캘린더 뷰 컴포넌트
function RequestCalendar(props: {
  year: number
  monthIndex: number
  dayCards: any[]
  tab: string
  onApplyRecording: (date: string, slot: number, lang: any) => void
  onApplyEducation: (date: string, slot: number, type: any) => void
  renderEduLabel: (type: any) => string
  isSlotAvailable: (date: string, slot: number, language: string, educationType: string) => boolean
  isRecordingSlotAvailable: (date: string, slot: number, language: string) => boolean
  getCurrentApplicants: (date: string, slot: number, language: string, educationType: string, category?: string) => number
  getRecordingCurrentApplicants: (date: string, slot: number) => number
  availabilityCache: Record<string, any>
  userLanguageRestrictions: Record<string, boolean>
  onDateSelect: (date: string | null) => void
}) {
  const { 
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
  } = props
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // selectedDate가 변경될 때 부모에게 알림
  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date)
    onDateSelect(date)
  }

  const handleRecordingApplication = (date: string, slot: number) => {
    // 임시로 첫 번째 언어로 호출하고, 실제로는 부모에서 언어 선택 처리
    onApplyRecording(date, slot, 'language-select')
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
    <>
      <div className="w-full max-w-7xl mx-auto">
      {/* 헤더 - 모바일 최적화 */}
      <div className={`${
        tab === 'education' 
          ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700' 
          : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600'
      } rounded-3xl shadow-2xl overflow-hidden mb-6`}>
        <div className="px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                {tab === 'education' ? (
                  <GraduationCap className="w-7 h-7 md:w-8 md:h-8 text-white" />
                ) : (
                  <Mic className="w-7 h-7 md:w-8 md:h-8 text-white" />
                )}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {year}년 {monthIndex + 1}월
                </h1>
                <p className="text-white/80 text-sm md:text-base font-medium">
                  {tab === 'education' ? '교육' : '녹음'} 신청 캘린더
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 요일 헤더 - 향상된 디자인 */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3 px-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div 
              key={day} 
            className={`
              text-center font-bold text-xs md:text-sm py-3 md:py-4 rounded-xl
              ${idx === 0 ? 'text-red-500 bg-red-50' : 
                idx === 6 ? 'text-blue-500 bg-blue-50' : 
                'text-gray-700 bg-gray-50'}
              transition-all duration-200 hover:scale-105
            `}
            >
              {day}
            </div>
          ))}
        </div>
        
      {/* 캘린더 그리드 - 완전히 새로운 디자인 */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 px-2">
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
                  group relative min-h-[140px] md:min-h-[160px] rounded-2xl transition-all duration-300 ease-out
                  ${isCurrentMonthDay ? 
                    'bg-white shadow-sm hover:shadow-xl border border-gray-100' : 
                    'bg-gray-50/50 border border-gray-100/50 opacity-60'}
                  ${isTodayDay ? 'ring-2 ring-blue-500 ring-opacity-30 shadow-lg' : ''}
                  ${hasData ? 'hover:scale-[1.02] cursor-pointer transform-gpu' : ''}
                  overflow-hidden backdrop-blur-sm
                `}
                onClick={() => hasData ? handleDateSelect(formatDateKey(date)) : null}
              >
                {/* 상단 오버레이 그라데이션 (오늘인 경우) */}
                {isTodayDay && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
                )}
                
                {/* 날짜 헤더 - 완전히 새로운 디자인 */}
                <div className="flex items-center justify-between p-3 md:p-4">
                  <div className={`
                    flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-bold text-sm md:text-base
                    ${!isCurrentMonthDay ? 'text-gray-400 bg-gray-100' : 
                      isTodayDay ? 'text-white bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg' : 
                      date.getDay() === 0 ? 'text-red-600 bg-red-50' : 
                      date.getDay() === 6 ? 'text-blue-600 bg-blue-50' : 
                      'text-gray-800 bg-gray-50 group-hover:bg-gray-100'}
                    transition-all duration-200
                  `}>
                    {date.getDate()}
                  </div>
                  
                  {dayData?.resultAnnouncement && tab === 'recording' && (
                    <div className="px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md animate-pulse">
                      결과 공지
                    </div>
                  )}
                </div>
                
                {/* 일정 미리보기 - 완전히 새로운 디자인 */}
                {isCurrentMonthDay && dayData && (
                  <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-2">
                    {tab === 'recording' && dayData.recording?.slots?.length > 0 && (
                      <div className="space-y-2">
                         {/* 간결한 녹음 시간표 - 통일된 블루 테마 */}
                         <div className="space-y-1">
                           {dayData.recording.slots.map((slot: number) => {
                             const currentApplicants = getRecordingCurrentApplicants(formatDateKey(date), slot)
                             const slotTime = getRecordingSlotTime(slot)
                             const isFull = currentApplicants >= 8
                             
                             return (
                               <button
                                 key={`rec-${formatDateKey(date)}-${slot}`}
                                 onClick={() => handleRecordingApplication(formatDateKey(date), slot)}
                                 disabled={isFull}
                                 className={`w-full p-2 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                                   isFull 
                                     ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
                                     : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                                 }`}
                               >
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                     <span className={`text-sm font-bold ${isFull ? 'text-gray-500' : 'text-blue-700'}`}>
                                       {slot}차수
                                     </span>
                                     <span className={`text-xs ${isFull ? 'text-gray-400' : 'text-gray-600'}`}>
                                       {slotTime}
                                     </span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <span className={`text-xs font-medium ${
                                       isFull ? 'text-red-600' : 'text-blue-600'
                                     }`}>
                                       {isFull ? '마감' : `${currentApplicants}/8`}
                                     </span>
                                     <Mic className={`w-3 h-3 ${isFull ? 'text-gray-400' : 'text-blue-500'}`} />
                                   </div>
                                 </div>
                               </button>
                             )
                           })}
                         </div>
                      </div>
                    )}
                    
                    {tab === 'education' && dayData.education?.length > 0 && (
                      <div className="space-y-2">
                        
                        {dayData.education.slice(0, 2).map((edu: any, idx: number) => {
                          // 가용성 데이터가 변경될 때마다 실시간으로 재계산 (forceUpdate로 리렌더링 트리거)
                          const convertedSlots = convertToEducationSlots(edu.slots, edu.type, formatDateKey(date), isSlotAvailable)
                          // forceUpdate를 사용하여 의존성 추가 (실제로는 사용하지 않지만 리렌더링을 위해)
                          const _ = forceUpdate
                          
                          const getLanguageConfig = (lang: string) => {
                            switch(lang) {
                              case 'korean-english': 
                                return {
                                  gradient: 'from-indigo-50 via-blue-50 to-purple-50',
                                  border: 'border-indigo-200/60',
                                  text: 'text-indigo-900',
                                  dot: 'from-indigo-400 to-blue-600',
                                  badge: 'bg-indigo-100 text-indigo-800'
                                }
                              case 'japanese': 
                                return {
                                  gradient: 'from-green-50 via-emerald-50 to-teal-50',
                                  border: 'border-green-200/60',
                                  text: 'text-green-900',
                                  dot: 'from-green-400 to-emerald-600',
                                  badge: 'bg-green-100 text-green-800'
                                }
                              case 'chinese': 
                                return {
                                  gradient: 'from-purple-50 via-violet-50 to-fuchsia-50',
                                  border: 'border-purple-200/60',
                                  text: 'text-purple-900',
                                  dot: 'from-purple-400 to-violet-600',
                                  badge: 'bg-purple-100 text-purple-800'
                                }
                              default: 
                                return {
                                  gradient: 'from-gray-50 to-gray-100',
                                  border: 'border-gray-200/60',
                                  text: 'text-gray-900',
                                  dot: 'from-gray-400 to-gray-600',
                                  badge: 'bg-gray-100 text-gray-800'
                                }
                            }
                          }
                          
                          const config = getLanguageConfig(edu.type.lang)
                          
                          return (
                            <div key={`edu-${formatDateKey(date)}-${idx}`} className="group/edu">
                              <div className={`p-3 bg-gradient-to-br ${config.gradient} rounded-xl border ${config.border} hover:shadow-md transition-all duration-200 hover:scale-[1.02]`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-xs font-bold ${config.text}`}>
                                    {edu.type.lang === 'korean-english' ? '한/영' : 
                                     edu.type.lang === 'japanese' ? '일본어' : 
                                     edu.type.lang === 'chinese' ? '중국어' : '기타'}
                                    {edu.type.mode === '1:1' ? ' (온라인)' : 
                                     edu.type.lang === 'korean-english' && edu.type.mode === 'small' ? ` (${edu.type.category || '신규'})` : ''}
                                  </span>
                                  <div className={`px-2 py-0.5 ${config.badge} rounded-full text-xs font-medium`}>
                                    {edu.type.mode === '1:1' ? '1:1' : '소규모'}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 mb-2">
                                  <span className="text-xs text-gray-600 font-medium">차수:</span>
                                  <div className="flex gap-1">
                                    {convertedSlots.slice(0, 8).map((slot: number) => (
                                    <div
                                      key={slot}
                                        className={`w-2 h-2 bg-gradient-to-br ${config.dot} rounded-full shadow-sm`}
                                        title={`${slot}차수`}
                                    ></div>
                                  ))}
                                    {convertedSlots.length > 8 && (
                                      <span className="text-xs text-gray-500 font-medium">+{convertedSlots.length - 8}</span>
                                    )}
                                </div>
                                </div>
                                
                                {convertedSlots.length > 0 && (
                                  <div className="text-xs text-gray-600">
                                    {edu.type.mode === '1:1' ? 
                                      getOneOnOneSlotTime(convertedSlots[0]) :
                                      getSmallGroupSlotTime(convertedSlots[0])
                                    }
                                    {convertedSlots.length > 1 && (
                                      <span className="text-gray-500"> 외 {convertedSlots.length - 1}개</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {dayData.education.length > 2 && (
                          <div className="text-center">
                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full hover:bg-indigo-200 transition-colors cursor-pointer">
                              <span>+{dayData.education.length - 2}개 교육</span>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                            </div>
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
        
        {/* 현대적인 범례 */}
                 <div className="mt-8 px-2">
           <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h4 className="text-base font-bold text-gray-800">범례</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-blue-900">한/영</span>
            </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-green-900">일본어</span>
            </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div className="w-4 h-4 bg-gradient-to-br from-purple-400 to-violet-600 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-purple-900">중국어</span>
            </div>
              {tab === 'recording' && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-4 h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-sm animate-pulse"></div>
                  <span className="text-sm font-medium text-amber-900">결과 공지</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg ring-2 ring-blue-500 ring-opacity-30"></div>
                <span className="text-sm font-medium text-gray-900">오늘</span>
            </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-4 h-4 bg-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"></div>
                <span className="text-sm font-medium text-gray-900">상세보기</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 상세 일정 모달 */}
      {selectedDate && selectedDayData && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => handleDateSelect(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-gray-200 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 - 더 매력적인 그라데이션 */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white p-6 md:p-8 relative overflow-hidden">
              {/* 배경 패턴 */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-4 left-4 w-24 h-24 bg-white rounded-full blur-2xl"></div>
              </div>
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                <div>
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                        {new Date(selectedDate!).toLocaleDateString("ko-KR", {
                      month: "long", 
                          day: "numeric"
                    })}
                  </h3>
                      <p className="text-white/80 text-sm md:text-base">
                        {new Date(selectedDate!).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          weekday: "long"
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm font-medium">
                    {tab === 'education' ? '교육' : '녹음'} 상세 일정 및 신청
                  </p>
                </div>
                <button
                  onClick={() => handleDateSelect(null)}
                  className="p-3 hover:bg-white/20 rounded-2xl transition-all duration-200 hover:scale-110 group"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* 모달 내용 - 현대적 디자인 */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] space-y-6">

              {tab === 'recording' && selectedDayData.recording?.slots?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-blue-600" />
                    녹음 가능 차수
                  </h4>
                   {/* 간결한 모달 녹음 시간표 - 통일된 블루 테마 */}
                   <div className="space-y-3">
                     {selectedDayData.recording.slots.map((slot: number) => {
                       const currentApplicants = getRecordingCurrentApplicants(selectedDate!, slot)
                       const slotTime = getRecordingSlotTime(slot)
                       const isFull = currentApplicants >= 8
                       const canApply = !isFull && !userLanguageRestrictions.recording
                       
                       return (
                         <div key={`modal-rec-${slot}`} className={`p-4 rounded-lg border transition-all duration-200 ${
                           isFull ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                         }`}>
                           <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-4">
                               <span className={`text-lg font-bold ${isFull ? 'text-gray-500' : 'text-blue-700'}`}>
                                 {slot}차수
                               </span>
                               <span className={`text-sm ${isFull ? 'text-gray-400' : 'text-gray-600'}`}>
                                 {slotTime}
                               </span>
                             </div>
                             <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                               isFull 
                                 ? 'bg-red-100 text-red-700' 
                                 : 'bg-blue-100 text-blue-700'
                             }`}>
                               {isFull ? '마감' : `${currentApplicants}/8명`}
                             </span>
                           </div>
                           
                           <button
                             onClick={() => {
                               if (canApply) {
                                 handleRecordingApplication(selectedDate!, slot)
                               }
                             }}
                             disabled={!canApply}
                             className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                               canApply
                                 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                                 : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                             }`}
                           >
                             <div className="flex items-center justify-center gap-2">
                               <Mic className="w-4 h-4" />
                               <span>
                                 {isFull ? '신청 마감' : 
                                  userLanguageRestrictions.recording ? '신청 제한' : 
                                  '녹음 신청하기'}
                               </span>
                             </div>
                           </button>
                           
                           {userLanguageRestrictions.recording && (
                             <div className="mt-2 text-center py-2 bg-yellow-50 rounded-lg border border-yellow-200">
                               <div className="text-xs font-medium text-yellow-700">
                                 ⚠️ 이미 이번 달에 녹음 신청하셨습니다
                               </div>
                             </div>
                           )}
                         </div>
                       )
                     })}
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
                    {selectedDayData.education
                      .sort((a: any, b: any) => {
                        // 1. 언어별 우선순위: 한/영 → 일본어 → 중국어
                        const langPriority = {
                          'korean-english': 1,
                          'japanese': 2,
                          'chinese': 3
                        };
                        const langA = langPriority[a.type.lang as keyof typeof langPriority] || 4;
                        const langB = langPriority[b.type.lang as keyof typeof langPriority] || 4;
                        
                        if (langA !== langB) {
                          console.log(`📋 [데스크톱 정렬] 언어 우선순위: ${a.type.lang}(${langA}) vs ${b.type.lang}(${langB})`);
                          return langA - langB;
                        }
                        
                        // 2. 같은 언어 내에서는 첫 번째 차수 기준으로 시간순 정렬
                        const firstSlotA = Math.min(...a.slots);
                        const firstSlotB = Math.min(...b.slots);
                        console.log(`⏰ [데스크톱 정렬] ${a.type.lang} 시간순: 차수${firstSlotA} vs 차수${firstSlotB}`);
                        return firstSlotA - firstSlotB;
                      })
                      .map((edu: any, idx: number) => {
                      // 가용성 데이터가 변경될 때마다 실시간으로 재계산 (forceUpdate로 리렌더링 트리거)
                      const convertedSlots = convertToEducationSlots(edu.slots, edu.type, selectedDate!, isSlotAvailable)
                      // forceUpdate를 사용하여 의존성 추가 (실제로는 사용하지 않지만 리렌더링을 위해)
                      const _ = forceUpdate
                      return (
                        <div key={`modal-edu-${idx}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                          <div className="mb-4">
                            {/* 통일된 헤더 디자인 */}
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {/* 언어 배지 - 통일된 크기와 스타일 */}
                                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    edu.type.lang === 'korean-english' ? 'bg-blue-500 text-white' :
                                    edu.type.lang === 'japanese' ? 'bg-green-500 text-white' :
                                    edu.type.lang === 'chinese' ? 'bg-purple-500 text-white' :
                                    'bg-gray-500 text-white'
                              }`}>
                                {edu.type.lang === 'korean-english' ? '한/영' : 
                                 edu.type.lang === 'japanese' ? '일본어' : 
                                 edu.type.lang === 'chinese' ? '중국어' : '기타'}
                                  </div>
                                  
                                  {/* 모드 배지 - 통일된 크기와 스타일 */}
                                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    edu.type.mode === '1:1' ? 'bg-indigo-500 text-white' :
                                    'bg-orange-500 text-white'
                                  }`}>
                                    {edu.type.mode === '1:1' ? '💻 온라인' : '👥 소규모'}
                                  </div>
                                </div>
                                
                                {/* 학과장 정보 - 통일된 스타일 */}
                                {edu.type.mode === 'small' && ((edu as any).classroomInfo || selectedDayData.classroomInfo) && (
                                  <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full border border-amber-300">
                                    <Building className="w-3 h-3 text-amber-700" />
                                    <span className="text-sm font-semibold text-amber-800">
                                      {(edu as any).classroomInfo || selectedDayData.classroomInfo} 학과장
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* 소규모 교육 카테고리 - 별도 행으로 분리하여 깔끔하게 */}
                              {edu.type.mode === 'small' && edu.type.lang === 'korean-english' && edu.type.category && (
                                <div className="pt-2 border-t border-slate-200">
                                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                                    edu.type.category === '신규' ? 'bg-emerald-500 text-white' :
                                    edu.type.category === '재자격' ? 'bg-amber-500 text-white' :
                                    edu.type.category === '공통' ? 'bg-slate-500 text-white' :
                                    edu.type.category === 'PUS' ? 'bg-violet-500 text-white' :
                                    'bg-gray-500 text-white'
                                  }`}>
                                    {edu.type.category === '신규' ? '✨' :
                                     edu.type.category === '재자격' ? '🔄' :
                                     edu.type.category === '공통' ? '👥' :
                                     edu.type.category === 'PUS' ? '✈️' : '📚'}
                                    <span>{edu.type.category}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>진행 시간:</strong> {edu.type.mode === '1:1' ? '25분' : '1시간 50분'} · 총 {convertedSlots.length}개 차수</p>
                            </div>
                            {edu.type.lang === 'korean-english' && edu.type.mode === 'small' && (
                              <div className="mt-3 space-y-2">
                                <div className="text-sm font-medium text-gray-700 mb-2">📋 교육 대상 안내</div>
                                <div className={`p-2 rounded-md text-sm ${
                                  edu.type.category === '신규' ? 'bg-emerald-50 border border-emerald-200' :
                                  edu.type.category === '재자격' ? 'bg-amber-50 border border-amber-200' :
                                  (edu.type.category === '공통' || edu.type.category === 'PUS') ? 'bg-slate-50 border border-slate-200' :
                                  'bg-gray-50 border border-gray-200'
                                }`}>
                                  {edu.type.category === '신규' && (
                                    <p className="font-semibold text-emerald-800">
                                      ✨ <strong>신규:</strong> 기내방송 자격이 없는 승무원 대상
                                    </p>
                                  )}
                                  {edu.type.category === '재자격' && (
                                    <p className="font-semibold text-amber-800">
                                      🔄 <strong>재자격:</strong> 자격 갱신 또는 상위 등급이 목표인 승무원 대상
                                    </p>
                                  )}
                                  {edu.type.category === '공통' && (
                                    <p className="font-semibold text-slate-800">
                                      👥 <strong>공통:</strong> 자격 무관 (누구나 신청 가능)
                                    </p>
                                  )}
                                  {edu.type.category === 'PUS' && (
                                    <div className="space-y-1">
                                      <p className="font-semibold text-violet-800">
                                        ✈️ <strong>PUS:</strong> PUS 승무원 전용
                                      </p>
                                      <p className="text-slate-700 text-xs">
                                        💡 PUS 승무원은 자격 무관하게 신청 가능합니다
                                      </p>
                              </div>
                            )}
                          </div>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {convertedSlots.map((slot: number) => {
                              // 가용성 확인
                              const educationType = edu.type.mode === '1:1' ? '1:1' : 'small-group'
                              console.log('🔍 모달에서 isSlotAvailable 호출:', { selectedDate, slot, language: edu.type.lang, educationType })
                              const isAvailable = isSlotAvailable(selectedDate!, slot, edu.type.lang, educationType)
                              const currentApplicants = getCurrentApplicants(selectedDate!, slot, edu.type.lang, educationType, edu.type.category)
                              
                              return (
                                <button
                                  key={slot}
                                                                      onClick={() => {
                                      if (isAvailable) {
                                        // 변환된 차수로 신청하지만, 원본 슬롯 정보도 함께 전달
                                        onApplyEducation(selectedDate!, slot, edu.type)
                                        handleDateSelect(null)
                                      }
                                    }}
                                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                                    isAvailable 
                                      ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-800 hover:border-indigo-400 hover:shadow-md transform hover:scale-105'
                                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                  }`}
                                  disabled={!isAvailable}
                                >
                                  <div className="text-center">
                                    <div className="text-sm font-bold">{slot}차수</div>
                                    <div className="text-xs mt-1">
                                    {getEducationSlotTime(edu.type, slot)}
                                  </div>
                                  {edu.type.mode === 'small' && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {currentApplicants}/4명
                                    </div>
                                  )}
                                  {!isAvailable && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      신청 마감
                                    </div>
                                  )}
                                  </div>
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
    </>
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
  const [isCheckingIn, setIsCheckingIn] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userInfo.name && userInfo.employeeId && userInfo.language && userInfo.category) {
      setIsCheckingIn(true)
      
      try {
        // 녹음 체크인 확인
        const checkinResponse = await fetch('/api/recording/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employeeId: userInfo.employeeId,
            name: userInfo.name,
            language: userInfo.language,
            category: userInfo.category,
            checkinTime: new Date().toISOString()
          })
        })

        const checkinResult = await checkinResponse.json()

        if (checkinResult.success) {
          // 체크인 성공 팝업
          alert(checkinResult.message)
          onComplete(userInfo)
        } else {
          // 체크인 실패 팝업
          alert(checkinResult.message || '녹음을 응시하지 않으셨습니다. 담당자에게 문의하세요.')
          // 체크인 실패해도 녹음으로 넘어가도록 함 (사용자 요구사항에 따라)
          onComplete(userInfo)
        }
      } catch (error) {
        console.error('체크인 확인 중 오류:', error)
        alert('체크인 확인 중 오류가 발생했습니다.')
        // 오류가 발생해도 녹음으로 넘어가도록 함
        onComplete(userInfo)
      } finally {
        setIsCheckingIn(false)
      }
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
        disabled={!userInfo.name || !userInfo.employeeId || !userInfo.language || !userInfo.category || isCheckingDevice || isCheckingIn}
      >
        {isCheckingDevice ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            컴퓨터 등록 확인 중...
          </>
        ) : isCheckingIn ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            체크인 확인 중...
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
        // Database API 우선 시도 (스케줄 정보 포함)
        const res = await fetch(`/api/requests/database?employeeId=${encodeURIComponent(userInfo.employeeId)}&includeSchedule=true`, { cache: 'no-store' })
        const json = await res.json()
        
        if (json.success && json.items) {
          // 캘린더 스케줄 API에서 교실 정보 가져오기 (교육별로 세분화)
          const uniqueMonths = [...new Set(json.items.map((item: any) => item.date.slice(0, 7)))]
          const classroomInfoMap = new Map()
          
          for (const month of uniqueMonths) {
            try {
              const scheduleRes = await fetch(`/api/schedules?month=${month}`)
              if (scheduleRes.ok) {
                const scheduleData = await scheduleRes.json()
                if (scheduleData.data?.days) {
                  scheduleData.data.days.forEach((day: any) => {
                    // 교육별로 세분화된 교실 정보 매핑
                    if (day.education && Array.isArray(day.education)) {
                      day.education.forEach((edu: any) => {
                        if (edu.classroomInfo && edu.type && edu.slots) {
                          edu.slots.forEach((slot: number) => {
                            // 카테고리가 있는 경우와 없는 경우 모두 처리
                            if (edu.type.category) {
                              // 카테고리별 키 (한/영 소규모)
                              const categoryKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}_${edu.type.category}`
                              classroomInfoMap.set(categoryKey, edu.classroomInfo)
                              console.log(`✅ [MyPage] 교육별 교실 정보 추가 (카테고리): ${categoryKey} → ${edu.classroomInfo}`)
                            }
                            
                            // 기본 키 (모든 교육)
                            const baseKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}`
                            classroomInfoMap.set(baseKey, edu.classroomInfo)
                            console.log(`✅ [MyPage] 교육별 교실 정보 추가 (기본): ${baseKey} → ${edu.classroomInfo}`)
                          })
                        }
                      })
                    }
                    
                    // 호환성을 위한 날짜별 전체 교실 정보도 유지

                    if (day.classroomInfo) {
                      classroomInfoMap.set(day.date, day.classroomInfo)
                    }
                  })
                }
              }
            } catch (error) {
              console.warn(`캘린더 스케줄 로드 실패 (${month}):`, error)
            }
          }
          
          console.log('🏫 [MyPage] 캘린더에서 가져온 교실 정보:', Object.fromEntries(classroomInfoMap))
          
          // Request mode와 동일한 로직 사용 (작동하는 것으로 확인됨)
          const convertedItems = json.items.map((item: any) => ({
            type: item.type,
            date: item.date,
            slot: item.slot,
            detail: getDetailFromItem(item) // Request mode와 동일한 detail 생성 로직
          }))
          
          function getDetailFromItem(item: any) {
            if (item.type === 'recording') {
              return item.details?.recordingLanguage || 'recording'
            }
            
            // 교육 타입의 경우 details에서 정보 추출
            const language = item.details?.language || 'korean-english'
            const languageLabel = language === 'korean-english' ? '한/영' : 
                                language === 'japanese' ? '일본어' : 
                                language === 'chinese' ? '중국어' : language
            
            const mode = item.details?.mode || item.details?.educationType || '1:1'
            const modeLabel = (mode === 'small' || mode === 'small-group') ? '소규모' : '1:1'
            
            const category = item.details?.category || ''
            
            // 캘린더에서 교실 정보 가져오기 (카테고리별 우선, 기본 키, 날짜별 순서)
            let educationClassroom = ''
            
            // 1. 카테고리별 키 시도 (한/영 소규모만)
            if (category && language === 'korean-english' && (mode === 'small' || mode === 'small-group')) {
              const categoryKey = `${item.date}_${item.slot}_${language}_small_${category}`
              educationClassroom = classroomInfoMap.get(categoryKey) || ''
              console.log(`🔍 [MyPage] 카테고리 키 시도: ${categoryKey} → ${educationClassroom}`)
            }
            
            // 2. 기본 키 시도 (모든 교육)
            if (!educationClassroom) {
              const normalizedMode = (mode === 'small' || mode === 'small-group') ? 'small' : mode
              const baseKey = `${item.date}_${item.slot}_${language}_${normalizedMode}`
              educationClassroom = classroomInfoMap.get(baseKey) || ''
              console.log(`🔍 [MyPage] 기본 키 시도: ${baseKey} → ${educationClassroom}`)
            }
            
            // 3. 날짜별 키 시도 (fallback)
            if (!educationClassroom) {
              educationClassroom = classroomInfoMap.get(item.date) || ''
              console.log(`🔍 [MyPage] 날짜별 키 시도: ${item.date} → ${educationClassroom}`)
            }
            
            const classroom = educationClassroom ? (educationClassroom.includes('학과장') ? educationClassroom : `${educationClassroom} 학과장`) : ''
            const locationPart = (mode === 'small' || mode === 'small-group') && classroom ? ` · ${classroom}` : ''
            
            return `${languageLabel} ${modeLabel}${locationPart} ${category}`.trim()
          }
          setRequests(convertedItems)
        } else {
          // Database API 실패시 기존 API로 fallback
          console.log('🔄 [MyPage] Database API 실패, 기존 API로 fallback')
          const fallbackRes = await fetch(`/api/requests/list?employeeId=${encodeURIComponent(userInfo.employeeId)}`, { cache: 'no-store' })
          const fallbackJson = await fallbackRes.json()
          if (fallbackJson.success) setRequests(fallbackJson.items || [])
        }
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
                  <p className="text-gray-600">교육/녹음 신청을 확인하고 당일 기준 2일 전 오후 2시까지 취소할 수 있습니다.</p>
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

// Request mode에서 사용할 통일된 detail 표시 함수
function getRequestDetailLabel(request: any, classroomInfoMap: Map<string, string>) {
  if (request.type === 'recording') {
    return `녹음: ${langLabel(request.details?.recordingLanguage || 'recording')}`
  }
  
  // 교육 타입의 경우
  const language = request.details?.language || 'korean-english'
  const languageLabel = langLabel(language)
  
  const mode = request.details?.mode || request.details?.educationType || '1:1'
  const modeLabel = (mode === 'small' || mode === 'small-group') ? '소규모' : '1:1'
  
  const category = request.details?.category || '공통'
  
  // 교실 정보 - request.classroomInfo를 우선 사용, 없으면 classroomInfoMap에서 가져오기
  let classroom = request.classroomInfo?.trim() || ''
  
  if (!classroom) {
    // fallback: classroomInfoMap에서 가져오기
    const normalizedMode = mode === 'small' || mode === 'small-group' ? 'small' : '1:1'
    let educationClassroom = ''
    
    // 1. 카테고리별 키 시도 (한/영 소규모만)
    if (category && language === 'korean-english' && normalizedMode === 'small') {
      const categoryKey = `${request.date}_${request.slot}_${language}_${normalizedMode}_${category}`
      educationClassroom = classroomInfoMap.get(categoryKey) || ''
      console.log(`🔍 [Request mode] 카테고리 키 시도 (fallback): ${categoryKey} → ${educationClassroom}`)
    }
    
    // 2. 기본 키 시도 (모든 교육)
    if (!educationClassroom) {
      const baseKey = `${request.date}_${request.slot}_${language}_${normalizedMode}`
      educationClassroom = classroomInfoMap.get(baseKey) || ''
      console.log(`🔍 [Request mode] 기본 키 시도 (fallback): ${baseKey} → ${educationClassroom}`)
    }
    
    classroom = educationClassroom ? (educationClassroom.includes('학과장') ? educationClassroom : `${educationClassroom} 학과장`) : ''
  }
  
  const locationPart = (mode === 'small' || mode === 'small-group') && classroom ? ` · ${classroom}` : ''
  
  console.log(`🔍 [Request mode] 최종 교실 정보: request.classroomInfo=${request.classroomInfo}, classroom=${classroom}, locationPart=${locationPart}`)
  
  // 카테고리 이모지 및 라벨
  const categoryEmoji = category === '신규' ? '✨' :
                       category === '재자격' ? '🔄' :
                       category === '공통' ? '👥' :
                       category === 'PUS' ? '✈️' : '📚'
  
  const categoryPart = category ? ` ${categoryEmoji}${category}` : ''
  
  return `교육: ${languageLabel} ${modeLabel}${locationPart}${categoryPart}`.trim()
}

function CancelButton({ employeeId, item }: { employeeId: string, item: any }){
  const [busy, setBusy] = React.useState(false)
  const canCancel = React.useMemo(()=>{
    // 교육/녹음 날짜 이틀 전 오후 2시까지만 취소 가능
    const scheduleDate = new Date(item.date)
    const twoDaysBefore = new Date(scheduleDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
    twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
    
    return Date.now() <= twoDaysBefore.getTime()
  },[item])
  const onCancel = async () => {
    if (!confirm('정말로 취소하시겠습니까? 교육/녹음일 기준 2일 전 오후 2시까지만 취소할 수 있습니다.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/requests/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: item.type, date: item.date, slot: item.slot, employeeId }) })
      const json = await res.json()
      if (!json.success) {
        // 취소 기간 만료 시 안내 팝업 표시
        if (json.error === '기간만료' || json.contactRequired) {
          const scheduleDate = new Date(json.scheduleDate || item.date).toLocaleDateString('ko-KR')
          const deadline = new Date(json.deadline || '').toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          alert(`취소 기간이 만료되었습니다.

📅 교육/녹음 날짜: ${scheduleDate}
⏰ 취소 가능 기한: ${deadline}까지

🏢 취소를 원하시면 담당자에게 연락하여 취소 사유를 말씀해 주세요.

⚠️ 합당하지 않은 사유로 취소할 경우, 다음 달의 녹음/교육 신청이 제한될 수 있습니다.`)
        } else {
          throw new Error(json.error||'취소 실패')
        }
      } else {
        alert('취소되었습니다.')
        // 새로고침
        window.location.reload()
      }
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
  onModeChange: (mode: "select" | "recording" | "review" | "evaluation" | "admin" | "request") => void
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
            {/* Request 메뉴: Home 과 Record 사이 */}
            <button
              onClick={() => handleNavigation("request")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
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
  onModeChange: (mode: "select" | "recording" | "review" | "evaluation" | "admin" | "request") => void
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

            {/* Request 메뉴: Home 과 Record 사이 */}
            <button
              onClick={() => handleNavigation("request")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
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
  setIsMobileMenuOpen,
}: {
  onBack: () => void
  onNavigate: (mode: string) => void
  onModeChange: (mode: "select" | "recording" | "review" | "evaluation" | "admin" | "request") => void
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
  setIsMobileMenuOpen: (v: boolean) => void
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

            {/* Request 메뉴: Home 과 Record 사이 */}
            <button
              onClick={() => { handleNavigation("request"); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-base">Request</span>
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

            {/* Request 메뉴: Home 과 Record 사이 */}
            <button
              onClick={() => handleNavigation("request")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
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


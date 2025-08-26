"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  FileText, 
  User, 
  LogIn, 
  ArrowLeft,
  Mic,
  History,
  Monitor,
  X,
  Loader2,
  LogOut,
  Music,
  BookOpen
} from "lucide-react"
import { FileUploadEvaluation } from "@/components/file-upload-evaluation"
import { GoogleAuth } from "@/components/google-auth"
import { employeeDB } from "@/lib/employee-database"
import { MobileReviewPage } from "@/components/mobile-review-page"

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
  isInstructor?: boolean
  isAdmin?: boolean
  roles?: string[]
  department?: string
  position?: string
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

export default function MobilePage() {
  // CSS 키프레임 애니메이션 정의
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInFade {
        from {
          opacity: 0;
          transform: translateX(12px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
      @keyframes typeWriter {
        from { width: 0; }
        to { width: 100%; }
      }
      @keyframes attentionPulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
        50% { transform: scale(1.015); box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
      }
      @keyframes subtleFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-2px); }
      }
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .attention-pulse { animation: attentionPulse 1.3s ease-out infinite; }
      .subtle-float { animation: subtleFloat 3s ease-in-out infinite; }
      .gradient-shift { 
        background-size: 200% 200%;
        animation: gradientShift 4s ease infinite;
      }
      .card-hover {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null | undefined>(undefined)
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showMyPage, setShowMyPage] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [recentSubmission, setRecentSubmission] = useState<any>(null)
  const [loadingSubmission, setLoadingSubmission] = useState(false)
  const [statusMessageKey, setStatusMessageKey] = useState(0) // 메시지 변경 감지용

  // 최근 제출 내역 가져오기
  const fetchRecentSubmission = async (employeeId: string, clearCache = false) => {
    if (!employeeId) return;
    
    setLoadingSubmission(true);
    try {
      const cacheParam = clearCache ? "&clearCache=true" : "";
      const response = await fetch(`/api/evaluations/load-my-recordings?employeeId=${employeeId}${cacheParam}`);
      const data = await response.json();
      
      if (data.success && data.records && data.records.length > 0) {
        // 가장 최근 제출 내역 찾기
        const sortedRecords = data.records.sort((a: any, b: any) => 
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        
        console.log('🔍 [모바일] 최근 제출 내역:', sortedRecords[0]);
        console.log('🔍 [모바일] 상태 정보:', {
          status: sortedRecords[0].status,
          approved: sortedRecords[0].approved,
          submittedAt: sortedRecords[0].submittedAt,
          totalScore: sortedRecords[0].totalScore,
          grade: sortedRecords[0].grade
        });
        
        // 상태 메시지 미리보기
        const testMessage = getStatusMessage();
        console.log('🔍 [모바일] 상태 메시지:', testMessage);
        
        setRecentSubmission(sortedRecords[0]);
      } else {
        setRecentSubmission(null);
      }
    } catch (error) {
      console.error("최근 제출 내역 로드 실패:", error);
      setRecentSubmission(null);
    } finally {
      setLoadingSubmission(false);
    }
  };

  // 상태에 따른 메시지 생성
  const getStatusMessage = () => {
    if (loadingSubmission) {
      return {
        icon: "⏳",
        title: "제출 내역 확인 중...",
        message: "최근 평가 응시 정보를 불러오고 있습니다.",
      };
    }

    if (!recentSubmission) {
      return {
        icon: "🎤",
        title: "평가 응시 대기",
        message: "아직 평가에 응시하지 않으셨습니다."
      };
    }

    const submittedDate = new Date(recentSubmission.submittedAt);
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    };

    // 상태에 따른 메시지 결정 (단순화: 평가 완료 vs 평가 대기중)
    if (recentSubmission.approved) {
      return {
        icon: "🎉",
        title: "평가 완료",
        message: `${formatDate(submittedDate)}자 응시 내역의 평가가 완료되었습니다. 지금 바로 결과를 확인해 보세요!`
      };
    } else {
      // pending, submitted, review_requested 상태 모두 "평가 대기중"으로 통합
      return {
        icon: "⏰",
        title: "평가 대기중",
        message: `${formatDate(submittedDate)}에 평가에 응시하셨고, 현재 평가 대기중입니다.`
      };
    }
  };

  const shouldEmphasizeReviewCard = React.useMemo(() => {
    const msg = getStatusMessage();
    return msg.title === '평가 완료';
  }, [recentSubmission, loadingSubmission]);

  // 서버사이드 인증 상태 확인
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/user")
        const data = await res.json()
        if (data.authenticated && data.user) {
          setAuthenticatedUser(data.user)
          // 직원 정보 불러오기
          const employeeInfo = await employeeDB.findEmployeeByEmail(data.user.email)
          if (employeeInfo) {
            setUserInfo((prev) => ({
              ...prev,
              name: employeeInfo.name,
              employeeId: employeeInfo.employeeId,
              department: employeeInfo.department,
              position: employeeInfo.position,
              email: data.user.email,
              isInstructor: employeeInfo.isInstructor,
              isAdmin: employeeInfo.isAdmin,
              roles: employeeInfo.roles,
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

  // 사용자 정보가 로드된 후 최근 제출 내역 가져오기
  useEffect(() => {
    if (userInfo.employeeId && authenticatedUser) {
      fetchRecentSubmission(userInfo.employeeId);
    }
  }, [userInfo.employeeId, authenticatedUser]);

  // 상태 메시지 변경 시 애니메이션 트리거
  useEffect(() => {
    setStatusMessageKey(prev => prev + 1);
  }, [recentSubmission, loadingSubmission]);

  // 페이지 로드 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoaded(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleAuthSuccess = async (user: AuthenticatedUser) => {
    setAuthenticatedUser(user)

    // 직원 정보 불러오기
    const employeeInfo = await employeeDB.findEmployeeByEmail(user.email)
    if (employeeInfo) {
      setUserInfo((prev) => ({
        ...prev,
        name: employeeInfo.name,
        employeeId: employeeInfo.employeeId,
        department: employeeInfo.department,
        position: employeeInfo.position,
        email: user.email,
        isInstructor: employeeInfo.isInstructor,
        isAdmin: employeeInfo.isAdmin,
        roles: employeeInfo.roles,
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
      } else if (pendingAction === "review") {
        setShowReview(true)
      }
      setPendingAction(null)
    }
  }

  const handleCardClick = (action: string, event?: React.MouseEvent) => {
    console.log("🎯 [MobilePage] handleCardClick 호출됨:", action, "이벤트 타겟:", event?.target)
    
    // 이벤트 버블링 방지
    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }
    
    if (!authenticatedUser) {
      console.log("🔐 [MobilePage] 로그인 필요, pendingAction 설정:", action)
      setPendingAction(action)
      setShowLoginModal(true)
    } else {
      console.log("✅ [MobilePage] 로그인됨, 액션 실행:", action)
      if (action === "fileUpload") {
        setShowFileUpload(true)
      } else if (action === "review") {
        setShowReview(true)
      }
    }
  }

  const handleBack = () => {
    setShowFileUpload(false)
    setShowReview(false)
  }

  const handleLogout = async () => {
    console.log("🚨 [MobilePage] 로그아웃 시작")
    setIsLoggingOut(true)

    try {
      localStorage.clear()
      sessionStorage.clear()

      setAuthenticatedUser(null)
      setUserInfo({ name: "", employeeId: "", language: "", category: "" })
      setShowMyPage(false)

      // 로그아웃 API 호출
      await fetch("/api/auth/logout", { method: "POST" })
      
      console.log("✅ [MobilePage] 로그아웃 완료")
    } catch (error) {
      console.error("❌ [MobilePage] 로그아웃 실패:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleFileUploadComplete = (evaluationData: any) => {
    setShowFileUpload(false)
    // 성공 메시지 표시
    const successMessage = document.createElement('div')
    successMessage.className = 'fixed top-4 left-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50'
    successMessage.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <span>녹음 파일이 성공적으로 제출되었습니다!</span>
      </div>
    `
    document.body.appendChild(successMessage)
    
    // 3초 후 메시지 제거
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage)
      }
    }, 3000)
  }

  if (showFileUpload) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center gap-3">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">녹음 파일 제출</h1>
        </div>
        <FileUploadEvaluation
          onComplete={handleFileUploadComplete}
          onBack={handleBack}
          authenticatedUser={authenticatedUser}
          hideHeader={true}
        />
      </div>
    )
  }

  if (showReview) {
    return (
      <MobileReviewPage 
        userInfo={userInfo} 
        onBack={handleBack} 
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 헤더 */}
      <div className={`bg-gradient-to-b from-white/80 via-white/60 to-transparent backdrop-blur-sm px-6 py-6 transition-all duration-700 ${
        isPageLoaded ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}>
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className={`text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent tracking-tight transition-all duration-1000 ${
              isPageLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}>
              JVOICE
            </h1>
            <Badge className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-xs font-bold px-3 py-1 shadow-lg transition-all duration-1000 delay-200 ${
              isPageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
            }`}>
              모바일
            </Badge>
          </div>
          {authenticatedUser ? (
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setShowMyPage(true)
                }}
                className="flex items-center gap-3 hover:scale-105 transition-all duration-300 group"
              >
                <div className="relative">
                  <img
                    src={authenticatedUser.picture || "/placeholder.svg?height=40&width=40&text=User"}
                    alt={authenticatedUser.name}
                    className="w-12 h-12 rounded-full object-cover border-3 border-white shadow-xl group-hover:shadow-2xl transition-all duration-300"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white animate-pulse shadow-lg"></div>
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{authenticatedUser.name}</span>
                  <span className="text-xs text-gray-500">{authenticatedUser.email}</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 px-6 rounded-xl shadow-xl font-bold transition-all duration-300 hover:shadow-2xl hover:scale-105" onClick={() => { window.location.href = '/api/auth/google' }}>
                Google로 로그인
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="p-6 space-y-6 pb-20 relative z-10 max-w-4xl mx-auto">
        {/* 상태 메시지 */}
                 {authenticatedUser ? (
           <div className={`bg-gradient-to-r from-blue-500/8 via-indigo-500/6 to-purple-500/8 backdrop-blur-xl border border-blue-200/30 rounded-3xl p-6 shadow-2xl cursor-default transition-all duration-1000 delay-300 ${
             isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
           }`}>
             <div className="flex items-center gap-4">
               <div className="flex-1">
                 <h3 className={`text-lg font-black text-gray-900 mb-2 transition-all duration-1000 delay-700 ${
                   isPageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                 }`}>안녕하세요, {userInfo.name}님! {getStatusMessage().icon}</h3>
                 <div className={`transition-all duration-1000 delay-900 ${
                   isPageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                 }`}>
                   <div 
                     key={`title-${statusMessageKey}`}
                     className={`text-sm font-bold mb-1 transition-all duration-500 ease-out ${
                       getStatusMessage().title === "평가 완료" 
                         ? "text-green-700 font-black text-base animate-pulse" 
                         : "text-gray-800 animate-pulse"
                     }`}
                     style={{
                       animation: 'slideInFade 0.5s ease-out forwards',
                       opacity: 0,
                       transform: 'translateX(8px)'
                     }}
                   >
                     {getStatusMessage().title}
                   </div>
                   <div 
                     key={`message-${statusMessageKey}`}
                     className="text-sm text-gray-600 leading-tight transition-all duration-1000 ease-out"
                     style={{
                       animation: 'slideInFade 0.8s ease-out 0.3s forwards',
                       opacity: 0,
                       transform: 'translateX(12px) scale(0.98)',
                     }}
                   >
                     {getStatusMessage().message}
                   </div>
                                       {/* 결과 확인 버튼 제거 - My Page로 연결되어 소용없음 */}
                 </div>
               </div>
             </div>
           </div>
         ) : (
           <div className={`bg-gradient-to-r from-amber-500/8 via-orange-500/6 to-red-500/8 backdrop-blur-xl border border-amber-200/30 rounded-3xl p-6 shadow-2xl cursor-default transition-all duration-1000 delay-300 ${
             isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
           }`}>
             <div className="flex items-center gap-4">
               <div className={`bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-2xl shadow-xl transition-all duration-1000 delay-500 ${
                 isPageLoaded ? 'rotate-0 scale-100' : 'rotate-12 scale-90'
               }`}>
                 <LogIn className="w-5 h-5 text-white" />
               </div>
               <div className="flex-1">
                 <h3 className={`text-lg font-black text-gray-900 mb-1 transition-all duration-1000 delay-700 ${
                   isPageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                 }`}>로그인이 필요합니다 🔐</h3>
                 <p className={`text-sm text-gray-600 leading-tight transition-all duration-1000 delay-900 ${
                   isPageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                 }`}>서비스를 이용하려면 로그인해주세요.</p>
               </div>
             </div>
           </div>
         )}

        {/* 기능 카드들 */}
        <div className="grid gap-6">
          {/* 녹음 파일 제출 카드 */}
          <Card 
            className={`bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 shadow-2xl rounded-2xl border border-white/50 card-hover cursor-pointer overflow-hidden group ${
              isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
            style={{ transitionDelay: '1100ms' }}
            onClick={(e) => handleCardClick("fileUpload", e)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-indigo-500/2 to-purple-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <CardContent className="p-8 relative">
              <div className="flex items-center gap-6">
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 rounded-2xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 subtle-float">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-2">녹음 파일 제출</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    부산베이스 전용 업로드 페이지입니다.
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 text-xs font-bold px-3 py-1 shadow-lg">
                      <Mic className="w-3 h-3 mr-1" />
                      PUS Base Only
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 내 응시 내역 카드 */}
          <Card 
            className={`bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 shadow-2xl rounded-2xl border border-white/50 card-hover cursor-pointer overflow-hidden group ${
              isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            } ${shouldEmphasizeReviewCard ? 'attention-pulse ring-2 ring-orange-400' : ''}`}
            style={{ transitionDelay: '1300ms' }}
            onClick={(e) => handleCardClick("review", e)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 via-emerald-500/2 to-teal-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <CardContent className="p-8 relative">
              <div className="flex items-center gap-6">
                <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-5 rounded-2xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 subtle-float">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-2">결과 확인</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    이전에 제출한 평가 결과를 확인합니다.
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 text-xs font-bold px-3 py-1 shadow-lg">
                      <History className="w-3 h-3 mr-1" />
                      Review
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* 하단 고정 정보 - 배경에 자연스럽게 녹아들도록 */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-0">
        <div className={`text-center pb-8 transition-all duration-1000 delay-[1500ms] ${
          isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <p className={`text-sm font-bold text-gray-700/90 mb-1 transition-all duration-1000 delay-[1900ms] ${
            isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}>
            JVOICE v1.0 Mobile
          </p>
          <p className={`text-xs text-gray-500/80 mb-3 transition-all duration-1000 delay-[2100ms] ${
            isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}>
            ⓒ 2025 Jin Air Cabin Training Group
          </p>
          <div className={`flex justify-center gap-2 transition-all duration-1000 delay-[2300ms] ${
            isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}>
            <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse shadow-lg"></div>
            <div className="w-2 h-2 bg-blue-800 rounded-full animate-pulse shadow-lg" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse shadow-lg" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">로그인</h2>
                <p className="text-gray-600">서비스를 이용하려면 로그인이 필요합니다.</p>
              </div>
              <GoogleAuth onAuthSuccess={handleAuthSuccess} />
              <Button
                onClick={() => setShowLoginModal(false)}
                variant="outline"
                className="w-full mt-3"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* My Page 모달 */}
      {showMyPage && (
        <MobileMyPageModal
          user={authenticatedUser || null}
          userInfo={userInfo}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      )}
    </div>
  )
}

// 모바일용 MyPage 모달 컴포넌트
function MobileMyPageModal({
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
  const [activeTab, setActiveTab] = useState<"profile" | "qualifications">("profile")
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 직원 자격 정보 불러오기
  useEffect(() => {
    const loadEmployeeQualifications = async () => {
      if (user?.email) {
        setLoading(true)
        try {
          // 캐시를 무시하고 새로운 데이터를 강제로 불러오기
          await employeeDB.refreshEmployeeData()
          const employeeInfo = await employeeDB.findEmployeeByEmail(user.email)
          console.log("🔍 [MobileMyPageModal] 직원 정보 로드:", employeeInfo)
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Escape") onClose();
      }}
      autoFocus
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden relative">
        {/* 헤더 */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">My Account</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex mt-4 bg-white rounded-lg p-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              프로필 정보
            </button>
            <button
              onClick={() => setActiveTab("qualifications")}
              className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "qualifications"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              방송 자격
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border border-blue-100">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg bg-white flex items-center justify-center">
                  <img
                    src={user?.picture || "/placeholder.svg?height=80&width=80&text=User"}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {getUserMainRole() && (
                  <span className={`absolute -bottom-1 -right-1 text-white font-bold px-3 py-1 rounded-full shadow-lg text-sm tracking-wider border-2 ${
                    getUserMainRole() === "관리자"
                      ? "bg-gradient-to-r from-orange-400 to-red-500 border-orange-300"
                      : "bg-gradient-to-r from-green-400 to-blue-500 border-blue-300"
                  }`}>
                    {getUserMainRole()}
                  </span>
                )}
              </div>
              <div className="w-full text-center mb-4">
                <h4 className="text-xl font-bold text-gray-900 mb-1">{user?.name}</h4>
                <p className="text-sm text-gray-500 mb-2">{user?.email}</p>
              </div>
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">사번</span>
                  <span className="text-gray-900 font-bold">{userInfo.employeeId || user?.broadcastCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">라인팀</span>
                  <span className="text-gray-900 font-bold">{userInfo.department || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">방송코드</span>
                  <span className="text-gray-900 font-bold">{userInfo.position || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "qualifications" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{userInfo.name}({userInfo.employeeId}) 방송 자격 현황</h3>
                <p className="text-sm text-gray-600">{new Date().toLocaleString('ko-KR', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}</p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">자격 정보를 불러오는 중입니다...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 한/영 자격 */}
                  <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-sm text-white">🇰🇷🇺🇸</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">한국어/영어</h4>
                          <p className="text-xs text-gray-600">
                            {employeeData?.koreanEnglishExpiry ? `유효기간: ${employeeData.koreanEnglishExpiry}` : "유효기간 정보 없음"}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-base font-bold shadow-md ${getGradeStyle(employeeData?.koreanEnglishGrade || "")}`}>
                        {extractGrade(employeeData?.koreanEnglishGrade || "")}
                      </div>
                    </div>
                  </div>

                  {/* 일본어 자격 */}
                  <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-sm text-white">🇯🇵</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">일본어</h4>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-base font-bold shadow-md ${getGradeStyle(employeeData?.japaneseGrade || "")}`}>
                        {extractGrade(employeeData?.japaneseGrade || "")}
                      </div>
                    </div>
                  </div>

                  {/* 중국어 자격 */}
                  <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-sm text-white">🇨🇳</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">중국어</h4>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-base font-bold shadow-md ${getGradeStyle(employeeData?.chineseGrade || "")}`}>
                        {extractGrade(employeeData?.chineseGrade || "")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 로그아웃 버튼 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Button onClick={onLogout} disabled={isLoggingOut} variant="outline" className="w-full">
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
    </div>
  )
}

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
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Video,
  GraduationCap,
  Clock,
  MapPin
} from "lucide-react"
import { FileUploadEvaluation } from "@/components/file-upload-evaluation"
import { GoogleAuth } from "@/components/google-auth"
import { employeeDB } from "@/lib/employee-database"
import { MobileReviewPage } from "@/components/mobile-review-page"
import { EducationCheckinModal } from "@/components/education-checkin-modal"

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
  sub: string
  isTestAccount?: boolean
  broadcastGrade: string
}

interface UserRequest {
  id: string
  type: 'education' | 'recording'
  date: string
  slot: number
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED'
  language?: string
  educationType?: string
  createdAt: string
}

export default function NewMobilePage() {
  // 상태 관리
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null | undefined>(undefined)
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [currentTab, setCurrentTab] = useState<'evaluation' | 'education'>('evaluation')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showMyPage, setShowMyPage] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showMobileReview, setShowMobileReview] = useState(false)
  const [showEducationCheckin, setShowEducationCheckin] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchCurrentX, setTouchCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [userRequests, setUserRequests] = useState<UserRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  // 페이지 로드 애니메이션
  useEffect(() => {
    setIsPageLoaded(true)
  }, [])

  // 사용자 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check")
        if (response.ok) {
          const data = await response.json()
          setAuthenticatedUser(data.user)
          
          if (data.user) {
            const employee = employeeDB.getByEmail(data.user.email)
            if (employee) {
              setUserInfo(employee)
              await loadUserRequests(employee.employeeId)
            }
          }
        } else {
          setAuthenticatedUser(null)
        }
      } catch (error) {
        console.error("인증 확인 실패:", error)
        setAuthenticatedUser(null)
      }
    }
    checkAuth()
  }, [])

  // 사용자 신청 내역 로드
  const loadUserRequests = async (employeeId: string) => {
    try {
      setLoadingRequests(true)
      const response = await fetch(`/api/requests?employeeId=${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setUserRequests(data.requests || [])
      }
    } catch (error) {
      console.error("신청 내역 로드 실패:", error)
    } finally {
      setLoadingRequests(false)
    }
  }

  // 로그인 성공 처리
  const handleAuthSuccess = (user: AuthenticatedUser) => {
    setAuthenticatedUser(user)
    setShowLoginModal(false)
    
    const employee = employeeDB.getByEmail(user.email)
    if (employee) {
      setUserInfo(employee)
      loadUserRequests(employee.employeeId)
    }
  }

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await fetch("/api/auth/logout", { method: "POST" })
      setAuthenticatedUser(null)
      setUserInfo({ name: "", employeeId: "", language: "", category: "" })
      setUserRequests([])
    } catch (error) {
      console.error("로그아웃 실패:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // 터치 스와이프 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setTouchCurrentX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    
    const deltaX = touchCurrentX - touchStartX
    const minSwipeDistance = 50
    
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && currentTab === 'education') {
        // 오른쪽으로 스와이프 - 평가 탭으로
        setCurrentTab('evaluation')
      } else if (deltaX < 0 && currentTab === 'evaluation') {
        // 왼쪽으로 스와이프 - 교육 탭으로
        setCurrentTab('education')
      }
    }
    
    setIsDragging(false)
    setTouchCurrentX(0)
  }

  // 최근 진행 상황 데이터 가져오기
  const getRecentActivity = () => {
    const activities = []
    
    // 평가 관련 활동
    const evaluationSubmissions = userRequests.filter(req => req.type === 'recording')
    if (evaluationSubmissions.length > 0) {
      const latest = evaluationSubmissions[0]
      activities.push({
        type: 'evaluation',
        title: '녹음 평가 신청',
        date: latest.date,
        status: latest.status,
        slot: latest.slot
      })
    }
    
    // 교육 관련 활동
    const educationApplications = userRequests.filter(req => req.type === 'education')
    if (educationApplications.length > 0) {
      const latest = educationApplications[0]
      activities.push({
        type: 'education',
        title: '교육 신청',
        date: latest.date,
        status: latest.status,
        slot: latest.slot,
        educationType: latest.educationType
      })
    }
    
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3)
  }

  // 파일 업로드 완료 처리
  const handleFileUploadComplete = () => {
    setShowFileUpload(false)
    // 신청 내역 새로고침
    if (userInfo.employeeId) {
      loadUserRequests(userInfo.employeeId)
    }
  }

  // 외부 링크로 이동
  const navigateToCalendar = (type: 'recording' | 'education') => {
    const baseUrl = window.location.origin
    const targetUrl = `${baseUrl}?mode=request&tab=${type}`
    window.location.href = targetUrl
  }

  // 로그인되지 않은 경우
  if (authenticatedUser === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col">
        {/* 헤더 */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-indigo-100/50 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">방송사 평가</h1>
                <p className="text-xs text-gray-600">모바일 서비스</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowLoginModal(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2 rounded-xl shadow-lg"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Google 로그인
            </Button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className={`max-w-md w-full transition-all duration-1000 ${
            isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <Card className="bg-gradient-to-r from-amber-500/8 via-orange-500/6 to-red-500/8 backdrop-blur-xl border border-amber-200/30 rounded-3xl shadow-2xl">
              <CardContent className="p-8 text-center">
                <div className={`bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-3xl shadow-xl mx-auto mb-6 w-fit transition-all duration-1000 delay-300 ${
                  isPageLoaded ? 'rotate-0 scale-100' : 'rotate-12 scale-90'
                }`}>
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <h2 className={`text-2xl font-black text-gray-900 mb-4 transition-all duration-1000 delay-500 ${
                  isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}>
                  로그인이 필요합니다 🔐
                </h2>
                <p className={`text-gray-600 mb-8 leading-relaxed transition-all duration-1000 delay-700 ${
                  isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}>
                  방송사 평가 및 교육 서비스를 이용하려면<br/>Google 계정으로 로그인해주세요.
                </p>
                <Button 
                  onClick={() => setShowLoginModal(true)}
                  className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-4 rounded-2xl shadow-lg text-lg font-semibold transition-all duration-1000 delay-900 ${
                    isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                >
                  <LogIn className="w-5 h-5 mr-3" />
                  지금 로그인하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 로그인 모달 */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">로그인</h2>
                  <p className="text-gray-600">Google 계정으로 로그인해주세요</p>
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
      </div>
    )
  }

  // 로그인 확인 중
  if (authenticatedUser === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">로그인 확인 중...</h3>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    )
  }

  // 로그인된 상태 - 메인 UI
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-indigo-100/50 p-4 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">방송사 평가</h1>
              <p className="text-xs text-gray-600">{userInfo.name} 님</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowMyPage(true)}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <User className="w-5 h-5 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-100/50 px-4 py-2">
        <div className="flex bg-gray-100/50 rounded-2xl p-1">
          <button
            onClick={() => setCurrentTab('evaluation')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
              currentTab === 'evaluation' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            평가
          </button>
          <button
            onClick={() => setCurrentTab('education')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
              currentTab === 'education' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-2" />
            교육
          </button>
        </div>
      </div>

      {/* 상황 표시판 */}
      {getRecentActivity().length > 0 && (
        <div className="p-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 최근 활동</h3>
            <div className="space-y-2">
              {getRecentActivity().map((activity, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'ACTIVE' ? 'bg-green-500' :
                    activity.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-gray-700">{activity.title}</span>
                  <span className="text-gray-500 text-xs">{activity.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-4 pb-8">
        {currentTab === 'evaluation' ? (
          // 평가 탭
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">📻 방송 평가</h2>
            
            {/* 녹음 신청 */}
            <Card className="bg-white/70 backdrop-blur-sm border border-indigo-100/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">녹음 신청</h3>
                      <p className="text-sm text-gray-600">녹음 일정을 예약하세요</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigateToCalendar('recording')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl"
                  >
                    신청하기
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 결과 확인 */}
            <Card className="bg-white/70 backdrop-blur-sm border border-indigo-100/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">결과 확인</h3>
                      <p className="text-sm text-gray-600">평가 결과를 확인하세요</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowMobileReview(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl"
                  >
                    확인하기
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 녹음 파일 제출 */}
            <Card className="bg-white/70 backdrop-blur-sm border border-indigo-100/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">녹음 파일 제출</h3>
                      <p className="text-sm text-gray-600">녹음 파일을 업로드하세요</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowFileUpload(true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-xl"
                  >
                    제출하기
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // 교육 탭
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">🎓 방송 교육</h2>
            
            {/* 교육 신청 */}
            <Card className="bg-white/70 backdrop-blur-sm border border-indigo-100/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">교육 신청</h3>
                      <p className="text-sm text-gray-600">교육 일정을 예약하세요</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigateToCalendar('education')}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-xl"
                  >
                    신청하기
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 교육 체크인 */}
            <Card className="bg-white/70 backdrop-blur-sm border border-indigo-100/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">교육 체크인</h3>
                      <p className="text-sm text-gray-600">교육 참석을 확인하세요</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowEducationCheckin(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl"
                  >
                    체크인
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 신청한 교육 목록 */}
            {userRequests.filter(req => req.type === 'education').length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm border border-indigo-100/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">📋 신청한 교육</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userRequests
                      .filter(req => req.type === 'education')
                      .slice(0, 3)
                      .map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                              <GraduationCap className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.date}</p>
                              <p className="text-sm text-gray-600">슬롯 {request.slot}</p>
                            </div>
                          </div>
                          <Badge className={`${
                            request.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : request.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status === 'ACTIVE' ? '예정' : 
                             request.status === 'COMPLETED' ? '완료' : '취소'}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 파일 업로드 모달 */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <FileUploadEvaluation
                onComplete={handleFileUploadComplete}
                onBack={() => setShowFileUpload(false)}
                authenticatedUser={authenticatedUser}
                hideHeader={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* 결과 확인 모달 */}
      {showMobileReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <MobileReviewPage
                authenticatedUser={authenticatedUser}
                userInfo={userInfo}
                onBack={() => setShowMobileReview(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 교육 체크인 모달 */}
      {showEducationCheckin && (
        <EducationCheckinModal
          isOpen={showEducationCheckin}
          onClose={() => setShowEducationCheckin(false)}
          userInfo={userInfo}
          onCheckinComplete={() => {
            // 체크인 완료 후 신청 내역 새로고침
            loadUserRequests(userInfo.employeeId)
          }}
        />
      )}

      {/* 마이페이지 모달 */}
      {showMyPage && (
        <MobileMyPageModal
          user={authenticatedUser}
          userInfo={userInfo}
          userRequests={userRequests}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          onRefreshRequests={() => loadUserRequests(userInfo.employeeId)}
        />
      )}
    </div>
  )
}

// 새로운 마이페이지 모달 컴포넌트
function MobileMyPageModal({
  user,
  userInfo,
  userRequests,
  onClose,
  onLogout,
  isLoggingOut,
  onRefreshRequests,
}: {
  user: AuthenticatedUser | null
  userInfo: UserInfo
  userRequests: UserRequest[]
  onClose: () => void
  onLogout: () => void
  isLoggingOut: boolean
  onRefreshRequests: () => void
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'qualification' | 'requests'>('profile')

  const getSlotTime = (slot: number) => {
    const slotTimes: Record<number, string> = {
      1: '08:30', 2: '09:30', 3: '10:30', 4: '11:30',
      5: '13:40', 6: '14:40', 7: '15:40', 8: '16:40'
    }
    return slotTimes[slot] || '미정'
  }

  const getEducationTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'korean-1:1': '한국어 1:1',
      'korean-small': '한국어 소규모',
      'english-1:1': '영어 1:1',
      'english-small': '영어 소규모',
      'chinese-1:1': '중국어 1:1',
      'chinese-small': '중국어 소규모'
    }
    return types[type] || type
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">마이페이지</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex bg-gray-50 mx-6 mt-4 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'profile' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            프로필 정보
          </button>
          <button
            onClick={() => setActiveTab('qualification')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'qualification' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            방송 자격
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'requests' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            신청 내역
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={user?.picture || '/default-avatar.png'}
                      alt="프로필"
                      className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{userInfo.name}</h3>
                      <p className="text-indigo-600 font-medium">{userInfo.employeeId}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">이메일</p>
                      <p className="font-medium text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">언어</p>
                      <p className="font-medium text-gray-900">{userInfo.language}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">카테고리</p>
                      <p className="font-medium text-gray-900">{userInfo.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">부서</p>
                      <p className="font-medium text-gray-900">{userInfo.department || '미설정'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'qualification' && (
            <div className="space-y-6">
              {/* 방송 자격 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-indigo-600" />
                    방송 자격 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">방송 코드</p>
                      <p className="font-medium text-gray-900">{userInfo.broadcastCode || '미설정'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">방송 등급</p>
                      <p className="font-medium text-gray-900">{userInfo.broadcastGrade || '미설정'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">팀 번호</p>
                      <p className="font-medium text-gray-900">{userInfo.teamNumber || '미설정'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">역할</p>
                      <p className="font-medium text-gray-900">{userInfo.role || '미설정'}</p>
                    </div>
                  </div>
                  
                  {userInfo.roles && userInfo.roles.length > 0 && (
                    <div>
                      <p className="text-gray-600 text-sm mb-2">추가 권한</p>
                      <div className="flex flex-wrap gap-2">
                        {userInfo.roles.map((role, index) => (
                          <Badge key={index} className="bg-indigo-100 text-indigo-800">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* 신청 내역 */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">내 신청 내역</h3>
                <Button
                  onClick={onRefreshRequests}
                  variant="outline"
                  size="sm"
                  className="p-2"
                >
                  <History className="w-4 h-4" />
                </Button>
              </div>

              {userRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">신청 내역이 없습니다</h3>
                    <p className="text-gray-600">교육이나 녹음을 신청해보세요.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {userRequests.map((request) => (
                    <Card key={request.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              request.type === 'education' 
                                ? 'bg-indigo-100' 
                                : 'bg-blue-100'
                            }`}>
                              {request.type === 'education' ? (
                                <GraduationCap className={`w-5 h-5 ${
                                  request.type === 'education' ? 'text-indigo-600' : 'text-blue-600'
                                }`} />
                              ) : (
                                <Mic className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {request.type === 'education' ? '교육' : '녹음'} 신청
                              </h4>
                              {request.type === 'education' && request.educationType && (
                                <p className="text-sm text-gray-600">
                                  {getEducationTypeLabel(request.educationType)}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${
                            request.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status === 'ACTIVE' ? '예정' : 
                             request.status === 'COMPLETED' ? '완료' : '취소'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{request.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{getSlotTime(request.slot)}</span>
                          </div>
                        </div>

                        {/* 1:1 교육인 경우 구글 미트 버튼 */}
                        {request.type === 'education' && 
                         request.educationType?.includes('1:1') && 
                         request.status === 'ACTIVE' && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <Button
                              onClick={() => {
                                // 구글 미트 링크로 이동 - 실제 링크는 서버에서 제공되어야 함
                                window.open('https://meet.google.com/', '_blank')
                              }}
                              className="w-full bg-green-500 hover:bg-green-600 text-white"
                              size="sm"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Google Meet 참여
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 로그아웃 버튼 */}
        <div className="p-6 border-t border-gray-100">
          <Button
            onClick={onLogout}
            disabled={isLoggingOut}
            variant="outline"
            className="w-full py-3 text-red-600 border-red-200 hover:bg-red-50"
          >
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

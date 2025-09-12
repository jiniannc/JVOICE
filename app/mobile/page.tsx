"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  GraduationCap,
  Calendar,
  Clock
} from "lucide-react"
import { FileUploadEvaluation } from "@/components/file-upload-evaluation"
import { GoogleAuth } from "@/components/google-auth"
import { employeeDB } from "@/lib/employee-database"
import { MobileReviewPage } from "@/components/mobile-review-page"
import { EducationCheckinModal } from "@/components/education-checkin-modal"
import { MobileRecordingCalendar } from "@/components/mobile-recording-calendar"
import { MobileEducationCalendar } from "@/components/mobile-education-calendar"
import { CustomDialog } from "@/components/ui/custom-dialog"
import { useCustomDialog } from "@/hooks/use-custom-dialog"

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
  const router = useRouter()
  
  const customDialogHook = useCustomDialog()
  const { isOpen: customDialogOpen, config: customDialogConfig, close: customDialogClose, showAlert, showConfirm } = customDialogHook
  
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
  const [educationRequests, setEducationRequests] = useState<any[]>([])
  const [loadingEducation, setLoadingEducation] = useState(false)
  const [currentTab, setCurrentTab] = useState<'evaluation' | 'education'>('evaluation')
  const [showEducationCheckin, setShowEducationCheckin] = useState(false)
  
  // 캘린더 모달 상태
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarType, setCalendarType] = useState<'recording' | 'education'>('recording')

  // 최근 제출 내역 가져오기 (Database API 사용)
  const fetchRecentSubmission = async (employeeId: string, clearCache = false) => {
    if (!employeeId) return;
    
    setLoadingSubmission(true);
    try {
      console.log('📋 [모바일] Database에서 평가 결과 로드 시작:', employeeId);
      
      const response = await fetch(`/api/evaluations/load-database?page=1&limit=10&status=all`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      console.log('📊 [모바일] Database 응답:', data);
      
      if (data.success && data.evaluations && data.evaluations.length > 0) {
        // 해당 사용자의 평가만 필터링
        const userEvaluations = data.evaluations.filter((evaluation: any) => 
          evaluation.candidateInfo?.employeeId === employeeId
        );
        
        console.log('🔍 [모바일] 사용자 평가 필터링:', { 
          total: data.evaluations.length, 
          userOnly: userEvaluations.length,
          employeeId 
        });
        
        if (userEvaluations.length === 0) {
          console.log('📋 [모바일] 해당 사용자의 제출된 평가 없음');
          setRecentSubmission(null);
          return;
        }
        
        // 가장 최근 평가 찾기
        const sortedEvaluations = userEvaluations
          .sort((a: any, b: any) => new Date(b.candidateInfo.submittedAt).getTime() - new Date(a.candidateInfo.submittedAt).getTime());
        
        const latest = sortedEvaluations[0];
        console.log('📋 [모바일] 최근 평가 내역:', {
          id: latest.id,
          status: latest.status,
          submittedAt: latest.candidateInfo.submittedAt,
          totalScore: latest.totalScore,
          grade: latest.grade,
          language: latest.candidateInfo.language
        });
        
        setRecentSubmission(latest);
      } else {
        console.log('📋 [모바일] 제출된 평가 없음');
        setRecentSubmission(null);
      }
    } catch (error) {
      console.error("❌ [모바일] Database 평가 결과 로드 실패:", error);
      setRecentSubmission(null);
    } finally {
      setLoadingSubmission(false);
    }
  };

  // 교육 신청 내역 가져오기
  const fetchEducationRequests = async (employeeId: string) => {
    if (!employeeId) return;
    
    setLoadingEducation(true);
    try {
      console.log('📋 [모바일] 교육 신청 내역 로드 시작:', employeeId);
      
      // GET 방식으로 변경 (separate page와 동일)
      const response = await fetch(`/api/requests/database?employeeId=${employeeId}`);

      if (response.ok) {
        const data = await response.json();
        const educationItems = data.items?.filter((item: any) => item.type === 'education') || [];
        
        // 클래스룸 정보 추가 로드
        if (educationItems.length > 0) {
          const uniqueMonths = [...new Set(educationItems.map((item: any) => item.date.slice(0, 7)))];
          const classroomInfoMap = new Map();
          
          for (const month of uniqueMonths) {
            try {
              const scheduleRes = await fetch(`/api/schedules?month=${month}`);
              if (scheduleRes.ok) {
                const scheduleData = await scheduleRes.json();
                if (scheduleData.data?.days) {
                  scheduleData.data.days.forEach((day: any) => {
                    if (day.education && Array.isArray(day.education)) {
                      day.education.forEach((edu: any) => {
                        if (edu.classroomInfo && edu.type && edu.slots) {
                          edu.slots.forEach((slot: number) => {
                            // 카테고리가 있는 경우와 없는 경우 모두 처리
                            if (edu.type.category) {
                              // 카테고리별 키 (한/영 소규모)
                              const categoryKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}_${edu.type.category}`;
                              classroomInfoMap.set(categoryKey, edu.classroomInfo);
                              console.log(`✅ [모바일 MyPage] 카테고리별 교실 정보: ${categoryKey} → ${edu.classroomInfo}`);
                            } else {
                              // 기본 키 (카테고리 없는 교육: 일본어/중국어, 1:1)
                              const baseKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}`;
                              classroomInfoMap.set(baseKey, edu.classroomInfo);
                              console.log(`✅ [모바일 MyPage] 기본 교실 정보: ${baseKey} → ${edu.classroomInfo}`);
                            }
                          });
                        }
                      });
                    }
                  });
                }
              }
            } catch (error) {
              console.warn(`모바일 클래스룸 정보 로드 실패 (${month}):`, error);
            }
          }
          
          console.log('🏫 [모바일 MyPage] 최종 교실 정보 맵:', Object.fromEntries(classroomInfoMap));
          
          // 교육 항목에 클래스룸 정보 추가
          const enrichedItems = educationItems.map((item: any) => {
            const language = item.details?.language || 'korean-english';
            const mode = item.details?.mode || item.details?.educationType || '1:1';
            const category = item.details?.category;
            const normalizedMode = mode === 'small-group' ? 'small' : mode;
            
            console.log(`🔍 [모바일 MyPage] 원본 신청 데이터:`, {
              date: item.date,
              slot: item.slot,
              details: item.details,
              schedule: item.schedule,
              language,
              mode,
              category,
              normalizedMode,
              expectedCategoryKey: `${item.date}_${item.slot}_${language}_${normalizedMode}_${category}`,
              expectedBaseKey: `${item.date}_${item.slot}_${language}_${normalizedMode}`
            });
            
            // 클래스룸 정보 매칭 (우선순위: Database API → 스케줄 API)
            let classroomInfo = null;
            
            // 1. Database API에서 제공하는 클래스룸 정보 확인
            if (item.schedule?.classroom) {
              console.log(`🚨 [모바일 MyPage] Database API 클래스룸 발견: ${item.schedule.classroom} (카테고리: ${category})`);
              // 카테고리별 매칭을 우선 시도하고, 실패하면 Database API 사용
            }
            
            // 2. 스케줄 API 매칭 우선 시도
            {
              // 소규모 교육의 경우 차수를 녹음 슬롯으로 변환
              let actualSlots = [item.slot];
              if (normalizedMode === 'small') {
                // 소규모 교육: 차수 → 녹음 슬롯 변환
                const slotMapping = {
                  1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8]
                };
                actualSlots = slotMapping[item.slot as keyof typeof slotMapping] || [item.slot];
                console.log(`🔄 [모바일 MyPage] 소규모 차수 변환: ${item.slot}차 → 녹음슬롯 [${actualSlots}]`);
              }
              
              // 각 녹음 슬롯에 대해 카테고리별 키 시도
              if (category && language === 'korean-english' && normalizedMode === 'small') {
                for (const slot of actualSlots) {
                  const categoryKey = `${item.date}_${slot}_${language}_${normalizedMode}_${category}`;
                  classroomInfo = classroomInfoMap.get(categoryKey);
                  console.log(`🔍 [모바일 MyPage] 카테고리 키 시도: ${categoryKey} → ${classroomInfo}`);
                  if (classroomInfo) break;
                }
              }
              
              // 기본 키 시도 (카테고리 없는 교육이거나 카테고리별 매칭 실패)
              if (!classroomInfo) {
                for (const slot of actualSlots) {
                  const baseKey = `${item.date}_${slot}_${language}_${normalizedMode}`;
                  classroomInfo = classroomInfoMap.get(baseKey);
                  console.log(`🔍 [모바일 MyPage] 기본 키 시도: ${baseKey} → ${classroomInfo}`);
                  if (classroomInfo) break;
                }
              }
              
              // 스케줄 API 매칭 실패 시 Database API 폴백
              if (!classroomInfo && item.schedule?.classroom) {
                classroomInfo = item.schedule.classroom;
                console.log(`🔄 [모바일 MyPage] Database API 폴백: ${classroomInfo}`);
              }
            }
            
            // 클래스룸 정보 포맷팅
            const formattedClassroom = classroomInfo ? (classroomInfo.includes('학과장') ? classroomInfo : `${classroomInfo} 학과장`) : '';
            
            console.log(`🔍 [모바일 MyPage] 교실 매칭: ${item.date}_${item.slot}_${language}_${normalizedMode} (카테고리: ${category || 'none'}) → ${classroomInfo} → ${formattedClassroom}`);
            
            return {
              ...item,
              classroomInfo: formattedClassroom
            };
          });
          
          console.log('📊 [모바일] 교육 신청 내역 (클래스룸 정보 포함):', enrichedItems);
          setEducationRequests(enrichedItems);
        } else {
        setEducationRequests(educationItems);
        }
      } else {
        console.error('❌ [모바일] 교육 신청 내역 로드 실패:', response.status);
        setEducationRequests([]);
      }
    } catch (error) {
      console.error('❌ [모바일] 교육 신청 내역 로드 오류:', error);
      setEducationRequests([]);
    } finally {
      setLoadingEducation(false);
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

    const submittedDate = new Date(recentSubmission.candidateInfo.submittedAt);
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    };

    // Database API 응답 구조에 따른 메시지 결정
    if (recentSubmission.status === 'approved') {
      return {
        icon: "🎉",
        title: "평가 완료",
        message: `${formatDate(submittedDate)}에 응시하신 평가가 완료되었습니다. 지금 바로 결과를 확인해 보세요!`
      };
    } else {
      // pending, submitted, review_requested 상태 모두 "평가 대기중"으로 통합
      const statusText = recentSubmission.status === 'pending' ? '검토 대기' :
                        recentSubmission.status === 'submitted' ? '제출 완료' :
                        recentSubmission.status === 'review_requested' ? '재검토 요청' : '평가 대기';
      
      return {
        icon: "⏰",
        title: "평가 대기중",
        message: `${formatDate(submittedDate)}에 평가에 응시하셨고, 현재 ${statusText} 상태입니다.`
      };
    }
  };

  // 교육 상태 메시지 생성
  const getEducationStatusMessage = () => {
    if (loadingEducation) {
      return "교육 신청 내역을 확인 중입니다...";
    }

    if (!educationRequests || educationRequests.length === 0) {
      return "아직 교육 신청 내역이 없습니다.";
    }

    // 가장 최근 교육 신청 찾기
    const sortedRequests = educationRequests
      .sort((a: any, b: any) => {
        const dateA = new Date(a.appliedAt || a.createdAt || a.date).getTime();
        const dateB = new Date(b.appliedAt || b.createdAt || b.date).getTime();
        return dateB - dateA;
      });
    
    const latest = sortedRequests[0];
    const requestDate = new Date(latest.appliedAt || latest.createdAt || latest.date);
    const educationDate = new Date(latest.date);
    
    console.log('🎓 교육 신청 내역 디버그:', { latest, requestDate, educationDate });
    console.log('🔍 [getEducationStatusMessage] latest 객체 상세:', {
      classroomInfo: latest.classroomInfo,
      details: latest.details,
      hasClassroomInfo: !!latest.classroomInfo,
      classroomInfoType: typeof latest.classroomInfo
    });
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric"
      });
    };
    
    const formatTime = (slot: number, educationType: string) => {
      if (educationType === '1:1') {
        // 1:1 교육 (25분 단위)
        const timeMap: Record<number, string> = {
          1: '08:30-08:55', 2: '09:00-09:25', 3: '09:30-09:55', 4: '10:00-10:25',
          5: '10:30-10:55', 6: '11:00-11:25', 7: '11:30-11:55', 8: '12:00-12:25',
          9: '13:35-14:00', 10: '14:05-14:30', 11: '14:35-15:00', 12: '15:05-15:30',
          13: '15:35-16:00', 14: '16:05-16:30', 15: '16:35-17:00', 16: '17:05-17:30'
        };
        return timeMap[slot] ? `${slot}차수 (${timeMap[slot]})` : `${slot}차수`;
      } else {
        // 소규모 교육 (2시간 단위)
        const timeMap: Record<number, string> = {
          1: '08:30-10:20', 2: '10:30-12:20', 3: '13:40-15:30', 4: '15:40-17:30'
        };
        return timeMap[slot] ? `${slot}차수 (${timeMap[slot]})` : `${slot}차수`;
      }
    };

    // details에서 정보 추출
    const language = latest.details?.language || '미정';
    const educationType = latest.details?.educationType || latest.details?.mode || '미정';
    
    const languageText = language === 'korean-english' ? '한/영' :
                        language === 'japanese' ? '일본어' :
                        language === 'chinese' ? '중국어' : language;
    
    const modeText = educationType === '1:1' ? '1:1 교육' : '소규모 교육';

    // 카테고리 정보 (한/영 소규모만)
    const category = latest.details?.category;
    const categoryText = (language === 'korean-english' && (educationType === 'small' || educationType === 'small-group') && category) ? ` ${category}` : '';
    
    // 클래스룸 정보 추가 (소규모 교육만)
    const classroomInfo = latest.classroomInfo;
    const locationPart = (educationType === 'small' || educationType === 'small-group') && classroomInfo ? ` (${classroomInfo})` : '';

    console.log('🎓 교육 상태 메시지 디버그:', { latest, language, educationType, languageText, modeText, category, categoryText, classroomInfo, locationPart });

    return `${formatDate(educationDate)} ${formatTime(latest.slot, educationType)} ${languageText} ${modeText}${categoryText}${locationPart}을 신청하셨습니다.`;
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

  // 사용자 정보가 로드된 후 최근 제출 내역과 교육 신청 내역 가져오기
  useEffect(() => {
    if (userInfo.employeeId && authenticatedUser) {
      fetchRecentSubmission(userInfo.employeeId);
      fetchEducationRequests(userInfo.employeeId);
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
      } else if (pendingAction === "recordingRequest") {
        navigateToCalendar('recording')
      } else if (pendingAction === "educationRequest") {
        navigateToCalendar('education')
      } else if (pendingAction === "educationCheckin") {
        setShowEducationCheckin(true)
      }
      setPendingAction(null)
    }
  }

  const navigateToCalendar = (type: 'recording' | 'education') => {
    console.log('🌐 모바일 캘린더 모달 열기:', type)
    
    setCalendarType(type)
    setShowCalendarModal(true)
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
      } else if (action === "recordingRequest") {
        console.log('🗓️ 녹음 신청 캘린더로 이동')
        navigateToCalendar('recording')
      } else if (action === "educationRequest") {
        console.log('🎓 교육 신청 캘린더로 이동')
        navigateToCalendar('education')
      } else if (action === "educationCheckin") {
        console.log('✅ 교육 체크인 모달 열기')
        setShowEducationCheckin(true)
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
                   
                   {/* 교육 상태 메시지 */}
                   <div 
                     className="text-sm text-gray-600 leading-tight mt-3 pt-3 border-t border-gray-200/50 transition-all duration-1000 ease-out"
                     style={{
                       animation: 'slideInFade 1s ease-out 0.5s forwards',
                       opacity: 0,
                       transform: 'translateX(12px) scale(0.98)',
                     }}
                   >
                     <span className="text-xs text-gray-500 font-medium">📚 교육 신청:</span><br/>
                     {getEducationStatusMessage()}
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

                 {/* 탭 네비게이션 */}
         <div className={`bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-xl transition-all duration-1000 delay-1000 ${
           isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
         }`}>
           <div className="flex bg-gray-100 rounded-xl p-1">
             <button
               onClick={() => setCurrentTab('evaluation')}
               className={`flex-1 text-center px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                 currentTab === 'evaluation'
                   ? 'bg-blue-600 text-white shadow-lg'
                   : 'text-gray-600 hover:bg-white hover:shadow-md'
               }`}
             >
               <BookOpen className="w-4 h-4" />
               평가
             </button>
             <button
               onClick={() => setCurrentTab('education')}
               className={`flex-1 text-center px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                 currentTab === 'education'
                   ? 'bg-green-600 text-white shadow-lg'
                   : 'text-gray-600 hover:bg-white hover:shadow-md'
               }`}
             >
               <GraduationCap className="w-4 h-4" />
               교육
             </button>
           </div>
         </div>

         {/* 기능 카드들 */}
         <div className="grid gap-6">
          {/* 평가 탭 - 기존 기능들 */}
          {currentTab === 'evaluation' && (
            <>
          {/* 녹음 신청 카드 */}
          <Card 
            className={`bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 shadow-2xl rounded-2xl border border-white/50 card-hover cursor-pointer overflow-hidden group ${
              isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
            style={{ transitionDelay: '1050ms' }}
            onClick={(e) => handleCardClick("recordingRequest", e)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/3 via-amber-500/2 to-yellow-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <CardContent className="p-8 relative">
              <div className="flex items-center gap-6">
                <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 p-5 rounded-2xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 subtle-float">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-2">녹음 신청</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    녹음 평가 스케줄 확인 및 예약
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-to-r from-orange-600 to-amber-600 text-white border-0 text-xs font-bold px-3 py-1 shadow-lg">
                      <Calendar className="w-3 h-3 mr-1" />
                      Schedule
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결과 확인 카드 */}
          <Card 
            className={`bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 shadow-2xl rounded-2xl border border-white/50 card-hover cursor-pointer overflow-hidden group ${
              isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            } ${shouldEmphasizeReviewCard ? 'attention-pulse ring-2 ring-orange-400' : ''}`}
                         style={{ transitionDelay: '1150ms' }}
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
                    이전에 제출한 평가 결과 확인
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

          {/* 녹음 파일 제출 카드 */}
          <Card 
            className={`bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 shadow-2xl rounded-2xl border border-white/50 card-hover cursor-pointer overflow-hidden group ${
              isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
            style={{ transitionDelay: '1200ms' }}
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
                    부산베이스 전용 업로드 페이지
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
            </>
          )}

          {/* 교육 탭 - 교육 관련 기능들 */}
          {currentTab === 'education' && (
            <>
              {/* 교육 신청 카드 */}
              <Card 
                className={`bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 shadow-2xl rounded-2xl border border-white/50 card-hover cursor-pointer overflow-hidden group ${
                  isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: '1050ms' }}
                onClick={(e) => handleCardClick("educationRequest", e)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 via-emerald-500/2 to-teal-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <CardContent className="p-8 relative">
                  <div className="flex items-center gap-6">
                    <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-5 rounded-2xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 subtle-float">
                      <Calendar className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">교육 신청</h3>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        언어별 교육 일정 확인 및 예약
                      </p>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 text-xs font-bold px-3 py-1 shadow-lg">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          Education
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 교육 체크인 카드 */}
              <Card 
                className={`bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/20 shadow-2xl rounded-2xl border border-white/50 card-hover cursor-pointer overflow-hidden group ${
                  isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: '1150ms' }}
                onClick={(e) => handleCardClick("educationCheckin", e)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/3 via-indigo-500/2 to-blue-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <CardContent className="p-8 relative">
                  <div className="flex items-center gap-6">
                    <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-5 rounded-2xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 subtle-float">
                      <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">교육 체크인</h3>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        신청한 교육에 출석체크
                      </p>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 text-xs font-bold px-3 py-1 shadow-lg">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          Check-in
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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

      {/* 교육 체크인 모달 */}
      <EducationCheckinModal
        isOpen={showEducationCheckin}
        onClose={() => setShowEducationCheckin(false)}
        userInfo={userInfo}
      />

      {/* 캘린더 모달들 */}
      {calendarType === 'recording' && authenticatedUser && (
        <MobileRecordingCalendar
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          authenticatedUser={authenticatedUser}
          userInfo={userInfo}
        />
      )}
      
      {calendarType === 'education' && authenticatedUser && (
        <MobileEducationCalendar
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          authenticatedUser={authenticatedUser}
          userInfo={userInfo}
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
  const [activeTab, setActiveTab] = useState<"profile" | "qualifications" | "requests">("profile")
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [myRequestsLoading, setMyRequestsLoading] = useState(false)
  const [classroomInfoMap, setClassroomInfoMap] = useState<Map<string, string>>(new Map())
  const [requestFilter, setRequestFilter] = useState<'all' | 'recording' | 'education'>('all')
  const filteredRequests = myRequests.filter(r => requestFilter === 'all' || r.type === requestFilter)
  
  const myPageDialogHook = useCustomDialog()
  const { isOpen: customDialogOpen, config: customDialogConfig, close: customDialogClose, showAlert, showConfirm } = myPageDialogHook

  // 신청 내역 로드 - 데스크톱과 동일한 로직
  const loadMyRequests = async () => {
    if (!user?.email || !userInfo.employeeId) return
    
    setMyRequestsLoading(true)
    try {
      const employeeId = userInfo.employeeId || 'TEMP001'
      console.log('🔍 [모바일 MyPage] 신청 내역 조회 - employeeId:', employeeId)
      
      // Database API 우선 시도
      const res = await fetch(`/api/requests/database?employeeId=${employeeId}`)
      const data = await res.json()
      console.log('📄 [모바일 MyPage] 신청 내역 응답:', data)
      
      if (data.success && data.items) {
        // 캘린더 스케줄 API에서 교실 정보 가져오기 (메인 페이지와 동일한 로직)
        const uniqueMonths = [...new Set(data.items.map((item: any) => item.date.slice(0, 7)))]
        const classroomInfoMap = new Map()
        
        for (const month of uniqueMonths) {
          try {
            console.log(`🔍 [모바일 MyPage] ${month} 월 스케줄 로드 중...`)
            const scheduleRes = await fetch(`/api/schedules?month=${month}`)
            if (scheduleRes.ok) {
              const scheduleData = await scheduleRes.json()
              console.log(`📅 [모바일 MyPage] ${month} 스케줄 응답:`, scheduleData)
              
              if (scheduleData.data?.days) {
                scheduleData.data.days.forEach((day: any) => {
                  console.log(`🔍 [모바일 MyPage] 날짜 ${day.date} 교육 데이터:`, day.education)
                  if (day.education && Array.isArray(day.education)) {
                    day.education.forEach((edu: any) => {
                      console.log(`🔍 [모바일 MyPage] 교육 객체:`, edu)
                      if (edu.classroomInfo && edu.type && edu.slots) {
                        edu.slots.forEach((slot: number) => {
                          // 카테고리가 있는 경우와 없는 경우 모두 처리
                          if (edu.type.category) {
                            // 카테고리별 키 (한/영 소규모)
                            const categoryKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}_${edu.type.category}`;
                            classroomInfoMap.set(categoryKey, edu.classroomInfo);
                            console.log(`✅ [모바일 MyPage] 카테고리별 교실 정보: ${categoryKey} → ${edu.classroomInfo}`);
                          } else {
                            // 기본 키 (카테고리 없는 교육: 일본어/중국어, 1:1)
                            const baseKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}`;
                            classroomInfoMap.set(baseKey, edu.classroomInfo);
                            console.log(`✅ [모바일 MyPage] 기본 교실 정보: ${baseKey} → ${edu.classroomInfo}`);
                          }
                        });
                      }
                    });
                  }
                });
              }
            }
          } catch (error) {
            console.warn(`모바일 클래스룸 정보 로드 실패 (${month}):`, error)
          }
        }
        
        console.log('🏫 [모바일 MyPage] 최종 교실 정보 맵:', Object.fromEntries(classroomInfoMap))
        
        // 교육 항목에 클래스룸 정보 추가 (메인 페이지와 동일한 로직)
        const enrichedItems = data.items.map((item: any) => {
          const language = item.details?.language || 'korean-english';
          const mode = item.details?.mode || item.details?.educationType || '1:1';
          const category = item.details?.category;
          const normalizedMode = mode === 'small-group' ? 'small' : mode;
          
          console.log(`🔍 [모바일 MyPage] 원본 신청 데이터:`, {
            date: item.date,
            slot: item.slot,
            details: item.details,
            schedule: item.schedule,
            language,
            mode,
            category,
            normalizedMode,
            expectedCategoryKey: `${item.date}_${item.slot}_${language}_${normalizedMode}_${category}`,
            expectedBaseKey: `${item.date}_${item.slot}_${language}_${normalizedMode}`
          });
          
          // 클래스룸 정보 매칭 (스케줄 API 우선)
          let classroomInfo = null;
          
          // 1. Database API에서 제공하는 클래스룸 정보 확인
          if (item.schedule?.classroom) {
            console.log(`🚨 [모바일 MyPage] Database API 클래스룸 발견: ${item.schedule.classroom} (카테고리: ${category})`);
            // 카테고리별 매칭을 우선 시도하고, 실패하면 Database API 사용
          }
          
          // 2. 스케줄 API 매칭 우선 시도
          {
            // 소규모 교육의 경우 차수를 녹음 슬롯으로 변환
            let actualSlots = [item.slot];
            if (normalizedMode === 'small') {
              // 소규모 교육: 차수 → 녹음 슬롯 변환
              const slotMapping = {
                1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8]
              };
              actualSlots = slotMapping[item.slot as keyof typeof slotMapping] || [item.slot];
              console.log(`🔄 [모바일 MyPage] 소규모 차수 변환: ${item.slot}차 → 녹음슬롯 [${actualSlots}]`);
            }
            
            // 각 녹음 슬롯에 대해 카테고리별 키 시도
            if (category && language === 'korean-english' && normalizedMode === 'small') {
              for (const slot of actualSlots) {
                const categoryKey = `${item.date}_${slot}_${language}_${normalizedMode}_${category}`;
                classroomInfo = classroomInfoMap.get(categoryKey);
                console.log(`🔍 [모바일 MyPage] 카테고리 키 시도: ${categoryKey} → ${classroomInfo}`);
                if (classroomInfo) break;
              }
            }
            
            // 기본 키 시도 (카테고리 없는 교육이거나 카테고리별 매칭 실패)
            if (!classroomInfo) {
              for (const slot of actualSlots) {
                const baseKey = `${item.date}_${slot}_${language}_${normalizedMode}`;
                classroomInfo = classroomInfoMap.get(baseKey);
                console.log(`🔍 [모바일 MyPage] 기본 키 시도: ${baseKey} → ${classroomInfo}`);
                if (classroomInfo) break;
              }
            }
            
            // 스케줄 API 매칭 실패 시 Database API 폴백
            if (!classroomInfo && item.schedule?.classroom) {
              classroomInfo = item.schedule.classroom;
              console.log(`🔄 [모바일 MyPage] Database API 폴백: ${classroomInfo}`);
            }
          }
          
          // 클래스룸 정보 포맷팅
          const formattedClassroom = classroomInfo ? (classroomInfo.includes('학과장') ? classroomInfo : `${classroomInfo} 학과장`) : '';
          
          console.log(`🔍 [모바일 MyPage] 교실 매칭: ${item.date}_${item.slot}_${language}_${normalizedMode} (카테고리: ${category || 'none'}) → ${classroomInfo} → ${formattedClassroom}`);
          
          return {
          id: item.id,
          type: item.type,
          date: item.date,
          slot: item.slot,
          details: item.details,
          applicationTime: item.appliedAt,
            status: item.status,
            classroomInfo: formattedClassroom
          };
        });
        
        console.log('📊 [모바일 MyPage] 교육 신청 내역 (클래스룸 정보 포함):', enrichedItems);
        setMyRequests(enrichedItems);
        console.log('✅ [모바일 MyPage] 신청 내역 로드 완료:', enrichedItems.length, '개')
        
        // 실제 설정된 데이터 확인
        setTimeout(() => {
          console.log('🔍 [모바일 MyPage] setMyRequests 후 실제 데이터 확인:', enrichedItems.map(item => ({
            id: item.id,
            date: item.date,
            slot: item.slot,
            classroomInfo: item.classroomInfo,
            hasClassroomInfo: !!item.classroomInfo
          })));
        }, 100);
      } else {
        // Database API 실패시 Dropbox API로 fallback
        console.log('🔄 [모바일 MyPage] Database 실패, Dropbox API로 fallback')
        const fallbackRes = await fetch(`/api/requests/dropbox?employeeId=${employeeId}&email=${user.email}`)
        const fallbackData = await fallbackRes.json()
        
        if (fallbackData.requests) {
          setMyRequests(fallbackData.requests)
          console.log('✅ [모바일 MyPage] Dropbox 신청 내역 로드 완료:', fallbackData.requests.length, '개')
        }
      }
    } catch (error) {
      console.error('모바일 MyPage 신청 내역 조회 실패:', error)
      setMyRequests([])
    } finally {
      setMyRequestsLoading(false)
    }
  }

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

  // 신청 내역 탭이 활성화될 때 로드
  useEffect(() => {
    if (activeTab === "requests" && user?.email && userInfo.employeeId) {
      loadMyRequests()
    }
  }, [activeTab, user?.email, userInfo.employeeId])

  // 신청 취소 함수 - 데스크톱과 동일한 로직
  const handleCancelRequest = async (recordId: string) => {
    const confirmed = await showConfirm({
      title: '신청 취소',
      message: '정말 취소하시겠습니까?',
      type: 'warning',
      confirmText: '취소하기',
      cancelText: '돌아가기'
    })
    if (!confirmed) return
    
    try {
      // Database 우선 시도: /api/requests/database DELETE
      console.log('🗑️ [모바일 MyPage 취소] Database DELETE 시도:', recordId)
      
      let res = await fetch(`/api/requests/database?id=${recordId}&employeeId=${userInfo.employeeId || 'TEMP001'}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      let data = await res.json()
      
      // Database에서 실패하면 Dropbox fallback
      if (!res.ok || !data.success) {
        console.log('🔄 [모바일 MyPage 취소] Database 실패, Dropbox API로 fallback')
        
        // 해당 신청 찾기
        const request = myRequests.find(r => r.id === recordId)
        if (!request) {
          throw new Error('신청 내역을 찾을 수 없습니다.')
        }
        
        // Dropbox API로 취소 시도
        res = await fetch('/api/requests/cancel-dropbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: request.type,
            date: request.date,
            slot: request.slot,
            employeeId: userInfo.employeeId || 'TEMP001'
          })
        })
        
        data = await res.json()
      }
      
      if (data.success) {
        showAlert({
          title: '취소 완료',
          message: '신청이 취소되었습니다.',
          type: 'success'
        })
        // 신청 내역 새로고침하여 UI 업데이트
        loadMyRequests()
      } else {
        // 데스크톱과 동일한 오류 처리
        if (data.error === '취소기간만료') {
          const scheduleDate = new Date(data.scheduleDate || '').toLocaleDateString('ko-KR')
          const deadline = new Date(data.deadline || '').toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          showAlert({
            title: '취소 기간 만료',
            message: `취소 기간이 만료되었습니다.

📅 교육/녹음 날짜: ${scheduleDate}
⏰ 취소 가능 기한: ${deadline}까지

🏢 취소를 원하시면 담당자에게 연락하여 취소 사유를 말씀해 주세요.

⚠️ 합당하지 않은 사유로 취소할 경우, 다음 달의 녹음/교육 신청이 제한될 수 있습니다.`,
            type: 'warning'
          })
        } else {
          showAlert({
            title: '취소 실패',
            message: `취소 실패: ${data.error || '알 수 없는 오류'}`,
            type: 'error'
          })
        }
      }
    } catch (error) {
      console.error('신청 취소 실패:', error)
      showAlert({
        title: '취소 실패',
        message: `취소 실패: ${error}`,
        type: 'error'
      })
    }
  }

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
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "requests"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              내 신청 내역
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

          {activeTab === "requests" && (
            <div className="space-y-6">
              {!myRequestsLoading && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRequestFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${requestFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setRequestFilter('recording')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${requestFilter === 'recording' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                  >
                    녹음
                  </button>
                  <button
                    onClick={() => setRequestFilter('education')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${requestFilter === 'education' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                  >
                    교육
                  </button>
                </div>
              )}

              {myRequestsLoading ? (
                <div className="bg-white rounded-xl shadow-lg p-8 border border-blue-100">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-500 font-medium">신청 내역을 불러오는 중...</div>
                  </div>
                </div>
              ) : myRequests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-8 border border-blue-100 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">신청 내역이 없습니다</h3>
                  <p className="text-gray-600">교육이나 녹음을 신청해보세요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => {
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

                    const getSlotTimeInfo = () => {
                      // 취소 가능 시간까지 남은 시간 계산
                      const scheduleDate = new Date(request.date)
                      const twoDaysBefore = new Date(scheduleDate)
                      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
                      twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
                      
                      const now = new Date()
                      const hoursDiff = (twoDaysBefore.getTime() - now.getTime()) / (1000 * 60 * 60)
                      
                      return { hoursDiff }
                    }

                    const getRequestLabel = (request: any) => {
                      if (request.type === 'recording') {
                        const langMap: Record<string, string> = {
                          'korean-english': '한/영',
                          'chinese': '중국어',
                          'japanese': '일본어'
                        }
                        const recordingLang = request.details?.recordingLanguage || request.details?.language
                        return `녹음: ${langMap[recordingLang] || recordingLang || '알 수 없음'}`
                      } else if (request.type === 'education') {
                        const eduTypeMap: Record<string, string> = {
                          '1:1': '1:1',
                          'small-group': '소규모',
                          'small': '소규모'
                        }
                        const langMap: Record<string, string> = {
                          'korean-english': '한/영',
                          'chinese': '중국어',
                          'japanese': '일본어'
                        }
                        
                        const eduType = eduTypeMap[request.details?.educationType || request.details?.mode] || '교육'
                        const lang = langMap[request.details?.language] || request.details?.language || ''
                        
                        // 카테고리 정보 (한/영 소규모만)
                        const category = request.details?.category
                        const categoryText = (request.details?.language === 'korean-english' && 
                                            (request.details?.educationType === 'small' || request.details?.educationType === 'small-group') && 
                                            category) ? ` ${category}` : ''
                        
                        // 클래스룸 정보 (소규모 교육만)
                        const classroomInfo = request.classroomInfo
                        const locationPart = (request.details?.educationType === 'small' || request.details?.educationType === 'small-group') && classroomInfo ? ` (${classroomInfo})` : ''
                        
                        console.log(`🔍 [모바일 MyPage] getRequestLabel 디버그:`, {
                          requestId: request.id,
                          date: request.date,
                          slot: request.slot,
                          language: request.details?.language,
                          educationType: request.details?.educationType,
                          category,
                          classroomInfo,
                          locationPart,
                          fullRequest: request
                        })
                        
                        return `${lang} ${eduType}${categoryText}${locationPart}`
                      }
                      return '알 수 없음'
                    }

                    const { hoursDiff } = getSlotTimeInfo()

                    return (
                      <div key={request.id} className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                        {/* 상단 헤더 - 타입별 색상 구분 */}
                        <div className={`p-4 ${
                          request.type === 'education' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                {request.type === 'education' ? (
                                  <GraduationCap className="w-5 h-5 text-white" />
                                ) : (
                                  <Mic className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="text-white font-bold text-lg">
                                  {request.type === 'education' ? '교육' : '녹음'}
                                </div>
                                <div className="text-white/80 text-sm">
                                  {getMobileRequestDetailLabel(request, classroomInfoMap)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-semibold">
                                {request.slot}차수
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 메인 컨텐츠 */}
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="font-bold text-gray-900 mb-2 text-lg">
                                📅 {new Date(request.date).toLocaleDateString('ko-KR', {
                                  month: 'long', 
                                  day: 'numeric', 
                                  weekday: 'short'
                                })}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium text-gray-700">시간</span>
                                </div>
                                <div className="text-gray-900 font-semibold">
                                  {(() => {
                                    if (request.type === 'recording') {
                                      // 녹음 시간표 - 데스크톱 녹음 캘린더와 완전히 동일
                                      const timeMap: Record<number, string> = {
                                        1: '08:30-09:20', 2: '09:30-10:20', 3: '10:30-11:20', 4: '11:30-12:20',
                                        5: '13:40-14:30', 6: '14:40-15:30', 7: '15:40-16:30', 8: '16:40-17:30'
                                      }
                                      return timeMap[request.slot] || '시간 미정'
                                    } else if (request.type === 'education') {
                                      // 교육 시간표 - educationType에 따라 다름
                                      const educationType = request.details?.educationType
                                      if (educationType === '1:1') {
                                        // 1:1 교육 (25분 단위)
                                        const timeMap: Record<number, string> = {
                                          1: '08:30-08:55', 2: '09:00-09:25', 3: '09:30-09:55', 4: '10:00-10:25',
                                          5: '10:30-10:55', 6: '11:00-11:25', 7: '11:30-11:55', 8: '12:00-12:25',
                                          9: '13:35-14:00', 10: '14:05-14:30', 11: '14:35-15:00', 12: '15:05-15:30',
                                          13: '15:35-16:00', 14: '16:05-16:30', 15: '16:35-17:00', 16: '17:05-17:30'
                                        }
                                        return timeMap[request.slot] || '시간 미정'
                                      } else {
                                        // 소규모 교육 (2시간 단위)
                                        const timeMap: Record<number, string> = {
                                          1: '08:30-10:20', 2: '10:30-12:20', 3: '13:40-15:30', 4: '15:40-17:30'
                                        }
                                        return timeMap[request.slot] || '시간 미정'
                                      }
                                    }
                                    return '시간 미정'
                                  })()}
                                </div>
                              </div>
                              
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                신청일: {new Date(request.applicationTime).toLocaleDateString('ko-KR')}
                              </div>
                            </div>
                          
                          </div>
                          
                          {/* 하단 액션 영역 */}
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {canCancel() ? (
                                  <>
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm text-green-600 font-medium">
                                      취소 가능 ({Math.floor(hoursDiff)}시간 남음)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="text-sm text-red-600 font-medium">
                                      취소 불가 (2일 전 14:00 이후)
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {canCancel() ? (
                                <button
                                  onClick={() => handleCancelRequest(request.id)}
                                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl active:scale-95"
                                >
                                  취소하기
                                </button>
                              ) : (
                                <button
                                  onClick={() => showAlert({
                                    title: '취소 불가',
                                    message: '교육/녹음일 기준 2일 전 오후 2시까지만 취소할 수 있습니다.\n취소가 필요한 경우 담당자에게 연락해주세요.',
                                    type: 'info'
                                  })}
                                  className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                                >
                                  취소 불가
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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

      {/* 커스텀 다이얼로그 */}
      {customDialogOpen && (
        <CustomDialog
          isOpen={customDialogOpen}
          onClose={customDialogClose}
          title={customDialogConfig.title}
          message={customDialogConfig.message}
          type={customDialogConfig.type}
          showCancel={customDialogConfig.showCancel}
          confirmText={customDialogConfig.confirmText}
          cancelText={customDialogConfig.cancelText}
          onConfirm={customDialogConfig.onConfirm}
          onCancel={customDialogConfig.onCancel}
        />
      )}

    </div>
  )
}

// 모바일에서 사용할 통일된 detail 표시 함수
function getMobileRequestDetailLabel(request: any, classroomInfoMap: Map<string, string>) {
  if (request.type === 'recording') {
    const language = request.details?.recordingLanguage || 'recording'
    const languageLabel = language === 'korean-english' ? '한/영' : 
                         language === 'japanese' ? '일본어' : 
                         language === 'chinese' ? '중국어' : language
    return languageLabel
  }
  
  // 교육 타입의 경우
  const language = request.details?.language || 'korean-english'
  const languageLabel = language === 'korean-english' ? '한/영' : 
                       language === 'japanese' ? '일본어' : 
                       language === 'chinese' ? '중국어' : language
  
  const mode = request.details?.mode || request.details?.educationType || '1:1'
  const modeLabel = (mode === 'small' || mode === 'small-group') ? '소규모' : '1:1'
  
  const category = request.details?.category || '공통'
  
  // 교실 정보 - request.classroomInfo를 우선 사용, 없으면 classroomInfoMap에서 가져오기
  let classroom = request.classroomInfo || ''
  
  if (!classroom) {
    // fallback: classroomInfoMap에서 가져오기
    const educationKey = `${request.date}_${request.slot}_${language}_${mode === 'small' || mode === 'small-group' ? 'small' : '1:1'}`
    const educationClassroom = classroomInfoMap.get(educationKey) || ''
    classroom = educationClassroom ? (educationClassroom.includes('학과장') ? educationClassroom : `${educationClassroom} 학과장`) : ''
    console.log(`🔍 [모바일 MyPage] 교실 매칭 (fallback): ${educationKey} → ${educationClassroom} → ${classroom}`)
  }
  
  const locationPart = (mode === 'small' || mode === 'small-group') && classroom ? ` · ${classroom}` : ''
  
  console.log(`🔍 [모바일 MyPage] 최종 교실 정보: request.classroomInfo=${request.classroomInfo}, classroom=${classroom}, locationPart=${locationPart}`)
  
  // 카테고리 이모지 및 라벨
  const categoryEmoji = category === '신규' ? '✨' :
                       category === '재자격' ? '🔄' :
                       category === '공통' ? '👥' :
                       category === 'PUS' ? '✈️' : '📚'
  
  const categoryPart = category ? ` ${categoryEmoji}${category}` : ''
  
  return `${languageLabel} ${modeLabel}${locationPart}${categoryPart}`.trim()
}

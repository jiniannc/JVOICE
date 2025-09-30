"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PDFUploadManager } from "@/components/pdf-upload-manager"
import { ScheduleSyncAdmin } from "@/components/schedule-sync-admin"
import { EvaluationSummary } from "@/components/evaluation-summary"
import { FileUploadEvaluation } from "@/components/file-upload-evaluation"
import { AdminRequestManagerModal } from "@/components/admin-request-manager-modal"
import { AdminEducationJournalModal } from "@/components/admin-education-journal-modal"
import { InstructorStatsModal } from "@/components/instructor-stats-modal"
import { RecordingManagementModal } from "@/components/recording-management-modal"
import {
  CheckCircle,
  Download,
  Clock,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Home,
  Search,
  Filter,
  Trash2,
  SortDesc,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileAudio,
  Globe,
  Users,
  RotateCcw,
  Activity,
} from "lucide-react"
import { getGradeInfo } from "@/lib/evaluation-criteria";

// SubmissionData 인터페이스를 Evaluation 데이터 구조와 통합
interface Submission {
  // candidateInfo에서 가져오는 정보
  id: string;
  name: string;
  employeeId: string;
  language: string;
  category: string;
  submittedAt: string;
  recordingCount?: number;
  scriptNumbers?: number[];
  comment?: string;
  duration?: number;
  
  // evaluation 전체 데이터
  status: "pending" | "review_requested" | "submitted" | "completed" | "deleted" | "re_evaluation";
  scores?: { [key: string]: number };
  categoryScores?: { [key: string]: any };
  koreanTotalScore?: number;
  englishTotalScore?: number;
  totalScore?: number;
  grade?: string;
  comments?: { korean: string; english: string } | string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  reviewRequestedBy?: string;
  dropboxPath?: string;
  approved?: boolean;
}

// 타입 가드 함수: 평가가 완료되었고 필수 데이터가 있는지 확인
function isFullyEvaluated(submission: Submission): submission is Submission & {
  grade: string;
  totalScore: number;
  evaluatedAt: string;
  evaluatedBy: string;
  comments: { korean: string; english: string } | string;
} {
  return (
    (submission.status === "submitted" || submission.status === "completed" || submission.approved === true) &&
    typeof submission.grade === "string" &&
    typeof submission.totalScore === "number" &&
    typeof submission.evaluatedAt === "string" &&
    typeof submission.evaluatedBy === "string" &&
    submission.comments !== undefined
  );
}


export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedResult, setSelectedResult] = useState<Submission | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [listMonth, setListMonth] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  // (관리자) 응시 목록 상태 제거됨

  // 실제 데이터에서 사용 가능한 월들을 추출하여 드롭다운 생성
  const monthOptions = useMemo(() => {
    // submissions에서 고유한 월들을 추출
    const uniqueMonths = new Set<string>();
    
    submissions.forEach(sub => {
      if (sub.submittedAt) {
        const month = sub.submittedAt.slice(0, 7); // YYYY-MM 형식
        uniqueMonths.add(month);
      }
    });
    
    // 월별로 정렬 (최신순)
    const sortedMonths = Array.from(uniqueMonths).sort().reverse();
    
    const options = sortedMonths.map(month => {
      const date = new Date(month + '-01'); // 월의 첫째 날로 Date 객체 생성
      return {
        value: month,
        label: date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })
      };
    });
    // 테이블용 '전체' 옵션 지원을 위해 상단에 공통 옵션 추가 (selectedMonth는 통계/다운로드용이라 유지)
    return options;
  }, [submissions]);

  // 월 선택 시 드롭다운 목록이 비는 문제 방지: 로드된 월도 합산해 보존
  const [loadedMonths, setLoadedMonths] = useState<string[]>([])
  useEffect(() => {
    const months = Array.from(new Set([...
      loadedMonths,
      ...submissions
        .filter(s => s.submittedAt)
        .map(s => s.submittedAt!.slice(0,7))
    ])).sort().reverse()
    setLoadedMonths(months)
  }, [submissions])

  // 컴포넌트 마운트 시 시간 제한 상태 로드
  useEffect(() => {
    loadTimeRestrictionsStatus()
  }, [])

  // 필터 및 검색 상태
  // 검색 기능 제거
  const [searchTerm, setSearchTerm] = useState("")
  
  // 시간 제한 토글 상태
  const [timeRestrictionsDisabled, setTimeRestrictionsDisabled] = useState(false)
  const [timeRestrictionsLoading, setTimeRestrictionsLoading] = useState(false)
  const [showRequestManager, setShowRequestManager] = useState(false)
  const [showEducationJournalManager, setShowEducationJournalManager] = useState(false)
  const [showInstructorStats, setShowInstructorStats] = useState(false)
  const [showRecordingManager, setShowRecordingManager] = useState(false)
  const [searchMode, setSearchMode] = useState<"all" | "monthly">("monthly")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(1000) // 모든 데이터 로드
  const [hasNextPage, setHasNextPage] = useState(false)
  const [totalPagesServer, setTotalPagesServer] = useState(1)
  const [totalCountServer, setTotalCountServer] = useState(0)
  const isServerPaging = true
  
  // 파일 업로드 상태
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 로그인 기록 상태
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [showLoginLogs, setShowLoginLogs] = useState(false)
  const [loginLogsLoading, setLoginLogsLoading] = useState(false)
  const [loginLogsPagination, setLoginLogsPagination] = useState<any>({})
  // 등록된 컴퓨터 목록 상태
  const [allowedDevices, setAllowedDevices] = useState<{ ip: string; label?: string; createdAt: string; createdBy?: string }[]>([])
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [deviceLabel, setDeviceLabel] = useState("")
  const [currentIp, setCurrentIp] = useState<string>("")

  useEffect(() => {
    loadData(1, itemsPerPage, "replace");
    setLastUpdate(new Date().toLocaleTimeString());
    loadLoginLogs(); // 로그인 기록 자동 로드 추가
    // 자동 새로고침 제거, 수동 업데이트만 허용
  }, []);

  // 월 변경 시점에 해당 월 데이터만 새로 로드 (선택 시 다운로드)
  useEffect(() => {
    if (listMonth && listMonth.length === 7) {
      loadData(1, itemsPerPage, "replace");
    }
  }, [listMonth]);
  // (관리자) 응시 목록 로드 제거됨

  const loadData = async (page: number = 1, limit: number = itemsPerPage, mode: "append" | "replace" = "replace") => {
    setIsLoading(true)
    
    // 재시도 로직
    const retryFetch = async (url: string, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            return response;
          }
          console.warn(`⚠️ [관리자] API 호출 실패 (시도 ${i + 1}/${retries}):`, response.status);
        } catch (error) {
          console.warn(`⚠️ [관리자] API 호출 오류 (시도 ${i + 1}/${retries}):`, error);
        }
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 지수 백오프
        }
      }
      throw new Error(`API 호출 실패 (${retries}회 시도 후)`);
    };
    
    try {
      // 최신 월의 모든 데이터만 로드 (month 미지정일 때는 최신 10개만)
      const selectedYm = listMonth && listMonth.length === 7 ? listMonth : undefined
      
      // 캐시 버스터 제거 (성능 최적화)
      const cacheBuster = '';
      
      // Database API로 변경 - 모든 상태의 평가 데이터를 한 번에 로드
      const [allEvaluationsRes] = await Promise.all([
        retryFetch(`/api/evaluations/load-database?${selectedYm ? `month=${selectedYm}&limit=50000` : `limit=50000&page=1`}${cacheBuster}`),
      ]);

      if (!allEvaluationsRes.ok) {
        const errorText = await allEvaluationsRes.text();
        console.error('❌ [관리자] Database API 오류:', allEvaluationsRes.status, errorText);
        throw new Error(`Database 데이터 로딩 실패: ${allEvaluationsRes.status}`);
      }

      const allEvaluationsData = await allEvaluationsRes.json();
      
      // Database에서 모든 상태의 평가 데이터를 받아옴
      let mergedEvaluations = (allEvaluationsData.evaluations || []) as any[]
      mergedEvaluations = mergedEvaluations.filter(Boolean)
      // 1) 유효성 필터를 먼저 적용하여 총합/페이지 계산과 일치시키기
      const isValid = (ev: any): boolean => {
        // Database API 구조에 맞게 수정: evaluation.id와 candidateInfo 분리
        return Boolean(ev && ev.id && ev.candidateInfo && ev.candidateInfo.name && ev.candidateInfo.employeeId)
      }
      const safeDate = (ev: any): number => {
        const raw = ev?.candidateInfo?.submittedAt || ev?.submittedAt || ev?.dropboxCreatedTime || 0
        // 다양한 형식 대응: ISO, 'YYYY-MM-DD', 'YYYY년 M월 D일 ...'
        if (typeof raw === 'number') return raw
        if (typeof raw !== 'string') return 0
        // ISO/표준
        const t1 = Date.parse(raw)
        if (!Number.isNaN(t1)) return t1
        // 'YYYY년 M월 D일 HH:MM' 또는 'YYYY년 M월 D일'
        const m = raw.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*(\d{1,2}):(\d{1,2}))?/)
        if (m) {
          const y = parseInt(m[1], 10)
          const mo = parseInt(m[2], 10) - 1
          const d = parseInt(m[3], 10)
          const hh = m[4] ? parseInt(m[4], 10) : 0
          const mm = m[5] ? parseInt(m[5], 10) : 0
          return new Date(y, mo, d, hh, mm, 0).getTime()
        }
        return 0
      }

      const validMerged = mergedEvaluations.filter(isValid)
      // 2) 최신순 정렬 (월 무관, 상태 무관)
      validMerged.sort((a: any, b: any) => safeDate(b) - safeDate(a))
      // 3) 현재 페이지 구간만 추출
      const pageEvaluations = validMerged // 월 선택 시 전체 표출

      console.log(`✅ [관리자] Page ${page} 로드 완료 (합계: ${pageEvaluations.length})`);
      console.log('🔍 [관리자] 원본 데이터 샘플:', pageEvaluations.slice(0, 2));
      
      const formattedSubmissions: Submission[] = pageEvaluations
        .filter((ev: any) => {
          // 위에서 유효성 필터를 이미 적용했으므로 true
          return true;
        })
        .map((ev: any) => {
          // 데이터 구조 불일치 해결: infoSource를 통해 정규화
          const infoSource = ev.candidateInfo || ev;
          // 등급 계산: grade가 없거나 N/A면 클라이언트에서 계산
          let grade = ev.grade;
          if (!grade || grade === 'N/A') {
            try {
              const info = getGradeInfo(
                typeof ev.totalScore === 'number' ? ev.totalScore : 0,
                ev.categoryScores || {},
                infoSource.language,
                infoSource.category
              );
              grade = info.grade;
            } catch (e) {
              grade = 'N/A';
            }
          }
          return {
            // candidateInfo 내용물
            id: ev.id, // 평가 ID 사용 (candidateInfo.id가 아님)
            name: infoSource.name,
            employeeId: infoSource.employeeId,
            language: infoSource.language,
            category: infoSource.category,
            submittedAt: infoSource.submittedAt || ev.dropboxCreatedTime,
            recordingCount: infoSource.recordingCount,
            scriptNumbers: infoSource.scriptNumbers,
            comment: infoSource.comment,
            duration: infoSource.duration,
            // evaluation 상위 내용물
            status: ev.status,
            scores: ev.scores,
            categoryScores: ev.categoryScores,
            koreanTotalScore: ev.koreanTotalScore,
            englishTotalScore: ev.englishTotalScore,
            totalScore: ev.totalScore,
            grade, // 등급 반영 (중복 제거)
            comments: ev.comments,
            evaluatedAt: ev.evaluatedAt,
            evaluatedBy: ev.evaluatedBy,
            reviewRequestedBy: ev.reviewRequestedBy,
            reviewRequestedAt: ev.reviewRequestedAt,
            dropboxPath: ev.dropboxPath,
            approved: ev.approved, // approved 필드 추가
          }
        });

      console.log(`✅ [관리자] 필터링 후 유효한 데이터: ${formattedSubmissions.length}개`);
      setSubmissions(prev => mode === "append" ? [...prev, ...formattedSubmissions] : formattedSubmissions);
      const totalMerged = validMerged.length
      setTotalCountServer(totalMerged)
      setHasNextPage(page * limit < totalMerged)
      setTotalPagesServer(Math.max(1, Math.ceil(totalMerged / limit)))
      
      // 데이터가 로드된 후 통계/다운로드용 월은 자동 선택하되, 목록 필터는 기본 '전체'
      if (page === 1 && formattedSubmissions.length > 0) {
        const firstMonth = formattedSubmissions[0].submittedAt?.slice(0, 7);
        if (firstMonth) {
          setSelectedMonth(firstMonth);
        }
        // 기본 월 선택은 첫 데이터의 월로 설정
        setListMonth(firstMonth || "");
      }

    } catch (error) {
      console.error("❌ [관리자] 데이터 로딩 실패:", error)
      setSubmissions([]); // 실패 시 데이터 비우기
    } finally {
      setIsLoading(false)
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

  const getLanguageFlag = (language: string) => {
    return <></>;
  }

  // 평가대기목록과 동일하게 언어별 색상 뱃지 적용
  const getLanguageColor = (language: string) => {
    const colorMap: { [key: string]: string } = {
      "korean-english": "border-blue-300 bg-blue-50 text-blue-700",
      "japanese": "border-purple-300 bg-purple-50 text-purple-700",
      "chinese": "border-red-300 bg-red-50 text-red-700",
    }
    return colorMap[language] || "border-gray-300 bg-gray-50 text-gray-700"
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-"
    return `${minutes}분`
  }

  // 평가 결과 확인 함수 - selectedResult를 설정
  const viewEvaluationResult = (submissionId: string) => {
    const result = submissions.find((sub) => sub.id === submissionId);
    console.log("🔥🔥🔥 [ADMIN DEBUG] viewEvaluationResult 호출 🔥🔥🔥")
    console.log("🔥 [ADMIN] submissionId:", submissionId)
    console.log("🔥 [ADMIN] 찾은 result:", result)
    
    if (result) {
      console.log("🔥 [ADMIN] result.categoryScores:", result.categoryScores)
      console.log("🔥 [ADMIN] result.scores:", result.scores)
      console.log("🔥 [ADMIN] result.language:", result.language)
      
      // 한/영 평가일 경우, 각 언어별 총점 계산
      if (result.language === "korean-english" && result.categoryScores) {
        const koreanTotalScore = result.categoryScores["korean"] || 0;
        const englishTotalScore = result.categoryScores["english"] || 0;
        
        const finalResult = {
          ...result,
          koreanTotalScore,
          englishTotalScore,
        };
        console.log("🔥 [ADMIN] 한/영 최종 결과:", finalResult)
        setSelectedResult(finalResult);
      } else {
        console.log("🔥 [ADMIN] 일본어/중국어 최종 결과:", result)
        setSelectedResult(result);
      }
    } else {
      console.log("🔥 [ADMIN] ERROR: result를 찾을 수 없음!")
    }
  };

  // 삭제 함수
  const handleDelete = async (submissionId: string) => {
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) {
      alert('제출 데이터를 찾을 수 없습니다.');
      return;
    }

    // 관리자 확인
    const confirmed = window.confirm(
      `정말로 "${submission.name} (${submission.employeeId})"의 녹음 제출을 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      // 🔥 Database API를 사용한 삭제 처리
      const response = await fetch('/api/evaluations/delete-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationId: submission.id,
          deletedBy: 'Admin',
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('녹음 제출이 성공적으로 삭제되었습니다.');
        // 목록 새로고침
        await loadData();
      } else {
        alert(`삭제 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('삭제 처리 중 오류:', error);
      alert('삭제 처리 중 오류가 발생했습니다.');
    }
  };

  // 필터링 로직 수정
  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((sub) => {
        // submittedAt이 없는 경우 필터링에서 제외
        if (!sub.submittedAt) {
          console.warn('submittedAt이 없는 제출물 발견:', sub);
          return false;
        }

        // 월별 필터: 'all'이 아니면 해당 월만
        if (listMonth !== "all" && !sub.submittedAt.startsWith(listMonth)) return false

        // 검색 필터 (이름 또는 사번)
        if (
          searchTerm &&
          !sub.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !sub.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false
        }

        // 언어 필터
        if (languageFilter !== "all" && sub.language !== languageFilter) return false

        // 구분 필터
        if (categoryFilter !== "all" && sub.category !== categoryFilter) return false

        // 상태 필터 수정: UI 값과 내부 상태 매핑 + 승인 필터 추가
        if (statusFilter !== "all") {
          if (statusFilter === "completed") {
            // "평가완료"는 제출 완료이되, 아직 승인되지 않은 항목만
            if (!(sub.status === "submitted" && !sub.approved)) return false;
          } else if (statusFilter === "pending") {
            // UI의 "평가대기"는 pending 상태만
            if (sub.status !== "pending") return false;
          } else if (statusFilter === "review_requested") {
            // 검토 요청 상태만
            if (sub.status !== "review_requested") return false;
          } else if (statusFilter === "re_evaluation") {
            // 재평가 대기 상태만
            if (sub.status !== "re_evaluation") return false;
          } else if (statusFilter === "approved") {
            // 승인 완료 항목만
            if (!sub.approved) return false;
          } else {
            // 기타 직접 매칭 (혹시 UI에 원시 상태가 추가될 경우 대비)
            if (sub.status !== statusFilter) return false;
          }
        }

        return true
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) // 최신순 정렬
  }, [submissions, listMonth, searchTerm, searchMode, languageFilter, categoryFilter, statusFilter]);

  // 페이지네이션된 데이터
  // 페이지네이션 제거: 필터 결과 전체 표시
  const paginatedSubmissions = filteredSubmissions;

  // 총 페이지 수 계산
  // 페이지네이션 제거: 총 페이지 1
  const totalPages = 1;
  // 필터/검색 변경 시 페이지 이동 로직 제거 (보정용 useEffect 삭제)

  // 페이지 변경 시 스크롤을 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // 페이지네이션 제거에 따라 보정 로직도 제거

  // v85 통계 계산 - 정확한 버전
  const monthlyStats = useMemo(() => {
    const languages = ["korean-english", "japanese", "chinese"];
    const result = {
      byLanguage: {} as Record<string, { total: number; completed: number; pending: number }>,
      byGrade: {} as Record<string, any>,
    };

    for (const lang of languages) {
      // 해당 월의 전체 제출 데이터
      const monthSubmissions = submissions.filter(
        (sub) =>
          sub.language === lang &&
          sub.submittedAt &&
          sub.submittedAt.startsWith(selectedMonth)
      );

      // 해당 월의 평가 완료된 데이터 (submitted, completed, approved 상태)
      const monthEvaluationResults = monthSubmissions.filter(
        (sub) => sub.status === 'submitted' || sub.status === 'completed' || sub.approved
      );

      result.byLanguage[lang] = {
        total: monthSubmissions.length,
        completed: monthEvaluationResults.length,
        pending: monthSubmissions.length - monthEvaluationResults.length,
      };

      // 모든 언어에 대한 등급 통계 생성
      if (lang === "korean-english") {
        const gradeStats = { S등급: 0, A등급: 0, B등급: 0, FAIL: 0 };
        for (const evaluationResult of monthEvaluationResults) {
          const grade = evaluationResult.grade;
          if (grade === "S등급") gradeStats.S등급++;
          else if (grade === "A등급") gradeStats.A등급++;
          else if (grade === "B등급") gradeStats.B등급++;
          else if (grade === "FAIL" || grade === "F") gradeStats.FAIL++;
        }
        result.byGrade[lang] = gradeStats;
      } else if (lang === "japanese" || lang === "chinese") {
        const gradeStats = { A: 0, B: 0, F: 0 };
        for (const evaluationResult of monthEvaluationResults) {
          const grade = evaluationResult.grade;
          if (grade === "A") gradeStats.A++;
          else if (grade === "B") gradeStats.B++;
          else if (grade === "F" || grade === "FAIL") gradeStats.F++;
        }
        result.byGrade[lang] = gradeStats;
      }
    }

    return result;
  }, [submissions, selectedMonth]);

  const handleFileUploadComplete = (result: any) => {
    // 파일 업로드 결과 처리
    console.log("파일 업로드 결과:", result)
    
    if (result.success) {
      // 모달 닫기
      setShowFileUpload(false)
      
      // 성공 메시지 표시
      alert(result.message || "파일 업로드가 완료되었습니다.")
      
      // 평가 대시보드로 이동
      window.location.href = "/evaluation"
    } else {
      // 에러 메시지 표시
      alert(result.error || "파일 업로드에 실패했습니다.")
    }
  }

  // 언어별 내보내기 함수들
  const exportKoreanEnglishSpreadsheet = () => {
    const monthlyData = filteredSubmissions.filter(sub => sub.submittedAt && sub.submittedAt.startsWith(selectedMonth) && sub.language === "korean-english");
    if (monthlyData.length === 0) {
      alert("선택한 월에 해당하는 한/영 데이터가 없습니다.");
      return;
    }
    // 실제 항목명으로 헤더 구성
    const korLabels = ["발음", "억양", "전달력", "음성", "속도"];
    const engLabels = ["발음_자음", "발음_모음", "억양", "강세", "전달력"];
    const headers = [
      "번호", "사번", "이름", "구분",
      "한국어", ...korLabels, "한국어 총점",
      "영어", ...engLabels, "영어 총점",
      "결과", "최종등급", "한국어 평가의견", "영어 평가의견"
    ];
    let csvData: any[] = [];
    let rowNumber = 1;
    for (const sub of monthlyData) {
      if (isFullyEvaluated(sub)) {
        // 한/영: 한 행에 모두
        const korKeys = ["korean-발음", "korean-억양", "korean-전달력", "korean-음성", "korean-속도"];
        const engKeys = ["english-발음_자음", "english-발음_모음", "english-억양", "english-강세", "english-전달력"];
        const korScores = korKeys.map(k => sub.categoryScores?.[k] ?? "");
        const engScores = engKeys.map(k => sub.categoryScores?.[k] ?? "");
        const korTotal = korKeys.reduce((sum, k) => sum + (sub.categoryScores?.[k] ?? 0), 0);
        const engTotal = engKeys.reduce((sum, k) => sum + (sub.categoryScores?.[k] ?? 0), 0);
        const result = sub.grade === "FAIL" || sub.grade === "F" ? "Fail" : "Pass";
        const grade = sub.grade ?? "";
        const korComment = typeof sub.comments === 'object' ? (sub.comments.korean || "") : (sub.comments || "");
        const engComment = typeof sub.comments === 'object' ? (sub.comments.english || "") : (sub.comments || "");
        csvData.push([
          rowNumber,
          sub.employeeId,
          sub.name,
          sub.category,
          "한국어", ...korScores, korTotal,
          "영어", ...engScores, engTotal,
          result,
          grade,
          korComment,
          engComment
        ]);
        rowNumber++;
      }
    }
    const monthLabel = selectedMonth.replace(/\D/g, '') + "월 ";
    const csvContent = [headers, ...csvData].map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${monthLabel}한영 기내방송 평가 결과.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJapaneseSpreadsheet = () => {
    const monthlyData = filteredSubmissions.filter(sub => sub.submittedAt && sub.submittedAt.startsWith(selectedMonth) && sub.language === "japanese");
    if (monthlyData.length === 0) {
      alert("선택한 월에 해당하는 일본어 데이터가 없습니다.");
      return;
    }
    // 실제 항목명으로 헤더 구성
    const jpLabels = ["발음", "억양", "Pause", "Speed", "Tone", "Volume"];
    const headers = [
      "번호", "사번", "이름", "구분", "언어",
      ...jpLabels,
      "점수합계", "결과", "최종등급", "평가의견"
    ];
    let csvData: any[] = [];
    let rowNumber = 1;
    for (const sub of monthlyData) {
      if (isFullyEvaluated(sub)) {
        const keys = ["발음", "억양", "Pause", "Speed", "Tone", "Volume"];
        const itemScores = keys.map(k => sub.categoryScores?.[k] ?? "");
        const total = keys.reduce((sum, k) => sum + (sub.categoryScores?.[k] ?? 0), 0);
        const result = sub.grade === "FAIL" || sub.grade === "F" ? "Fail" : "Pass";
        csvData.push([
          rowNumber,
          sub.employeeId,
          sub.name,
          sub.category,
          "일본어",
          ...itemScores,
          total,
          result,
          sub.grade ?? "",
          typeof sub.comments === 'object' ? (sub.comments.korean || sub.comments.english || "") : (sub.comments || "")
        ]);
        rowNumber++;
      }
    }
    const monthLabel = selectedMonth.replace(/\D/g, '') + "월 ";
    const csvContent = [headers, ...csvData].map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${monthLabel}일본어 기내방송 평가 결과.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportChineseSpreadsheet = () => {
    const monthlyData = filteredSubmissions.filter(sub => sub.submittedAt && sub.submittedAt.startsWith(selectedMonth) && sub.language === "chinese");
    if (monthlyData.length === 0) {
      alert("선택한 월에 해당하는 중국어 데이터가 없습니다.");
      return;
    }
    // 실제 항목명으로 헤더 구성
    const cnLabels = ["성조", "억양", "PAUSE", "속도", "Tone", "Volume"];
    const headers = [
      "번호", "사번", "이름", "구분", "언어",
      ...cnLabels,
      "점수합계", "결과", "최종등급", "평가의견"
    ];
    let csvData: any[] = [];
    let rowNumber = 1;
    for (const sub of monthlyData) {
      if (isFullyEvaluated(sub)) {
        const keys = ["성조", "억양", "PAUSE", "속도", "Tone", "Volume"];
        const itemScores = keys.map(k => sub.categoryScores?.[k] ?? "");
        const total = keys.reduce((sum, k) => sum + (sub.categoryScores?.[k] ?? 0), 0);
        const result = sub.grade === "FAIL" || sub.grade === "F" ? "Fail" : "Pass";
        csvData.push([
          rowNumber,
          sub.employeeId,
          sub.name,
          sub.category,
          "중국어",
          ...itemScores,
          total,
          result,
          sub.grade ?? "",
          typeof sub.comments === 'object' ? (sub.comments.korean || sub.comments.english || "") : (sub.comments || "")
        ]);
        rowNumber++;
      }
    }
    const monthLabel = selectedMonth.replace(/\D/g, '') + "월 ";
    const csvContent = [headers, ...csvData].map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${monthLabel}중국어 기내방송 평가 결과.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToSpreadsheet = () => {
    const monthlyData = filteredSubmissions.filter(sub => sub.submittedAt && sub.submittedAt.startsWith(selectedMonth));

    if (monthlyData.length === 0) {
      alert("선택한 월에 해당하는 데이터가 없습니다.")
      return
    }

    // 헤더
    const headers = [
      "번호", "사번", "이름", "구분", "언어",
      "항목1", "항목2", "항목3", "항목4", "항목5", "항목6",
      "점수합계", "결과", "최종등급", "평가의견"
    ];

    // 항목 점수 추출 함수 (언어별)
    function getItemScores(sub: Submission, langType: 'korean' | 'english' | 'japanese' | 'chinese') {
      const { categoryScores } = sub;
      if (langType === 'korean') {
        // 항목1~5: korean-발음, 억양, 전달력, 음성, 속도
        const korKeys = ["korean-발음", "korean-억양", "korean-전달력", "korean-음성", "korean-속도"];
        return korKeys.map(k => categoryScores?.[k] ?? "");
      } else if (langType === 'english') {
        // 항목1~5: english-발음_자음, 발음_모음, 억양, 강세, 전달력
        const engKeys = [
          "english-발음_자음",
          "english-발음_모음",
          "english-억양",
          "english-강세",
          "english-전달력"
        ];
        return engKeys.map(k => categoryScores?.[k] ?? "");
      } else if (langType === 'japanese') {
        const keys = ["발음", "억양", "Pause", "Speed", "Tone", "Volume"];
        return keys.map(k => categoryScores?.[k] ?? "");
      } else if (langType === 'chinese') {
        const keys = ["성조", "억양", "PAUSE", "속도", "Tone", "Volume"];
        return keys.map(k => categoryScores?.[k] ?? "");
      } else {
        return Array(6).fill("");
      }
    }

    // 점수합계 (언어별)
    function getLangTotal(sub: Submission, langType: 'korean' | 'english') {
      if (!sub.categoryScores) return "";
      if (langType === 'korean') {
        const korKeys = ["korean-발음", "korean-억양", "korean-전달력", "korean-음성", "korean-속도"];
        return korKeys.reduce((sum, k) => sum + (sub.categoryScores?.[k] ?? 0), 0);
      } else if (langType === 'english') {
        const engKeys = [
          "english-발음_자음",
          "english-발음_모음",
          "english-억양",
          "english-강세",
          "english-전달력"
        ];
        return engKeys.reduce((sum, k) => sum + (sub.categoryScores?.[k] ?? 0), 0);
      }
      return "";
    }

    // 평가의견 (언어별)
    function getLangComment(sub: Submission, langType: 'korean' | 'english') {
      if (typeof sub.comments === 'object') {
        return sub.comments[langType] || "";
      }
      return sub.comments || "";
    }

    let csvData: any[] = [];
    let rowNumber = 1;
    for (const sub of monthlyData) {
      if (isFullyEvaluated(sub)) {
        if (sub.language === "korean-english") {
          // 한/영: 두 행 (한국어/영어)
          // 공통: 번호, 사번, 이름, 구분, 결과, 최종등급 동일
          const result = sub.grade === "FAIL" || sub.grade === "F" ? "Fail" : "Pass";
          const grade = sub.grade ?? "";
          // 한국어 행
          csvData.push([
            rowNumber,
            sub.employeeId,
            sub.name,
            sub.category,
            "한국어",
            ...getItemScores(sub, 'korean'),
            "", // 항목6 빈칸
            getLangTotal(sub, 'korean'),
            result,
            grade,
            getLangComment(sub, 'korean')
          ]);
          // 영어 행
          csvData.push([
            rowNumber,
            sub.employeeId,
            sub.name,
            sub.category,
            "영어",
            ...getItemScores(sub, 'english'),
            "", // 항목6 빈칸
            getLangTotal(sub, 'english'),
            result,
            grade,
            getLangComment(sub, 'english')
          ]);
          rowNumber++;
        } else if (sub.language === "japanese") {
          // 일본어: 한 행
          const result = sub.grade === "FAIL" || sub.grade === "F" ? "Fail" : "Pass";
          csvData.push([
            rowNumber,
            sub.employeeId,
            sub.name,
            sub.category,
            "일본어",
            ...getItemScores(sub, 'japanese'),
            sub.totalScore ?? "",
            result,
            sub.grade ?? "",
            typeof sub.comments === 'object' ? (sub.comments.korean || sub.comments.english || "") : (sub.comments || "")
          ]);
          rowNumber++;
        } else if (sub.language === "chinese") {
          // 중국어: 한 행
          const result = sub.grade === "FAIL" || sub.grade === "F" ? "Fail" : "Pass";
          csvData.push([
            rowNumber,
            sub.employeeId,
            sub.name,
            sub.category,
            "중국어",
            ...getItemScores(sub, 'chinese'),
            sub.totalScore ?? "",
            result,
            sub.grade ?? "",
            typeof sub.comments === 'object' ? (sub.comments.korean || sub.comments.english || "") : (sub.comments || "")
          ]);
          rowNumber++;
        } else {
          // 기타 언어: 한 행, 항목 빈칸
          csvData.push([
            rowNumber,
            sub.employeeId,
            sub.name,
            sub.category,
            sub.language,
            ...Array(6).fill(""),
            sub.totalScore ?? "",
            sub.grade === "FAIL" || sub.grade === "F" ? "Fail" : "Pass",
            sub.grade ?? "",
            typeof sub.comments === 'object' ? (sub.comments.korean || sub.comments.english || "") : (sub.comments || "")
          ]);
          rowNumber++;
        }
      } else {
        // 평가 미완료: 한 행, 빈 값
        csvData.push([
          rowNumber,
          sub.employeeId,
          sub.name,
          sub.category,
          sub.language,
          ...Array(6).fill(""),
          "", "", "", ""
        ]);
        rowNumber++;
      }
    }

    const csvContent = [headers, ...csvData].map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `기내방송평가_v85_${selectedMonth}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const approveOne = async (submission: Submission) => {
    if (!submission.id) {
      throw new Error("평가 ID가 없습니다.");
    }
    
    const response = await fetch("/api/evaluations/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evaluationId: submission.id, approvedBy: "Admin" }),
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "승인 처리 실패");
    }
    
    return result;
  };

  const approveMany = async () => {
    const targets = filteredSubmissions.filter((s) => selectedIds.has(s.id));
    
    console.log('🔍 [approveMany] 선택된 항목들:', targets.map(t => ({ id: t.id, name: t.name, status: t.status, approved: t.approved })));
    
    // 승인 가능한 항목만 필터링 (status가 'submitted'이고 approved가 false인 것만)
    const approveTargets = targets.filter(s => s.status === 'submitted' && !s.approved);
    
    console.log('✅ [approveMany] 승인 가능한 항목들:', approveTargets.map(t => ({ id: t.id, name: t.name, status: t.status, approved: t.approved })));
    
    if (approveTargets.length === 0) {
      alert('승인할 수 있는 항목이 없습니다. (평가 완료되었지만 승인되지 않은 항목만 승인 가능)');
      return;
    }

    // 관리자 확인
    const confirmed = window.confirm(
      `정말로 ${approveTargets.length}개 항목을 승인하시겠습니까?\n\n승인된 항목은 더 이상 수정할 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      // 병렬로 승인 처리 - Database API 사용
      const approvePromises = approveTargets.map(async (submission) => {
        const response = await fetch('/api/evaluations/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evaluationId: submission.id,
            approvedBy: 'Admin',
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(`승인 실패 (${submission.name}): ${result.error}`);
        }
        return result;
      });

      await Promise.all(approvePromises);
      
      alert(`${approveTargets.length}개 항목이 성공적으로 승인되었습니다.`);
      
      // 목록 새로고침
      await loadData();
      setSelectedIds(new Set());
      
    } catch (error) {
      console.error('승인 처리 중 오류:', error);
      alert(`승인 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const deleteMany = async () => {
    const targets = filteredSubmissions.filter((s) => selectedIds.has(s.id));
    for (const t of targets) {
      await handleDelete(t.id);
    }
    setSelectedIds(new Set());
  };

  const reevaluateMany = async () => {
    const targets = filteredSubmissions.filter((s) => selectedIds.has(s.id));
    
    // 재평가 가능한 항목만 필터링 (status가 'submitted'이고 approved가 false인 것만)
    const reevaluateTargets = targets.filter(s => s.status === 'submitted' && !s.approved);
    
    if (reevaluateTargets.length === 0) {
      alert('재평가할 수 있는 항목이 없습니다. (평가 완료되었지만 승인되지 않은 항목만 재평가 가능)');
      return;
    }

    // 관리자 확인
    const confirmed = window.confirm(
      `정말로 ${reevaluateTargets.length}개 항목을 재평가 대기 상태로 되돌리시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      // 🔥 Database API를 사용한 병렬 재평가 처리
      const reevaluatePromises = reevaluateTargets.map(async (submission) => {
        const response = await fetch('/api/evaluations/reevaluate-database', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evaluationId: submission.id,
            reevaluatedBy: 'Admin',
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(`재평가 실패 (${submission.name}): ${result.error}`);
        }
        return result;
      });

      await Promise.all(reevaluatePromises);
      
      alert(`${reevaluateTargets.length}개 항목이 재평가 대기 상태로 변경되었습니다.`);
      
      // 목록 새로고침
      await loadData();
      setSelectedIds(new Set());
      
    } catch (error) {
      console.error('재평가 처리 중 오류:', error);
      alert(`재평가 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 로그인 기록 불러오기
  const loadLoginLogs = async (page = 1) => {
    setLoginLogsLoading(true);
    try {
      const response = await fetch(`/api/auth/login-log?limit=20&page=${page}`);
      const data = await response.json();
      setLoginLogs(data.logs || []);
      setLoginLogsPagination(data.pagination || {});
    } catch (error) {
      console.error('로그인 기록 로딩 실패:', error);
      alert('로그인 기록을 불러오는데 실패했습니다.');
    } finally {
      setLoginLogsLoading(false);
    }
  };

  // 등록된 컴퓨터 목록 불러오기
  const loadAllowedDevices = async () => {
    setLoadingDevices(true)
    try {
      const res = await fetch('/api/devices/allowlist', { cache: 'no-store' })
      const data = await res.json()
      setAllowedDevices(data.devices || [])
    } catch (e) {
      console.error('등록된 컴퓨터 목록 로딩 실패:', e)
      alert('등록된 컴퓨터 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoadingDevices(false)
    }
  }

  // 현재 접속 IP 확인
  const loadCurrentIp = async () => {
    try {
      const res = await fetch('/api/devices/allowlist?mode=check', { cache: 'no-store' })
      const data = await res.json()
      setCurrentIp(data.ip || '')
    } catch (e) {
      setCurrentIp('')
    }
  }

  // 현재 접속 컴퓨터를 등록
  const registerCurrentComputer = async () => {
    setRegistering(true)
    try {
      const res = await fetch('/api/devices/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: deviceLabel || undefined, createdBy: 'Admin', ip: currentIp || undefined })
      })
      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error || '등록 실패')
      }
      await loadAllowedDevices()
      await loadCurrentIp()
      setDeviceLabel("")
      alert(`등록 완료: ${result.ip}`)
    } catch (e: any) {
      console.error('등록 실패:', e)
      alert(e?.message || '등록 실패')
    } finally {
      setRegistering(false)
    }
  }

  const deleteAllowedDevice = async (ip: string) => {
    if (!confirm(`정말로 ${ip}을(를) 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/devices/allowlist?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || '삭제 실패')
      await loadAllowedDevices()
    } catch (e) {
      console.error('삭제 실패:', e)
      alert('삭제 실패')
    }
  }

  // 시간 제한 상태 로드
  const loadTimeRestrictionsStatus = async () => {
    try {
      const response = await fetch('/api/admin/time-restrictions')
      const result = await response.json()
      if (result.success) {
        setTimeRestrictionsDisabled(result.disabled)
      }
    } catch (error) {
      console.error('시간 제한 상태 로드 실패:', error)
    }
  }

  // 시간 제한 토글
  const toggleTimeRestrictions = async () => {
    setTimeRestrictionsLoading(true)
    try {
      const response = await fetch('/api/admin/time-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !timeRestrictionsDisabled })
      })
      const result = await response.json()
      
      if (result.success) {
        setTimeRestrictionsDisabled(result.disabled)
        alert(result.message)
      } else {
        alert('시간 제한 설정 실패: ' + result.error)
      }
    } catch (error) {
      console.error('시간 제한 토글 실패:', error)
      alert('시간 제한 설정 중 오류가 발생했습니다.')
    } finally {
      setTimeRestrictionsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        {/* v85 헤더 */}
        <div className="flex items-center justify-between mb-4 mt-10">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-sm text-gray-600">마지막 업데이트: {lastUpdate} | 실시간 모니터링 중</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* 시간 제한 토글 버튼 */}
            <Button
              onClick={toggleTimeRestrictions}
              disabled={timeRestrictionsLoading}
              className={`${
                timeRestrictionsDisabled 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold`}
            >
              {timeRestrictionsLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  설정 중...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  시간 제한 {timeRestrictionsDisabled ? 'OFF' : 'ON'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 관리자 도구 모음 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 시스템 관리 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">시스템 관리</h3>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={async () => { 
                    try {
                      console.log("✅ Database 데이터 새로고침");
                    } catch (error) {
                      console.warn("⚠️ 데이터 새로고침 실패:", error);
                    }
                    await loadData(); 
                    setLastUpdate(new Date().toLocaleTimeString()); 
                  }} 
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  즉시 새로고침
                </Button>
                <Button
                  onClick={async () => {
                    if (confirm('모든 사용자 정보를 구글 스프레드시트 정보로 동기화하시겠습니까?')) {
                      try {
                        const response = await fetch('/api/admin/sync-user-info', { method: 'POST' });
                        const result = await response.json();
                        if (result.success) {
                          alert(`동기화 완료: ${result.stats.updatedCount}명 업데이트됨`);
                          await loadData();
                        } else {
                          alert(`동기화 실패: ${result.error}`);
                        }
                      } catch (error) {
                        alert('동기화 중 오류가 발생했습니다.');
                      }
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  사용자 정보 동기화
                </Button>
              </div>
            </div>

            {/* 데이터 관리 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">데이터 관리</h3>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setShowRequestManager(true)}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                >
                  <Users className="w-3 h-3 mr-2" />
                  신청 내역 관리
                </Button>
                <Button
                  onClick={() => setShowEducationJournalManager(true)}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                >
                  <FileSpreadsheet className="w-3 h-3 mr-2" />
                  교육 기록 관리
                </Button>
                <Button
                  onClick={() => setShowRecordingManager(true)}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                >
                  <FileAudio className="w-3 h-3 mr-2" />
                  녹음 파일 관리
                </Button>
              </div>
            </div>

            {/* 분석 및 외부 링크 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">분석 및 외부 링크</h3>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => setShowInstructorStats(true)}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                >
                  <Activity className="w-3 h-3 mr-2" />
                  교관 관리
                </Button>
                <Button 
                  onClick={() => {
                    const employeeSpreadsheetId = "1F1xWL9dv0vAFvMfZaf05nO_vZKpuz82WIJLLBHWgaes";
                    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${employeeSpreadsheetId}/edit`;
                    window.open(spreadsheetUrl, '_blank');
                  }}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                >
                  <Globe className="w-3 h-3 mr-2" />
                  사용자 계정 정보
                </Button>
              </div>
            </div>
          </div>
        </div>

        

        {/* v85 언어별 현황 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {["korean-english", "japanese", "chinese"].map((lang) => (
            <Card key={lang} className="bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-2 bg-gray-50/80 rounded-t-2xl">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* 국기 아이콘과 한글 언어명 표시 */}
                    {getLanguageFlag(lang)}
                    <span>{getLanguageDisplay(lang)}</span>
                  </div>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option, i) => (
                        <SelectItem key={`stats-${lang}-${option.value}`} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="text-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="font-bold text-lg text-blue-600">{monthlyStats.byLanguage[lang]?.total || 0}</div>
                    <div className="text-xs text-gray-600">총 제출</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 border border-green-100 rounded-lg">
                    <div className="font-bold text-lg text-green-600">{monthlyStats.byLanguage[lang]?.completed || 0}</div>
                    <div className="text-xs text-gray-600">평가완료</div>
                  </div>
                </div>

                {/* v85 등급별 통계 - 언어에 따라 다르게 표시 */}
                <div className="mt-4">
                  {lang === "korean-english" ? (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center p-2 bg-gray-50 border rounded-md">
                        <div className="font-bold text-green-700">{monthlyStats.byGrade[lang]?.["S등급"] || 0}</div>
                        <div className="text-green-600">S</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 border rounded-md">
                        <div className="font-bold text-blue-700">{monthlyStats.byGrade[lang]?.["A등급"] || 0}</div>
                        <div className="text-blue-600">A</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 border rounded-md">
                        <div className="font-bold text-yellow-700">{monthlyStats.byGrade[lang]?.["B등급"] || 0}</div>
                        <div className="text-yellow-600">B</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 border rounded-md">
                        <div className="font-bold text-red-700">{monthlyStats.byGrade[lang]?.["FAIL"] || 0}</div>
                        <div className="text-red-600">F</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-gray-50 border rounded-md">
                        <div className="font-bold text-green-700">{monthlyStats.byGrade[lang]?.["A"] || 0}</div>
                        <div className="text-green-600">A</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 border rounded-md">
                        <div className="font-bold text-blue-700">{monthlyStats.byGrade[lang]?.["B"] || 0}</div>
                        <div className="text-blue-600">B</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 border rounded-md">
                        <div className="font-bold text-red-700">{monthlyStats.byGrade[lang]?.["F"] || 0}</div>
                        <div className="text-red-600">F</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* v85 월별 데이터 추출 */}
        <Card className="mb-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2 bg-gray-50/80 rounded-t-2xl flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              <span className="text-lg font-bold text-gray-900">월별 데이터 추출</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option, i) => (
                    <SelectItem key={`export-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            <div className="flex flex-wrap gap-3 items-center justify-start">
              <Button onClick={exportKoreanEnglishSpreadsheet} className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-2 px-5 py-2 rounded-lg shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> 한/영 다운로드
              </Button>
              <Button onClick={exportJapaneseSpreadsheet} className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 px-5 py-2 rounded-lg shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> 일본어 다운로드
              </Button>
              <Button onClick={exportChineseSpreadsheet} className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-2 px-5 py-2 rounded-lg shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> 중국어 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* v85 제출 인원 리스트 */}
        <Card className="mb-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4 bg-gray-50/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                  <span className="text-xl font-bold text-gray-800">제출 인원 현황</span>
                </CardTitle>
                <Select value={listMonth} onValueChange={setListMonth}>
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue placeholder="월 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {(loadedMonths.length ? loadedMonths : monthOptions.map(o=>o.value)).map((ym) => {
                      const date = new Date(ym + '-01')
                      const label = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
                      return (
                        <SelectItem key={`list-${ym}`} value={ym}>{label}</SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-sm">
                <SortDesc className="w-3 h-3 mr-1" />
                최신순 정렬
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* 선택 버튼과 필터를 같은 라인에 배치 */}
            <div className="flex justify-between items-center mb-3">
              {/* 왼쪽: 선택 버튼들 */}
              <div className="flex gap-3">
                <Button 
                  size="sm" 
                  disabled={selectedIds.size === 0 || !filteredSubmissions.filter(s => selectedIds.has(s.id)).some(s => s.status === 'submitted' && !s.approved)} 
                  onClick={approveMany}
                >
                  선택 항목 승인
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={selectedIds.size === 0 || !filteredSubmissions.filter(s => selectedIds.has(s.id)).some(s => s.status === 'submitted' && !s.approved)} 
                  onClick={reevaluateMany}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  선택 항목 재평가
                </Button>
                <Button size="sm" variant="destructive" disabled={selectedIds.size===0} onClick={deleteMany}>선택 항목 삭제</Button>
              </div>
              
              {/* 오른쪽: 필터 드롭다운들 */}
              <div className="flex gap-2 items-center">
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue placeholder="언어" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="korean-english">한/영</SelectItem>
                    <SelectItem value="japanese">일본어</SelectItem>
                    <SelectItem value="chinese">중국어</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue placeholder="구분" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="신규">신규</SelectItem>
                    <SelectItem value="재자격">재자격</SelectItem>
                    <SelectItem value="상위">상위</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="completed">평가완료</SelectItem>
                    <SelectItem value="pending">평가대기</SelectItem>
                    <SelectItem value="re_evaluation">재평가 대기</SelectItem>
                    <SelectItem value="approved">승인 완료</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setLanguageFilter("all"); setCategoryFilter("all"); setStatusFilter("all"); }}
                  className="h-8"
                >
                  <Filter className="w-3 h-3 mr-1" /> 초기화
                </Button>
              </div>
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>데이터 로딩 중...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                {searchTerm || languageFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all"
                  ? "검색 조건에 맞는 데이터가 없습니다."
                  : "제출된 녹음이 없습니다."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="w-6 text-center">
                        <input type="checkbox" onChange={e=>{
                          if(e.target.checked){setSelectedIds(new Set(filteredSubmissions.map(s=>s.id)))}
                          else setSelectedIds(new Set());
                        }}
                        checked={selectedIds.size===filteredSubmissions.length && filteredSubmissions.length>0}/>
                      </TableHead>
                      <TableHead className="w-20 text-center">이름</TableHead>
                      <TableHead className="w-24 text-center">사번</TableHead>
                      <TableHead className="w-16 text-center">언어</TableHead>
                      <TableHead className="w-16 text-center">구분</TableHead>
                      <TableHead className="w-32 text-center">제출시간</TableHead>
                      <TableHead className="w-24 text-center">상태</TableHead>
                      <TableHead className="w-24 text-center">평가결과</TableHead>
                      <TableHead className="w-24 text-center">결과 확인</TableHead>
                      <TableHead className="w-16 text-center">삭제</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubmissions.map((sub, index) => (
                      <TableRow key={sub.id || sub.dropboxPath || index} className="h-8">
                        <TableCell className="text-center">
                          <input type="checkbox" checked={selectedIds.has(sub.id)} onChange={e=>{
                            const copy=new Set(selectedIds);
                            e.target.checked?copy.add(sub.id):copy.delete(sub.id);
                            setSelectedIds(copy);
                          }}/>
                        </TableCell>
                        <TableCell className="font-medium py-1 text-center text-sm">{sub.name}</TableCell>
                        <TableCell className="py-1 text-center text-sm">{sub.employeeId}</TableCell>
                        <TableCell className="py-1 text-center">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLanguageColor(sub.language)}`}>
                            {getLanguageDisplay(sub.language)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1 text-center text-sm">{sub.category}</TableCell>
                        <TableCell className="text-[11px] py-1 text-center">{formatDateTime(sub.submittedAt)}</TableCell>
                        <TableCell className="py-1 text-center">
                          {sub.approved ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300">승인 완료</Badge>
                          ) : (
                            <div className="flex flex-col gap-1 items-center">
                              <Badge variant={(sub.status === "submitted" || sub.status === "completed") ? "default" : (sub.status === "re_evaluation" ? "destructive" : "secondary")}>
                                {(sub.status === "submitted" || sub.status === "completed") ? "평가 완료" : 
                                 (sub.status === "review_requested" ? "검토 요청" : 
                                  (sub.status === "re_evaluation" ? "재평가 대기" : "평가 대기"))}
                              </Badge>
                              {sub.status === "review_requested" && sub.reviewRequestedBy && (
                                <span className="text-xs text-orange-600">검토 요청: {sub.reviewRequestedBy}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(sub.status === 'submitted' || sub.status === 'completed' || sub.approved) ? (
                            (<>{(() => {
                              const gradeInfo = getGradeInfo(
                                typeof sub.totalScore === 'number' ? sub.totalScore : 0,
                                sub.categoryScores || {},
                                sub.language,
                                sub.category
                              );
                              const isFail = gradeInfo.grade === 'FAIL' || gradeInfo.grade === 'F';
                              return (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={isFail ? "font-bold text-red-600" : "font-bold text-blue-600"}>
                                    {gradeInfo.grade === 'F' ? 'FAIL' : (sub.language === 'korean-english' ? String(gradeInfo.grade).replace(/등급$/, '') : gradeInfo.grade)}
                                  </span>
                                  {sub.language === 'korean-english' ? (
                                    <span className="text-xs text-gray-500">
                                      ({typeof sub.koreanTotalScore === 'number' ? sub.koreanTotalScore.toFixed(1) : '0.0'} / {typeof sub.englishTotalScore === 'number' ? sub.englishTotalScore.toFixed(1) : '0.0'})
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      ({typeof sub.totalScore === 'number' ? sub.totalScore.toFixed(1) : '0.0'})
                                    </span>
                                  )}
                                </div>
                              );
                            })()}</>)
                          ) : (
                              <span className="text-xs text-gray-500">대기</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(sub.status === 'submitted' || sub.status === 'completed' || sub.approved) ? (
                            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => viewEvaluationResult(sub.id)}>
                              <Eye className="w-4 h-4 mr-1" />
                              결과 확인
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 px-2 text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleDelete(sub.id)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            삭제
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 결과 개수 표시 (페이지네이션 제거) */}
                <div className="mt-3 text-sm text-gray-600 text-center">
                  총 {filteredSubmissions.length}명의 제출 기록
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* v85 파일 업로드 카드 */}
        <Card className="mb-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4 bg-gray-50/80 rounded-t-2xl">
            <CardTitle className="flex items-center gap-3 text-lg">
              <FileAudio className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-800">PUS 녹음파일 업로드</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  기존 녹음 파일을 업로드하여 평가를 진행할 수 있습니다. 
                  <span className="text-red-600 font-bold">언어별로 1개 파일씩 업로드하면 됩니다.</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>• 지원 형식: MP3, WAV, WEBM, M4A, OGG, AAC</span>
                  <span>• 최대 파일 크기: 50MB</span>
                  <span>• 언어별 필요 파일: 한/영(2개), 일/중(1개)</span>
                </div>
              </div>
              <Button 
                onClick={() => setShowFileUpload(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                파일 업로드 시작
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* v85 PDF 동기화 */}
        <PDFUploadManager />

        {/* 스케줄 동기화 */}
        <ScheduleSyncAdmin />

        {/* v85 로그인 기록 */}
        <Card className="mb-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4 bg-gray-50/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Activity className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-800">로그인 기록</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    setShowLoginLogs(!showLoginLogs);
                    if (!showLoginLogs) {
                      loadLoginLogs();
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Activity className="w-4 h-4 mr-1" />
                  {showLoginLogs ? '숨기기' : '보기'}
                </Button>
              </div>
            </div>
          </CardHeader>
          {showLoginLogs && (
            <CardContent className="pt-0">
              {loginLogsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p>로그인 기록 로딩 중...</p>
                </div>
              ) : loginLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>로그인 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-10">
                        <TableHead className="w-32 text-center">로그인 시간</TableHead>
                        <TableHead className="w-24 text-center">이름</TableHead>
                        <TableHead className="w-32 text-center">이메일</TableHead>
                        <TableHead className="w-20 text-center">사번</TableHead>
                        <TableHead className="w-20 text-center">부서</TableHead>
                        <TableHead className="w-16 text-center">방법</TableHead>
                        <TableHead className="w-16 text-center">결과</TableHead>
                        <TableHead className="w-24 text-center">IP 주소</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginLogs.map((log, index) => (
                        <TableRow key={log.id || index} className="h-12">
                          <TableCell className="text-xs py-2 text-center">
                            {formatDateTime(log.loginTime)}
                          </TableCell>
                          <TableCell className="py-2 text-center font-medium">
                            {log.name}
                          </TableCell>
                          <TableCell className="py-2 text-center text-sm">
                            {log.email}
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            {log.employeeId || '-'}
                          </TableCell>
                          <TableCell className="py-2 text-center text-sm">
                            {log.department || '-'}
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <Badge variant="outline" className="text-xs">
                              {log.loginMethod === 'google' ? 'Google' : 
                               log.loginMethod === 'workspace' ? 'Workspace' : 
                               log.loginMethod === 'test' ? '테스트' : log.loginMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <Badge 
                              variant={log.success ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {log.success ? '성공' : '실패'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-center text-xs">
                            {log.ipAddress || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="mt-3 text-sm text-gray-600 text-center">
                    최근 {loginLogs.length}개의 로그인 기록 (총 {loginLogsPagination.totalRecords || 0}개)
                  </div>
                  
                  {/* 페이지네이션 */}
                  {loginLogsPagination.totalPages > 1 && (
                    <div className="mt-4 flex justify-center items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadLoginLogs(loginLogsPagination.page - 1)}
                        disabled={!loginLogsPagination.hasPrevPage}
                      >
                        이전
                      </Button>
                      
                      <span className="text-sm text-gray-600">
                        {loginLogsPagination.page} / {loginLogsPagination.totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadLoginLogs(loginLogsPagination.page + 1)}
                        disabled={!loginLogsPagination.hasNextPage}
                      >
                        다음
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* 등록된 컴퓨터 목록 (IP 허용 목록) */}
        <Card className="mb-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4 bg-gray-50/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Globe className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-800">등록된 컴퓨터 목록</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="라벨(선택): 예) 교육실 1번 PC"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  className="h-9 w-64"
                />
                <Button variant="outline" size="sm" onClick={() => { loadAllowedDevices(); loadCurrentIp(); }}>
                  새로고침
                </Button>
                <Button size="sm" onClick={registerCurrentComputer} disabled={registering}>
                  {registering ? '등록 중...' : '이 컴퓨터 등록'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-sm text-gray-600 mb-3">현재 접속 IP: {currentIp || '확인 중...'}</div>
            {loadingDevices ? (
              <div className="text-center py-6">불러오는 중...</div>
            ) : allowedDevices.length === 0 ? (
              <div className="text-center py-6 text-gray-500">등록된 컴퓨터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40 text-center">IP</TableHead>
                      <TableHead className="w-64 text-center">라벨</TableHead>
                      <TableHead className="w-40 text-center">등록일</TableHead>
                      <TableHead className="w-32 text-center">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allowedDevices.map((d) => (
                      <TableRow key={d.ip}>
                        <TableCell className="text-center font-mono">{d.ip}</TableCell>
                        <TableCell className="text-center">{d.label || '-'}</TableCell>
                        <TableCell className="text-center text-sm">
                          {new Date(d.createdAt).toLocaleString('ko-KR')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="destructive" onClick={() => deleteAllowedDevice(d.ip)}>삭제</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 평가 결과 모달 */}
        {selectedResult && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">평가 결과 상세</h2>
                <button 
                  onClick={() => setSelectedResult(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <EvaluationSummary
                  isOpen={true}
                  onClose={() => setSelectedResult(null)}
                  evaluationResult={selectedResult as any}
                  authenticatedUser={{ name: "Admin" }}
                  showPdfButton={true}
                  isReviewMode={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* 파일 업로드 모달 */}
        {showFileUpload && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <FileUploadEvaluation 
                onComplete={handleFileUploadComplete}
                onBack={() => setShowFileUpload(false)}
                authenticatedUser={null}
              />
            </div>
          </div>
        )}

        {/* 신청 내역 관리 모달 */}
        <AdminRequestManagerModal
          isOpen={showRequestManager}
          onClose={() => setShowRequestManager(false)}
        />

        {/* 교육 일지 관리 모달 */}
        <AdminEducationJournalModal
          isOpen={showEducationJournalManager}
          onClose={() => setShowEducationJournalManager(false)}
        />

        {/* 교관 통계 모달 */}
        <InstructorStatsModal
          isOpen={showInstructorStats}
          onClose={() => setShowInstructorStats(false)}
        />

        {/* 녹음 파일 관리 모달 */}
        <RecordingManagementModal
          isOpen={showRecordingManager}
          onClose={() => setShowRecordingManager(false)}
        />
      </div>
    </div>
  )
}

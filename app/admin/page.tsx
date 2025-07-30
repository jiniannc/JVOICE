"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PDFSyncManager } from "@/components/pdf-sync-manager"
import { EvaluationSummary } from "@/components/evaluation-summary"
import { FileUploadEvaluation } from "@/components/file-upload-evaluation"
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
  status: "pending" | "review_requested" | "submitted";
  scores?: { [key: string]: number };
  categoryScores?: { [key: string]: any };
  koreanTotalScore?: number;
  englishTotalScore?: number;
  totalScore?: number;
  grade?: string;
  comments?: { korean: string; english: string } | string;
  evaluatedAt?: string;
  evaluatedBy?: string;
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
    submission.status === "submitted" &&
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

  // 필터 및 검색 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // 파일 업로드 상태
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 로그인 기록 상태
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [showLoginLogs, setShowLoginLogs] = useState(false)
  const [loginLogsLoading, setLoginLogsLoading] = useState(false)
  const [loginLogsPagination, setLoginLogsPagination] = useState<any>({})

  useEffect(() => {
    loadData();
    setLastUpdate(new Date().toLocaleTimeString());
    setSelectedMonth(new Date().toISOString().slice(0, 7));
    setListMonth(new Date().toISOString().slice(0, 7));
    loadLoginLogs(); // 로그인 기록 자동 로드 추가
    // 자동 새로고침 제거, 수동 업데이트만 허용
  }, []);

  const loadData = async () => {
    setIsLoading(true)
    try {
      // pending 목록과 completed 목록을 병렬로 가져오기
      const [pendingRes, completedRes] = await Promise.all([
        fetch("/api/evaluations/load-dropbox"), // Pending+Review Requested
        fetch("/api/evaluations/load-completed"), // Submitted
      ]);

      if (!pendingRes.ok || !completedRes.ok) {
        throw new Error("데이터 로딩 실패");
      }

      const pendingData = await pendingRes.json();
      const completedData = await completedRes.json();
      
      const allEvaluations = [
        ...(pendingData.evaluations || []),
        ...(completedData.evaluations || []),
      ];

      console.log(`✅ [관리자] Total ${allEvaluations.length}개 평가 데이터 로드 (Pending: ${pendingData.evaluations?.length}, Completed: ${completedData.evaluations?.length})`);
      console.log('🔍 [관리자] 원본 데이터 샘플:', allEvaluations.slice(0, 2));
      
      const formattedSubmissions: Submission[] = allEvaluations
        .filter((ev: any) => {
          // 유효하지 않은 데이터 필터링
          const infoSource = ev.candidateInfo || ev;
          if (!infoSource || !infoSource.id || !infoSource.name || !infoSource.employeeId) {
            console.warn('유효하지 않은 평가 데이터 발견:', ev);
            return false;
          }
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
            id: infoSource.id,
            name: infoSource.name,
            employeeId: infoSource.employeeId,
            language: infoSource.language,
            category: infoSource.category,
            submittedAt: infoSource.submittedAt,
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
            dropboxPath: ev.dropboxPath,
            approved: ev.approved, // approved 필드 추가
          }
        });

      console.log(`✅ [관리자] 필터링 후 유효한 데이터: ${formattedSubmissions.length}개`);
      setSubmissions(formattedSubmissions);

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
    if (result) {
      // 한/영 평가일 경우, 각 언어별 총점 계산
      if (result.language === "korean-english" && result.categoryScores) {
        const koreanTotalScore = Object.entries(result.categoryScores)
          .filter(([key]) => key.startsWith("korean-"))
          .reduce((sum, [, score]) => sum + (score as number), 0);
        const englishTotalScore = Object.entries(result.categoryScores)
          .filter(([key]) => key.startsWith("english-"))
          .reduce((sum, [, score]) => sum + (score as number), 0);
        
        setSelectedResult({
          ...result,
          koreanTotalScore,
          englishTotalScore,
        });
      } else {
      setSelectedResult(result);
      }
    }
  };

  // 삭제 함수
  const handleDelete = async (submissionId: string) => {
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) {
      alert('제출 데이터를 찾을 수 없습니다.');
      return;
    }

    // 1. 평가 완료된 데이터는 삭제 불가
    if (submission.status === 'submitted') {
      alert('평가가 완료된 데이터는 삭제할 수 없습니다.');
      return;
    }

    // 2. 관리자 확인
    const confirmed = window.confirm(
      `정말로 "${submission.name} (${submission.employeeId})"의 녹음 제출을 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/evaluations/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          dropboxPath: submission.dropboxPath,
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

        // 월별 필터
        if (!sub.submittedAt.startsWith(listMonth)) return false

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

        // 상태 필터 수정
        if (statusFilter !== "all" && sub.status !== statusFilter) return false;

        return true
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) // 최신순 정렬
  }, [submissions, listMonth, searchTerm, languageFilter, categoryFilter, statusFilter]);

  // 페이지네이션된 데이터
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSubmissions.slice(startIndex, endIndex);
  }, [filteredSubmissions, currentPage, itemsPerPage]);

  // 총 페이지 수 계산
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

  // 페이지 변경 시 스크롤을 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // 필터나 검색이 변경될 때 페이지를 1로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, languageFilter, categoryFilter, statusFilter, listMonth]);

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

      // 해당 월의 평가 완료된 데이터
      const monthEvaluationResults = monthSubmissions.filter(
        (sub) => sub.status === 'submitted'
      );

      result.byLanguage[lang] = {
        total: monthSubmissions.length,
        completed: monthEvaluationResults.length,
        pending: monthSubmissions.length - monthEvaluationResults.length,
      };

      if (lang === "korean-english") {
        const gradeStats = { S등급: 0, A등급: 0, B등급: 0, FAIL: 0 };
        for (const evaluationResult of monthEvaluationResults) {
          const grade = evaluationResult.grade;
          if (grade === "S등급") gradeStats.S등급++;
          else if (grade === "A등급") gradeStats.A등급++;
          else if (grade === "B등급") gradeStats.B등급++;
          else if (grade === "FAIL") gradeStats.FAIL++;
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
    if (!submission.dropboxPath) return;
    await fetch("/api/evaluations/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropboxPath: submission.dropboxPath, approvedBy: "Admin" }),
    });
  };

  const approveMany = async () => {
    const targets = submissions.filter((s) => selectedIds.has(s.id));
    await Promise.all(targets.map((t) => approveOne(t)));
    await loadData();
    setSelectedIds(new Set());
  };

  const deleteMany = async () => {
    const targets = submissions.filter((s) => selectedIds.has(s.id));
    for (const t of targets) {
      await handleDelete(t.id);
    }
    setSelectedIds(new Set());
  };

  const reevaluateMany = async () => {
    const targets = submissions.filter((s) => selectedIds.has(s.id));
    
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
      // 병렬로 재평가 처리
      const reevaluatePromises = reevaluateTargets.map(async (submission) => {
        const response = await fetch('/api/evaluations/reevaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dropboxPath: submission.dropboxPath,
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

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        {/* v85 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-sm text-gray-600">마지막 업데이트: {lastUpdate} | 실시간 모니터링 중</p>
            </div>
          </div>
          <Button onClick={() => { loadData(); setLastUpdate(new Date().toLocaleTimeString()); }} className="ml-2" variant="outline">Update</Button>
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
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthDate1 = new Date();
                        monthDate1.setMonth(monthDate1.getMonth() - i);
                        const monthStr1 = monthDate1.toISOString().slice(0, 7);
                        return (
                          <SelectItem key={`stats-${lang}-${monthStr1}-${i}`} value={monthStr1}>
                            {monthDate1.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
                          </SelectItem>
                        )
                      })}
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
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthStr2 = date.toISOString().slice(0, 7);
                    return (
                      <SelectItem key={`export-${monthStr2}-${i}`} value={monthStr2}>
                        {date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
                      </SelectItem>
                    );
                  })}
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
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date()
                      date.setMonth(date.getMonth() - i)
                      const monthStr3 = date.toISOString().slice(0, 7)
                      return (
                        <SelectItem key={`list-${monthStr3}-${i}`} value={monthStr3}>
                          {date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
                        </SelectItem>
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
            {/* v85 검색 및 필터 */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="이름 또는 사번 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="언어" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 언어</SelectItem>
                  <SelectItem value="korean-english">한/영</SelectItem>
                  <SelectItem value="japanese">일본어</SelectItem>
                  <SelectItem value="chinese">중국어</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-28 h-9">
                  <SelectValue placeholder="구분" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 구분</SelectItem>
                  <SelectItem value="신규">신규</SelectItem>
                  <SelectItem value="재자격">재자격</SelectItem>
                  <SelectItem value="상위">상위</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="completed">평가완료</SelectItem>
                  <SelectItem value="pending">평가대기</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || languageFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setLanguageFilter("all")
                    setCategoryFilter("all")
                    setStatusFilter("all")
                  }}
                  className="h-9"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  초기화
                </Button>
              )}
            </div>
            <div className="flex gap-3 mb-3">
              <Button size="sm" disabled={selectedIds.size===0} onClick={approveMany}>선택 항목 승인</Button>
              <Button 
                size="sm" 
                variant="outline" 
                disabled={selectedIds.size === 0 || !submissions.filter(s => selectedIds.has(s.id)).some(s => s.status === 'submitted' && !s.approved)} 
                onClick={reevaluateMany}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                선택 항목 재평가
              </Button>
              <Button size="sm" variant="destructive" disabled={selectedIds.size===0} onClick={deleteMany}>선택 항목 삭제</Button>
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
                      <TableRow key={sub.id || sub.dropboxPath || index} className="h-12">
                        <TableCell className="text-center">
                          <input type="checkbox" checked={selectedIds.has(sub.id)} onChange={e=>{
                            const copy=new Set(selectedIds);
                            e.target.checked?copy.add(sub.id):copy.delete(sub.id);
                            setSelectedIds(copy);
                          }}/>
                        </TableCell>
                        <TableCell className="font-medium py-2 text-center">{sub.name}</TableCell>
                        <TableCell className="py-2 text-center">{sub.employeeId}</TableCell>
                        <TableCell className="py-2 text-center">
                          <Badge variant="outline" className={`text-xs px-2 py-0 ${getLanguageColor(sub.language)}`}>
                            {getLanguageDisplay(sub.language)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-center">{sub.category}</TableCell>
                        <TableCell className="text-xs py-2 text-center">{formatDateTime(sub.submittedAt)}</TableCell>
                        <TableCell className="py-2 text-center">
                          {sub.approved ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300">승인 완료</Badge>
                          ) : (
                            <Badge variant={sub.status === "submitted" ? "default" : "secondary"}>
                              {sub.status === "submitted" ? "평가 완료" : (sub.status === "review_requested" ? "검토 요청" : "평가 대기")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {sub.status === 'submitted' ? (
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
                            <span className="text-gray-500">대기중</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {sub.status === 'submitted' ? (
                            <Button variant="outline" size="sm" onClick={() => viewEvaluationResult(sub.id)}>
                              <Eye className="w-4 h-4 mr-1" />
                              결과 확인
                            </Button>
                          ) : (
                            <span className="text-sm text-gray-400">평가 미완료</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {sub.status === 'submitted' ? (
                            <span className="text-sm text-gray-400">삭제 불가</span>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDelete(sub.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              삭제
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 결과 개수 표시 */}
                <div className="mt-3 text-sm text-gray-600 text-center">
                  총 {filteredSubmissions.length}명의 제출 기록
                </div>

                {/* 페이지네이션 컨트롤 */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* 페이지 정보 표시 */}
                {totalPages > 1 && (
                  <div className="mt-2 text-sm text-gray-500 text-center">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)} / {filteredSubmissions.length}개
                  </div>
                )}
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
                  언어별로 1개 파일씩 업로드하면 됩니다.
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
        <PDFSyncManager />

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
      </div>
    </div>
  )
}

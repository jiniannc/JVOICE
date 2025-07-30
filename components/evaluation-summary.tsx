"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Award, User, FileText, Calendar, Type, UserSquare, Star, MessageSquare, CheckCircle, ListChecks, BarChart2, Pencil, RefreshCw, AlertTriangle, AlertCircle } from "lucide-react"
import { getGradeInfo, evaluationCriteria } from "@/lib/evaluation-criteria"
import { RadarChart } from "@/components/radar-chart"
// WeaknessChart import 제거됨
// WeaknessChart 컴포넌트 사용 부분은 이미 순위 리스트로 대체됨
import { useState } from "react";

// admin/page.tsx에서 정의한 Submission 타입을 가져오거나 여기에 다시 정의
interface Submission {
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
}

interface EvaluationSummaryProps {
  evaluationResult: Submission;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (result: any) => void; // 평가 대시보드에서만 사용
  onRequestReview?: (result: any) => void; // 평가 대시보드에서만 사용
  authenticatedUser: any; // PDF 생성 등에 필요할 수 있음
  dropboxPath?: string; // 🔑 dropboxPath prop 추가
  showPdfButton?: boolean; // 관리자 모드에서만 PDF 다운로드 노출
  isReviewMode?: boolean; // 리뷰 모드 여부
}

export function EvaluationSummary({
  evaluationResult,
  isOpen,
  onClose,
  onSubmit,
  onRequestReview,
  authenticatedUser,
  dropboxPath, // 🔑 dropboxPath prop 받기
  showPdfButton = false,
  isReviewMode = false,
}: EvaluationSummaryProps) {
  console.log("🔍 EvaluationSummary 렌더링 시작:", { isOpen, evaluationResult })
  
  if (!isOpen) {
    console.log("❌ isOpen이 false이므로 null 반환")
    return null;
  }

  if (!evaluationResult) {
    console.log("❌ evaluationResult가 없으므로 null 반환")
    return null;
  }

  const {
    name,
    employeeId, // 누락된 속성 추가
    language,
    category,
    submittedAt, // 누락된 속성 추가
    evaluatedAt, // 누락된 속성 추가
    evaluatedBy, // 누락된 속성 추가
    scores = {},
    categoryScores = {},
    comments: rawComments = "", // 이름 변경
    totalScore = 0,
    koreanTotalScore = 0, // 누락된 속성 추가
    englishTotalScore = 0, // 누락된 속성 추가
  } = evaluationResult;

  const gradeInfo = getGradeInfo(totalScore, categoryScores, language, category);

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 한국어/영어 카테고리 분리
  const getKoreanCategories = () => {
    return Object.entries(categoryScores).filter(([key]) => key.startsWith("korean-"))
  }

  const getEnglishCategories = () => {
    return Object.entries(categoryScores).filter(([key]) => key.startsWith("english-"))
  }

  const getOtherCategories = () => {
    return Object.entries(categoryScores).filter(([key]) => !key.startsWith("korean-") && !key.startsWith("english-"))
  }

  // 평가 의견 분리
  const parseComments = (comment: string | { korean: string; english: string }) => {
    if (typeof comment === "object" && comment !== null) {
      return comment;
    }
    if (language === "korean-english" && typeof comment === 'string' && comment.includes("한국어:") && comment.includes("영어:")) {
      const parts = comment.split("\n");
      const koreanComment = parts.find((part) => part.startsWith("한국어:"))?.replace("한국어:", "").trim() || "";
      const englishComment = parts.find((part) => part.startsWith("영어:"))?.replace("영어:", "").trim() || "";
      return { korean: koreanComment, english: englishComment };
    }
    return { korean: typeof comment === 'string' ? comment : "", english: "" };
  };

  const comments = parseComments(rawComments); // 중복되지 않는 변수명 사용

  // 레이더 차트 데이터 준비
  const prepareRadarData = (language: string, scores: { [key: string]: number }) => {
    if (language === "korean-english") {
      // 한국어 데이터
      const koreanData = [
        { label: "발음", value: scores["korean-발음"] || 0, maxValue: 20 },
        { label: "억양", value: scores["korean-억양"] || 0, maxValue: 20 },
        { label: "전달력", value: scores["korean-전달력"] || 0, maxValue: 20 },
        { label: "음성", value: scores["korean-음성"] || 0, maxValue: 20 },
        { label: "속도", value: scores["korean-속도"] || 0, maxValue: 20 },
      ]

      // 영어 데이터
      const englishData = [
        { label: "발음_자음", value: scores["english-발음_자음"] || 0, maxValue: 20 },
        { label: "발음_모음", value: scores["english-발음_모음"] || 0, maxValue: 20 },
        { label: "억양", value: scores["english-억양"] || 0, maxValue: 20 },
        { label: "강세", value: scores["english-강세"] || 0, maxValue: 20 },
        { label: "전달력", value: scores["english-전달력"] || 0, maxValue: 20 },
      ]

      return { koreanData, englishData }
    } else if (language === "japanese" || language === "chinese") {
      // 평가 진행에서 쓰는 실제 항목을 evaluationCriteria에서 동적으로 추출
      const criteria = evaluationCriteria[language];
      const data = Object.entries(criteria).map(([label, maxValue]) => ({
        label,
        value: scores[label] || 0,
        maxValue: maxValue as number,
      }));
      return language === "japanese" ? { japaneseData: data } : { chineseData: data };
    }
    return {};
  };

  const radarData = prepareRadarData(language, categoryScores);

  // 소항목 기준 약점 데이터 준비
  const prepareWeaknessData = (language: string, scores: { [key: string]: number }) => {
    const weaknessData: Array<{
      subCategory: string
      mainCategory: string
      value: number
      maxValue: number
      percentage: number
      langType?: 'korean' | 'english'
    }> = []

    if (language === "korean-english") {
      // 한국어 소항목
      const koreanCriteria = evaluationCriteria.korean
      Object.entries(koreanCriteria).forEach(([mainCategory, subCriteria]) => {
        if (typeof subCriteria === 'object') {
          Object.entries(subCriteria).forEach(([subCategory, maxValue]) => {
            const score = scores[`korean-${mainCategory}-${subCategory}`] || 0
            const percentage = (score / maxValue) * 100
            weaknessData.push({
              subCategory,
              mainCategory,
              value: score,
              maxValue,
              percentage,
              langType: 'korean',
            })
          })
        }
      })

      // 영어 소항목
      const englishCriteria = evaluationCriteria.english
      Object.entries(englishCriteria).forEach(([mainCategory, subCriteria]) => {
        if (typeof subCriteria === 'object') {
          Object.entries(subCriteria).forEach(([subCategory, maxValue]) => {
            const score = scores[`english-${mainCategory}-${subCategory}`] || 0
            const percentage = (score / maxValue) * 100
            weaknessData.push({
              subCategory,
              mainCategory,
              value: score,
              maxValue,
              percentage,
              langType: 'english',
            })
          })
        }
      })
    }
    // 일본어/중국어는 소항목 약점 분석 차트 없음
    return weaknessData
  }

  const weaknessData = prepareWeaknessData(language, scores)

  // gradeInfo.reason 커스텀: 한/영 평가에서 16점 미만인 모든 항목을 등급 사유에 모두 표출
  const getAllFailReasons = () => {
    if (language === "korean-english") {
      const failReasons: string[] = [];
      const koreanCategories = ["발음", "억양", "전달력", "음성", "속도"];
      const englishCategories = ["발음_자음", "발음_모음", "억양", "강세", "전달력"];
      koreanCategories.forEach(cat => {
        const score = categoryScores[`korean-${cat}`] || 0;
        if (score < 16) failReasons.push(`한국어 ${cat} 항목 점수 부족 (${score}/20)`);
      });
      englishCategories.forEach(cat => {
        const score = categoryScores[`english-${cat}`] || 0;
        if (score < 16) failReasons.push(`영어 ${cat.replace('_', ' ')} 항목 점수 부족 (${score}/20)`);
      });
      if (failReasons.length > 0) return failReasons.join(', ');
    }
    return gradeInfo.reason;
  }

  // PDF 생성 함수
  const generatePDF = async () => {
    try {
      // jsPDF와 html2canvas 동적 import
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      // PDF 1페이지와 2테이너 찾기
      const page1Container = document.getElementById('pdf-page1');
      const page2Container = document.getElementById('pdf-page2');
      
      if (!page1Container || !page2Container) {
        alert('PDF 페이지 컨테이너를 찾을 수 없습니다.');
        return;
      }

      // PDF 생성 (A4 세로)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10; // 여백을 줄여서 더 많은 내용이 들어가도록 조정
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);

      // PDF 1페이지 생성
      await generatePagePDF(pdf, page1Container, margin, contentWidth, contentHeight, 1);
      
      // PDF2지 생성
      pdf.addPage();
      await generatePagePDF(pdf, page2Container, margin, contentWidth, contentHeight,2);

      // PDF 파일명 생성
      const fileName = `평가리포트_${name}_${employeeId}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // 새 창에서 PDF 열기
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      // 메모리 정리
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    }
  };

  // 각 페이지를 PDF에 추가하는 헬퍼 함수
  const generatePagePDF = async (
    pdf: any, 
    container: HTMLElement, 
    margin: number, 
    contentWidth: number, 
    contentHeight: number, 
    pageNum: number
  ) => {
    // jsPDF와 html2nvas 동적 import
    const html2canvas = await import('html2canvas');
    
    // 원래 스타일 저장
    const originalStyles = { ...container.style };
    const originalPaddingBottom = container.style.paddingBottom;
    
    // PDF 생성을 위한 최적화된 스타일 적용 (A4 비율에 맞춤)
    Object.assign(container.style, {
      overflow: 'visible',
      position: 'relative',
      transform: 'none',
      width: '794px', // A4 너비 (210mm ≈ 794px at 96 DPI)
      // height 고정값 제거 → 컨텐츠 실제 높이만큼 캡처
      maxHeight: 'unset',
      padding: '20px', // 상하좌우 기본 패딩
      paddingBottom: '40px', // 하단 여유 공간 추가해 잘림 방지
      backgroundColor: '#ffffff',
      fontSize: '11px', // 폰트 크기를 약간 줄여서 더 많은 내용이 들어가도록 조정
      lineHeight: '1.03', // 줄 간격을 줄여서 더 많은 내용이 들어가도록 조정
      boxSizing: 'border-box',
    });

    // 모든 하위 요소의 flexbox 관련 스타일 조정
    const flexElements = container.querySelectorAll('[class*="flex"]');
    const originalFlexStyles: any = {};
    flexElements.forEach((el, index) => {
      const element = el as HTMLElement;
      originalFlexStyles[index] = {
        display: element.style.display,
        flexDirection: element.style.flexDirection,
        alignItems: element.style.alignItems,
        justifyContent: element.style.justifyContent,
      };
      
      // flexbox를 block으로 변경하여 정렬 문제 해결
      if (element.style.display === 'flex') {
        element.style.display = 'block';
        element.style.flexDirection = 'unset';
        element.style.alignItems = 'unset';
        element.style.justifyContent = 'unset';
      }
    });
    
    // 폰트 로딩 대기
    await document.fonts.ready;
    
    // 렌더링 완료를 위한 지연
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // HTML을 캔버스로 변환
    const canvas = await html2canvas.default(container, {
      scale: 2, // 적절한 해상도
      useCORS: true,
      allowTaint: true,
      width: container.offsetWidth,
      height: container.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
      windowHeight: container.scrollHeight + 120,
      foreignObjectRendering: false,
      removeContainer: false,
      backgroundColor: '#ffffff',
      ignoreElements: (element: Element) => {
        return element.tagName === 'BUTTON' || 
               element.classList.contains('pdf-exclude');
      }
    });
    
    // 원래 스타일 복원
    Object.assign(container.style, originalStyles);
    container.style.paddingBottom = originalPaddingBottom;
    
    flexElements.forEach((el, index) => {
      const element = el as HTMLElement;
      if (originalFlexStyles[index]) {
        Object.assign(element.style, originalFlexStyles[index]);
      }
    });
    
    // 캔버스를 이미지로 변환
    const imgData = canvas.toDataURL('image/png');
    
    // 캔버스 비율에 맞게 이미지 크기 계산 (컨텐츠 전체가 A4 영역 안에 들어가도록)
    const widthRatio = contentWidth / canvas.width;
    const heightRatio = contentHeight / canvas.height;
    const scaleFactor = Math.min(widthRatio, heightRatio, 1); // 1보다 크게 확대하지 않음
    const imgWidth = canvas.width * scaleFactor;
    const imgHeight = canvas.height * scaleFactor;
    const offsetX = margin + (contentWidth - imgWidth) / 2;
    const offsetY = margin + (contentHeight - imgHeight) / 2;
 
    // PDF 페이지에 이미지 추가
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, imgWidth, imgHeight);
  };

  // 로딩 상태 관리 (제출 또는 검토 요청)
  const [loadingType, setLoadingType] = useState<null | 'submit' | 'review'>(null);

  const handleSubmit = async () => {
    if (!onSubmit) return;
    try {
      setLoadingType('submit');
      await Promise.resolve(onSubmit({
        ...evaluationResult,
        status: "submitted",
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: authenticatedUser?.name || authenticatedUser?.email || "Unknown",
        dropboxPath,
      }));
    } finally {
      setLoadingType(null);
    }
  };

  const handleRequestReviewClick = async () => {
    if (!onRequestReview) return;
    try {
      setLoadingType('review');
      await Promise.resolve(onRequestReview({
        ...evaluationResult,
        status: "review_requested",
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: authenticatedUser?.name || authenticatedUser?.email || "Unknown",
        dropboxPath,
      }));
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="min-h-screen p-4">
      {/* PDF 1페이지: 응시자 정보, 평가 결과, 카테고리별 상세 점수 */}
      <div id="pdf-page1" className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="relative flex items-center justify-between mb-6">
            <Button onClick={onClose} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
            </Button>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-3xl font-bold text-gray-900 whitespace-nowrap">상세 평가 리포트</h1>
          </div>
          <div>
          {showPdfButton && (
            <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              PDF 다운로드
            </Button>
          )}
          </div>
        </div>

        {/* 통합 정보 카드 (기존 응시자 정보 + 평가 결과) */}
        <Card className="mb-6 bg-white shadow-lg rounded-2xl overflow-hidden border-purple-100">
          <div className="md:flex">
            {/* 왼쪽: 응시자 정보 */}
            <div className="md:w-1/2 p-6 bg-gray-50/80">
              <div className="flex items-center gap-3 mb-5">
                <UserSquare className="w-7 h-7 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-800">응시자 정보</h3>
                </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-500 w-20">이름 (사번)</span>
                  <span className="font-semibold text-gray-900">{name} ({employeeId})</span>
                </div>
                <div className="flex items-center">
                  <Type className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-500 w-20">구분</span>
                  <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">{category}</Badge>
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-500 w-20">언어</span>
                  <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">{getLanguageDisplay(language)}</Badge>
                </div>
                <hr className="my-4 border-gray-200"/>
                {!isReviewMode && (
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-3 text-gray-400" />
                    <span className="font-medium text-gray-500 w-20">평가자</span>
                    <span className="font-semibold text-gray-900">{evaluatedBy || authenticatedUser?.name || authenticatedUser?.email || "Unknown"}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-500 w-20">평가일시</span>
                  <span className="font-semibold text-gray-900">{formatDate(evaluatedAt || new Date().toISOString())}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-500 w-20">제출일시</span>
                  <span className="font-semibold text-gray-900">{formatDate(submittedAt)}</span>
                </div>
              </div>
            </div>

            {/* 오른쪽: 평가 결과 */}
            <div className="relative md:w-1/2 p-6 flex flex-col items-center justify-center bg-gray-50 overflow-hidden">
              {/* Animated background */}
              <div
                className="absolute inset-0 w-full h-full bg-gradient-to-tl from-purple-200 via-pink-200 to-blue-200 animate-background-pan opacity-50"
                style={{ backgroundSize: '400% 400%' }}
              />
              {/* Shimmer Effect */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-0 left-0 w-1/2 h-full bg-white/30 animate-shimmer" />
              </div>
              <div className="absolute inset-0 w-full h-full backdrop-blur-sm" />
              
              <div className="relative z-10 text-center w-full">
                <div className="mb-3">
                  <span className="text-lg font-semibold text-gray-700">최종 등급</span>
                  </div>
                <Badge
                  className={`text-6xl font-bold px-10 py-5 mb-4 border-2 shadow-xl rounded-full ${gradeInfo.borderColor} ${gradeInfo.bgColor} ${gradeInfo.color}`}
                >
                  {language === "korean-english"
                    ? String(gradeInfo.grade).replace(/등급$/, "")
                    : gradeInfo.grade}
                </Badge>
                {gradeInfo.reason && <div className="text-sm text-gray-600 font-medium mt-2 max-w-xs mx-auto bg-white/20 p-1 rounded-md">{getAllFailReasons()}</div>}
                
                <div className={`mt-6 w-full grid gap-2 text-center ${language === "korean-english" ? "grid-cols-2" : "grid-cols-1"}`}>
                  {language === "korean-english" ? (
                    <>
                      <div className="p-3 bg-white/70 rounded-lg shadow-sm border border-gray-200">
                          <div className="text-2xl font-bold text-green-600">{koreanTotalScore}</div>
                          <div className="text-xs text-green-800 font-semibold">한국어 점수 (100점)</div>
                      </div>
                      <div className="p-3 bg-white/70 rounded-lg shadow-sm border border-gray-200">
                          <div className="text-2xl font-bold text-purple-600">{englishTotalScore}</div>
                          <div className="text-xs text-purple-800 font-semibold">영어 점수 (100점)</div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-white/70 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-2xl font-bold text-blue-600">{totalScore}</div>
                        <div className="text-xs text-blue-900 font-semibold">총점 (100점)</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 카테고리별 상세 점수 (한/영 기준만) */}
        {!isReviewMode && language === "korean-english" && (
          <Card className="mb-6 bg-white shadow-lg rounded-2xl overflow-hidden border-purple-100">
            <CardHeader className="bg-gray-50/80">
              <CardTitle className="flex items-center gap-3">
                <ListChecks className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-800">카테고리별 상세 점수</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-6">
                {/* 한국어 섹션 */}
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2 flex items-center gap-2">🇰🇷 한국어 평가</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(evaluationCriteria.korean).map(([mainCategory, subCriteria]) => {
                      const categoryScore = categoryScores[`korean-${mainCategory}`] || 0;
                      const isFail = categoryScore < 16;
                      return (
                        <div
                          key={mainCategory}
                          className={`p-2 border rounded ${isFail ? 'border-red-500 bg-red-50' : 'bg-green-50 border-green-200'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-green-900 text-sm">{mainCategory}</span>
                            <Badge variant="outline" className={`font-bold text-xs ${isFail ? 'text-red-600 border-red-500' : 'text-green-700 border-green-300'}`}>{categoryScore}/20</Badge>
                          </div>
                          {/* 소항목 점수 */}
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-green-800">
                            {typeof subCriteria === 'object' &&
                              Object.entries(subCriteria).map(([subCategory, maxValue]) => (
                                <div key={subCategory} className="flex items-center gap-1 min-w-[70px]">
                                  <span className="text-[11px] text-green-700">{subCategory}</span>
                                  <span className="font-bold text-green-900">{scores[`korean-${mainCategory}-${subCategory}`] ?? 0}/{maxValue}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* 영어 섹션 */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 mb-2 flex items-center gap-2">🇺🇸 영어 평가</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(evaluationCriteria.english).map(([mainCategory, subCriteria]) => {
                      const categoryScore = categoryScores[`english-${mainCategory}`] || 0;
                      const isFail = categoryScore < 16;
                      return (
                        <div
                          key={mainCategory}
                          className={`p-2 border rounded ${isFail ? 'border-red-500 bg-red-50' : 'bg-purple-50 border-purple-200'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-purple-900 text-sm">{mainCategory}</span>
                            <Badge variant="outline" className={`font-bold text-xs ${isFail ? 'text-red-600 border-red-500' : 'text-purple-700 border-purple-300'}`}>{categoryScore}/20</Badge>
                          </div>
                          {/* 소항목 점수 */}
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-purple-800">
                            {typeof subCriteria === 'object' &&
                              Object.entries(subCriteria).map(([subCategory, maxValue]) => (
                                <div key={subCategory} className="flex items-center gap-1 min-w-[70px]">
                                  <span className="text-[11px] text-purple-700">{subCategory}</span>
                                  <span className="font-bold text-purple-900">{scores[`english-${mainCategory}-${subCategory}`] ?? 0}/{maxValue}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* 일본어/중국어만: 카테고리별 상세 점수 */}
        {!isReviewMode && (language === "japanese" || language === "chinese") && (
          <Card className="mb-6 bg-white shadow-lg rounded-2xl overflow-hidden border-purple-100">
            <CardHeader className="bg-gray-50/80">
              <CardTitle className="flex items-center gap-3">
                <ListChecks className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-800">카테고리별 상세 점수</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(radarData.japaneseData || radarData.chineseData || []).map((item) => {
                  const percentage = (item.value / item.maxValue) * 100;
                  const isFail = percentage < 80;
                  return (
                    <div
                      key={item.label}
                      className={`p-2 border rounded ${
                        isFail ? 'border-red-500 bg-red-50' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-medium text-sm ${
                          isFail ? 'text-red-900' : 'text-blue-900'
                        }`}>{item.label}</span>
                        <Badge variant="outline" className={`font-bold text-xs ${
                          isFail ? 'text-red-600 border-red-500' : 'text-blue-700 border-blue-300'
                        }`}>
                          {item.value}/{item.maxValue}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* PDF 2페이지: 평가 결과 분석, 평가 의견 */}
      {!isReviewMode && (
      <div id="pdf-page2" className="max-w-4xl mx-auto mt-6">
        {/* 평가 결과 분석 */}
          <Card className="mb-6 bg-white shadow-lg rounded-2xl overflow-hidden border-purple-100">
            <CardHeader className="bg-gray-50/80">
              <CardTitle className="flex items-center gap-3">
                <BarChart2 className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-800">평가 결과 분석</span>
              </CardTitle>
          </CardHeader>
            <CardContent className="p-4 md:p-6">
            {language === "korean-english" ? (
              <div className="space-y-8">               {/* 레이더 차트 섹션 */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* 한국어 레이더 차트 */}
                  <div className="flex justify-center">
                    <RadarChart
                      data={radarData.koreanData || []}
                      title="한국어"
                      color="#10b981"
                      size={280}
                    />
                  </div>
                  {/* 영어 레이더 차트 */}
                  <div className="flex justify-center">
                    <RadarChart
                      data={radarData.englishData || []}
                      title="영어"
                      color="#8b5cf6"
                      size={280}
                    />
                  </div>
                </div>
                {/* 약점 순위 리스트 */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* 한국어 약점 순위 */}
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4 text-center">한국어 상세 보완점</h3>
                    <div className="mt-2 w-full max-w-xs">
                      <div className="space-y-2">
                        {weaknessData.filter(item => item.langType === 'korean').sort((a, b) => a.percentage - b.percentage).slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 bg-red-50 rounded-lg border ${index === 0 ? 'border-2 border-red-500' : 'border-red-200'}`}
                          >
                            <div className="flex items-center gap-2">
                              {index === 0 ? (
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              <div>
                                <div className={`font-medium text-gray-900 ${index === 0 ? 'text-lg' : 'text-sm'}`}>{item.subCategory}</div>
                                <div className="text-xs text-gray-600">{item.mainCategory}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold text-red-600 ${index === 0 ? 'text-lg' : 'text-sm'}`}>{item.value}/{item.maxValue}</div>
                              <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* 영어 약점 순위 */}
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4 text-center">영어 상세 보완점</h3>
                    <div className="mt-2 w-full max-w-xs">
                      <div className="space-y-2">
                        {weaknessData.filter(item => item.langType === 'english').sort((a, b) => a.percentage - b.percentage).slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 bg-red-50 rounded-lg border ${index === 0 ? 'border-2 border-red-500' : 'border-red-200'}`}
                          >
                            <div className="flex items-center gap-2">
                              {index === 0 ? (
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              <div>
                                <div className={`font-medium text-gray-900 ${index === 0 ? 'text-lg' : 'text-sm'}`}>{item.subCategory}</div>
                                <div className="text-xs text-gray-600">{item.mainCategory}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold text-red-600 ${index === 0 ? 'text-lg' : 'text-sm'}`}>{item.value}/{item.maxValue}</div>
                              <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <RadarChart
                  data={radarData.japaneseData || radarData.chineseData || []}
                  title={`${getLanguageDisplay(language)} 평가 분석`}
                  color="#3b82f6"
                  size={300}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 평가 의견 (PDF 포함) */}
        <Card className="mb-6 bg-white shadow-lg rounded-2xl overflow-hidden border-purple-100">
          <CardHeader className="bg-gray-50/80">
            <CardTitle className="flex items-center gap-3">
              <Pencil className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-800">평가 의견</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {language === "korean-english" ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-semibold text-green-700 flex items-center gap-2">한국어</h4>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="whitespace-pre-wrap">{comments.korean || "의견이 없습니다."}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-semibold text-purple-700 flex items-center gap-2">영어</h4>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="whitespace-pre-wrap">{comments.english || "의견이 없습니다."}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">{comments.korean}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* 평가 의견 (리뷰 모드 전용 – PDF 제외) */}
      {isReviewMode && (
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 bg-white shadow-lg rounded-2xl overflow-hidden border-purple-100">
          <CardHeader className="bg-gray-50/80">
            <CardTitle className="flex items-center gap-3">
              <Pencil className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-800">평가 의견</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {language === "korean-english" ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-semibold text-green-700 flex items-center gap-2">한국어</h4>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="whitespace-pre-wrap">{comments.korean || "의견이 없습니다."}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-semibold text-purple-700 flex items-center gap-2">영어</h4>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="whitespace-pre-wrap">{comments.english || "의견이 없습니다."}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">{comments.korean}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* 제출/검토 버튼 (평가자 모드에서만 표시) */}
      {!isReviewMode && onSubmit && (
        <div className="max-w-4xl mx-auto mt-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4">
              <Button onClick={handleSubmit} disabled={!!loadingType} size="lg" className="px-12 py-3 text-lg font-semibold">
                {loadingType === 'submit' ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                {loadingType === 'submit' ? '제출 중...' : '평가 최종 제출'}
              </Button>
              {onRequestReview && (
                <Button onClick={handleRequestReviewClick} disabled={!!loadingType} size="lg" variant="outline" className="px-12 py-3 text-lg font-semibold border-orange-300 text-orange-700 hover:bg-orange-50">
                  {loadingType === 'review' ? (
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  {loadingType === 'review' ? '검토 요청 중...' : '검토 요청'}
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600">제출 후에는 수정할 수 없습니다. 검토가 필요한 경우 '검토 요청'을 사용하세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}

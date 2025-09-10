import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EvaluationSummary } from "@/components/evaluation-summary";
import { History, Mic, Calendar, Users, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface MyRecordingEntry {
  id?: string;
  employeeId: string;
  name: string;
  language: string;
  category: string;
  submittedAt: string;
  dropboxPath?: string;
  approved: boolean;
  // Database API에서 추가되는 필드들
  totalScore?: number;
  koreanTotalScore?: number;
  englishTotalScore?: number;
  grade?: string;
  scores?: Record<string, number>;
  categoryScores?: Record<string, number>;
  comments?: Record<string, string>;
  evaluatedAt?: string;
  evaluatedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  recordings?: Record<string, string>;
}

interface MyRecordingsTableProps {
  employeeId: string;
  searchTerm?: string;
  hideHeader?: boolean;
}

export default function MyRecordingsTable({ employeeId, searchTerm = "", hideHeader = false }: MyRecordingsTableProps) {
  const [records, setRecords] = useState<MyRecordingEntry[]>([]);
  const [selectedEval, setSelectedEval] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [resultLoading, setResultLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    // Database API 사용 (승인된 평가 결과만 조회)
    fetch(`/api/evaluations/load-my-recordings-database?employeeId=${employeeId}`)
      .then(res => res.json())
      .then(data => {
        console.log("✅ [MyRecordingsTable] Database API에서 로드:", data.records?.length || 0, "개");
        setRecords(data.records || []);
      })
      .catch(error => {
        console.error("❌ [MyRecordingsTable] Database API 로드 실패:", error);
        // 실패시 기존 Dropbox API로 fallback
        console.log("🔄 [MyRecordingsTable] Dropbox API로 fallback");
        return fetch(`/api/evaluations/load-my-recordings?employeeId=${employeeId}`)
          .then(res => res.json())
          .then(data => setRecords(data.records || []));
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  const getLanguageDisplay = (lang: string) => {
    const map: any = { "korean-english": "한/영", japanese: "일본어", chinese: "중국어", korean: "한국어" };
    return map[lang] || lang;
  };
  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  });
  }

  const filtered = records
    .filter(rec => {
    const term = searchTerm.toLowerCase();
    return (
      rec.language.toLowerCase().includes(term) ||
      rec.category.toLowerCase().includes(term) ||
      formatDate(rec.submittedAt).includes(term)
    );
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // Find the most recent record
  const mostRecentIdx = filtered.reduce((latestIdx, rec, idx, arr) => {
    if (!arr[latestIdx]) return idx;
    return new Date(rec.submittedAt) > new Date(arr[latestIdx].submittedAt) ? idx : latestIdx;
  }, 0);

  const handleResultCheck = async (record: MyRecordingEntry) => {
    const key = record.dropboxPath || record.id || `${record.employeeId}_${record.language}`;
    setResultLoading(prev => ({ ...prev, [key]: true }));
    try {
      // 승인된 항목만 결과 확인 가능
      if (record.approved) {
        // Database API에서 이미 모든 데이터가 로드되었으므로 record 자체를 사용
        if (record.scores && record.categoryScores) {
          console.log("✅ [handleResultCheck] Database 데이터 사용:", record.id);
          setSelectedEval(record);
        } else {
          // Fallback: Dropbox에서 로드
          console.log("🔄 [handleResultCheck] Dropbox에서 fallback 로드");
          const res = await fetch(`/api/evaluations/download-json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: record.dropboxPath })
          });
          const { evaluation } = await res.json();
          const merged = evaluation && evaluation.candidateInfo ? { ...evaluation, ...evaluation.candidateInfo } : evaluation;
          setSelectedEval(merged);
        }
      }
    } catch (error) {
      console.error("Failed to load evaluation result:", error);
      // 필요하다면 여기에 에러 알림(toast)을 추가할 수 있습니다.
    } finally {
      setResultLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getMonthBadge = (date: string) => {
    if (!date) return null;
    const d = new Date(date);
    const month = d.getMonth() + 1;
    return <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 ml-2">{month}월 제출</Badge>;
  };

  return (
    <>
    <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
        {!hideHeader && (
          <CardHeader className="bg-gray-50/80">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-purple-600" />
              <CardTitle className="text-xl font-bold text-gray-800">내 녹음 기록</CardTitle>
            </div>
          </CardHeader>
        )}
      <CardContent className="p-6">
        {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-gray-600">녹음 기록을 불러오는 중입니다...</p>
            </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">녹음 기록이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
                {filtered.map((rec, idx) => (
              <Card 
                key={idx}
                className={`shadow-md rounded-lg overflow-hidden flex flex-col justify-between transition-all duration-300
                  hover:shadow-xl cursor-pointer
                  ${idx === mostRecentIdx ? 'ring-2 ring-green-400/60 bg-green-50/60' : 'bg-white'}`}
              >
                <CardHeader className="p-4 bg-gray-50 border-b">
                  <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-600" />
                    {getLanguageDisplay(rec.language)}
                    {getMonthBadge(rec.submittedAt)}
                    {idx === mostRecentIdx && (
                      <span className="ml-auto">
                        <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm animate-pulse">최신</Badge>
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-grow">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <Badge variant="secondary">{rec.category}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(rec.submittedAt)}</span>
                  </div>
                </CardContent>
                <div className="p-4">
                      {rec.approved ? (
                      <Button 
                        className="w-full" 
                        size="sm" 
                        variant="outline"
                        disabled={resultLoading[rec.dropboxPath || rec.id || `${rec.employeeId}_${rec.language}`]} 
                        onClick={() => handleResultCheck(rec)}
                      >
                        {resultLoading[rec.dropboxPath || rec.id || `${rec.employeeId}_${rec.language}`] ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            결과 로딩 중...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            결과 확인
                          </>
                        )}
                      </Button>
                      ) : (
                      <div className="flex items-center justify-center text-xs text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        평가 대기 중
                      </div>
                    )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      </Card>
      <Dialog open={!!selectedEval} onOpenChange={()=>setSelectedEval(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
          {selectedEval && (
            <EvaluationSummary isOpen={true} onClose={()=>setSelectedEval(null)} evaluationResult={selectedEval} authenticatedUser={{name:"User"}} onSubmit={()=>{}} onRequestReview={()=>{}} showPdfButton={false} isReviewMode={true} hideHeader={hideHeader} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 
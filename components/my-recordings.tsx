import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { History, Mic, Calendar, Users } from "lucide-react";

interface MyRecordingEntry {
  employeeId: string;
  name: string;
  language: string;
  category: string;
  submittedAt: string;
  dropboxPath: string;
}

interface MyRecordingsProps {
  employeeId: string;
}

export default function MyRecordings({ employeeId }: MyRecordingsProps) {
  const [records, setRecords] = useState<MyRecordingEntry[]>([]);
  const [selected, setSelected] = useState<MyRecordingEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    fetch(`/api/evaluations/load-my-recordings?employeeId=${employeeId}`)
      .then(res => res.json())
      .then(data => {
        setRecords(data.records || []);
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  const getLanguageDisplay = (lang: string) => {
    const map: any = { "korean-english": "한/영", japanese: "일본어", chinese: "중국어", korean: "한국어" };
    return map[lang] || lang;
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8">
      <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/80">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-xl font-bold text-gray-800">내 녹음 기록</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-gray-600">녹음 기록을 불러오는 중입니다...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">녹음 기록이 없습니다.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {records.map((rec, idx) => (
                <Card 
                  key={rec.dropboxPath + idx} 
                  className="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300" 
                  onClick={() => setSelected(rec)}
                >
                  <CardHeader className="p-4 bg-gray-50 border-b">
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-purple-600" />
                      {getLanguageDisplay(rec.language)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(rec.submittedAt)}</span>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <Badge variant="secondary">{rec.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상세 정보</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <div><b>응시자 정보</b></div>
              <div>이름: {selected.name}</div>
              <div>사번: {selected.employeeId}</div>
              <div>언어: {getLanguageDisplay(selected.language)}</div>
              <div>구분: {selected.category}</div>
              <div>제출일: {formatDate(selected.submittedAt)}</div>
              <div className="mt-4"><b>평가 결과/의견</b></div>
              <div className="text-gray-500 text-sm">(상세 평가는 추후 구현 예정입니다.)</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
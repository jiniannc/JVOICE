"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Calendar, Database, Upload, CheckCircle, AlertCircle, Clock, StopCircle, PlayCircle, Trash2, ExternalLink } from 'lucide-react';

interface SyncStatus {
  month: string;
  syncedAt: string;
  scheduleCount: number;
  active: boolean;
}

interface SyncResponse {
  success: boolean;
  message?: string;
  scheduleCount?: number;
  syncedAt?: string;
  error?: string;
}

export function ScheduleSyncAdmin() {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingMonths, setSyncingMonths] = useState<Set<string>>(new Set());
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newMonth, setNewMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedManageMonth, setSelectedManageMonth] = useState('');

  // 스프레드시트 바로가기
  const openSpreadsheet = () => {
    const url = 'https://docs.google.com/spreadsheets/d/1fF7lJZ_j2osxDe0PBJBUo4FPUp3Ne0kaqtJbF0CQAL8/edit#gid=0';
    window.open(url, '_blank');
  };



  // 동기화 상태 로드
  const loadSyncStatuses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/schedules/sync-from-sheets');
      const data = await response.json();
      
      if (data.success) {
        setSyncStatuses(data.schedules || []);
      } else {
        console.error('동기화 상태 로드 실패:', data.error);
      }
    } catch (error) {
      console.error('동기화 상태 로드 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 특정 월 동기화
  const syncMonth = async (month: string, forceUpdate = false) => {
    setSyncingMonths(prev => new Set([...prev, month]));
    
    try {
      const response = await fetch('/api/schedules/sync-from-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, forceUpdate })
      });
      
      const data: SyncResponse = await response.json();
      
      if (data.success) {
        alert(`✅ ${month} 동기화 완료: ${data.scheduleCount}개 스케줄`);
        loadSyncStatuses(); // 상태 새로고침
      } else {
        alert(`❌ ${month} 동기화 실패: ${data.error}`);
      }
    } catch (error) {
      console.error(`${month} 동기화 중 오류:`, error);
      alert(`${month} 동기화 중 오류가 발생했습니다.`);
    } finally {
      setSyncingMonths(prev => {
        const newSet = new Set(prev);
        newSet.delete(month);
        return newSet;
      });
    }
  };

  // 새 월 추가
  const addNewMonth = () => {
    const monthString = `${newYear}-${newMonth}`;
    if (/^\d{4}-\d{2}$/.test(monthString)) {
      syncMonth(monthString);
    } else {
      alert('올바른 년도와 월을 선택하세요');
    }
  };

  // 스케줄 활성화/비활성화
  const toggleScheduleActive = async (month: string, active: boolean) => {
    try {
      const response = await fetch('/api/schedules/sync-from-sheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, active })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${month} 스케줄이 ${active ? '활성화' : '종료'}되었습니다.`);
        loadSyncStatuses(); // 상태 새로고침
      } else {
        alert(`❌ ${month} 상태 변경 실패: ${data.error}`);
      }
    } catch (error) {
      console.error(`${month} 상태 변경 중 오류:`, error);
      alert(`${month} 상태 변경 중 오류가 발생했습니다.`);
    }
  };

  // 상태 뱃지 렌더링
  const renderStatusBadge = (status: SyncStatus | null) => {
    if (!status) {
      return <Badge variant="secondary" className="bg-gray-100">미동기화</Badge>;
    }
    
    const syncedDate = new Date(status.syncedAt);
    const hoursSinceSync = (Date.now() - syncedDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 1) {
      return <Badge className="bg-green-100 text-green-700">최신</Badge>;
    } else if (hoursSinceSync < 24) {
      return <Badge className="bg-yellow-100 text-yellow-700">오늘 동기화</Badge>;
    } else {
      return <Badge variant="outline" className="text-orange-700">
        {Math.floor(hoursSinceSync / 24)}일 전
      </Badge>;
    }
  };

  useEffect(() => {
    loadSyncStatuses();
  }, []);

  // 년도 옵션 생성 (현재년도 기준 ±2년)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  };

  // 월 옵션 생성
  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0');
      const monthName = (i + 1) + '월';
      return { value: month, label: monthName };
    });
  };

  return (
    <Card className="w-full mb-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4 bg-gray-50/80 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <Database className="w-6 h-6 text-purple-600" />
            <span className="text-xl font-bold text-gray-800">스케줄 동기화 관리</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              onClick={openSpreadsheet}
              variant="outline"
              size="sm"
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              스케줄 입력용 구글스프레드시트 바로가기
            </Button>
            <Button 
              onClick={loadSyncStatuses} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-6">
        {/* 새 월 추가 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">새 스케줄 동기화</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">년도</label>
              <Select value={newYear} onValueChange={setNewYear}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">월</label>
              <Select value={newMonth} onValueChange={setNewMonth}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addNewMonth} className="flex-shrink-0">
              <Upload className="w-4 h-4 mr-2" />
              동기화 시작
            </Button>
          </div>
        </div>

        {/* 동기화된 스케줄 관리 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">기존 스케줄 관리</h3>
          
          {syncStatuses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              동기화된 스케줄이 없습니다.
            </div>
          ) : (
            <>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">관리할 월 선택</label>
                  <Select value={selectedManageMonth} onValueChange={setSelectedManageMonth}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="월을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {syncStatuses
                        .sort((a, b) => b.month.localeCompare(a.month))
                        .map(status => {
                          const date = new Date(status.month + '-01');
                          const label = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
                          return (
                            <SelectItem key={status.month} value={status.month}>
                              {label} ({status.scheduleCount}개 스케줄)
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedManageMonth && (() => {
                const selectedStatus = syncStatuses.find(s => s.month === selectedManageMonth);
                const isSyncing = syncingMonths.has(selectedManageMonth);
                
                return selectedStatus && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium text-lg">{selectedManageMonth}</div>
                          <div className="text-sm text-gray-600">
                            {selectedStatus.scheduleCount}개 스케줄 • {' '}
                            마지막 동기화: {new Date(selectedStatus.syncedAt).toLocaleString('ko-KR')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(selectedStatus)}
                        <Badge 
                          variant={selectedStatus.active ? "default" : "secondary"}
                          className={selectedStatus.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                        >
                          {selectedStatus.active ? '활성화' : '종료됨'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => syncMonth(selectedManageMonth, false)}
                        disabled={isSyncing}
                        size="sm"
                        variant="outline"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            동기화 중...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            재동기화
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => syncMonth(selectedManageMonth, true)}
                        disabled={isSyncing}
                        size="sm"
                        variant="destructive"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        강제 업데이트
                      </Button>
                      
                      {selectedStatus.active ? (
                        <Button
                          onClick={() => toggleScheduleActive(selectedManageMonth, false)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <StopCircle className="w-4 h-4 mr-2" />
                          스케줄 종료
                        </Button>
                      ) : (
                        <Button
                          onClick={() => toggleScheduleActive(selectedManageMonth, true)}
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          스케줄 재개
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* 도움말 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">기능 설명</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>재동기화:</strong> 이미 동기화된 데이터가 있으면 스킵하고 기존 데이터 유지</li>
            <li>• <strong>강제 업데이트:</strong> 기존 데이터를 무시하고 Google Sheets에서 완전히 새로 가져와서 덮어쓰기</li>
            <li>• <strong>스케줄 종료:</strong> 승무원들이 Request 모드에서 해당 월을 볼 수 없게 함 (데이터는 보존)</li>
            <li>• <strong>스케줄 재개:</strong> 종료된 스케줄을 다시 승무원들에게 노출</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


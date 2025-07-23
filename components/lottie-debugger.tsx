"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { PlayerEvent } from "@lottiefiles/react-lottie-player";

// 동적 임포트로 Player 컴포넌트 로드
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then(mod => ({ default: mod.Player })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-200 animate-pulse rounded flex items-center justify-center">로딩 중...</div>
  }
);

export default function LottieDebugger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [playerState, setPlayerState] = useState<string>("initializing");
  const [fileStatus, setFileStatus] = useState<string>("checking");
  const [fileData, setFileData] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  useEffect(() => {
    setIsClient(true);
    addLog("LottieDebugger 컴포넌트 마운트됨");
    
    // 파일 존재 여부 및 내용 확인
    addLog("JSON 파일 확인 시작");
    fetch("/typography1.json")
      .then(response => {
        addLog(`HTTP 응답 상태: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        addLog("JSON 파일 로드 성공");
        addLog(`파일 크기: ${JSON.stringify(data).length} 문자`);
        addLog(`애니메이션 정보: ${data.w}x${data.h}, ${data.fr}fps, ${data.op}프레임`);
        setFileData(data);
        setFileStatus("loaded");
      })
      .catch(err => {
        addLog(`JSON 파일 로드 실패: ${err.message}`);
        setFileStatus("error");
      });
  }, []);

  const handlePlayerEvent = (event: PlayerEvent) => {
    addLog(`Player 이벤트: ${event}`);
    setPlayerState(event);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testDifferentPaths = () => {
    const paths = [
      "/typography1.json",
      "/public/typography1.json",
      "/components/Typography1.json",
      "typography1.json"
    ];

    paths.forEach(path => {
      fetch(path)
        .then(response => {
          addLog(`경로 ${path}: ${response.status}`);
        })
        .catch(err => {
          addLog(`경로 ${path}: 오류 - ${err.message}`);
        });
    });
  };

  if (!isClient) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Lottie 애니메이션 디버거</h2>
          <p className="text-gray-600">클라이언트 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Lottie 애니메이션 디버거</h2>
        
        {/* 상태 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">파일 상태</h3>
            <p className="text-blue-600">{fileStatus}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Player 상태</h3>
            <p className="text-green-600">{playerState}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">로그 개수</h3>
            <p className="text-purple-600">{logs.length}개</p>
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            로그 지우기
          </button>
          <button
            onClick={testDifferentPaths}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            경로 테스트
          </button>
        </div>

        {/* 애니메이션 영역 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">애니메이션</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <Player
              src="/typography1.json"
              autoplay
              loop
              style={{ width: "100%", height: 300 }}
              onEvent={handlePlayerEvent}
            />
          </div>
        </div>

        {/* 파일 정보 */}
        {fileData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">파일 정보</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify({
                  width: fileData.w,
                  height: fileData.h,
                  fps: fileData.fr,
                  duration: fileData.op,
                  version: fileData.v,
                  assets: fileData.assets?.length || 0,
                  layers: fileData.layers?.length || 0
                }, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 로그 영역 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">디버그 로그</h3>
          <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">로그가 없습니다...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
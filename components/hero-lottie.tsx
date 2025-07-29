"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { PlayerEvent } from "@lottiefiles/react-lottie-player";

// 동적 임포트로 Player 컴포넌트 로드
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then(mod => ({ default: mod.Player })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-transparent"></div>
  }
);

export default function HeroLottie() {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerState, setPlayerState] = useState<string>("initializing");

  useEffect(() => {
    console.log("HeroLottie: 컴포넌트 마운트됨");
    setIsClient(true);
    
    // 파일 존재 여부 확인
    fetch("/typography1.json")
      .then(response => {
        console.log("HeroLottie: JSON 파일 응답 상태:", response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("HeroLottie: JSON 파일 로드 성공", data);
        setLoading(false);
      })
      .catch(err => {
        console.error("HeroLottie: JSON 파일 로드 실패:", err);
        setError(`JSON 파일 로드 실패: ${err.message}`);
        setLoading(false);
      });
  }, []);

  const handlePlayerEvent = (event: PlayerEvent) => {
    console.log("HeroLottie: Player 이벤트 발생:", event);
    setPlayerState(event);
    
    switch (event) {
      case 'load':
        console.log("HeroLottie: 애니메이션 로드 완료");
        setLoading(false);
        break;
      case 'error':
        console.error("HeroLottie: Player 오류 발생");
        setError('Lottie Player 오류 발생');
        setLoading(false);
        break;
      case 'ready':
        console.log("HeroLottie: Player 준비 완료");
        break;
      case 'play':
        console.log("HeroLottie: 애니메이션 재생 시작");
        break;
      case 'pause':
        console.log("HeroLottie: 애니메이션 일시정지");
        break;
      case 'stop':
        console.log("HeroLottie: 애니메이션 정지");
        break;
      case 'complete':
        console.log("HeroLottie: 애니메이션 완료");
        break;
      default:
        console.log("HeroLottie: 기타 이벤트:", event);
    }
  };

  if (!isClient) {
    console.log("HeroLottie: 서버 사이드 렌더링 중");
    return (
      <div className="w-full flex justify-center items-center min-h-[300px] bg-transparent">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center min-h-[300px] bg-transparent">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex justify-center items-center min-h-[300px] bg-transparent">
        <div className="text-red-300 bg-red-900/80 p-6 rounded-lg max-w-md backdrop-blur-sm">
          <h3 className="font-semibold mb-2">애니메이션 로드 실패</h3>
          <p className="text-sm mb-3">{error}</p>
          <p className="text-xs text-red-200">Player 상태: {playerState}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            페이지 새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center items-center bg-transparent">
      <div 
        className="w-full max-w-2xl"
        style={{
          animation: 'typography-floating 6s ease-in-out infinite, typography-color-shift 8s ease-in-out infinite'
        }}
      >
        <Player
          src="/typography1.json"
          autoplay
          keepLastFrame
          style={{ width: "100%", height: 300 }}
          onEvent={handlePlayerEvent}
        />
      </div>
    </div>
  );
} 
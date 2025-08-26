'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone, Globe, Chrome } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // PWA 설치 가능 여부 확인
    const checkPWASupport = async () => {
      try {
        // 매니페스트 파일 확인
        const manifestResponse = await fetch('/manifest.json');
        if (!manifestResponse.ok) {
          console.log('❌ PWA: 매니페스트 파일을 찾을 수 없습니다');
          return;
        }
        
        // 서비스 워커 등록 확인
        if ('serviceWorker' in navigator) {
          console.log('✅ PWA: 서비스 워커 지원됨');
        }
        
        // 설치 가능 여부 확인
        if ('standalone' in window.navigator) {
          console.log('✅ PWA: standalone 모드 지원됨');
        }
        
        console.log('✅ PWA: 설치 조건 확인 완료');
      } catch (error) {
        console.log('❌ PWA: 설치 조건 확인 실패', error);
      }
    };

    checkPWASupport();

    // 로컬 스토리지에서 이전에 닫았는지 확인
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedTime) {
      if (dismissedTime === 'installed') {
        // 설치 완료된 경우 영구적으로 숨김
        setDismissed(true);
        return;
      }
      const expiryTime = parseInt(dismissedTime);
      if (Date.now() < expiryTime) {
        setDismissed(true);
        return;
      } else {
        // 만료된 경우 삭제
        localStorage.removeItem('pwa-prompt-dismissed');
      }
    }

    // 디바이스 및 브라우저 감지
    const userAgent = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
    const isChromeBrowser = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isSafariBrowser = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsChrome(isChromeBrowser);
    setIsSafari(isSafariBrowser);

    // PWA 설치 이벤트 리스너 (Android Chrome에서만 작동)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    // iOS 디바이스에서 설치 안내 표시 (Safari 또는 Chrome)
    if (isIOSDevice) {
      setShowInstallPrompt(true);
    }

    // Android Chrome에서도 강제로 표시 (테스트용)
    if (isChromeBrowser && !isIOSDevice) {
      // 3초 후에 강제로 표시
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
    }

    // 디버깅을 위한 로그
    console.log('🔍 PWA Install Prompt Debug:', {
      isIOSDevice,
      isChromeBrowser,
      isSafariBrowser,
      userAgent: userAgent.substring(0, 100) + '...',
      showInstallPrompt: isIOSDevice
    });

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
        // 설치 완료 시 영구적으로 숨김
        localStorage.setItem('pwa-prompt-dismissed', 'installed');
      }
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDismissed(true);
    // 24시간 동안 다시 표시하지 않음
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24시간 후
    localStorage.setItem('pwa-prompt-dismissed', expiryTime.toString());
  };

  // 디버깅을 위한 상태 로그
  console.log('🔍 PWA Install Prompt State:', {
    dismissed,
    showInstallPrompt,
    isIOS,
    isChrome,
    isSafari,
    shouldShow: !dismissed && (showInstallPrompt || isIOS)
  });

  // 테스트용: 항상 표시 (조건 무시)
  if (dismissed) {
    console.log('❌ PWA Install Prompt: 사용자가 닫음');
    return null;
  }

  // 강제로 표시 (테스트용)
  if (!showInstallPrompt && !isIOS) {
    console.log('🔧 PWA Install Prompt: 강제 표시 (테스트용)');
    setShowInstallPrompt(true);
  }

  // 데스크톱에서는 표시하지 않음 (테스트를 위해 주석 처리)
  // if (typeof window !== 'undefined' && window.innerWidth > 768) {
  //   return null;
  // }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      {/* 테스트용 리셋 버튼 */}
      <div className="mb-2 text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            localStorage.removeItem('pwa-prompt-dismissed');
            window.location.reload();
          }}
          className="text-xs"
        >
          PWA 프롬프트 리셋 (테스트용)
        </Button>
      </div>
      <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-sm font-semibold text-gray-800">
                앱 설치하기
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-xs text-gray-600">
            홈 화면에 바로가기를 추가하여 더 빠르게 접근하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isIOS ? (
            <div className="space-y-3">
              {isChrome ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <Chrome className="h-4 w-4 text-blue-600" />
                    <span><strong>Chrome</strong>에서 사용 중</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Chrome에서 <strong>주소창 옆 메뉴</strong> (⋮)를 탭하고 <strong>"홈 화면에 추가"</strong>를 선택하세요
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>1. 주소창 옆 ⋮ 메뉴 클릭</div>
                    <div>2. "홈 화면에 추가" 선택</div>
                    <div>3. "추가" 버튼 클릭</div>
                  </div>
                </div>
              ) : isSafari ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span><strong>Safari</strong>에서 사용 중</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Safari에서 <strong>공유</strong> 버튼을 탭하고 <strong>홈 화면에 추가</strong>를 선택하세요
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>1. 공유 버튼 □↗ 클릭</div>
                    <div>2. "홈 화면에 추가" 선택</div>
                    <div>3. "추가" 버튼 클릭</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    <strong>Safari</strong> 또는 <strong>Chrome</strong>에서 접속하여 홈 화면에 추가하세요
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>• Safari: 공유 버튼 → 홈 화면에 추가</div>
                    <div>• Chrome: 메뉴 ⋮ → 홈 화면에 추가</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={handleInstallClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              앱 설치
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

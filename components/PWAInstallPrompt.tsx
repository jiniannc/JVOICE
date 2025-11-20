'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone, Globe, Chrome, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'failed' | 'not-supported'>('idle');

  useEffect(() => {
    // 이미 standalone 모드로 실행 중인지 확인 (이미 설치된 경우)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      console.log('✅ PWA: 이미 설치됨 - 프롬프트 표시 안 함');
      setDismissed(true);
      localStorage.setItem('pwa-prompt-dismissed', 'installed');
      return;
    }

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
    
    // Chrome 감지
    const isChromeBrowser = /Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent);
    
    // Safari 감지
    const isSafariBrowser = /Safari/.test(userAgent) && !/Chrome|Chromium/.test(userAgent) && /Version/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsChrome(isChromeBrowser);
    setIsSafari(isSafariBrowser);

    // PWA 설치 이벤트 리스너 (Android Chrome에서만 작동)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // beforeinstallprompt 이벤트가 발생한 경우에만 표시
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        setInstallStatus('installing');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setInstallStatus('success');
          setDeferredPrompt(null);
          // 설치 완료 시 영구적으로 숨김
          localStorage.setItem('pwa-prompt-dismissed', 'installed');
          
          // 3초 후에 프롬프트 숨김
          setTimeout(() => {
            setShowInstallPrompt(false);
          }, 3000);
        } else {
          setInstallStatus('failed');
          // 2초 후에 다시 idle 상태로
          setTimeout(() => {
            setInstallStatus('idle');
          }, 2000);
        }
      } catch (error) {
        setInstallStatus('failed');
        console.error('PWA 설치 오류:', error);
        // 2초 후에 다시 idle 상태로
        setTimeout(() => {
          setInstallStatus('idle');
        }, 2000);
      }
    } else {
      // deferredPrompt가 없는 경우 (데스크톱 등)
      setInstallStatus('not-supported');
      // 3초 후에 다시 idle 상태로
      setTimeout(() => {
        setInstallStatus('idle');
      }, 3000);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDismissed(true);
    // 7일 동안 다시 표시하지 않음 (24시간 -> 7일로 변경)
    const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7일 후
    localStorage.setItem('pwa-prompt-dismissed', expiryTime.toString());
  };

  // 이미 닫았거나 설치 완료된 경우, 또는 알림을 표시할 필요가 없는 경우
  if (dismissed || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
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
                    Chrome에서 <strong>주소창 옆 공유 버튼</strong>을 탭하고 <strong>"홈 화면에 추가"</strong>를 선택하세요
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>1. 주소창 옆 공유 버튼 클릭</div>
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
                    <div>• Chrome: 주소창 옆 공유 버튼 → 홈 화면에 추가</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {installStatus === 'success' && (
                <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">앱이 성공적으로 설치되었습니다!</span>
                </div>
              )}
              
              {installStatus === 'failed' && (
                <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-red-700 font-medium">설치가 취소되었습니다.</span>
                </div>
              )}
              
              {installStatus === 'not-supported' && (
                <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700 font-medium">이 브라우저에서는 자동 설치가 지원되지 않습니다. 브라우저 메뉴에서 "홈 화면에 추가"를 선택해주세요.</span>
                </div>
              )}
              
              <Button
                onClick={handleInstallClick}
                disabled={installStatus === 'installing' || installStatus === 'success'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                size="sm"
              >
                {installStatus === 'installing' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    설치 중...
                  </>
                ) : installStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    설치 완료
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    앱 설치
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

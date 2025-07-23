# 🧹 캐시 삭제 가이드

## 🚨 Google 인증 오류 해결

Google Identity Services 마이그레이션 후 발생하는 캐시 관련 오류를 해결하는 방법입니다.

## 🔧 자동 해결 방법

### CacheBuster 컴포넌트 사용
\`\`\`typescript
import { CacheBuster } from '@/components/cache-buster'

// 페이지에 추가
<CacheBuster />
\`\`\`

**"모든 캐시 삭제 + 새로고침" 버튼 클릭**
- 모든 브라우저 캐시 자동 삭제
- 자동 페이지 새로고침
- 가장 확실한 해결 방법

## 🛠️ 수동 해결 방법

### 1. 강제 새로고침
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### 2. 개발자 도구 캐시 삭제
1. **F12** 키로 개발자 도구 열기
2. **Application** 탭 클릭
3. **Storage** 섹션에서 **Clear storage** 클릭
4. **Clear site data** 버튼 클릭

### 3. 시크릿/프라이빗 모드
- **Chrome**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- **Safari**: `Cmd + Shift + N`

### 4. 브라우저 설정에서 캐시 삭제
#### Chrome
1. `chrome://settings/clearBrowserData`
2. **고급** 탭 선택
3. **전체 기간** 선택
4. 모든 항목 체크 후 **데이터 삭제**

#### Firefox
1. `about:preferences#privacy`
2. **쿠키 및 사이트 데이터** → **데이터 지우기**
3. 모든 항목 체크 후 **지우기**

## ✅ 해결 확인 방법

캐시 삭제 후 다음을 확인하세요:

### 콘솔 로그 확인
\`\`\`
✅ Google Identity Services 초기화 완료!
✅ 로그인 성공: user@jinair.com
\`\`\`

### 오류 메시지 사라짐
- ❌ `idpiframe_initialization_failed`
- ❌ `gapi.auth2 is not a function`
- ❌ CSP 오류

### 정상 작동 확인
- 🔐 Google 로그인 팝업 정상 표시
- 🚀 빠른 로그인 속도
- 📱 안정적인 인증 시스템

## 🎯 문제별 해결책

### CSP 오류
\`\`\`
Refused to load script 'https://accounts.google.com/gsi/client'
\`\`\`
**해결**: `next.config.mjs`에서 CSP 헤더 수정

### 구버전 API 오류
\`\`\`
gapi.auth2 is not defined
\`\`\`
**해결**: 브라우저 캐시 완전 삭제

### 초기화 실패
\`\`\`
Google Identity Services 스크립트를 로드할 수 없습니다
\`\`\`
**해결**: 네트워크 연결 확인 + 캐시 삭제

## 🚀 예방 방법

### 1. 정기적인 캐시 관리
- 개발 중 정기적으로 캐시 삭제
- 브라우저 자동 업데이트 활성화

### 2. 개발 환경 설정
\`\`\`javascript
// next.config.mjs
const nextConfig = {
  // 개발 중 캐시 비활성화
  ...(process.env.NODE_ENV === 'development' && {
    headers: async () => [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
        ]
      }
    ]
  })
}
\`\`\`

### 3. 버전 관리
- 주요 업데이트 시 버전 번호 변경
- 사용자에게 캐시 삭제 안내

---

**💡 팁**: 문제가 지속되면 다른 브라우저에서 테스트해보세요!

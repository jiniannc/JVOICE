# Railway 콘솔 로그 관리 가이드

## 📋 개요

Railway는 애플리케이션의 console.log 출력을 자동으로 수집하고 저장합니다.
이 가이드는 Railway의 로그 보존 기간을 설정하여 로그 용량을 관리하는 방법을 설명합니다.

---

## 🔧 Railway 로그 설정

### Railway의 로그 보존 정책

Railway는 다음과 같은 로그 보존 정책을 제공합니다:

| 플랜 | 로그 보존 기간 | 비고 |
|------|--------------|------|
| **Hobby Plan (무료)** | 7일 | 자동 설정됨 |
| **Pro Plan** | 30일 (기본) | 최대 90일까지 설정 가능 |
| **Enterprise** | 커스텀 | 협의 가능 |

**무료 플랜 사용 시**: Railway가 자동으로 7일 이상 된 로그를 삭제하므로 별도 설정이 필요 없습니다. ✅

---

## 📊 Railway 로그 확인

### CLI로 로그 확인
```bash
# 최근 로그 확인
railway logs

# 실시간 로그 스트리밍
railway logs --follow

# 특정 개수만 확인
railway logs --tail 100
```

### 대시보드에서 확인
1. Railway 대시보드 접속
2. 프로젝트 선택
3. Deployments 탭
4. Logs 섹션

---

## 🗑️ 로그 용량 절감 방법

### 1. 불필요한 console.log 제거 (권장)

프로덕션 환경에서 불필요한 로그를 줄이는 것이 가장 효과적입니다.

#### Next.js에서 프로덕션 로그 필터링

`next.config.mjs` 수정:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프로덕션에서 console.log 제거
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? {
          exclude: ['error', 'warn'], // error, warn만 남기고 나머지 제거
        }
      : false,
  },
}

export default nextConfig
```

### 2. 환경별 로깅 설정

`lib/logger.ts` 생성:

```typescript
// 환경에 따라 로깅 레벨 조정
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },
  
  info: (...args: any[]) => {
    console.log('[INFO]', ...args)
  },
  
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  },
}
```

사용 예시:
```typescript
import { logger } from '@/lib/logger'

// 개발 환경에서만 출력
logger.debug('디버그 정보:', data)

// 모든 환경에서 출력
logger.info('중요 정보:', info)
logger.error('에러 발생:', error)
```

### 3. 중요한 로그만 선별적으로 출력

```typescript
// ❌ 나쁜 예: 모든 요청 로깅
export async function GET(request: NextRequest) {
  console.log('GET 요청 받음')
  console.log('헤더:', request.headers)
  console.log('쿼리:', request.nextUrl.searchParams)
  // ...
}

// ✅ 좋은 예: 에러나 중요한 이벤트만 로깅
export async function GET(request: NextRequest) {
  try {
    // 정상 동작은 로그 없음
    const result = await processRequest()
    return NextResponse.json(result)
  } catch (error) {
    // 에러만 로깅
    console.error('❌ GET 요청 처리 실패:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

---

## 🎯 로깅 모범 사례

### 로그 레벨별 사용 기준

| 레벨 | 용도 | 프로덕션 사용 |
|------|------|--------------|
| **DEBUG** | 개발 중 디버깅 정보 | ❌ 사용 안 함 |
| **INFO** | 중요한 이벤트, 상태 변경 | ✅ 선별적 사용 |
| **WARN** | 잠재적 문제 | ✅ 사용 |
| **ERROR** | 에러, 예외 | ✅ 필수 사용 |

### 로깅 시 포함할 정보

```typescript
// ❌ 나쁜 예: 정보 부족
console.error('에러 발생')

// ✅ 좋은 예: 컨텍스트 포함
console.error('❌ [평가 저장] 데이터베이스 저장 실패:', {
  userId: user.id,
  evaluationId: evaluation.id,
  error: error.message,
  timestamp: new Date().toISOString()
})
```

---

## 📈 현재 프로젝트 로그 현황

프로젝트에서 2,679개의 console.log를 사용 중입니다 (225개 파일).

### 권장 조치

1. **프로덕션에서 console.log 제거 설정**
   - `next.config.mjs`에 `removeConsole` 추가
   - 예상 로그 감소: 약 70-80%

2. **logger 유틸리티 도입**
   - 개발/프로덕션 환경 분리
   - 예상 로그 감소: 추가 10-15%

3. **중요 로그만 유지**
   - 에러, 중요 이벤트만 로깅
   - 최종 로그 감소: 총 85-90%

---

## 🚀 적용 순서

### 1단계: next.config.mjs 수정

```bash
# 파일 수정 후
npm run build
railway up
```

### 2단계: 효과 확인

```bash
# Railway 로그 확인
railway logs --tail 100

# 로그 양 비교
railway logs --since 1h | wc -l  # 1시간 동안의 로그 줄 수
```

### 3단계: 필요시 추가 최적화

로그가 여전히 많다면:
- logger 유틸리티 도입
- 불필요한 console.log 수동 제거

---

## 📊 예상 효과

### Before (현재)
- 로그 출력: 하루 수천~수만 줄
- Railway 로그 용량: 계속 증가
- 로그 조회 속도: 느림

### After (최적화)
- 로그 출력: 하루 수백 줄 (에러/중요 이벤트만)
- Railway 로그 용량: 7일치만 유지 (자동)
- **로그 감소: 85-90%** 💰
- **로그 조회 속도: 10배 이상 개선** ⚡

---

## 💡 팁

1. **Railway 무료 플랜**은 7일 자동 삭제가 이미 활성화되어 있습니다
2. **프로덕션에서는 에러/경고만 로깅**하는 것이 관례입니다
3. **개발 환경과 프로덕션 환경을 분리**하여 로깅하세요
4. **민감한 정보(비밀번호, 토큰 등)는 절대 로깅하지 마세요**

---

## ❓ FAQ

### Q: Railway 로그가 자동으로 삭제되나요?
**A:** 네, Railway는 플랜에 따라 자동으로 오래된 로그를 삭제합니다.
- Hobby (무료): 7일
- Pro: 30일 (기본)

### Q: 데이터베이스 로그도 자동 삭제되나요?
**A:** 아니요, DB의 `LoginLog`, `ScheduleApplication` 등은 별도입니다. 
현재 설정에서는 **영구 보존**됩니다.

### Q: console.log를 모두 제거해야 하나요?
**A:** 아니요, 에러와 중요한 이벤트는 남겨두는 것이 좋습니다.
`next.config.mjs`의 `removeConsole` 옵션으로 선택적 제거 가능합니다.

### Q: 로그를 장기 보관하려면?
**A:** Railway Pro 플랜으로 업그레이드하거나, 
외부 로깅 서비스(Sentry, Datadog 등) 사용을 고려하세요.


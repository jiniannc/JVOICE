# 🗓️ Google Calendar OAuth 설정 가이드

## 🎯 목적
기존 Google OAuth에 Calendar API 권한을 추가하여 관리자가 자동으로 Google Meet 링크를 생성할 수 있도록 합니다.

## 🛠️ Google Cloud Console 설정

### 1. API 활성화
Google Cloud Console → APIs & Services → Library에서 다음 API들을 활성화:

```
✅ Google Calendar API
✅ Google OAuth2 API (이미 활성화되어 있을 것)
```

### 2. OAuth 2.0 클라이언트 ID 설정
Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**승인된 리디렉션 URI에 추가:**
```
# 로컬 개발환경
http://localhost:3000/api/auth/google-calendar/callback

# 프로덕션 환경 (실제 도메인으로 변경)
https://your-domain.com/api/auth/google-calendar/callback
```

### 3. OAuth 동의 화면 설정
Google Cloud Console → APIs & Services → OAuth consent screen

**스코프에 추가:**
```
✅ openid
✅ email  
✅ profile
✅ https://www.googleapis.com/auth/calendar
✅ https://www.googleapis.com/auth/calendar.events
```

## 🚀 사용 방법

### 1. 관리자 권한 설정
1. Evaluate Mode → 교육 신청자 목록
2. 1:1 교육 세션에서 "Meet 생성" 버튼 클릭
3. 처음 사용 시 "Google Calendar 연동" 팝업 표시
4. Google 계정으로 로그인 후 Calendar 권한 승인

### 2. Google Meet 생성
1. 권한 승인 후 자동으로 Google Meet 링크 생성
2. 교육생과 관리자에게 캘린더 초대 자동 발송
3. 교육 24시간 전부터 참가 버튼 활성화

### 3. 교육생 사용
1. Request Mode → 내 신청 내역
2. 1:1 교육 24시간 전부터 "Google Meet 참가" 버튼 표시
3. 버튼 클릭으로 바로 Meet 룸 입장

## 🔧 기술적 세부사항

### OAuth Flow
```
1. 관리자가 "Meet 생성" 클릭
2. Calendar 권한 없으면 OAuth 팝업 열기
3. /api/auth/google-calendar → Google OAuth
4. /api/auth/google-calendar/callback → 토큰 저장
5. /api/requests/generate-meet → Meet 생성
```

### 토큰 관리
- **Access Token**: 1시간 유효, HttpOnly 쿠키 저장
- **Refresh Token**: 30일 유효, 자동 갱신
- **보안**: XSS 방지를 위한 HttpOnly 쿠키 사용

### 생성되는 캘린더 이벤트
```json
{
  "summary": "1:1 한/영 교육 - 홍길동",
  "description": "교육 세부 정보...",
  "start": "2024-01-15T08:30:00+09:00",
  "end": "2024-01-15T09:20:00+09:00",
  "attendees": [
    "student@jinair.com",
    "instructor@jinair.com"
  ],
  "conferenceData": {
    "createRequest": {
      "conferenceSolutionKey": { "type": "hangoutsMeet" }
    }
  }
}
```

## ⚠️ 주의사항

1. **도메인 제한**: `@jinair.com` 계정만 사용 가능
2. **권한 범위**: Calendar 읽기/쓰기 권한 필요
3. **토큰 갱신**: Refresh Token 만료 시 재인증 필요
4. **1:1 교육만**: 소규모 교육은 별도 처리 필요

## 🐛 트러블슈팅

### "Calendar 권한이 없습니다" 오류
→ Google Calendar 연동 버튼을 클릭하여 권한 승인

### "토큰 갱신에 실패했습니다" 오류  
→ Refresh Token 만료, 다시 권한 승인 필요

### "허용되지 않은 도메인" 오류
→ `@jinair.com` 계정으로만 로그인 가능

### Meet 링크가 생성되지 않음
→ Google Calendar API가 활성화되어 있는지 확인



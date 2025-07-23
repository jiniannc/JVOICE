# 🔐 서버사이드 Google OAuth 설정 가이드

## ✅ 장점
- **FedCM 문제 완전 우회** - 클라이언트 사이드 제약 없음
- **모든 브라우저 호환** - Chrome, Firefox, Safari, Edge 모두 지원
- **보안 강화** - 서버에서 모든 토큰 검증
- **간단한 구현** - 복잡한 FedCM 설정 불필요

## 🛠️ 설정 단계

### 1. Google Cloud Console 설정
1. 기존 OAuth 클라이언트 ID 사용 가능
2. **승인된 리디렉션 URI**에 추가:
   \`\`\`
   http://localhost:3000/api/auth/server/callback
   https://your-domain.com/api/auth/server/callback
   \`\`\`

### 2. 환경변수 설정
\`\`\`env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
\`\`\`

### 3. 테스트
1. `/test-server-auth` 페이지 접속
2. "Google로 로그인" 클릭
3. Google 인증 완료
4. 자동으로 메인 페이지 리다이렉트

## 🔄 작동 방식
1. **전체 페이지 리다이렉트** → Google OAuth
2. **서버에서 코드 교환** → 액세스 토큰
3. **서버에서 사용자 정보 조회** → 안전한 검증
4. **HttpOnly 쿠키 설정** → XSS 방지
5. **메인 페이지 리다이렉트** → 로그인 완료

## 🚀 배포 시 주의사항
- 리다이렉션 URI를 실제 도메인으로 업데이트
- HTTPS 환경에서 secure 쿠키 사용
- 환경변수 보안 관리

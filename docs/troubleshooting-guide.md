# 🔧 문제 해결 가이드

## 🚨 **자주 발생하는 오류들**

### 1. **OAuth 관련 오류**

#### `Error 400: redirect_uri_mismatch`
\`\`\`
증상: 로그인 버튼 클릭 시 Google에서 리디렉션 오류 발생

원인: OAuth 클라이언트 설정의 리디렉션 URI가 실제 URL과 다름

해결방법:
1. Google Cloud Console > APIs 및 서비스 > 사용자 인증 정보
2. OAuth 클라이언트 ID 편집
3. 승인된 리디렉션 URI에 정확한 URL 추가:
   - http://localhost:3000 (개발용)
   - https://your-domain.com (프로덕션용)
4. 저장 후 5-10분 대기 (전파 시간)
\`\`\`

#### `Error 403: access_denied`
\`\`\`
증상: 로그인 시도 시 접근 거부 메시지

원인: OAuth 동의 화면 설정 또는 도메인 제한 문제

해결방법:
1. OAuth 동의 화면에서 "내부" 선택 확인
2. 승인된 도메인에 jinair.com 추가 확인
3. 개발 중이면 테스트 사용자에 이메일 추가
4. 앱 상태가 "테스트" 상태인지 확인
\`\`\`

#### `Error 401: unauthorized_client`
\`\`\`
증상: 클라이언트 인증 실패

원인: 클라이언트 ID 또는 시크릿 불일치

해결방법:
1. .env.local의 NEXT_PUBLIC_GOOGLE_CLIENT_ID 확인
2. GOOGLE_CLIENT_SECRET 확인
3. Google Cloud Console에서 올바른 값 복사
4. 서버 재시작 (npm run dev)
\`\`\`

---

### 2. **직원 정보 조회 오류**

#### `직원 정보를 찾을 수 없습니다`
\`\`\`
증상: 로그인 성공했지만 직원 정보 조회 실패

원인: 스프레드시트 설정 또는 데이터 문제

해결방법:
1. 스프레드시트 ID 확인:
   - URL: https://docs.google.com/spreadsheets/d/[스프레드시트ID]/edit
   - .env.local의 NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID와 일치 확인

2. 스프레드시트 공유 설정:
   - "링크가 있는 모든 사용자" 권한 설정
   - "뷰어" 권한으로 설정

3. 데이터 구조 확인:
   A1: 이메일, B1: 이름, C1: 사번, D1: 부서, E1: 직급, F1: 상태
   
4. 이메일 주소 정확성:
   - 로그인한 이메일과 스프레드시트의 이메일 정확히 일치
   - 대소문자 구분 없음
\`\`\`

#### `Google Sheets API 호출 실패`
\`\`\`
증상: API 호출 자체가 실패

원인: API 활성화 또는 권한 문제

해결방법:
1. Google Cloud Console > APIs 및 서비스 > 라이브러리
2. Google Sheets API 활성화 확인
3. API 키 설정 확인 (NEXT_PUBLIC_GOOGLE_API_KEY)
4. 브라우저 개발자 도구에서 네트워크 오류 확인
\`\`\`

---

### 3. **환경변수 관련 오류**

#### `Google 인증 시스템을 로드할 수 없습니다`
\`\`\`
증상: 로그인 페이지에서 Google API 로드 실패

원인: 환경변수 누락 또는 잘못된 설정

해결방법:
1. .env.local 파일 존재 확인
2. 필수 환경변수 확인:
   - NEXT_PUBLIC_GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL

3. 서버 재시작 필수:
   npm run dev 중지 후 다시 실행

4. 브라우저 캐시 삭제
\`\`\`

#### `NEXTAUTH_SECRET 관련 오류`
\`\`\`
증상: NextAuth 관련 오류 메시지

원인: NEXTAUTH_SECRET 누락 또는 너무 짧음

해결방법:
1. 32자 이상의 랜덤 문자열 생성:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

2. .env.local에 추가:
   NEXTAUTH_SECRET=생성된_랜덤_문자열

3. 서버 재시작
\`\`\`

---

### 4. **네트워크 및 CORS 오류**

#### `CORS 정책 위반 오류`
\`\`\`
증상: 브라우저 콘솔에 CORS 오류 메시지

원인: 도메인 설정 또는 브라우저 보안 정책

해결방법:
1. Google Cloud Console에서 승인된 JavaScript 원본 확인
2. 정확한 도메인 추가 (http://localhost:3000)
3. 브라우저 시크릿 모드에서 테스트
4. 광고 차단기 비활성화
\`\`\`

#### `네트워크 요청 실패`
\`\`\`
증상: API 호출이 네트워크 레벨에서 실패

원인: 방화벽, 프록시, 또는 네트워크 제한

해결방법:
1. 회사 네트워크 정책 확인
2. VPN 사용 시 비활성화 테스트
3. 다른 네트워크에서 테스트
4. IT 부서에 Google APIs 접근 허용 요청
\`\`\`

---

## 🔍 **디버깅 도구 및 방법**

### 1. **브라우저 개발자 도구 활용**

#### 콘솔에서 상태 확인
\`\`\`javascript
// Google API 로드 상태 확인
console.log('Google API:', !!window.gapi);
console.log('Auth2:', !!window.gapi?.auth2);

// 현재 인증 상태 확인
const authInstance = window.gapi?.auth2?.getAuthInstance();
if (authInstance) {
  console.log('로그인 상태:', authInstance.isSignedIn.get());
  console.log('현재 사용자:', authInstance.currentUser.get().getBasicProfile().getEmail());
}

// 환경변수 확인 (클라이언트 사이드만)
console.log('Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
console.log('Employee Sheet ID:', process.env.NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID);
\`\`\`

#### 네트워크 탭 모니터링
확인해야 할 요청들:
- `https://apis.google.com/js/api.js` - Google API 스크립트 로드
- `https://accounts.google.com/oauth/authorize` - OAuth 인증 요청
- `https://sheets.googleapis.com/v4/spreadsheets/` - 스프레드시트 API 호출

### 2. **서버 로그 확인**
\`\`\`bash
# 개발 서버 실행 시 상세 로그 확인
npm run dev

# 콘솔에서 다음과 같은 로그 확인:
# ✅ 로그인 성공: user@jinair.com
# 📋 직원 정보 조회 중...
# ✅ 로그인 성공: 김승무 (CA001)
\`\`\`

---

## 📋 **단계별 검증 체크리스트**

### Phase 1: Google Cloud Console 설정
- [ ] 프로젝트 생성 완료
- [ ] OAuth 동의 화면 설정 (내부 선택)
- [ ] OAuth 클라이언트 ID 생성
- [ ] 승인된 도메인에 jinair.com 추가
- [ ] Google Sheets API 활성화
- [ ] Google Drive API 활성화

### Phase 2: 스프레드시트 설정
- [ ] 직원 정보 스프레드시트 생성
- [ ] 헤더 구조 올바르게 설정 (A1:F1)
- [ ] 샘플 데이터 입력
- [ ] 공유 설정: "링크가 있는 모든 사용자" + "뷰어"
- [ ] 스프레드시트 ID 복사

### Phase 3: 환경변수 설정
- [ ] .env.local 파일 생성
- [ ] NEXT_PUBLIC_GOOGLE_CLIENT_ID 설정
- [ ] GOOGLE_CLIENT_SECRET 설정
- [ ] NEXTAUTH_SECRET 생성 및 설정
- [ ] NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID 설정
- [ ] 서버 재시작

### Phase 4: 기능 테스트
- [ ] 로그인 페이지 정상 로드
- [ ] @jinair.com 계정 로그인 성공
- [ ] 다른 도메인 계정 차단 확인
- [ ] 직원 정보 자동 입력 확인
- [ ] 로그아웃 기능 정상 작동

---

## 🆘 **긴급 문제 해결**

### 즉시 확인할 사항들
1. **서버 재시작**: 환경변수 변경 후 반드시 재시작
2. **브라우저 캐시**: 시크릿 모드에서 테스트
3. **네트워크**: 다른 네트워크에서 테스트
4. **타이밍**: Google Cloud 설정 변경 후 5-10분 대기

### 백업 계획
1. **임시 우회**: 환경변수에 하드코딩된 값 사용
2. **로컬 테스트**: localhost에서만 먼저 동작 확인
3. **단계적 배포**: 기능별로 하나씩 테스트

### 지원 요청 시 포함할 정보
- 정확한 에러 메시지
- 브라우저 개발자 도구 스크린샷
- 환경변수 설정 (민감한 정보 제외)
- 재현 단계
- 사용 중인 브라우저 및 버전

이 가이드로도 해결되지 않는 문제가 있다면 개발팀에 문의해주세요! 🚀

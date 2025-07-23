# 🔧 Google OAuth 설정 완전 가이드

## 📋 **1단계: Google Cloud Console 프로젝트 설정**

### 1.1 Google Cloud Console 접속
1. 브라우저에서 [https://console.cloud.google.com/](https://console.cloud.google.com/) 접속
2. JINAIR Google 계정으로 로그인 (@jinair.com)

### 1.2 새 프로젝트 생성
1. 상단 프로젝트 선택 드롭다운 클릭
2. **"새 프로젝트"** 클릭
3. 프로젝트 정보 입력:
   \`\`\`
   프로젝트 이름: JINAIR-기내방송평가시스템
   조직: jinair.com (있는 경우)
   위치: 조직 선택
   \`\`\`
4. **"만들기"** 클릭
5. 프로젝트 생성 완료까지 1-2분 대기

---

## 🔐 **2단계: OAuth 동의 화면 설정**

### 2.1 OAuth 동의 화면 이동
1. 왼쪽 메뉴에서 **"APIs 및 서비스"** > **"OAuth 동의 화면"** 클릭

### 2.2 사용자 유형 선택
- **"내부"** 선택 (G Suite 조직용)
- **"만들기"** 클릭

### 2.3 앱 정보 입력
\`\`\`
앱 이름: JINAIR 기내방송 평가시스템
사용자 지원 이메일: admin@jinair.com
앱 로고: (선택사항) JINAIR 로고 업로드

앱 도메인:
- 앱 홈페이지: https://your-domain.com
- 개인정보처리방침: https://your-domain.com/privacy
- 서비스 약관: https://your-domain.com/terms

승인된 도메인:
- jinair.com

개발자 연락처 정보:
- admin@jinair.com
\`\`\`

### 2.4 범위 설정
1. **"범위 추가 또는 삭제"** 클릭
2. 다음 범위들을 추가:
   \`\`\`
   ../auth/userinfo.email
   ../auth/userinfo.profile
   openid
   \`\`\`
3. **"업데이트"** 클릭

### 2.5 테스트 사용자 (개발 중에만)
- 개발/테스트 단계에서는 테스트 사용자 이메일 추가
- 실제 배포 시에는 "프로덕션으로 게시" 필요

---

## 🔑 **3단계: OAuth 클라이언트 ID 생성**

### 3.1 사용자 인증 정보 페이지 이동
1. **"APIs 및 서비스"** > **"사용자 인증 정보"** 클릭

### 3.2 OAuth 클라이언트 ID 생성
1. **"+ 사용자 인증 정보 만들기"** 클릭
2. **"OAuth 클라이언트 ID"** 선택

### 3.3 애플리케이션 유형 설정
\`\`\`
애플리케이션 유형: 웹 애플리케이션
이름: JINAIR-기내방송평가시스템-Web

승인된 JavaScript 원본:
- http://localhost:3000
- http://localhost:3001
- https://your-production-domain.com

승인된 리디렉션 URI:
- http://localhost:3000
- http://localhost:3000/api/auth/callback/google
- https://your-production-domain.com
- https://your-production-domain.com/api/auth/callback/google
\`\`\`

### 3.4 클라이언트 ID 및 시크릿 저장
- 생성 완료 후 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사
- 안전한 곳에 저장 (나중에 환경변수에 사용)

---

## 📊 **4단계: 필요한 API 활성화**

### 4.1 API 라이브러리 이동
1. **"APIs 및 서비스"** > **"라이브러리"** 클릭

### 4.2 Google Sheets API 활성화
1. 검색창에 "Google Sheets API" 입력
2. **Google Sheets API** 클릭
3. **"사용"** 버튼 클릭

### 4.3 Google Drive API 활성화
1. 검색창에 "Google Drive API" 입력
2. **Google Drive API** 클릭
3. **"사용"** 버튼 클릭

---

## 📋 **5단계: 직원 정보 스프레드시트 설정**

### 5.1 스프레드시트 생성
1. [Google Sheets](https://sheets.google.com) 접속
2. 새 스프레드시트 생성
3. 이름: "JINAIR 직원 정보"

### 5.2 헤더 설정 (A1:F1)
\`\`\`
A1: 이메일
B1: 이름  
C1: 사번
D1: 부서
E1: 직급
F1: 상태
\`\`\`

### 5.3 샘플 데이터 입력 (A2:F3)
\`\`\`
A2: john.kim@jinair.com    B2: 김승무    C2: CA001    D2: 객실승무    E2: 승무원      F2: 활성
A3: jane.park@jinair.com   B3: 박항공    C3: CA002    D3: 객실승무    E3: 선임승무원   F3: 활성
\`\`\`

### 5.4 스프레드시트 공유 설정
1. 우상단 **"공유"** 버튼 클릭
2. **"링크가 있는 모든 사용자"** 선택
3. 권한: **"뷰어"** (읽기 전용)
4. **"완료"** 클릭
5. 스프레드시트 ID 복사 (URL에서 `/d/` 다음 부분)

---

## ⚙️ **6단계: 환경변수 설정**

### 6.1 .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

\`\`\`env
# ===== Google OAuth 설정 (필수) =====
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# ===== NextAuth 설정 (필수) =====
NEXTAUTH_SECRET=your-super-secret-random-string-here-32-chars-min
NEXTAUTH_URL=http://localhost:3000

# ===== Google API 설정 =====
NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSyADJhs8QYnV6YP_NhDh2k6iLWVFErdEgus

# ===== Google Sheets ID =====
NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID=1F1xWL9dv0vAFvMfZaf05nO_vZKpuz82WIJLLBHWgaes

# ===== 기타 설정 =====
NEXT_PUBLIC_SCRIPTS_FOLDER_ID=1M6DtyV6mXGh87LYYh-U5EpPgjuzua2AM
NEXT_PUBLIC_RECORDINGS_FOLDER_ID=1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF
NEXT_PUBLIC_SPREADSHEET_ID=1u821kL8BFQb0Z0Y4YfpqDXw6f_geKmFe-QAw3gHeZts
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# ===== 관리자 계정 =====
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
DEFAULT_INSTRUCTOR_USERNAME=instructor
DEFAULT_INSTRUCTOR_PASSWORD=eval123
\`\`\`

### 6.2 NEXTAUTH_SECRET 생성 방법
터미널에서 다음 명령어 실행:
\`\`\`bash
# Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 온라인 생성기 사용
# https://generate-secret.vercel.app/32
\`\`\`

---

## 🧪 **7단계: 테스트 및 검증**

### 7.1 개발 서버 실행
\`\`\`bash
npm install
npm run dev
\`\`\`

### 7.2 로그인 테스트
1. http://localhost:3000 접속
2. **"Google로 로그인"** 버튼 클릭
3. @jinair.com 계정으로 로그인 시도

### 7.3 검증 항목들
- ✅ @jinair.com 계정 로그인 성공
- ✅ 다른 도메인 계정 차단 확인
- ✅ 직원 정보 자동 입력 확인
- ✅ 로그아웃 기능 정상 작동

---

## 🚨 **8단계: 문제 해결**

### 8.1 일반적인 오류들

#### **Error 400: redirect_uri_mismatch**
\`\`\`
해결방법:
1. Google Cloud Console > OAuth 클라이언트 ID 설정 확인
2. 승인된 리디렉션 URI에 정확한 URL 추가
3. http://localhost:3000 정확히 입력 (trailing slash 없이)
\`\`\`

#### **Error 403: access_denied**
\`\`\`
해결방법:
1. OAuth 동의 화면에서 "내부" 선택 확인
2. 테스트 사용자에 이메일 추가 (개발 중)
3. 도메인 제한 설정 확인
\`\`\`

#### **직원 정보를 찾을 수 없음**
\`\`\`
해결방법:
1. 스프레드시트 ID 확인
2. 스프레드시트 공유 설정 확인 (링크가 있는 모든 사용자)
3. 헤더 구조 확인 (A1:F1)
4. 이메일 주소 정확성 확인
\`\`\`

#### **Google API 로드 실패**
\`\`\`
해결방법:
1. 브라우저 개발자 도구 > 콘솔 확인
2. 네트워크 탭에서 차단된 요청 확인
3. 광고 차단기 비활성화
4. CORS 설정 확인
\`\`\`

### 8.2 디버깅 도구

#### 브라우저 개발자 도구 활용
\`\`\`javascript
// 콘솔에서 Google API 상태 확인
console.log('Google API loaded:', !!window.gapi);
console.log('Auth2 loaded:', !!window.gapi?.auth2);

// 현재 로그인 상태 확인
const authInstance = window.gapi?.auth2?.getAuthInstance();
console.log('Is signed in:', authInstance?.isSignedIn.get());
\`\`\`

#### 네트워크 요청 확인
1. 개발자 도구 > Network 탭
2. 다음 요청들 확인:
   - `https://apis.google.com/js/api.js`
   - `https://accounts.google.com/oauth/authorize`
   - `https://sheets.googleapis.com/v4/spreadsheets/`

---

## 🚀 **9단계: 프로덕션 배포**

### 9.1 환경변수 업데이트
\`\`\`env
# 프로덕션 URL로 변경
NEXTAUTH_URL=https://your-production-domain.com

# 프로덕션 도메인 추가
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-production-client-id
\`\`\`

### 9.2 Google Cloud Console 업데이트
1. OAuth 클라이언트 ID 설정에서 프로덕션 도메인 추가
2. OAuth 동의 화면을 "프로덕션으로 게시"

### 9.3 보안 체크리스트
- ✅ HTTPS 사용 확인
- ✅ 환경변수 보안 저장
- ✅ 도메인 제한 활성화
- ✅ API 키 권한 최소화
- ✅ 로그 모니터링 설정

---

## 📞 **10단계: 지원 및 문의**

### 문제 발생 시 확인사항
1. **환경변수 설정**: `.env.local` 파일의 모든 값 확인
2. **Google Cloud Console**: API 활성화 및 OAuth 설정 확인  
3. **스프레드시트**: 공유 설정 및 데이터 구조 확인
4. **브라우저 콘솔**: 에러 메시지 확인

### 추가 도움이 필요한 경우
- Google Cloud Console 공식 문서 참조
- 개발팀 내부 문의
- 시스템 관리자 연락

---

## ✅ **설정 완료 체크리스트**

- [ ] Google Cloud Console 프로젝트 생성
- [ ] OAuth 동의 화면 설정 완료
- [ ] OAuth 클라이언트 ID 생성
- [ ] Google Sheets API 활성화
- [ ] Google Drive API 활성화
- [ ] 직원 정보 스프레드시트 생성 및 설정
- [ ] .env.local 파일 생성 및 환경변수 설정
- [ ] @jinair.com 계정 로그인 테스트 성공
- [ ] 다른 도메인 계정 차단 확인
- [ ] 직원 정보 자동 입력 확인
- [ ] 로그아웃 기능 테스트 완료

모든 항목이 체크되면 설정 완료! 🎉

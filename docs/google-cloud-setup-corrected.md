# 🔧 Google Cloud 프로젝트 설정 (수정된 버전)

## 1️⃣ 새 프로젝트 생성
1. Google Cloud Console 접속: https://console.cloud.google.com
2. 프로젝트 선택 드롭다운 클릭 → "새 프로젝트"
3. 프로젝트 이름: "JINAIR-Broadcast-System"
4. "만들기" 클릭

## 2️⃣ 필요한 API만 활성화
**검색해서 활성화할 API들:**

### ✅ Google Sheets API
- 검색: "Google Sheets API"
- "Google Sheets API" 클릭 → "사용" 버튼

### ✅ Google Drive API  
- 검색: "Google Drive API"
- "Google Drive API" 클릭 → "사용" 버튼

**❌ Google Identity Services API는 활성화 불필요!**
(클라이언트 사이드 라이브러리라서 API 활성화가 필요 없음)

## 3️⃣ OAuth 2.0 클라이언트 ID 생성
1. 좌측 메뉴 "API 및 서비스" → "사용자 인증 정보"
2. "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"

### 동의 화면 구성 (처음이면)
- 사용자 유형: "외부" 선택
- 앱 이름: "JINAIR 기내방송 평가시스템"
- 사용자 지원 이메일: 본인 이메일
- 개발자 연락처: 본인 이메일
- "저장 후 계속" 클릭

### OAuth 클라이언트 ID 생성
- 애플리케이션 유형: **웹 애플리케이션**
- 이름: "JINAIR Broadcast Web Client"

**승인된 JavaScript 원본:**
\`\`\`
http://localhost:3000
https://your-domain.vercel.app
\`\`\`

**승인된 리디렉션 URI:**
\`\`\`
http://localhost:3000
https://your-domain.vercel.app
\`\`\`

4. "만들기" 클릭
5. **클라이언트 ID 복사** (중요!)

## 4️⃣ API 키 생성 (Google Sheets용)
1. "사용자 인증 정보" 페이지에서
2. "+ 사용자 인증 정보 만들기" → "API 키"
3. API 키 생성됨 → **복사해서 저장**
4. "키 제한" 클릭하여 보안 설정:
   - API 제한사항: "키 제한"
   - "Google Sheets API" 선택
   - "저장" 클릭
\`\`\`

환경변수 파일을 업데이트하겠습니다:

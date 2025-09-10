# 📧 실제 이메일 발송 설정 가이드

교육 폐강 알림 기능에서 실제 이메일을 발송하기 위한 설정 방법을 안내합니다.

## 🚀 **설정 방법**

### 1️⃣ **Gmail SMTP 사용 (추천)**

#### **🏢 Google Workspace 계정 (회사 계정)**

**단계 1: Google Workspace 앱 비밀번호 생성**

1. **Google 계정 관리**로 이동: https://myaccount.google.com/
2. **보안** → **2단계 인증** 활성화 (필수)
3. **보안** → **앱 비밀번호** 생성
4. **앱 선택**: "메일"
5. **기기 선택**: "기타(맞춤 이름)" → "교육시스템" 입력
6. **생성된 16자리 비밀번호 복사** (예: `abcd efgh ijkl mnop`)

**단계 2: 환경변수 설정**

```bash
# Google Workspace SMTP 설정
EMAIL_SERVICE_TYPE="workspace"
EMAIL_FROM="noreply@yourcompany.com"  # 실제 회사 도메인
EMAIL_FROM_NAME="객실기내방송팀"

# Google Workspace 계정 정보
EMAIL_GMAIL_USER="your-email@yourcompany.com"  # 회사 이메일
EMAIL_GMAIL_PASSWORD="abcd efgh ijkl mnop"     # 앱 비밀번호
```

#### **👤 개인 Gmail 계정**

**단계 1: Gmail 앱 비밀번호 생성**

1. **Google 계정 관리**로 이동: https://myaccount.google.com/
2. **보안** → **2단계 인증** 활성화 (필수)
3. **보안** → **앱 비밀번호** 생성
4. **앱 선택**: "메일"
5. **기기 선택**: "기타(맞춤 이름)" → "교육시스템" 입력
6. **생성된 16자리 비밀번호 복사** (예: `abcd efgh ijkl mnop`)

**단계 2: 환경변수 설정**

```bash
# Gmail SMTP 설정
EMAIL_SERVICE_TYPE="gmail"
EMAIL_FROM="noreply@yourcompany.com"
EMAIL_FROM_NAME="객실기내방송팀"

# Gmail 계정 정보
EMAIL_GMAIL_USER="your-gmail@gmail.com"
EMAIL_GMAIL_PASSWORD="abcd efgh ijkl mnop"  # 앱 비밀번호 (공백 포함)
```

---

### 2️⃣ **SendGrid 사용**

#### **단계 1: SendGrid 계정 생성**

1. **SendGrid 가입**: https://sendgrid.com/
2. **API Key 생성**:
   - Settings → API Keys
   - Create API Key
   - Full Access 권한 설정
   - API Key 복사

#### **단계 2: 환경변수 설정**

```bash
# SendGrid 설정
EMAIL_SERVICE_TYPE="sendgrid"
EMAIL_FROM="noreply@yourcompany.com"
EMAIL_FROM_NAME="객실기내방송팀"

# SendGrid API Key
SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 🔧 **현재 설정 확인**

### **시뮬레이션 모드 (기본값)**
```bash
EMAIL_SERVICE_TYPE="simulation"  # 또는 설정하지 않음
```
- 실제 이메일 발송 없음
- 콘솔에 로그만 출력
- 개발/테스트용

### **실제 발송 모드**
```bash
EMAIL_SERVICE_TYPE="gmail"     # Gmail SMTP 사용
# 또는
EMAIL_SERVICE_TYPE="sendgrid"  # SendGrid 사용
```

---

## 🎯 **테스트 방법**

### 1. **환경변수 설정 후 서버 재시작**
```bash
npm run dev  # 개발 모드
# 또는
npm run build && npm start  # 프로덕션 모드
```

### 2. **폐강 알림 테스트**
1. **evaluate 모드** 접속
2. **교육 신청자 목록**에서 소규모 교육 선택
3. **"폐강 알림"** 버튼 클릭
4. **확인** 후 이메일 발송 결과 확인

### 3. **로그 확인**
```bash
# 성공시
✅ [Gmail] 이메일 발송 성공: <message-id>

# 실패시  
❌ [이메일 발송] 오류: [오류 메시지]
```

---

## ⚠️ **주의사항**

### **Gmail/Google Workspace 사용시**
- **2단계 인증 필수**: 앱 비밀번호 생성을 위해 필요
- **일일 발송 제한**: Gmail/Workspace 모두 일일 500통 제한
- **스팸 필터**: 수신자의 스팸함에 들어갈 수 있음
- **Google Workspace**: 회사 도메인(@company.com)으로 발송 시 신뢰성 향상
- **관리자 정책**: 회사 Workspace 관리자가 SMTP 사용을 제한했을 수 있음

### **SendGrid 사용시**
- **도메인 인증**: 신뢰성을 위해 도메인 인증 권장
- **발송량 제한**: 무료 계정은 월 100통 제한
- **비용**: 유료 플랜 필요시 비용 발생

### **보안**
- **환경변수 보호**: `.env` 파일을 `.gitignore`에 추가
- **API 키 관리**: API 키 노출 방지
- **권한 최소화**: 필요한 권한만 부여

---

## 🔍 **문제 해결**

### **Gmail 오류**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**해결방법**: 
- 2단계 인증 활성화 확인
- 앱 비밀번호 재생성
- 환경변수 정확성 확인

### **SendGrid 오류**
```
Error: Unauthorized
```
**해결방법**:
- API 키 정확성 확인
- API 키 권한 설정 확인
- 발신자 이메일 인증 확인

### **네트워크 오류**
```
Error: getaddrinfo ENOTFOUND smtp.gmail.com
```
**해결방법**:
- 인터넷 연결 확인
- 방화벽 설정 확인
- DNS 설정 확인

---

## 📝 **추가 설정**

### **이메일 템플릿 커스터마이징**

`app/api/education/cancel-notification/route.ts`에서 이메일 내용 수정:

```typescript
const emailContent = `
안녕하세요. ${applicant.name}님

신청하신 교육이 폐강되어 안내 드립니다.

[커스터마이징된 내용]

감사합니다.
`
```

### **발송자 정보 설정**

```bash
EMAIL_FROM="education@yourcompany.com"
EMAIL_FROM_NAME="교육운영팀"
```

---

이제 실제 이메일 발송이 가능합니다! 🎉📧

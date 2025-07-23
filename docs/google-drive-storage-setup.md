# 🗄️ Google Drive 서버 사이드 저장소 설정 가이드

## ✅ 장점
- **무제한 저장 용량** - Google Drive의 15GB 무료 용량 활용
- **자동 백업** - Google의 안정적인 인프라 활용
- **실시간 동기화** - 여러 기기에서 동시 접근 가능
- **검색 및 필터링** - Google Drive의 강력한 검색 기능
- **버전 관리** - 파일 수정 이력 자동 관리

## 🛠️ 설정 단계

### 1. Google Cloud Console 설정
1. **Google Cloud Console** 접속: https://console.cloud.google.com/
2. **프로젝트 선택** 또는 새 프로젝트 생성
3. **Google Drive API** 활성화
4. **서비스 계정** 생성:
   - IAM & Admin → Service Accounts
   - "Create Service Account" 클릭
   - 이름: `jvoice-evaluations`
   - 역할: `Editor` (또는 `Drive File Stream`)

### 2. 서비스 계정 키 다운로드
1. 생성된 서비스 계정 클릭
2. **Keys** 탭 → **Add Key** → **Create new key**
3. **JSON** 형식 선택
4. 다운로드된 파일을 `credentials/service-account.json`에 저장

### 3. Google Drive 폴더 설정 (선택사항)

#### 옵션 A: 개인 Google Drive 사용 (기본)
- **폴더 생성 불필요** - 루트에 자동 저장
- **환경 변수 설정 불필요** - `NEXT_PUBLIC_EVALUATIONS_FOLDER_ID` 생략
- **장점**: 간단한 설정, 개인 공간 활용

#### 옵션 B: 전용 폴더 생성 (권장)
1. **Google Drive** 접속
2. 새 폴더 생성: `JVOICE-Evaluations`
3. 폴더 공유 설정:
   - 서비스 계정 이메일 추가 (예: `jvoice-evaluations@project.iam.gserviceaccount.com`)
   - 권한: `Editor`
4. 폴더 ID 복사 (URL에서 추출)

#### 옵션 C: 공유 드라이브 사용 (팀 환경)
1. **Google Workspace** 관리자에게 공유 드라이브 생성 요청
2. 서비스 계정을 공유 드라이브 멤버로 추가
3. 공유 드라이브 내에 `JVOICE-Evaluations` 폴더 생성
4. 폴더 ID 복사

### 4. 환경 변수 설정

#### 최소 설정 (개인 드라이브 사용)
```env
# 필수 설정
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=credentials/service-account.json

# 기존 설정 유지
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
NEXT_PUBLIC_RECORDINGS_FOLDER_ID=your_recordings_folder_id
```

#### 전용 폴더 사용 시 추가 설정
```env
# 추가 설정 (폴더 지정 시)
NEXT_PUBLIC_EVALUATIONS_FOLDER_ID=your_evaluations_folder_id
```

### 5. 폴더 구조 확인
```
cabin/
├── credentials/
│   └── service-account.json  # 서비스 계정 키
├── app/api/evaluations/
│   ├── save/route.ts         # 평가 결과 저장 API
│   └── load/route.ts         # 평가 결과 로드 API
└── .env.local               # 환경 변수
```

## 🔄 작동 방식

### 평가 결과 저장
1. **평가 완료** → 평가 데이터 생성
2. **폴더 ID 확인** → 지정된 폴더 또는 루트에 저장
3. **Google Drive API 호출** → JSON 파일로 저장
4. **localStorage 백업** → 최근 100개만 유지
5. **성공 응답** → 사용자에게 완료 알림

### 평가 결과 로드
1. **관리자 페이지 접속** → Google Drive API 호출
2. **검색 범위 결정** → 특정 폴더 또는 전체 드라이브
3. **평가 결과 파일 목록** → 최신순 정렬
4. **파일 내용 읽기** → JSON 파싱
5. **화면 표시** → 필터링 및 검색

## 📊 저장 형식

### 파일명
```
evaluation_{candidateId}_{timestamp}.json
```

### 파일 내용
```json
{
  "candidateId": "submission-1234567890",
  "candidateInfo": {
    "name": "김승무",
    "employeeId": "CA001",
    "language": "korean-english",
    "category": "신규",
    "submittedAt": "2024-01-15T14:30:00Z"
  },
  "scores": {
    "korean-발음-자음": 8,
    "korean-발음-모음": 7
  },
  "categoryScores": {
    "korean-발음": 15,
    "korean-억양": 9
  },
  "totalScore": 89,
  "grade": "A등급",
  "comments": {
    "korean": "발음 부분에서 개선이 필요합니다.",
    "english": "Pronunciation needs improvement."
  },
  "evaluatedAt": "2024-01-15T15:30:00Z",
  "evaluatedBy": "교관"
}
```

## 🚀 배포 시 주의사항

### 1. 보안 설정
- 서비스 계정 키 파일을 `.gitignore`에 추가
- 프로덕션에서는 환경 변수로 키 관리
- HTTPS 환경에서만 사용

### 2. 용량 관리
- Google Drive 무료 용량: 15GB
- 평가 결과 파일 크기: 약 2-5KB/개
- 예상 저장 가능 개수: 3,000,000개 이상

### 3. 성능 최적화
- 페이지네이션 사용 (1000개씩 로드)
- 캐싱 전략 적용
- 백그라운드 동기화

## 🔧 문제 해결

### 1. 권한 오류
```
Error: insufficient permissions
```
**해결**: 서비스 계정에 Drive 권한 추가

### 2. 폴더 접근 실패
```
Error: folder not found
```
**해결**: 폴더 ID 확인 및 공유 설정 재확인

### 3. API 할당량 초과
```
Error: quota exceeded
```
**해결**: Google Cloud Console에서 할당량 증가 요청

## 📈 모니터링

### 1. 저장 통계
- 총 평가 결과 수
- 월별 저장량
- 오류 발생률

### 2. 성능 지표
- API 응답 시간
- 파일 업로드 속도
- 동시 접속자 수

### 3. 용량 사용량
- Google Drive 사용량
- 파일별 크기 분석
- 백업 필요성 판단 
# 로그인 로그 DB 마이그레이션

## 개요

기존에 Dropbox에 JSON 파일로 저장하던 로그인 기록(`/logs/login-history.json`)을 PostgreSQL 데이터베이스로 전환하였습니다.

---

## 변경 사항

### 1. Dropbox → PostgreSQL DB 전환

**이전 (Dropbox)**
```typescript
// Dropbox에 JSON 파일로 저장
await dropbox.overwrite({
  path: "/logs/login-history.json",
  content: Buffer.from(JSON.stringify(existingLogs, null, 2), 'utf-8')
})
```

**이후 (PostgreSQL DB)**
```typescript
// DB에 저장 (Prisma ORM 사용)
const loginLog = await prisma.loginLog.create({
  data: {
    userId: user?.id,
    email,
    name: user?.name || name,
    employeeId: user?.employeeId,
    department: user?.department,
    loginTime: new Date(),
    ipAddress,
    userAgent,
    loginMethod,
    success,
    errorMessage
  }
})
```

---

## DB 스키마

```prisma
model LoginLog {
  id           String @id @default(cuid())
  userId       String?
  email        String
  name         String
  employeeId   String?
  department   String?
  loginTime    DateTime @default(now())
  ipAddress    String?
  userAgent    String?
  loginMethod  String // 'google', 'workspace', 'test'
  success      Boolean @default(true)
  errorMessage String?

  // 관계
  user         User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("login_logs")
}
```

---

## API 변경 사항

### POST `/api/auth/login-log`

**요청 본문**
```json
{
  "email": "user@example.com",
  "name": "홍길동",
  "loginMethod": "google",
  "success": true,
  "errorMessage": null
}
```

**응답 (변경됨)**
```json
{
  "success": true,
  "logId": "clxxxxx..."
}
```

### GET `/api/auth/login-log`

**쿼리 파라미터**
- `email` (optional): 이메일 필터
- `startDate` (optional): 시작 날짜
- `endDate` (optional): 종료 날짜
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 레코드 수 (기본값: 20)

**응답 구조 (동일)**
```json
{
  "logs": [...],
  "total": 20,
  "totalRecords": 1500,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 75,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 주요 개선 사항

### 1. 성능 향상
- ✅ DB 인덱싱으로 빠른 검색
- ✅ 필터링이 DB 레벨에서 처리됨 (Dropbox는 전체 다운로드 후 필터링)
- ✅ 페이지네이션이 DB 레벨에서 처리됨

### 2. 데이터 무결성
- ✅ User 테이블과 관계 설정
- ✅ 트랜잭션 보장
- ✅ 동시성 제어 자동 처리

### 3. 확장성
- ✅ 레코드 수 제한 없음 (Dropbox는 1000개 제한)
- ✅ 복잡한 쿼리 지원
- ✅ 통계 및 분석 쿼리 가능

### 4. 관리 편의성
- ✅ Railway 대시보드에서 직접 조회/관리 가능
- ✅ 백업 및 복원 자동화
- ✅ 파일 잠금 로직 불필요

---

## 마이그레이션 방법

만약 기존 Dropbox 데이터를 DB로 마이그레이션하려면:

### 1. 마이그레이션 스크립트 작성

```typescript
// scripts/migrate-login-logs-to-db.ts
import { prisma } from '../lib/database'
import dropboxService from '../lib/dropbox-service'

async function migrateLoginLogs() {
  try {
    // 1. Dropbox에서 기존 로그 가져오기
    console.log('📥 Dropbox에서 로그인 기록 가져오는 중...')
    const logFileContent = await dropboxService.download({ 
      path: '/logs/login-history.json' 
    })
    
    const logs = JSON.parse(logFileContent)
    console.log(`✅ ${logs.length}개의 로그 발견`)

    // 2. DB에 저장
    let successCount = 0
    let errorCount = 0

    for (const log of logs) {
      try {
        // 이메일로 사용자 찾기
        const user = await prisma.user.findUnique({
          where: { email: log.email },
          select: { id: true }
        })

        await prisma.loginLog.create({
          data: {
            userId: user?.id,
            email: log.email,
            name: log.name,
            employeeId: log.employeeId,
            department: log.department,
            loginTime: new Date(log.loginTime),
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            loginMethod: log.loginMethod,
            success: log.success,
            errorMessage: log.errorMessage
          }
        })
        successCount++
      } catch (error) {
        console.error(`❌ 로그 저장 실패:`, log.email, error)
        errorCount++
      }
    }

    console.log(`✅ 마이그레이션 완료: 성공 ${successCount}개, 실패 ${errorCount}개`)

    // 3. Dropbox 파일 백업 (선택)
    const backupPath = `/logs/login-history-backup-${Date.now()}.json`
    await dropboxService.upload({
      path: backupPath,
      content: Buffer.from(logFileContent, 'utf-8')
    })
    console.log(`💾 백업 파일 생성: ${backupPath}`)

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error)
  }
}

migrateLoginLogs()
```

### 2. 스크립트 실행

```bash
npx ts-node scripts/migrate-login-logs-to-db.ts
```

---

## 롤백 방법

이전 방식으로 되돌리려면:

1. `app/api/auth/login-log/route.ts` 파일을 git history에서 복원
2. 또는 아래 명령어로 이전 버전 복원:

```bash
git checkout <commit-hash> -- app/api/auth/login-log/route.ts
```

---

## 주의 사항

1. **Dropbox 파일 보존**: 마이그레이션 후에도 Dropbox의 `/logs/login-history.json` 파일은 백업으로 보존하는 것을 권장합니다.

2. **User 관계**: 로그인 시점에 User가 DB에 없으면 `userId`가 `null`로 저장됩니다. 이는 정상 동작입니다.

3. **DB 인덱스**: 대량의 로그 조회 시 성능을 위해 다음 인덱스가 자동 생성됩니다:
   - `email`
   - `loginTime`
   - `employeeId`
   - `userId`

---

## 테스트

```bash
# 1. 로그인 기록 저장 테스트
curl -X POST http://localhost:3000/api/auth/login-log \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "테스트",
    "loginMethod": "google",
    "success": true
  }'

# 2. 로그인 기록 조회 테스트
curl "http://localhost:3000/api/auth/login-log?email=test@example.com&page=1&limit=10"
```

---

## 완료 ✅

- [x] POST API를 DB 저장으로 변경
- [x] GET API를 DB 조회로 변경
- [x] 파일 잠금 로직 제거
- [x] Dropbox 의존성 제거
- [x] 에러 처리 개선
- [x] 마이그레이션 문서 작성


# Phase 2: DB 기반 시스템 전환 가이드

## 📋 개요

스프레드시트에서 Railway DB로 직원 정보 조회 방식을 전환합니다.

### 목표
- ✅ 조회 속도 개선: 500ms → 5ms (100배)
- ✅ 보안 강화: DB 기반 권한 관리
- ✅ 안정성 향상: Fallback 메커니즘
- ✅ 데이터 일관성: 자동 동기화

---

## 🔧 변경 사항

### 1. EmployeeDatabase 클래스 리팩토링

```typescript
// 새로 추가된 함수들:
- fetchEmployeesFromDB()     // DB에서 조회
- fetchEmployeesFromSheets()  // Sheets에서 조회 (분리)
- fetchEmployees()            // 통합 (스위치 포함)
```

### 2. 환경변수 추가

```bash
# .env 또는 Railway 환경변수
NEXT_PUBLIC_USE_DB_EMPLOYEES="false"  # Sheets 사용 (기본값)
# 또는
NEXT_PUBLIC_USE_DB_EMPLOYEES="true"   # DB 사용 (Phase 2)
```

### 3. Fallback 메커니즘

```
1차: DB 조회 시도
  ↓ 실패 시
2차: Google Sheets 조회
  ↓ 실패 시
3차: 로컬 캐시 사용
```

---

## 🚀 배포 단계

### Step 1: 로컬 테스트 (Day 1-2)

```bash
# 1. 환경변수 설정
echo 'NEXT_PUBLIC_USE_DB_EMPLOYEES="true"' >> .env.local

# 2. 개발 서버 실행
npm run dev

# 3. 성능 테스트 실행
npx ts-node scripts/test-employee-performance.ts

# 예상 결과:
# ✅ Sheets: 500ms (930명)
# ✅ DB: 5ms (930명)
# ✨ DB가 99.0% 더 빠름!
```

**확인 사항:**
- [ ] 로그인 정상 작동
- [ ] 신청 기능 정상 작동
- [ ] 평가 기능 정상 작동
- [ ] 데이터 개수 일치 (930명)

---

### Step 2: 스테이징 배포 (Day 3-4)

```bash
# Railway 스테이징 환경변수
NEXT_PUBLIC_USE_DB_EMPLOYEES="false"  # 기본값 유지

# 배포
npx @railway/cli up
```

**테스트:**
1. 관리자 계정으로 테스트
2. 수동으로 환경변수 true 변경
3. 1시간 모니터링
4. 문제 없으면 false로 되돌리기

---

### Step 3: 점진적 전환 (Day 5-7)

#### Day 5: 10% 사용자
```bash
# Railway 환경변수 (운영)
NEXT_PUBLIC_USE_DB_EMPLOYEES="true"
FEATURE_DB_ROLLOUT_PERCENT="10"  # 10%만
```

#### Day 6: 50% 사용자
```bash
FEATURE_DB_ROLLOUT_PERCENT="50"  # 50%
```

#### Day 7: 100% 전환
```bash
NEXT_PUBLIC_USE_DB_EMPLOYEES="true"
# FEATURE_DB_ROLLOUT_PERCENT 제거 (100%)
```

---

### Step 4: 검증 (Day 8-10)

```sql
-- Railway DB Console에서 확인

-- 1. 사용자 수
SELECT COUNT(*) FROM users WHERE isActive = true;
-- 예상: 930명

-- 2. 자격증 정보 확인
SELECT COUNT(*) FROM users 
WHERE koreanEnglishGrade IS NOT NULL;
-- 예상: G열에 값 있는 직원 수

-- 3. 역할 정보 확인
SELECT 
  COUNT(*) FILTER (WHERE isInstructor = true) as instructors,
  COUNT(*) FILTER (WHERE isAdmin = true) as admins
FROM users;
-- 예상: 교관, 관리자 수

-- 4. 최근 로그인 확인
SELECT COUNT(*) FROM login_logs 
WHERE loginTime > NOW() - INTERVAL '1 day';
-- 예상: 최근 24시간 로그인 수
```

---

## 📊 모니터링

### 로그 확인

```bash
# Railway 로그
railway logs

# 확인할 로그:
# ✅ "🔀 [Phase 2] DB 모드 활성화"
# ✅ "📊 [DB] 직원 정보 930명 로드 완료"
# ❌ "🔄 [Fallback] DB 실패, Google Sheets로 전환"  # 이건 안 나와야 함!
```

### 성능 메트릭

```typescript
// 평균 응답 시간
- Before: 500ms (Google Sheets)
- After: 5ms (Railway DB)
- 개선율: 99%

// 동시 접속
- 10명 동시: 45ms
- 평균: 4.5ms/명
```

---

## 🔄 롤백 계획

### 문제 발생 시 즉시 롤백

```bash
# Railway 환경변수 변경
NEXT_PUBLIC_USE_DB_EMPLOYEES="false"

# 또는 Railway CLI
railway variables set NEXT_PUBLIC_USE_DB_EMPLOYEES=false
```

**롤백 후:**
- ✅ 즉시 Google Sheets 모드로 전환
- ✅ 기존 기능 완전 복구
- ✅ 사용자 영향 없음

---

## ⚠️ 주의사항

### 1. 데이터 동기화
```bash
# Phase 1 마이그레이션이 완료되어야 함
# 930명 전원이 DB에 있어야 함!

# 확인:
SELECT COUNT(*) FROM users WHERE isActive = true;
# 결과: 930 (예상)
```

### 2. 기존 데이터 보존
```sql
-- 11월 신청 데이터 (영향 없음)
SELECT COUNT(*) FROM schedule_applications WHERE status = 'ACTIVE';

-- 10월 평가 데이터 (영향 없음)
SELECT COUNT(*) FROM evaluations 
WHERE submittedAt >= '2024-10-01' AND submittedAt < '2024-11-01';
```

### 3. 성능 저하 시
```bash
# 원인 확인:
# 1. DB 커넥션 풀 부족
# 2. 인덱스 누락
# 3. 쿼리 최적화 필요

# 대응:
# 1. Fallback 자동 작동 확인
# 2. 롤백 실행
# 3. 이슈 분석 후 재배포
```

---

## ✅ 체크리스트

### 배포 전
- [ ] Phase 1 마이그레이션 완료
- [ ] DB에 930명 확인
- [ ] 로컬 테스트 완료
- [ ] 성능 테스트 완료
- [ ] 백업 완료

### 배포 중
- [ ] 환경변수 설정
- [ ] 배포 완료
- [ ] 로그 확인 (10분)
- [ ] 테스트 계정 확인

### 배포 후
- [ ] 로그인 기능 확인
- [ ] 신청 기능 확인
- [ ] 평가 기능 확인
- [ ] 성능 개선 확인
- [ ] 오류율 확인 (0% 목표)

---

## 🆘 트러블슈팅

### 문제 1: "DB 조회 실패"
```
원인: DATABASE_URL 오류 또는 Prisma 연결 실패
대응: Fallback이 자동 작동 (Sheets 사용)
해결: DATABASE_URL 확인, Prisma 재생성
```

### 문제 2: "데이터 개수 불일치"
```
원인: 마이그레이션 미완료 또는 동기화 실패
대응: 롤백 (Sheets 모드)
해결: Phase 1 마이그레이션 재실행
```

### 문제 3: "성능 저하"
```
원인: DB 쿼리 최적화 필요
대응: 캐시 사용 확인
해결: 인덱스 추가, 쿼리 최적화
```

---

## 📞 지원

문제 발생 시:
1. Railway 로그 확인
2. 이 문서의 트러블슈팅 참고
3. 필요시 롤백 실행
4. 이슈 리포트 작성

---

## 다음 단계: Phase 3

Phase 2 완료 후:
- 프론트엔드 관리 기능 개발
- 스프레드시트 읽기 전용 전환
- 완전한 DB 기반 시스템 구축



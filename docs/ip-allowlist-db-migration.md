# IP 허용 목록 DB 마이그레이션 가이드

## 개요

기존에 Dropbox에 JSON 파일로 저장하던 IP 허용 목록(`/config/allowed-ips.json`)을 PostgreSQL 데이터베이스로 전환하였습니다.

## 변경 사항

### 1. Dropbox → PostgreSQL DB 전환

**이전 (Dropbox)**
- 파일 경로: `/config/allowed-ips.json`
- 저장 방식: JSON 배열 파일
- 문제점: 동시 접근 시 충돌, 확장성 제한

**이후 (PostgreSQL)**
- 테이블: `allowed_devices`
- 관리: Prisma ORM 사용
- 장점: ACID 보장, 확장성, 인덱싱, 소프트 삭제 지원

### 2. 새로운 DB 스키마

```prisma
model AllowedDevice {
  id         String   @id @default(cuid())
  ip         String   @unique
  label      String?
  createdBy  String?
  userAgent  String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([ip])
  @@index([isActive])
  @@map("allowed_devices")
}
```

### 3. API 변경 사항

**API 엔드포인트는 동일하게 유지됩니다:**
- `GET /api/devices/allowlist` - IP 목록 조회
- `GET /api/devices/allowlist?mode=check` - 현재 IP 확인
- `POST /api/devices/allowlist` - IP 등록
- `DELETE /api/devices/allowlist?ip={IP주소}` - IP 삭제 (소프트 삭제)

**내부 동작만 변경:**
- Dropbox 파일 읽기/쓰기 → PostgreSQL 쿼리로 변경
- 삭제 시 실제 삭제 대신 `isActive=false`로 소프트 삭제

## 마이그레이션 절차

### 1단계: Prisma 스키마 마이그레이션

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev --name add_allowed_device_table

# Prisma Client 재생성
npx prisma generate
```

### 2단계: 기존 데이터 마이그레이션

```bash
# Dropbox의 IP 데이터를 DB로 이전
npx ts-node scripts/migrate-ip-to-db.ts
```

마이그레이션 스크립트는 다음을 수행합니다:
1. Dropbox에서 기존 IP 목록 읽기
2. DB에 이미 존재하는지 확인
3. 새로운 IP는 생성, 기존 IP는 업데이트
4. Dropbox 파일을 백업으로 저장

### 3단계: 배포 (Railway)

```bash
# Railway에 배포
npx @railway/cli up
```

배포 후 Railway에서 자동으로 Prisma 마이그레이션이 실행됩니다.

### 4단계: 확인

관리자 페이지에서 IP 목록이 정상적으로 표시되는지 확인:
- 관리자 대시보드 → "컴퓨터 등록 관리" 섹션

## 롤백 방법

만약 문제가 발생하면 다음과 같이 롤백할 수 있습니다:

### 1. 코드 롤백

```bash
git revert <커밋해시>
```

### 2. DB 테이블 삭제 (필요시)

```sql
DROP TABLE allowed_devices;
```

### 3. API 코드를 이전 버전으로 복구

이전 `app/api/devices/allowlist/route.ts` 파일로 복원하면 다시 Dropbox를 사용합니다.

## 주의사항

1. **Dropbox 파일 보존**: 마이그레이션 후에도 Dropbox의 `allowed-ips.json` 파일은 백업으로 보존됩니다.

2. **소프트 삭제**: IP를 삭제해도 DB에서 완전히 삭제되지 않고 `isActive=false`로 표시됩니다. 이는 감사(audit) 목적과 재활성화를 위함입니다.

3. **Railway 환경 변수**: `DATABASE_URL`이 올바르게 설정되어 있는지 확인하세요.

## 테스트 체크리스트

- [ ] IP 등록 (새로운 IP)
- [ ] IP 등록 (이미 존재하는 IP)
- [ ] IP 목록 조회
- [ ] 현재 IP 확인 (`mode=check`)
- [ ] IP 삭제
- [ ] 삭제된 IP 재등록 (재활성화)

## 문제 해결

### 마이그레이션 스크립트 오류

```bash
# Prisma Client 재생성
npx prisma generate

# 다시 실행
npx ts-node scripts/migrate-ip-to-db.ts
```

### DB 연결 오류

Railway의 환경 변수에서 `DATABASE_URL`이 올바른지 확인하세요.

### API 오류 (Prisma 관련)

```bash
# Prisma Client 재생성
npx prisma generate

# 애플리케이션 재시작
```

## 참고

- Prisma 스키마: `prisma/schema.prisma`
- API 라우트: `app/api/devices/allowlist/route.ts`
- 마이그레이션 스크립트: `scripts/migrate-ip-to-db.ts`



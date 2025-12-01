# 다른 서버/데이터베이스 이전 가이드

## ✅ 결론: 작동합니다!

이 프로젝트는 **플랫폼 독립적**으로 설계되어 있어, Railway에서 다른 서버로 이전해도 작동합니다.
단, **환경 변수와 데이터베이스 설정**만 제대로 해주면 됩니다.

---

## 🏗️ 프로젝트 구조 분석

### 사용 중인 기술 스택
- **프레임워크**: Next.js 15.2.4
- **데이터베이스**: PostgreSQL (Prisma ORM)
- **언어**: TypeScript
- **스타일**: Tailwind CSS
- **배포**: Standalone 모드 (Docker 친화적)

### Railway 의존성 확인
✅ **Railway 전용 코드 없음**
- `railway.json`은 단순 배포 설정일 뿐
- 코드 자체는 플랫폼 독립적

---

## 🔄 이전 가능한 플랫폼

### ✅ 완벽 호환 (추천)
1. **Vercel** - Next.js 최적화 (가장 쉬움)
2. **AWS (EC2, ECS, Elastic Beanstalk)** - 완전한 제어
3. **Google Cloud Run** - 컨테이너 기반
4. **Azure App Service** - 엔터프라이즈급
5. **DigitalOcean App Platform** - Railway 대안
6. **Fly.io** - 이미 fly.toml 설정 파일 있음
7. **자체 서버 (Linux/Windows)** - Docker 또는 직접 실행

### ⚠️ 일부 수정 필요
- **Netlify** - SSR 제한 있음 (API 라우트 수정 필요)
- **GitHub Pages** - 정적 사이트만 지원 (불가능)

---

## 📋 이전 시 필요한 작업

### 1️⃣ **필수: 환경 변수 설정**

다음 환경 변수들이 새 서버에서도 설정되어야 합니다:

#### 데이터베이스
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Google API (인증 및 시트 연동)
```env
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=credentials/service-account.json
NEXT_PUBLIC_GOOGLE_SHEETS_ID=your_sheets_id
NEXT_PUBLIC_RECORDINGS_FOLDER_ID=your_folder_id
NEXT_PUBLIC_EVALUATIONS_FOLDER_ID=your_evaluations_folder_id
```

#### Dropbox (파일 저장)
```env
DROPBOX_ACCESS_TOKEN=your_access_token
DROPBOX_REFRESH_TOKEN=your_refresh_token
DROPBOX_APP_KEY=your_app_key
DROPBOX_APP_SECRET=your_app_secret
```

#### 이메일 (선택)
```env
SENDGRID_API_KEY=your_sendgrid_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

#### 기타
```env
NEXT_PUBLIC_BASE_URL=https://your-new-domain.com
JWT_SECRET=your_jwt_secret
```

### 2️⃣ **필수: 데이터베이스 설정**

#### PostgreSQL 데이터베이스 준비
```bash
# 1. PostgreSQL 설치 (새 서버에)
# Ubuntu 예시
sudo apt update
sudo apt install postgresql postgresql-contrib

# 2. 데이터베이스 생성
sudo -u postgres psql
CREATE DATABASE cabin_db;
CREATE USER cabin_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cabin_db TO cabin_user;
```

#### Prisma 마이그레이션
```bash
# 의존성 설치
npm install

# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 스키마 적용
npx prisma db push

# 또는 마이그레이션 실행
npx prisma migrate deploy
```

### 3️⃣ **필수: 파일 업로드**

#### 서비스 계정 키 파일
```bash
# credentials 폴더 생성
mkdir -p credentials

# Google 서비스 계정 JSON 키 복사
cp service-account.json credentials/
```

#### 권한 설정
```bash
chmod 600 credentials/service-account.json
```

### 4️⃣ **빌드 및 실행**

#### 방법 1: Node.js 직접 실행
```bash
# 프로덕션 빌드
npm run build

# 서버 시작
npm start
# 또는 PM2 사용
pm2 start npm --name "cabin" -- start
```

#### 방법 2: Docker 사용 (권장)
```dockerfile
# Dockerfile (생성 필요)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Docker 빌드 및 실행
docker build -t cabin-app .
docker run -p 3000:3000 --env-file .env cabin-app
```

---

## 🚨 주의사항

### 1. **데이터베이스 마이그레이션**
Railway에서 다른 서버로 데이터를 이전하려면:

```bash
# Railway에서 데이터 백업
railway run pg_dump $DATABASE_URL > backup.sql

# 새 서버에 복원
psql -h new_host -U new_user -d new_db < backup.sql
```

### 2. **파일 경로**
- `credentials/service-account.json` 경로 확인
- 새 서버의 파일 시스템 경로 맞추기

### 3. **포트 설정**
```bash
# 기본 포트 3000
PORT=3000 npm start

# 다른 포트 사용 시
PORT=8080 npm start
```

### 4. **HTTPS/도메인**
- 새 서버에 도메인 연결
- `NEXT_PUBLIC_BASE_URL` 환경 변수 업데이트
- SSL 인증서 설정 (Let's Encrypt 권장)

---

## 📊 플랫폼별 배포 방법

### Vercel (가장 쉬움)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_GOOGLE_API_KEY
# ... (나머지 환경 변수들)
```

### AWS EC2
```bash
# 1. EC2 인스턴스 생성 (Ubuntu)
# 2. Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 프로젝트 클론
git clone your-repo.git
cd your-project

# 4. 환경 변수 설정
nano .env

# 5. 빌드 및 실행
npm install
npm run build
pm2 start npm --name cabin -- start

# 6. Nginx 리버스 프록시 설정 (선택)
```

### Docker + 자체 서버
```bash
# 1. Docker 설치
curl -fsSL https://get.docker.com | sh

# 2. Docker Compose 파일 생성
cat > docker-compose.yml << EOF
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: \${DATABASE_URL}
      NEXT_PUBLIC_GOOGLE_API_KEY: \${NEXT_PUBLIC_GOOGLE_API_KEY}
    volumes:
      - ./credentials:/app/credentials
  
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: cabin_db
      POSTGRES_USER: cabin_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# 3. 실행
docker-compose up -d
```

---

## ✅ 체크리스트

이전 전 확인사항:

- [ ] PostgreSQL 데이터베이스 준비됨
- [ ] 모든 환경 변수 설정됨
- [ ] `credentials/service-account.json` 파일 있음
- [ ] `DATABASE_URL` 연결 테스트 완료
- [ ] Prisma 마이그레이션 실행됨
- [ ] 빌드 성공 (`npm run build`)
- [ ] 새 도메인으로 `NEXT_PUBLIC_BASE_URL` 업데이트
- [ ] Google API 인증 도메인 추가
- [ ] 데이터 백업 완료 (Railway에서)

---

## 🎯 결론

**네, 다른 서버/데이터베이스로 이전해도 작동합니다!**

### 핵심 요구사항
1. ✅ **PostgreSQL 데이터베이스** (어떤 호스팅이든 가능)
2. ✅ **Node.js 20+** 실행 환경
3. ✅ **환경 변수 설정**
4. ✅ **파일 경로 유지** (credentials 폴더)

### Railway 특화 코드 없음
- 코드는 100% 플랫폼 독립적
- `railway.json`은 단순 배포 설정
- Vercel, AWS, 자체 서버 모두 가능

### 데이터 이전
- PostgreSQL dump/restore로 간단히 이전
- Prisma 덕분에 DB 설정만 바꾸면 끝

**추천 이전 경로**: Railway → Vercel (가장 쉬움) 또는 Railway → AWS/자체서버 (더 많은 제어)


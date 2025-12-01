/**
 * Dropbox의 로그인 로그를 PostgreSQL DB로 마이그레이션하는 스크립트
 */

import { prisma } from "../lib/database";
import dropboxService from "../lib/dropbox-service";

const DROPBOX_LOG_PATH = "/logs/login-history.json";

interface DropboxLoginLog {
  id: string;
  email: string;
  name: string;
  employeeId?: string;
  department?: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
  loginMethod: "google" | "workspace" | "test";
  success: boolean;
  errorMessage?: string;
}

async function migrateLoginLogs() {
  console.log("🚀 로그인 로그 마이그레이션 시작\n");

  try {
    // 1. Dropbox에서 기존 로그 가져오기
    console.log("📥 Dropbox에서 로그인 기록 가져오는 중...");
    let dropboxLogs: DropboxLoginLog[] = [];

    try {
      const logFileContent = await dropboxService.download({ path: DROPBOX_LOG_PATH });
      if (logFileContent && typeof logFileContent === 'string' && logFileContent.trim()) {
        const parsed = JSON.parse(logFileContent);
        dropboxLogs = Array.isArray(parsed) ? parsed : [];
        console.log(`✅ Dropbox에서 ${dropboxLogs.length}개의 로그를 찾았습니다.\n`);
      } else {
        console.log("⚠️  Dropbox에 로그 데이터가 없습니다.\n");
      }
    } catch (error) {
      console.log("⚠️  Dropbox 파일을 찾을 수 없거나 오류가 발생했습니다.");
      console.log("   마이그레이션을 건너뜁니다.\n");
      return;
    }

    if (dropboxLogs.length === 0) {
      console.log("📭 마이그레이션할 로그가 없습니다.\n");
      return;
    }

    // 2. DB에 이미 있는 로그 확인
    console.log("🔍 DB에 기존 로그인 기록 확인 중...");
    const existingCount = await prisma.loginLog.count();
    console.log(`   DB에 ${existingCount}개의 기존 로그가 있습니다.\n`);

    if (existingCount > 0) {
      console.log("⚠️  DB에 이미 로그인 기록이 존재합니다.");
      console.log("   계속하시겠습니까? (중복될 수 있습니다)");
      console.log("   스크립트를 수정하여 중복 체크 로직을 추가하는 것을 권장합니다.\n");
    }

    // 3. DB에 저장
    console.log("💾 DB에 로그 저장 중...");
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const log of dropboxLogs) {
      try {
        // 이메일로 사용자 찾기
        const user = await prisma.user.findUnique({
          where: { email: log.email },
          select: { id: true }
        });

        // 로그 저장
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
        });

        successCount++;

        // 진행 상황 표시
        if (successCount % 100 === 0) {
          console.log(`   진행 중: ${successCount}/${dropboxLogs.length}`);
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          skipCount++;
        } else {
          console.error(`   ❌ 로그 저장 실패 (${log.email}):`, error instanceof Error ? error.message : String(error));
          errorCount++;
        }
      }
    }

    console.log("\n📊 마이그레이션 결과:");
    console.log(`   - 성공: ${successCount}개`);
    console.log(`   - 중복 건너뜀: ${skipCount}개`);
    console.log(`   - 실패: ${errorCount}개`);
    console.log(`   - 총계: ${dropboxLogs.length}개\n`);

    // 4. 최종 DB 상태 확인
    const finalCount = await prisma.loginLog.count();
    console.log(`✅ DB에 총 ${finalCount}개의 로그인 기록이 있습니다.\n`);

    // 5. Dropbox 백업 생성 (선택사항)
    console.log("💾 Dropbox 파일 백업 중...");
    try {
      const backupPath = `/logs/login-history-backup-${Date.now()}.json`;
      const content = JSON.stringify(dropboxLogs, null, 2);
      await dropboxService.upload({
        path: backupPath,
        content: Buffer.from(content, 'utf-8')
      });
      console.log(`   백업 파일 생성: ${backupPath}\n`);
    } catch (error) {
      console.warn("   ⚠️  백업 파일 생성 실패:", error);
    }

    console.log("🎉 마이그레이션이 완료되었습니다!\n");
    console.log("📝 참고사항:");
    console.log("   - Dropbox의 allowed-ips.json 파일은 그대로 유지됩니다.");
    console.log("   - 백업이 완료되었으므로 필요시 복원할 수 있습니다.");
    console.log("   - 원하시면 Dropbox 파일을 삭제해도 됩니다.\n");

  } catch (error) {
    console.error("❌ 마이그레이션 중 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migrateLoginLogs()
  .then(() => {
    console.log("✨ 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 스크립트 실행 실패:", error);
    process.exit(1);
  });


/**
 * Dropbox의 IP 화이트리스트를 PostgreSQL DB로 마이그레이션하는 스크립트
 * 
 * 실행 방법:
 * npx ts-node scripts/migrate-ip-to-db.ts
 */

import dropboxService from "../lib/dropbox-service";
import { prisma } from "../lib/prisma";

const ALLOWLIST_PATH = "/config/allowed-ips.json";

type AllowedDeviceDropbox = {
  ip: string;
  label?: string;
  createdAt: string;
  createdBy?: string;
  userAgent?: string;
};

async function migrateIpToDb() {
  console.log("🚀 IP 마이그레이션 시작...\n");

  try {
    // 1. Dropbox에서 기존 IP 목록 가져오기
    console.log("📥 Dropbox에서 IP 목록 가져오는 중...");
    let dropboxDevices: AllowedDeviceDropbox[] = [];
    
    try {
      const content = await dropboxService.download({ path: ALLOWLIST_PATH });
      if (content && typeof content === "string" && content.trim()) {
        const parsed = JSON.parse(content);
        dropboxDevices = Array.isArray(parsed) ? parsed : [];
        console.log(`✅ Dropbox에서 ${dropboxDevices.length}개의 IP를 찾았습니다.\n`);
      } else {
        console.log("⚠️  Dropbox에 IP 데이터가 없습니다.\n");
      }
    } catch (e) {
      console.log("⚠️  Dropbox 파일을 찾을 수 없거나 오류가 발생했습니다.");
      console.log("   에러:", e);
      console.log("   마이그레이션을 계속 진행합니다...\n");
    }

    // 2. DB의 기존 데이터 확인
    console.log("🔍 DB의 기존 IP 확인 중...");
    const existingDevices = await prisma.allowedDevice.findMany();
    console.log(`   DB에 이미 ${existingDevices.length}개의 IP가 있습니다.\n`);

    if (dropboxDevices.length === 0) {
      console.log("✅ 마이그레이션할 데이터가 없습니다.");
      return;
    }

    // 3. 마이그레이션 진행
    console.log("💾 DB로 마이그레이션 중...");
    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const device of dropboxDevices) {
      try {
        const existing = await prisma.allowedDevice.findUnique({
          where: { ip: device.ip },
        });

        if (existing) {
          // 이미 존재하면 업데이트 (비활성화된 경우 활성화)
          if (!existing.isActive) {
            await prisma.allowedDevice.update({
              where: { ip: device.ip },
              data: {
                isActive: true,
                label: device.label || existing.label,
                createdBy: device.createdBy || existing.createdBy,
                userAgent: device.userAgent || existing.userAgent,
              },
            });
            console.log(`   🔄 업데이트: ${device.ip} (${device.label || "라벨 없음"})`);
            updatedCount++;
          } else {
            console.log(`   ⏭️  건너뜀: ${device.ip} (이미 존재)`);
            skippedCount++;
          }
        } else {
          // 새로 생성
          await prisma.allowedDevice.create({
            data: {
              ip: device.ip,
              label: device.label,
              createdBy: device.createdBy,
              userAgent: device.userAgent,
              createdAt: new Date(device.createdAt),
            },
          });
          console.log(`   ✅ 생성: ${device.ip} (${device.label || "라벨 없음"})`);
          createdCount++;
        }
      } catch (error) {
        console.error(`   ❌ 실패: ${device.ip}`, error);
      }
    }

    console.log("\n📊 마이그레이션 결과:");
    console.log(`   - 새로 생성: ${createdCount}개`);
    console.log(`   - 업데이트: ${updatedCount}개`);
    console.log(`   - 건너뜀: ${skippedCount}개`);
    console.log(`   - 총계: ${dropboxDevices.length}개\n`);

    // 4. 최종 확인
    const finalCount = await prisma.allowedDevice.count({
      where: { isActive: true },
    });
    console.log(`✅ 마이그레이션 완료! 현재 DB에 ${finalCount}개의 활성 IP가 있습니다.\n`);

    // 5. Dropbox 백업 생성 (선택사항)
    console.log("💾 Dropbox 파일 백업 중...");
    const backupPath = `/config/allowed-ips.backup.${Date.now()}.json`;
    try {
      const content = JSON.stringify(dropboxDevices, null, 2);
      await dropboxService.upload({
        path: backupPath,
        content: Buffer.from(content, "utf-8"),
      });
      console.log(`   ✅ 백업 완료: ${backupPath}\n`);
    } catch (e) {
      console.log("   ⚠️  백업 실패 (무시하고 계속 진행)\n");
    }

    console.log("🎉 모든 작업이 완료되었습니다!");
    console.log("\n💡 참고:");
    console.log("   - Dropbox의 allowed-ips.json 파일은 그대로 유지됩니다.");
    console.log("   - 이제 API는 DB를 사용합니다.");
    console.log("   - 원하시면 Dropbox 파일을 삭제해도 됩니다.\n");

  } catch (error) {
    console.error("❌ 마이그레이션 중 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migrateIpToDb()
  .then(() => {
    console.log("✅ 스크립트 종료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실패:", error);
    process.exit(1);
  });


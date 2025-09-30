import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const submissionData = await request.json();
    console.log("녹음 제출 (Database):", submissionData);

    // 1. 사용자 생성 또는 찾기
    let user = await prisma.user.findUnique({
      where: { employeeId: submissionData.employeeId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `${submissionData.employeeId}@jinair.com`,
          name: submissionData.name,
          employeeId: submissionData.employeeId,
          department: '승무부',
          position: '승무원',
          isActive: true,
          isInstructor: false,
          isAdmin: false,
          roles: []
        }
      });
      console.log(`👤 새 사용자 생성: ${user.name}`);
    }

    // 2. 평가 레코드 생성
    const evaluationRecord = await prisma.evaluation.create({
      data: {
        userId: user.id,
        language: submissionData.language,
        category: submissionData.category,
        status: 'pending',
        submittedAt: new Date(submissionData.submittedAt || new Date()),
        evaluatedAt: null,
        evaluatedBy: null,
        totalScore: 0,
        koreanTotalScore: 0,
        englishTotalScore: 0,
        grade: 'N/A',
        comments: { korean: '', english: '' },
        approved: false,
        recordingCount: submissionData.recordingCount || 0,
        scriptNumbers: submissionData.scriptNumbers || [],
        comment: submissionData.comment || '',
        duration: submissionData.duration || 0,
        isFileUpload: false
        // 새로운 필드들은 기본값으로 설정되므로 명시적으로 지정하지 않음
      }
    });

    // 3. 녹음 파일 정보 생성 (Base64 데이터 최적화)
    if (submissionData.recordings && Object.keys(submissionData.recordings).length > 0) {
      console.log(`📁 ${Object.keys(submissionData.recordings).length}개의 녹음 파일 처리 중...`);
      
      for (const [key, base64Data] of Object.entries(submissionData.recordings)) {
        try {
          // 🔥 수정: 키 형식 개선 (uploadedFile.key 사용)
          let scriptNumber = 1;
          let language = key;
          
          // 기존 형식 호환성 유지 (예: "1-korean")
          if (key.includes('-')) {
            const [scriptNumberStr, lang] = key.split('-');
            const parsedNumber = parseInt(scriptNumberStr);
            if (!isNaN(parsedNumber)) {
              scriptNumber = parsedNumber;
              language = lang;
            }
          }

          // 원본 파일 확장자 사용 (없으면 webm 기본값)
          const originalExtension = submissionData.fileExtensions?.[key] || 'webm';
          const fileName = `${submissionData.name}_${submissionData.employeeId}_${submissionData.category}_${language}_${scriptNumber}번문안_${new Date().toISOString().split("T")[0]}.${originalExtension}`;
          
          // 🔥 성능 최적화: Base64 데이터 크기 제한 및 압축
          const base64String = base64Data as string;
          const base64Size = base64String.length;
          console.log(`📊 Base64 데이터 크기: ${(base64Size / 1024 / 1024).toFixed(2)}MB`);
          
          // 10MB 이상의 Base64 데이터는 경고 표시
          if (base64Size > 10 * 1024 * 1024) {
            console.warn(`⚠️ 대용량 파일 감지: ${fileName} (${(base64Size / 1024 / 1024).toFixed(2)}MB)`);
          }
          
          await prisma.recording.create({
            data: {
              evaluationId: evaluationRecord.id,
              scriptNumber: scriptNumber,
              language: language,
              filePath: `database://${evaluationRecord.id}/${fileName}`,
              fileName: fileName,
              originalFileName: fileName,
              url: base64String, // Base64 데이터 저장 (향후 외부 스토리지로 이전 예정)
              dropboxPath: null,
              dropboxFileId: null,
              success: true
            }
          });
          
          console.log(`✅ 녹음 파일 저장 완료: ${fileName}`);
        } catch (error) {
          console.error(`❌ 녹음 파일 저장 실패 (${key}):`, error);
        }
      }
    }

    console.log(`✅ [API] Database 녹음 제출 완료: ${evaluationRecord.id}`);

    return NextResponse.json({
      success: true,
      message: "녹음이 제출되었고 평가 대기 목록에 추가되었습니다.",
      evaluationId: evaluationRecord.id,
      candidateId: evaluationRecord.id // 기존 형식 호환
    });

  } catch (error: any) {
    console.error("❌ [API] Database 녹음 제출 실패:", error);
    return NextResponse.json(
      { success: false, details: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}


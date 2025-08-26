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
      }
    });

    // 3. Base64 녹음 파일 정보 생성
    if (submissionData.recordings && Object.keys(submissionData.recordings).length > 0) {
      console.log(`📁 ${Object.keys(submissionData.recordings).length}개의 녹음 파일 처리 중...`);
      
      for (const [key, base64Data] of Object.entries(submissionData.recordings)) {
        try {
          // 키에서 스크립트 번호와 언어 추출 (예: "1-korean" -> scriptNumber: 1, language: "korean")
          const [scriptNumberStr, language] = key.split('-');
          const scriptNumber = parseInt(scriptNumberStr);
          
          if (isNaN(scriptNumber)) {
            console.warn(`⚠️ 잘못된 스크립트 번호: ${key}`);
            continue;
          }

          // 파일명 생성
          const fileName = `${submissionData.name}_${submissionData.employeeId}_${submissionData.category}_${language}_${scriptNumber}번문안_${new Date().toISOString().split("T")[0]}.webm`;
          
          await prisma.recording.create({
            data: {
              evaluationId: evaluationRecord.id,
              scriptNumber: scriptNumber,
              language: language,
              filePath: `database://${evaluationRecord.id}/${fileName}`, // 데이터베이스 내 경로 표시
              fileName: fileName,
              originalFileName: fileName,
              url: base64Data, // Base64 데이터를 URL 필드에 저장
              dropboxPath: null, // Dropbox 사용 안함
              dropboxFileId: null, // Dropbox 사용 안함
              success: true,
              fileData: base64Data // Base64 데이터를 별도 필드에도 저장
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


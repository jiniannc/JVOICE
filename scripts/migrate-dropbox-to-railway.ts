import { PrismaClient } from '../lib/generated/prisma'
import dropboxService from '../lib/dropbox-service'

const prisma = new PrismaClient()

interface DropboxEvaluation {
  candidateInfo: {
    name: string
    employeeId: string
    language: string
    category: string
    submittedAt: string
    recordingCount?: number
    scriptNumbers?: number[]
    comment?: string
    duration?: number
  }
  scores: { [key: string]: number }
  categoryScores: { [key: string]: any }
  totalScore: number
  grade: string
  comments: { korean: string; english: string } | string
  evaluatedAt: string
  evaluatedBy: string | null
  status: string
  recordings: { [key: string]: string }
  dropboxFiles?: any[]
  approved?: boolean
}

async function migrateDropboxToRailway() {
  try {
    console.log('🚀 Dropbox에서 Railway로 마이그레이션 시작...')

    // 1. index.json에서 평가 목록 가져오기
    const indexData = await dropboxService.getIndexJson({ path: '/evaluations/index.json' })
    console.log(`📋 총 ${indexData.entries.length}개의 평가 데이터 발견`)

    // 2. 각 평가 데이터 처리
    for (const entry of indexData.entries) {
      try {
        console.log(`📝 처리 중: ${entry.name} (${entry.employeeId})`)

        // 3. 사용자 정보 확인/생성
        let user = await prisma.user.findUnique({
          where: { employeeId: entry.employeeId }
        })

        if (!user) {
          // Google Sheets에서 직원 정보 가져오기 (임시로 기본값 사용)
          user = await prisma.user.create({
            data: {
              email: `${entry.employeeId}@jinair.com`,
              name: entry.name,
              employeeId: entry.employeeId,
              department: '승무부',
              position: '승무원',
              isActive: true,
              isInstructor: false,
              isAdmin: false,
              roles: []
            }
          })
          console.log(`👤 새 사용자 생성: ${user.name}`)
        }

        // 4. 평가 데이터 가져오기
        const evaluationData = await dropboxService.getIndexJson({ path: entry.dropboxPath })
        const evaluation: DropboxEvaluation = evaluationData.entries[0]

        // 5. 평가 레코드 생성
        const evaluationRecord = await prisma.evaluation.create({
          data: {
            userId: user.id,
            language: evaluation.candidateInfo.language,
            category: evaluation.candidateInfo.category,
            status: evaluation.status || 'pending',
            submittedAt: new Date(evaluation.candidateInfo.submittedAt),
            evaluatedAt: evaluation.evaluatedAt ? new Date(evaluation.evaluatedAt) : null,
            evaluatedBy: evaluation.evaluatedBy,
            totalScore: evaluation.totalScore || 0,
            koreanTotalScore: evaluation.categoryScores?.['korean-total'] || 0,
            englishTotalScore: evaluation.categoryScores?.['english-total'] || 0,
            grade: evaluation.grade || 'N/A',
            comments: evaluation.comments,
            approved: evaluation.approved || false,
            recordingCount: evaluation.candidateInfo.recordingCount,
            scriptNumbers: evaluation.candidateInfo.scriptNumbers || [],
            comment: evaluation.candidateInfo.comment,
            duration: evaluation.candidateInfo.duration || 0,
            isFileUpload: !!evaluation.dropboxFiles
          }
        })

        // 6. 평가 점수 저장
        for (const [key, score] of Object.entries(evaluation.scores)) {
          await prisma.evaluationScore.create({
            data: {
              evaluationId: evaluationRecord.id,
              criteriaKey: key,
              score: score as number,
              language: key.startsWith('korean') ? 'korean' : 
                       key.startsWith('english') ? 'english' : 
                       key.startsWith('japanese') ? 'japanese' : 
                       key.startsWith('chinese') ? 'chinese' : null
            }
          })
        }

        // 7. 녹음 파일 정보 저장
        if (evaluation.dropboxFiles) {
          for (const file of evaluation.dropboxFiles) {
            await prisma.recording.create({
              data: {
                evaluationId: evaluationRecord.id,
                scriptNumber: parseInt(file.scriptKey.split('-')[0]),
                language: file.scriptKey.split('-')[1],
                filePath: file.dropboxPath,
                fileName: file.fileName || file.originalFileName,
                originalFileName: file.originalFileName,
                url: file.url,
                dropboxPath: file.dropboxPath,
                dropboxFileId: file.fileId,
                success: file.success || true
              }
            })
          }
        }

        console.log(`✅ 완료: ${entry.name}의 평가 데이터 마이그레이션`)

      } catch (error) {
        console.error(`❌ 오류: ${entry.name} 처리 중`, error)
      }
    }

    console.log('🎉 마이그레이션 완료!')

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateDropboxToRailway()
}

export default migrateDropboxToRailway

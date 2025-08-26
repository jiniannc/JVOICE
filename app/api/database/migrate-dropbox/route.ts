import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'
import dropboxService from '../../../../lib/dropbox-service'

const prisma = new PrismaClient()

interface DropboxEvaluation {
  id: string
  name: string
  employeeId: string
  language: string
  category: string
  submittedAt: string
  recordings: Record<string, string>
  recordingBlobs: Record<string, any>
  uploadedFiles: Record<string, any>
  status: string
  approved: boolean
  reviewRequestedBy?: string
  dropboxFiles: Array<{
    scriptKey: string
    success: boolean
    fileId: string
    fileName: string
    url: string
    path: string
    originalFileName: string
    dropboxPath: string
  }>
  dropboxPath: string
  scores: Record<string, number>
  categoryScores: Record<string, number>
  totalScore: number
  koreanTotalScore: number
  englishTotalScore: number
  comments: Record<string, string>
  evaluatedAt: string
  evaluatedBy: string
  approvedAt: string
  approvedBy: string
}

export async function GET(request: NextRequest) {
  return await POST(request)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Dropbox에서 Railway로 마이그레이션 시작...')
    
    // 1. 데이터베이스 연결 테스트
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공')
    
    // 2. Dropbox에서 index.json 가져오기
    console.log('📋 Dropbox에서 평가 데이터 목록 가져오는 중...')
    
    try {
      const indexData = await dropboxService.getIndexJson({ path: '/evaluations/index.json' })
      console.log(`📊 총 ${indexData.entries.length}개의 평가 데이터 발견`)
      
      let successCount = 0
      let errorCount = 0
      
      // 3. 각 평가 데이터를 데이터베이스로 마이그레이션
      for (const entry of indexData.entries) {
        try {
          console.log(`📝 처리 중: ${entry.name} (${entry.employeeId})`)
          
          // 사용자 생성 또는 찾기
          let user = await prisma.user.findUnique({ 
            where: { employeeId: entry.employeeId } 
          })
          
          if (!user) {
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
          
          // 평가 데이터 가져오기
          const evaluationData = await dropboxService.getIndexJson({ path: entry.dropboxPath })
          const evaluation: DropboxEvaluation = evaluationData.entries
          
          // 평가 레코드 생성
          const evaluationRecord = await prisma.evaluation.create({
            data: {
              userId: user.id,
              language: evaluation.language,
              category: evaluation.category,
              status: evaluation.status || 'pending',
              submittedAt: new Date(evaluation.submittedAt),
              evaluatedAt: evaluation.evaluatedAt ? new Date(evaluation.evaluatedAt) : null,
              evaluatedBy: evaluation.evaluatedBy,
              totalScore: evaluation.totalScore || 0,
              koreanTotalScore: evaluation.koreanTotalScore || 0,
              englishTotalScore: evaluation.englishTotalScore || 0,
              grade: 'N/A', // 실제 데이터에 grade가 없으므로 기본값 사용
              comments: evaluation.comments,
              approved: evaluation.approved || false,
              recordingCount: evaluation.dropboxFiles?.length || 0,
              scriptNumbers: evaluation.dropboxFiles?.map(f => parseInt(f.scriptKey.split('-')[0])) || [],
              comment: '', // 실제 데이터에 comment가 없으므로 빈 문자열
              duration: 0, // 실제 데이터에 duration이 없으므로 0
              isFileUpload: !!evaluation.dropboxFiles
            }
          })
          
          // 평가 점수 생성
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
          
          // 녹음 파일 정보 생성
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
          
          successCount++
          console.log(`✅ 완료: ${entry.name}의 평가 데이터 마이그레이션`)
          
        } catch (error) {
          errorCount++
          console.error(`❌ 오류: ${entry.name} 처리 중`, error)
        }
      }
      
      console.log('🎉 마이그레이션 완료!')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Dropbox에서 Railway로 마이그레이션 완료',
        summary: {
          total: indexData.entries.length,
          success: successCount,
          error: errorCount
        }
      })
      
    } catch (error) {
      console.error('❌ Dropbox 데이터 가져오기 실패:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Dropbox 데이터 가져오기 실패',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error)
    return NextResponse.json({ 
      success: false, 
      message: '마이그레이션 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

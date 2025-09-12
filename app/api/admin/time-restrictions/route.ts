import { NextRequest, NextResponse } from 'next/server'

// 메모리 기반 설정 저장 (서버 재시작 시 초기화됨)
let timeRestrictionsDisabled = false

export async function GET() {
  return NextResponse.json({
    success: true,
    disabled: timeRestrictionsDisabled,
    message: timeRestrictionsDisabled ? '시간 제한이 비활성화되어 있습니다' : '시간 제한이 활성화되어 있습니다'
  })
}

export async function POST(request: NextRequest) {
  try {
    const { disabled } = await request.json()
    
    timeRestrictionsDisabled = Boolean(disabled)
    
    console.log(`🔧 [Admin] 시간 제한 ${timeRestrictionsDisabled ? '비활성화' : '활성화'}됨`)
    
    return NextResponse.json({
      success: true,
      disabled: timeRestrictionsDisabled,
      message: `시간 제한이 ${timeRestrictionsDisabled ? '비활성화' : '활성화'}되었습니다`
    })
  } catch (error) {
    console.error('❌ [Admin] 시간 제한 설정 오류:', error)
    return NextResponse.json(
      { success: false, error: '시간 제한 설정 실패' },
      { status: 500 }
    )
  }
}

// 다른 API에서 사용할 수 있도록 export
export function isTimeRestrictionsDisabled(): boolean {
  return timeRestrictionsDisabled
}



import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("workspace_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({
        authenticated: false,
        domain: null,
        status: "not_authenticated",
      })
    }

    // 세션 디코딩 (실제로는 JWT 검증)
    const sessionData = JSON.parse(Buffer.from(sessionCookie, "base64").toString())

    // 세션 유효성 검사
    const loginTime = new Date(sessionData.loginTime)
    const now = new Date()
    const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLogin > 8) {
      return NextResponse.json({
        authenticated: false,
        domain: null,
        status: "session_expired",
      })
    }

    // Workspace 도메인 정보 확인
    const workspaceInfo = await checkWorkspaceDomain(sessionData.domain)

    return NextResponse.json({
      authenticated: true,
      user: {
        email: sessionData.email,
        name: sessionData.name,
        picture: sessionData.picture,
        domain: sessionData.domain,
        employee: sessionData.employee,
      },
      domain: sessionData.domain,
      status: "authenticated",
      workspace: workspaceInfo,
    })
  } catch (error) {
    console.error("Workspace status check error:", error)
    return NextResponse.json({
      authenticated: false,
      domain: null,
      status: "error",
    })
  }
}

async function checkWorkspaceDomain(domain: string) {
  try {
    // Google Workspace Admin SDK를 사용하여 도메인 정보 확인
    // 실제로는 서비스 계정을 사용해야 함
    return {
      domain: domain,
      verified: true,
      organizationName: "JINAIR",
      adminContact: "admin@jinair.com",
    }
  } catch (error) {
    console.error("Workspace domain check failed:", error)
    return {
      domain: domain,
      verified: false,
      error: "Domain verification failed",
    }
  }
}

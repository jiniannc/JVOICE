import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { EmployeeDatabase } from "@/lib/employee-database"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [User API] 사용자 정보 요청 받음")

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    // 이메일 파라미터가 있으면 직원 정보 조회
    if (email) {
      console.log("🔍 [User API] 직원 정보 조회:", email)
      try {
        const employeeDB = new EmployeeDatabase()
        const employee = await employeeDB.findEmployeeByEmail(email)
        
        if (employee) {
          console.log("✅ [User API] 직원 정보 찾음:", employee.name)
          return NextResponse.json({
            name: employee.name,
            employeeId: employee.employeeId,
            department: employee.department,
            email: employee.email
          })
        } else {
          console.log("⚠️ [User API] 직원 정보 없음:", email)
          return NextResponse.json({
            name: email,
            email: email
          })
        }
      } catch (error) {
        console.error("❌ [User API] 직원 정보 조회 실패:", error)
        return NextResponse.json({
          name: email,
          email: email
        })
      }
    }

    // 이메일 파라미터가 없으면 현재 로그인한 사용자 정보 반환
    const cookieStore = await cookies()
    const authUser = cookieStore.get("auth_user")
    const authStatus = cookieStore.get("auth_status")

    if (!authUser || !authStatus || authStatus.value !== "authenticated") {
      console.log("❌ [User API] 인증되지 않은 사용자")
      return NextResponse.json({
        authenticated: false,
        user: null,
      })
    }

    try {
      const userData = JSON.parse(authUser.value)

      // 토큰 만료 확인
      if (userData.expiresAt && Date.now() > userData.expiresAt) {
        console.log("⚠️ [User API] 토큰 만료됨")
        return NextResponse.json({
          authenticated: false,
          user: null,
          expired: true,
        })
      }

      console.log("✅ [User API] 인증된 사용자:", userData.email)

      return NextResponse.json({
        authenticated: true,
        user: userData,
      })
    } catch (parseError) {
      console.error("❌ [User API] 사용자 데이터 파싱 실패:", parseError)
      return NextResponse.json({
        authenticated: false,
        user: null,
      })
    }
  } catch (error) {
    console.error("❌ [User API] 사용자 정보 조회 실패:", error)
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: "사용자 정보 조회 실패",
      },
      { status: 500 },
    )
  }
}

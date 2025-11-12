import { NextResponse } from "next/server"
import { prisma } from "@/lib/database"

export const dynamic = "force-dynamic"

/**
 * GET /api/employees
 * DB에서 활성 직원 정보 조회 (서버 사이드)
 */
export async function GET() {
  try {
    console.log("📊 [API] 직원 정보 조회 중...")

    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        email: true,
        name: true,
        employeeId: true,
        department: true,
        position: true,
        lineTeam: true,
        isActive: true,
        isInstructor: true,
        isAdmin: true,
        roles: true,
        koreanEnglishGrade: true,
        koreanEnglishExpiry: true,
        japaneseGrade: true,
        chineseGrade: true,
      },
    })

    // Employee 인터페이스 형식으로 변환
    const employees = users.map((user) => ({
      email: user.email.toLowerCase(),
      name: user.name,
      employeeId: user.employeeId,
      department: user.department,
      position: user.position || "",
      lineTeam: user.lineTeam || undefined,
      isActive: user.isActive,
      isInstructor: user.isInstructor,
      isAdmin: user.isAdmin,
      roles: user.roles,
      koreanEnglishGrade: user.koreanEnglishGrade || undefined,
      koreanEnglishExpiry: user.koreanEnglishExpiry || undefined,
      japaneseGrade: user.japaneseGrade || undefined,
      chineseGrade: user.chineseGrade || undefined,
    }))

    console.log(`✅ [API] 직원 정보 ${employees.length}명 조회 완료`)

    return NextResponse.json({
      success: true,
      employees,
      count: employees.length,
    })
  } catch (error) {
    console.error("❌ [API] 직원 정보 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: "직원 정보 조회 실패",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


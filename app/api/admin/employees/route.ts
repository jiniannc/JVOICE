import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';

// GET: 직원 목록 조회 (검색, 필터링, 페이지네이션)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const lineTeam = searchParams.get("lineTeam") || "";
    const isActive = searchParams.get("isActive");
    const isInstructor = searchParams.get("isInstructor");
    const isAdmin = searchParams.get("isAdmin");
    const koreanEnglishGrade = searchParams.get("koreanEnglishGrade");
    const japaneseGrade = searchParams.get("japaneseGrade");
    const chineseGrade = searchParams.get("chineseGrade");

    const skip = (page - 1) * limit;

    // 필터 조건 구성
    const where: any = {
      // isActive가 명시적으로 false가 아니면 모두 조회 (기본값은 활성 직원)
    };

    if (search) {
      // 검색어 정확도 개선: 이름은 정확히 일치 또는 시작, 이메일/사번은 포함
      where.OR = [
        { name: { equals: search } },           // 정확히 일치
        { name: { startsWith: search } },       // 시작 일치
        { email: { contains: search, mode: 'insensitive' } },    // 이메일 포함
        { employeeId: { contains: search, mode: 'insensitive' } }, // 사번 포함
      ];
    }

    if (department) {
      where.department = { contains: department };
    }

    if (lineTeam) {
      where.lineTeam = { contains: lineTeam };
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (isInstructor !== null) {
      where.isInstructor = isInstructor === "true";
    }

    if (isAdmin !== null) {
      where.isAdmin = isAdmin === "true";
    }

    // 언어별 자격 필터
    if (koreanEnglishGrade) {
      where.koreanEnglishGrade = koreanEnglishGrade;
    }

    if (japaneseGrade) {
      where.japaneseGrade = japaneseGrade;
    }

    if (chineseGrade) {
      where.chineseGrade = chineseGrade;
    }

    // 전체 개수 조회
    const total = await prisma.user.count({ where });

    // 직원 목록 조회 (사번 오름차순 = 낮은 번호가 최신)
    const employees = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { employeeId: "asc" },
      select: {
        id: true,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        employees,
        total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error: any) {
    console.error("❌ [API] 직원 목록 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "직원 목록 조회 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

// POST: 신규 직원 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      employeeId,
      department,
      position,
      lineTeam,
      isActive = true,
      isInstructor = false,
      isAdmin = false,
      roles = [],
      koreanEnglishGrade,
      koreanEnglishExpiry,
      japaneseGrade,
      chineseGrade,
    } = body;

    // 필수 필드 검증
    if (!email || !name || !employeeId) {
      return NextResponse.json(
        { success: false, error: "이메일, 이름, 사번은 필수 항목입니다." },
        { status: 400 }
      );
    }

    // 중복 체크 (이메일)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: "이미 존재하는 이메일입니다." },
        { status: 409 }
      );
    }

    // 중복 체크 (사번)
    const existingByEmployeeId = await prisma.user.findUnique({
      where: { employeeId },
    });

    if (existingByEmployeeId) {
      return NextResponse.json(
        { success: false, error: "이미 존재하는 사번입니다." },
        { status: 409 }
      );
    }

    // 신규 직원 생성
    const newEmployee = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        employeeId,
        department: department || "",
        position: position || "",
        lineTeam: lineTeam || null,
        isActive,
        isInstructor,
        isAdmin,
        roles,
        koreanEnglishGrade: koreanEnglishGrade || null,
        koreanEnglishExpiry: koreanEnglishExpiry ? new Date(koreanEnglishExpiry) : null,
        japaneseGrade: japaneseGrade || null,
        chineseGrade: chineseGrade || null,
      },
    });

    console.log(`✅ [API] 신규 직원 추가: ${name} (${employeeId})`);

    return NextResponse.json({
      success: true,
      employee: newEmployee,
      message: "직원이 성공적으로 추가되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ [API] 직원 추가 실패:", error);
    return NextResponse.json(
      { success: false, error: "직원 추가 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 직원 정보 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      email,
      name,
      employeeId,
      department,
      position,
      lineTeam,
      isActive,
      isInstructor,
      isAdmin,
      roles,
      koreanEnglishGrade,
      koreanEnglishExpiry,
      japaneseGrade,
      chineseGrade,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "직원 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 직원 존재 여부 확인
    const existingEmployee = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 직원입니다." },
        { status: 404 }
      );
    }

    // 이메일 중복 체크 (자기 자신 제외)
    if (email && email.toLowerCase() !== existingEmployee.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { success: false, error: "이미 존재하는 이메일입니다." },
          { status: 409 }
        );
      }
    }

    // 사번 중복 체크 (자기 자신 제외)
    if (employeeId && employeeId !== existingEmployee.employeeId) {
      const duplicateEmployeeId = await prisma.user.findUnique({
        where: { employeeId },
      });

      if (duplicateEmployeeId) {
        return NextResponse.json(
          { success: false, error: "이미 존재하는 사번입니다." },
          { status: 409 }
        );
      }
    }

    // 직원 정보 업데이트
    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: {
        ...(email && { email: email.toLowerCase() }),
        ...(name && { name }),
        ...(employeeId && { employeeId }),
        ...(department !== undefined && { department }),
        ...(position !== undefined && { position }),
        ...(lineTeam !== undefined && { lineTeam }),
        ...(isActive !== undefined && { isActive }),
        ...(isInstructor !== undefined && { isInstructor }),
        ...(isAdmin !== undefined && { isAdmin }),
        ...(roles !== undefined && { roles }),
        ...(koreanEnglishGrade !== undefined && { koreanEnglishGrade }),
        ...(koreanEnglishExpiry !== undefined && {
          koreanEnglishExpiry: koreanEnglishExpiry ? new Date(koreanEnglishExpiry) : null,
        }),
        ...(japaneseGrade !== undefined && { japaneseGrade }),
        ...(chineseGrade !== undefined && { chineseGrade }),
      },
    });

    console.log(`✅ [API] 직원 정보 수정: ${updatedEmployee.name} (${updatedEmployee.employeeId})`);

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: "직원 정보가 성공적으로 수정되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ [API] 직원 수정 실패:", error);
    return NextResponse.json(
      { success: false, error: "직원 정보 수정 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 직원 비활성화 (소프트 삭제)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const hardDelete = searchParams.get("hardDelete") === "true";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "직원 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 직원 존재 여부 확인
    const existingEmployee = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 직원입니다." },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // 완전 삭제 (관리자만)
      await prisma.user.delete({
        where: { id },
      });

      console.log(`🗑️ [API] 직원 완전 삭제: ${existingEmployee.name} (${existingEmployee.employeeId})`);

      return NextResponse.json({
        success: true,
        message: "직원이 완전히 삭제되었습니다.",
      });
    } else {
      // 소프트 삭제 (비활성화)
      const updatedEmployee = await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      console.log(`🚫 [API] 직원 비활성화: ${updatedEmployee.name} (${updatedEmployee.employeeId})`);

      return NextResponse.json({
        success: true,
        employee: updatedEmployee,
        message: "직원이 비활성화되었습니다.",
      });
    }
  } catch (error: any) {
    console.error("❌ [API] 직원 삭제 실패:", error);
    return NextResponse.json(
      { success: false, error: "직원 삭제 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}


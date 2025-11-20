import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../../lib/database';

// GET: 특정 직원 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            evaluations: true,
            requests: true,
            educationCheckins: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 직원입니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee,
    });
  } catch (error: any) {
    console.error("❌ [API] 직원 상세 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "직원 정보 조회 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 직원 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // 기존 직원 확인
    const existingEmployee = await prisma.user.findUnique({
      where: { employeeId: id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 직원입니다." },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: any = {
      name: body.name,
      email: body.email.toLowerCase(),
      department: body.department,
      position: body.position || null,
      lineTeam: body.lineTeam || null,
      isActive: body.isActive,
      isInstructor: body.isInstructor,
      isAdmin: body.isAdmin,
    };

    // 자격 정보 (빈 문자열은 null로 변환)
    if (body.koreanEnglishGrade !== undefined) {
      updateData.koreanEnglishGrade = body.koreanEnglishGrade || null;
    }
    if (body.koreanEnglishExpiry !== undefined) {
      updateData.koreanEnglishExpiry = body.koreanEnglishExpiry ? new Date(body.koreanEnglishExpiry) : null;
    }
    if (body.japaneseGrade !== undefined) {
      updateData.japaneseGrade = body.japaneseGrade || null;
    }
    if (body.chineseGrade !== undefined) {
      updateData.chineseGrade = body.chineseGrade || null;
    }

    // DB 업데이트
    const updatedEmployee = await prisma.user.update({
      where: { id: existingEmployee.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "직원 정보가 수정되었습니다.",
      employee: updatedEmployee,
    });
  } catch (error: any) {
    console.error("❌ [API] 직원 정보 수정 실패:", error);
    return NextResponse.json(
      { success: false, error: "직원 정보 수정 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 직원 soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { deletedBy } = body; // 삭제하는 사람의 employeeId

    // 기존 직원 확인
    const existingEmployee = await prisma.user.findUnique({
      where: { employeeId: id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 직원입니다." },
        { status: 404 }
      );
    }

    // 이미 비활성화된 직원인지 확인
    if (!existingEmployee.isActive) {
      return NextResponse.json(
        { success: false, error: "이미 비활성화된 직원입니다." },
        { status: 400 }
      );
    }

    // Soft delete: isActive를 false로 업데이트
    const deletedEmployee = await prisma.user.update({
      where: { id: existingEmployee.id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "직원이 삭제되었습니다.",
      employee: deletedEmployee,
    });
  } catch (error: any) {
    console.error("❌ [API] 직원 삭제 실패:", error);
    return NextResponse.json(
      { success: false, error: "직원 삭제 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../../lib/database';
import * as XLSX from "xlsx";

/**
 * 엑셀 파일 업로드 API
 * POST /api/admin/employees/upload
 * 
 * 최소 필수 컬럼: 사번 (employeeId)
 * 선택 컬럼 (있는 것만 업데이트):
 * - name, email, department, position, lineTeam
 * - 활성/역할, koreanEnglishGrade, koreanEnglishExpiry
 * - japaneseGrade, chineseGrade
 * 
 * 엑셀 포맷 예시:
 * A: employeeId(필수), B: name, C: koreanEnglishGrade, D: koreanEnglishExpiry, ...
 */
export async function POST(request: NextRequest) {
  try {
    console.log("📤 [API] 엑셀 파일 업로드 시작");

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "파일이 제공되지 않았습니다" },
        { status: 400 }
      );
    }

    // 파일 확장자 확인
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, error: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다" },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // XLSX 파싱
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 사용
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`📊 [API] ${rows.length}행 데이터 파싱 완료`);

    // 헤더 읽기 (첫 행) - 동적 컬럼 매핑
    const headers = rows[0].map((h: any) => (h || "").toString().trim().toLowerCase());
    const dataRows = rows.slice(1);

    // 결과 카운터
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // 각 행을 순회하며 DB에 upsert
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // Excel 행 번호 (헤더 제외)

      try {
        // 빈 행 건너뛰기
        if (!row || row.length === 0) {
          skippedCount++;
          continue;
        }

        // 헤더를 기반으로 데이터 매핑 (빈 셀도 포함 - null로 처리하기 위해)
        const rowData: any = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined && row[index] !== null) {
            // 빈 문자열("")도 포함 (자격증 초기화를 위해)
            rowData[header] = row[index];
          }
        });

        // 사번 찾기 (employeeid, 사번, employee_id 등 다양한 형태 지원)
        const employeeId = (
          rowData["employeeid"] || 
          rowData["사번"] || 
          rowData["employee_id"] || 
          rowData["직원번호"] ||
          ""
        ).toString().trim();

        // 필수 필드 검증: 사번만 필수
        if (!employeeId) {
          errors.push(`${rowNumber}행: 사번(employeeId)은 필수입니다`);
          skippedCount++;
          continue;
        }

        // 기존 직원 찾기 (사번으로)
        const existingUser = await prisma.user.findUnique({
          where: { employeeId },
        });

        if (!existingUser) {
          errors.push(`${rowNumber}행: 사번 ${employeeId}에 해당하는 직원을 찾을 수 없습니다`);
          skippedCount++;
          continue;
        }

        // 업데이트할 데이터 구성 (엑셀에 있는 필드만)
        const updateData: any = {};

        // ========== 기본 정보 (빈 셀은 무시, DB 값 유지) ==========
        
        // 이름 (name, 이름)
        const name = rowData["name"] || rowData["이름"];
        if (name && name.toString().trim()) {
          updateData.name = name.toString().trim();
        }

        // 이메일 (email)
        const email = rowData["email"] || rowData["이메일"];
        if (email && email.toString().trim()) {
          updateData.email = email.toString().trim().toLowerCase();
        }

        // 부서 (department, 부서, 라인팀)
        const department = rowData["department"] || rowData["부서"] || rowData["라인팀"];
        if (department && department.toString().trim()) {
          updateData.department = department.toString().trim();
        }

        // 직급 (position, 직급, rank)
        const position = rowData["position"] || rowData["직급"] || rowData["rank"];
        if (position && position.toString().trim()) {
          updateData.position = position.toString().trim();
        }

        // 라인팀 (lineteam, 라인팀, line_team)
        const lineTeam = rowData["lineteam"] || rowData["라인팀"] || rowData["line_team"];
        if (lineTeam && lineTeam.toString().trim()) {
          updateData.lineTeam = lineTeam.toString().trim();
        }

        // 활성/역할 (active, 활성, 역할, status)
        const activeValue = rowData["active"] || rowData["활성"] || rowData["역할"] || rowData["status"];
        if (activeValue && activeValue.toString().trim()) {
          const activeStr = activeValue.toString().trim();
          updateData.isActive = !activeStr || activeStr === "Y" || activeStr.includes("교관") || activeStr.includes("관리자");
          
          const roles = activeStr.split(/[,，]/).map((role: string) => role.trim()).filter((role: string) => role && role !== "Y");
          if (roles.length > 0) updateData.roles = roles;
          
          updateData.isAdmin = roles.includes("관리자");
          updateData.isInstructor = roles.includes("교관") || updateData.isAdmin;
        }

        // ========== 자격 정보 (빈 셀이면 null로 덮어쓰기) ==========

        // 한/영 자격 (다양한 컬럼명 지원)
        const koreanEnglishGradeKey = headers.find(h => 
          ["koreanenglishgrade", "koreangrade", "한영등급", "한영자격", "한/영", "한영", "english", "eng"].includes(h)
        );
        if (koreanEnglishGradeKey !== undefined) {
          const koreanEnglishGrade = rowData[koreanEnglishGradeKey];
          const grade = (koreanEnglishGrade || "").toString().trim().toUpperCase();
          
          // 빈 셀이면 null로 덮어쓰기
          if (!grade || grade === "없음" || grade === "NONE") {
            updateData.koreanEnglishGrade = null;
          }
          // ANNC_S, ANNC_A, ANNC_B 형식으로 변환
          else if (grade === "ANNC_S" || grade === "ANNC_A" || grade === "ANNC_B") {
            updateData.koreanEnglishGrade = grade;
          }
          // S, A, B만 있으면 ANNC_ 접두사 추가
          else if (grade === "S") updateData.koreanEnglishGrade = "ANNC_S";
          else if (grade === "A") updateData.koreanEnglishGrade = "ANNC_A";
          else if (grade === "B") updateData.koreanEnglishGrade = "ANNC_B";
          // 그 외는 그대로 저장
          else updateData.koreanEnglishGrade = grade;
        }

        // 한/영 유효기간 (다양한 컬럼명 지원)
        const koreanEnglishExpiryKey = headers.find(h => 
          ["koreanenglishexpiry", "한영만료일", "한영유효기간", "한/영만료", "유효기간", "expiry"].includes(h)
        );
        if (koreanEnglishExpiryKey !== undefined) {
          const koreanEnglishExpiry = rowData[koreanEnglishExpiryKey];
          let expiryDate: Date | null = null;
          
          // 빈 셀이 아니고 "없음"도 아닌 경우만 날짜 파싱
          if (koreanEnglishExpiry && koreanEnglishExpiry.toString().trim() && koreanEnglishExpiry.toString().trim() !== "없음") {
            if (typeof koreanEnglishExpiry === "number") {
              const excelDate = XLSX.SSF.parse_date_code(koreanEnglishExpiry);
              expiryDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
            } else {
              expiryDate = new Date(koreanEnglishExpiry);
              if (isNaN(expiryDate.getTime())) expiryDate = null;
            }
          }
          // Date 객체를 ISO 문자열로 변환 (빈 셀이면 null로 덮어쓰기)
          updateData.koreanEnglishExpiry = expiryDate ? expiryDate.toISOString() : null;
        }

        // 일본어 자격 (다양한 컬럼명 지원)
        const japaneseGradeKey = headers.find(h => 
          ["japanesegrade", "japanese", "일본어등급", "일본어자격", "일본어", "jp"].includes(h)
        );
        if (japaneseGradeKey !== undefined) {
          const japaneseGrade = rowData[japaneseGradeKey];
          const grade = (japaneseGrade || "").toString().trim().toUpperCase();
          
          // 빈 셀이면 null로 덮어쓰기
          if (!grade || grade === "없음" || grade === "NONE") {
            updateData.japaneseGrade = null;
          }
          // JP_A, JP_B 형식으로 변환
          else if (grade === "JP_A" || grade === "JP_B") {
            updateData.japaneseGrade = grade;
          }
          // A, B만 있으면 JP_ 접두사 추가
          else if (grade === "A") updateData.japaneseGrade = "JP_A";
          else if (grade === "B") updateData.japaneseGrade = "JP_B";
          // 그 외는 그대로 저장
          else updateData.japaneseGrade = grade;
        }

        // 중국어 자격 (다양한 컬럼명 지원)
        const chineseGradeKey = headers.find(h => 
          ["chinesegrade", "chinese", "중국어등급", "중국어자격", "중국어", "cn"].includes(h)
        );
        if (chineseGradeKey !== undefined) {
          const chineseGrade = rowData[chineseGradeKey];
          const grade = (chineseGrade || "").toString().trim().toUpperCase();
          
          // 빈 셀이면 null로 덮어쓰기
          if (!grade || grade === "없음" || grade === "NONE") {
            updateData.chineseGrade = null;
          }
          // CN_A, CN_B 형식으로 변환
          else if (grade === "CN_A" || grade === "CN_B") {
            updateData.chineseGrade = grade;
          }
          // A, B만 있으면 CN_ 접두사 추가
          else if (grade === "A") updateData.chineseGrade = "CN_A";
          else if (grade === "B") updateData.chineseGrade = "CN_B";
          // 그 외는 그대로 저장
          else updateData.chineseGrade = grade;
        }

        // 업데이트할 내용이 없으면 건너뛰기
        if (Object.keys(updateData).length === 0) {
          errors.push(`${rowNumber}행: 업데이트할 내용이 없습니다`);
          skippedCount++;
          continue;
        }

        // DB 업데이트
        await prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
        });

        updatedCount++;
        
        // 100행마다 진행 상황 출력
        if (updatedCount % 100 === 0) {
          console.log(`📊 [API] 진행 중: ${updatedCount}/${dataRows.length}행 처리 완료`);
        }

      } catch (error: any) {
        console.error(`❌ [API] ${rowNumber}행 처리 실패:`, error);
        errors.push(`${rowNumber}행: ${error.message}`);
        skippedCount++;
      }
    }

    console.log(`✅ [API] 엑셀 업로드 완료: 업데이트 ${updatedCount}, 건너뜀 ${skippedCount}`);

    return NextResponse.json({
      success: true,
      message: "엑셀 파일 업로드가 완료되었습니다",
      summary: {
        total: dataRows.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length,
      },
      errors,
    });
  } catch (error: any) {
    console.error("❌ [API] 엑셀 업로드 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // FormData 처리를 위해 비활성화
  },
};


import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../../lib/database';
import * as XLSX from "xlsx";

/**
 * 엑셀 파일 업로드 API
 * POST /api/admin/employees/upload
 * 
 * 최소 필수 컬럼: 사번 (employeeId)
 * 
 * 동작 방식:
 * - DB에 사번이 있으면: 기본 정보 유지, 엑셀에 있는 항목만 업데이트, 자격증 빈 셀은 기존 값 유지
 * - DB에 사번이 없으면: 신규 사용자 생성 (필수: employeeId, name)
 * 
 * 선택 컬럼:
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
    let createdCount = 0;
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

        const isNewUser = !existingUser;

        // ========== 데이터 구성 시작 ==========
        
        // 업데이트/생성할 데이터 구성 (엑셀에 있는 필드만)
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

        // ========== 자격 정보 (빈 셀은 기존 값 유지, "없음"이나 "NONE"만 null로 설정) ==========

        // 한/영 자격 (다양한 컬럼명 지원)
        const koreanEnglishGradeKey = headers.find(h => 
          ["koreanenglishgrade", "koreangrade", "한영등급", "한영자격", "한/영", "한영", "english", "eng"].includes(h)
        );
        if (koreanEnglishGradeKey !== undefined) {
          const koreanEnglishGrade = rowData[koreanEnglishGradeKey];
          const grade = (koreanEnglishGrade || "").toString().trim().toUpperCase();
          
          // 값이 있는 경우에만 처리
          if (grade) {
            // "없음" 또는 "NONE"이면 명시적으로 null로 설정
            if (grade === "없음" || grade === "NONE") {
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
          // 빈 셀이면 아무것도 하지 않음 (기존 값 유지)
        }

        // 한/영 유효기간 (다양한 컬럼명 지원)
        const koreanEnglishExpiryKey = headers.find(h => 
          ["koreanenglishexpiry", "한영만료일", "한영유효기간", "한/영만료", "유효기간", "expiry"].includes(h)
        );
        if (koreanEnglishExpiryKey !== undefined) {
          const koreanEnglishExpiry = rowData[koreanEnglishExpiryKey];
          
          // 값이 있는 경우에만 처리
          if (koreanEnglishExpiry && koreanEnglishExpiry.toString().trim()) {
            const expiryStr = koreanEnglishExpiry.toString().trim();
            
            // "없음"이면 명시적으로 null로 설정
            if (expiryStr === "없음" || expiryStr === "NONE") {
              updateData.koreanEnglishExpiry = null;
            } else {
              // 날짜 파싱
              let expiryDate: Date | null = null;
              if (typeof koreanEnglishExpiry === "number") {
                const excelDate = XLSX.SSF.parse_date_code(koreanEnglishExpiry);
                expiryDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
              } else {
                expiryDate = new Date(koreanEnglishExpiry);
                if (isNaN(expiryDate.getTime())) expiryDate = null;
              }
              updateData.koreanEnglishExpiry = expiryDate ? expiryDate.toISOString() : null;
            }
          }
          // 빈 셀이면 아무것도 하지 않음 (기존 값 유지)
        }

        // 일본어 자격 (다양한 컬럼명 지원)
        const japaneseGradeKey = headers.find(h => 
          ["japanesegrade", "japanese", "일본어등급", "일본어자격", "일본어", "jp"].includes(h)
        );
        if (japaneseGradeKey !== undefined) {
          const japaneseGrade = rowData[japaneseGradeKey];
          const grade = (japaneseGrade || "").toString().trim().toUpperCase();
          
          // 값이 있는 경우에만 처리
          if (grade) {
            // "없음" 또는 "NONE"이면 명시적으로 null로 설정
            if (grade === "없음" || grade === "NONE") {
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
          // 빈 셀이면 아무것도 하지 않음 (기존 값 유지)
        }

        // 중국어 자격 (다양한 컬럼명 지원)
        const chineseGradeKey = headers.find(h => 
          ["chinesegrade", "chinese", "중국어등급", "중국어자격", "중국어", "cn"].includes(h)
        );
        if (chineseGradeKey !== undefined) {
          const chineseGrade = rowData[chineseGradeKey];
          const grade = (chineseGrade || "").toString().trim().toUpperCase();
          
          // 값이 있는 경우에만 처리
          if (grade) {
            // "없음" 또는 "NONE"이면 명시적으로 null로 설정
            if (grade === "없음" || grade === "NONE") {
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
          // 빈 셀이면 아무것도 하지 않음 (기존 값 유지)
        }

        // ========== 신규 생성 vs 업데이트 분기 ==========
        
        if (isNewUser) {
          // 신규 사용자 생성
          
          // 필수 필드 검증
          const name = rowData["name"] || rowData["이름"];
          if (!name || !name.toString().trim()) {
            errors.push(`${rowNumber}행: 신규 사용자는 이름(name)이 필수입니다`);
            skippedCount++;
            continue;
          }

          // 신규 사용자 기본값 설정
          const createData: any = {
            employeeId,
            name: name.toString().trim(),
            email: updateData.email || `${employeeId}@temp.com`,
            password: "임시비밀번호", // 실제로는 해시화된 기본 비밀번호
            department: updateData.department || null,
            position: updateData.position || null,
            lineTeam: updateData.lineTeam || null,
            isActive: updateData.isActive !== undefined ? updateData.isActive : true,
            isAdmin: updateData.isAdmin || false,
            isInstructor: updateData.isInstructor || false,
            roles: updateData.roles || [],
            koreanEnglishGrade: updateData.koreanEnglishGrade || null,
            koreanEnglishExpiry: updateData.koreanEnglishExpiry || null,
            japaneseGrade: updateData.japaneseGrade || null,
            chineseGrade: updateData.chineseGrade || null,
          };

          await prisma.user.create({
            data: createData,
          });

          createdCount++;
          console.log(`✅ [API] 신규 사용자 생성: ${employeeId} (${name})`);
          
        } else {
          // 기존 사용자 업데이트
          
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
        }
        
        // 100행마다 진행 상황 출력
        if ((createdCount + updatedCount) % 100 === 0) {
          console.log(`📊 [API] 진행 중: 생성 ${createdCount} + 업데이트 ${updatedCount}/${dataRows.length}행 처리 완료`);
        }

      } catch (error: any) {
        console.error(`❌ [API] ${rowNumber}행 처리 실패:`, error);
        errors.push(`${rowNumber}행: ${error.message}`);
        skippedCount++;
      }
    }

    console.log(`✅ [API] 엑셀 업로드 완료: 생성 ${createdCount}, 업데이트 ${updatedCount}, 건너뜀 ${skippedCount}`);

    return NextResponse.json({
      success: true,
      message: "엑셀 파일 업로드가 완료되었습니다",
      summary: {
        total: dataRows.length,
        created: createdCount,
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


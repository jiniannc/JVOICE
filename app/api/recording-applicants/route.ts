import { NextRequest, NextResponse } from "next/server";

const SPREADSHEET_ID = "1ge3OQ5lbpuB-rjiBafg44HkcZJlNqgHY_9GzfJZ8CgM";

function formatTodayKR(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}년 ${m}월 ${d}일`;
}

// 'YYYY년 M월 D일' 또는 'YYYY년M월D일' 형태를 실제 날짜 값으로 변환
function titleToTime(title: string): number {
  const m = title.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!m) return Number.NEGATIVE_INFINITY;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  return new Date(y, mo, d).getTime();
}

function sortDateTitlesDesc(titles: string[]): string[] {
  return titles.slice().sort((a, b) => titleToTime(b) - titleToTime(a));
}

function parseBatchOrder(batchStr: string | undefined): number {
  if (!batchStr) return Number.MAX_SAFE_INTEGER;
  const match = batchStr.match(/(\d+)\s*차/);
  if (match) return parseInt(match[1], 10);
  return Number.MAX_SAFE_INTEGER;
}

function cleanName(raw: string | undefined): string {
  const s = (raw || '').toString();
  const idx = s.indexOf('[');
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google API Key 미설정" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date") || undefined;

    // 1) 시트(탭) 목록 가져오기
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties(title)&key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!metaRes.ok) {
      const text = await metaRes.text();
      return NextResponse.json({ error: `시트 메타 로드 실패: ${text}` }, { status: metaRes.status });
    }
    const meta = await metaRes.json();
    const allTitles: string[] = (meta.sheets || [])
      .map((s: any) => s.properties?.title)
      .filter(Boolean);

    // 날짜 형태의 시트만 필터 (예: 2025년8월11일 또는 2025년 8월 11일)
    const dateTitles = allTitles.filter((t) => /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(t));
    const sortedDatesDesc = sortDateTitlesDesc(dateTitles);

    // 기본 선택 날짜 결정: 요청값 → 오늘 → 가장 최근(사전순 마지막)
    const today = formatTodayKR();
    const selectedDate = requestedDate && dateTitles.includes(requestedDate)
      ? requestedDate
      : (dateTitles.includes(today) ? today : (sortedDatesDesc[0] || ""));

    if (!selectedDate) {
      return NextResponse.json({ applicants: [], dates: sortedDatesDesc, selectedDate: null });
    }

    // 2) 선택 날짜 시트에서 데이터 가져오기
    const encodedTitle = encodeURIComponent(selectedDate);
    const valuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedTitle}!A1:Z1000?key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!valuesRes.ok) {
      const text = await valuesRes.text();
      return NextResponse.json({ error: `시트 데이터 로드 실패: ${text}` }, { status: valuesRes.status });
    }
    const valuesJson = await valuesRes.json();
    const rows: string[][] = valuesJson.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ applicants: [], dates: sortedDatesDesc, selectedDate });
    }

    const header = rows[0].map((h: any) => (h || "").toString().trim());
    const findIndexFlexible = (candidates: string[], patterns: RegExp[] = []) => {
      for (const label of candidates) {
        const i = header.findIndex((h: string) => h === label);
        if (i >= 0) return i;
      }
      for (const p of patterns) {
        const i = header.findIndex((h: string) => p.test(h));
        if (i >= 0) return i;
      }
      return -1;
    };
    const idxName = findIndexFlexible(["이름"], [/이름/]);
    const idxEmp = findIndexFlexible(["사번"], [/사번/]);
    const idxEmail = findIndexFlexible(["이메일", "Email", "email"], [/이메일/i, /email/i]);
    const idxLang = findIndexFlexible([
      "교육/녹음 언어",
      "교육 / 녹음 언어",
      "녹음 언어",
      "교육 언어",
      "언어",
    ], [/언어/]);
    const idxBatch = findIndexFlexible(["차수"], [/차수/]);
    const idxStatus = findIndexFlexible(["상태"], [/상태/]);

    const dataRows = rows.slice(1).filter((r) => r.some((c) => (c || "").toString().trim() !== ""));

    let applicants = dataRows.map((r) => ({
      name: cleanName((r[idxName] || "").toString().trim()),
      employeeId: (r[idxEmp] || "").toString().trim(),
      email: (idxEmail >= 0 ? (r[idxEmail] || "").toString().trim() : ""),
      language: (r[idxLang] || "").toString().trim(),
      batch: (r[idxBatch] || "").toString().trim(),
      status: (idxStatus >= 0 ? (r[idxStatus] || "").toString().trim() : ""),
    }));

    // 상태가 있으면 신청완료만 표시
    applicants = applicants.filter((a) => a.name || a.employeeId);
    if (idxStatus >= 0) {
      applicants = applicants.filter((a) => a.status === "신청완료");
    }

    // 정렬: 차수(숫자 오름차순) → 사번 오름차순
    applicants.sort((a, b) => {
      const ba = parseBatchOrder(a.batch);
      const bb = parseBatchOrder(b.batch);
      if (ba !== bb) return ba - bb;
      return (a.employeeId || "").localeCompare(b.employeeId || "");
    });

    return NextResponse.json({
      applicants,
      dates: sortedDatesDesc,
      selectedDate,
    });
  } catch (error) {
    console.error("녹음 응시 목록 로드 실패:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}


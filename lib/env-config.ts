// 임시 환경변수 설정
export const ENV_CONFIG = {
  GOOGLE_API_KEY: "AIzaSyADJhs8QYnV6YP_NhDh2k6iLWVFErdEgus",
  GOOGLE_CLIENT_ID: "425373056451-uop5bmgk3pjgm0i0abklt9jo46um6d9a.apps.googleusercontent.com",
  SCRIPTS_FOLDER_ID: "1M6DtyV6mXGh87LYYh-U5EpPgjuzua2AM",
  RECORDINGS_FOLDER_ID: "1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF", // 수정된 폴더 ID
  SPREADSHEET_ID: "1u821kL8BFQb0Z0Y4YfpqDXw6f_geKmFe-QAw3gHeZts",
  WS_URL: "ws://localhost:3001",
}

// 환경변수 또는 설정값 반환
export function getEnvValue(key: string): string {
  const envMap: { [key: string]: string } = {
    NEXT_PUBLIC_GOOGLE_API_KEY: ENV_CONFIG.GOOGLE_API_KEY,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: ENV_CONFIG.GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_SCRIPTS_FOLDER_ID: ENV_CONFIG.SCRIPTS_FOLDER_ID,
    NEXT_PUBLIC_RECORDINGS_FOLDER_ID: ENV_CONFIG.RECORDINGS_FOLDER_ID,
    NEXT_PUBLIC_SPREADSHEET_ID: ENV_CONFIG.SPREADSHEET_ID,
    NEXT_PUBLIC_WS_URL: ENV_CONFIG.WS_URL,
  }

  return process.env[key] || envMap[key] || ""
}

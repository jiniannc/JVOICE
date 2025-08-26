# Fly.io 환경 변수 자동 설정 스크립트
# 사용법: 이 파일을 수정한 후 PowerShell에서 실행

Write-Host "🚀 Fly.io 환경 변수 설정 시작..." -ForegroundColor Green

# Fly CLI 경로
$flyctl = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Fly-io.flyctl_Microsoft.Winget.Source_8wekyb3d8bbwe\flyctl.exe"

# 환경 변수 설정 (실제 값으로 수정하세요)
$secrets = @{
    # Google OAuth
    "GOOGLE_CLIENT_ID" = "your_google_client_id_here"
    "GOOGLE_CLIENT_SECRET" = "your_google_client_secret_here"
    
    # Dropbox 설정
    "DROPBOX_APP_KEY" = "your_dropbox_app_key_here"
    "DROPBOX_APP_SECRET" = "your_dropbox_app_secret_here"
    "DROPBOX_REFRESH_TOKEN" = "your_dropbox_refresh_token_here"
    
    # Google Sheets 설정
    "GOOGLE_SHEETS_PRIVATE_KEY" = "your_google_sheets_private_key_here"
    "GOOGLE_SHEETS_CLIENT_EMAIL" = "your_google_sheets_client_email_here"
    "GOOGLE_SHEETS_SPREADSHEET_ID" = "your_google_sheets_spreadsheet_id_here"
    
    # Google Drive 설정
    "GOOGLE_DRIVE_CLIENT_ID" = "your_google_drive_client_id_here"
    "GOOGLE_DRIVE_CLIENT_SECRET" = "your_google_drive_client_secret_here"
    "GOOGLE_DRIVE_REFRESH_TOKEN" = "your_google_drive_refresh_token_here"
    "GOOGLE_DRIVE_FOLDER_ID" = "your_google_drive_folder_id_here"
}

# 환경 변수 설정
foreach ($key in $secrets.Keys) {
    $value = $secrets[$key]
    if ($value -ne "your_${key}_here" -and $value -ne "") {
        Write-Host "설정 중: $key" -ForegroundColor Yellow
        & $flyctl secrets set "$key=$value"
        Start-Sleep -Seconds 2  # API 제한 방지
    } else {
        Write-Host "건너뛰기: $key (값이 설정되지 않음)" -ForegroundColor Gray
    }
}

Write-Host "✅ 환경 변수 설정 완료!" -ForegroundColor Green
Write-Host "현재 설정된 환경 변수 확인:" -ForegroundColor Cyan
& $flyctl secrets list 
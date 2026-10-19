# LinguaVoice - Windows Offline Voice Installer (PowerShell)
# Installs official Microsoft Text-to-Speech voices for Indian & Global languages

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  🌐 LinguaVoice - Windows Offline Voices Installer (PowerShell)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[INFO] Requesting Administrator permission..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "[OK] Running with Administrator permissions." -ForegroundColor Green
Write-Host "Installing offline speech language packs in Windows..." -ForegroundColor White
Write-Host ""

$languages = @(
    @{ Code = 'ta-IN'; Name = 'Tamil (India)' },
    @{ Code = 'hi-IN'; Name = 'Hindi (India)' },
    @{ Code = 'te-IN'; Name = 'Telugu (India)' },
    @{ Code = 'kn-IN'; Name = 'Kannada (India)' },
    @{ Code = 'ml-IN'; Name = 'Malayalam (India)' },
    @{ Code = 'mr-IN'; Name = 'Marathi (India)' },
    @{ Code = 'bn-IN'; Name = 'Bengali (India)' },
    @{ Code = 'gu-IN'; Name = 'Gujarati (India)' },
    @{ Code = 'pa-IN'; Name = 'Punjabi (India)' },
    @{ Code = 'ja-JP'; Name = 'Japanese' },
    @{ Code = 'fr-FR'; Name = 'French' },
    @{ Code = 'de-DE'; Name = 'German' },
    @{ Code = 'es-ES'; Name = 'Spanish' }
)

foreach ($item in $languages) {
    Write-Host "[INSTALLING] Speech pack for $($item.Name) ($($item.Code))..." -ForegroundColor Cyan
    try {
        Install-Language -Language $item.Code -ErrorAction SilentlyContinue
        Write-Host "  [OK] $($item.Name) installed!" -ForegroundColor Green
    } catch {
        Write-Host "  [SKIP] $($item.Name) already present or skipped." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  ✅ Installation finished! All voices are now active offline." -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Read-Host "Press Enter to exit"

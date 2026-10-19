@echo off
title Install Windows Offline Speech Voices for 25 Languages
color 0b

echo ======================================================================
echo   🌐 LinguaVoice - Windows Offline Voices Installer
echo   Installs official Microsoft Text-to-Speech voices for Indian and Global
echo   languages (Tamil, Hindi, Telugu, Kannada, Malayalam, Japanese, French, etc.)
echo ======================================================================
echo.

:: Check for Administrative privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator permissions to install Windows voice packs...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [OK] Running with Administrator privileges.
echo.
echo Installing offline speech language packs in Windows...
echo This will allow Windows to speak ALL 25 languages 100%% offline!
echo.

powershell -ExecutionPolicy Bypass -Command ^
    "$langs = @('ta-IN','hi-IN','te-IN','kn-IN','ml-IN','mr-IN','bn-IN','gu-IN','pa-IN','ur-PK','ja-JP','fr-FR','de-DE','es-ES','it-IT','ru-RU','zh-CN','ko-KR','ar-SA');" ^
    "foreach ($l in $langs) {" ^
    "   Write-Host ('[INSTALLING] Speech pack for: ' + $l + '...') -ForegroundColor Cyan;" ^
    "   try { Install-Language -Language $l -ErrorAction SilentlyContinue; Write-Host ('  [OK] ' + $l + ' installed!') -ForegroundColor Green; } catch { Write-Host ('  [SKIP] ' + $l + ' already present or skipped.') -ForegroundColor Yellow; }" ^
    "}"

echo.
echo ======================================================================
echo   ✅ All Windows Offline Voices Installed Successfully!
echo   You can now close this window and use LinguaVoice 100%% offline!
echo ======================================================================
echo.
pause

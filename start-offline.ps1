# LinguaVoice - PowerShell One-Click Offline Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         🌐 LinguaVoice 25-Lingua Offline Translator Studio" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Pause
    Exit 1
}

# 2. Check Ollama
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Checking Ollama connection at 127.0.0.1:11434..." -ForegroundColor Gray
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✅ Ollama is running!" -ForegroundColor Green
        if ($res.models -and $res.models.Count -gt 0) {
            Write-Host "  📦 Installed Models:" -ForegroundColor Gray
            foreach ($m in $res.models) {
                Write-Host "     - $($m.name)" -ForegroundColor DarkCyan
            }
        } else {
            Write-Host "  ⚠️  No models installed yet in Ollama. Pull a model with: 'ollama run qwen2.5:3b'" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Ollama is not running. Starting 'ollama serve' in background..." -ForegroundColor Yellow
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "[WARNING] Ollama is not installed. You can still use the app with offline dictionary or cloud APIs." -ForegroundColor Yellow
    Write-Host "Install Ollama from https://ollama.com/ to run 100% offline LLMs." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Launching LinguaVoice Server..." -ForegroundColor Green
Write-Host "[INFO] Local Address: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Launch Browser
Start-Process "http://localhost:3000"

# Run Node server
& node server.js

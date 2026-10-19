@echo off
setlocal enabledelayedexpansion
title LinguaVoice - 25-Lingua Offline Studio

echo ======================================================================
echo          🌐 LinguaVoice 25-Lingua Offline Translator Studio
echo ======================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/ to run the offline server.
    pause
    exit /b 1
)

:: 2. Check Ollama Installation
where ollama >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Ollama is not found in your system PATH!
    echo LinguaVoice can run with built-in dictionary and cloud engines,
    echo but for full offline LLM translation, please install Ollama:
    echo https://ollama.com/download
    echo.
) else (
    echo [INFO] Checking local Ollama service...
    curl.exe -s -m 2 http://127.0.0.1:11434/api/tags >nul 2>nul
    if !ERRORLEVEL! neq 0 (
        echo [INFO] Starting Ollama in background...
        start /b "Ollama Daemon" ollama serve >nul 2>nul
        timeout /t 3 /nobreak >nul
    ) else (
        echo [OK] Ollama is active and ready.
    )
)

echo.
echo [INFO] Launching LinguaVoice Offline Server...
echo [INFO] Opening http://localhost:3000 in your browser...
echo.

:: Start browser after 1 second delay
start "" http://localhost:3000

:: Start Node Server (keeps window open)
node server.js

pause

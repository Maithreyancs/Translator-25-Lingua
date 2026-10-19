#!/usr/bin/env bash
# LinguaVoice - Linux / macOS One-Click Offline Launcher

echo "======================================================================"
echo "         🌐 LinguaVoice 25-Lingua Offline Translator Studio"
echo "======================================================================"
echo ""

# 1. Verify Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not found. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# 2. Check Ollama
if command -v ollama &> /dev/null; then
    if ! curl -s -m 2 http://127.0.0.1:11434/api/tags &> /dev/null; then
        echo "[INFO] Starting Ollama in background..."
        ollama serve > /dev/null 2>&1 &
        sleep 3
    else
        echo "[OK] Ollama is active and ready."
    fi
else
    echo "[WARNING] Ollama is not installed. For offline LLM translation, install from https://ollama.com/"
fi

echo ""
echo "[INFO] Starting LinguaVoice server on http://localhost:3000..."

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" &
elif command -v open &> /dev/null; then
    open "http://localhost:3000" &
fi

node server.js

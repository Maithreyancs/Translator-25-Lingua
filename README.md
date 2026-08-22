# LinguaVoice - Multilingual Sentence Translator & Voice Playback

> **Translate. Listen. Understand.**  
> A modular, accessible web application providing real-time multilingual sentence translation and natural voice synthesis across 25+ global and regional languages.

---

## 🌟 Overview

**LinguaVoice** enables users to input sentences via text or microphone voice dictation, translate them with high linguistic fidelity into over 25 languages (including Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi, Urdu, Arabic, French, German, Spanish, Japanese, Chinese, and Korean), and immediately play back the translated sentence in natural human-sounding audio using the browser's native **Web Speech API**.

Unlike basic demonstration translators, the language selection in LinguaVoice is **functionally bound** to both the translation engine and the speech synthesizer's locale parameters, ensuring authentic text output and correct pronunciation.

---

## ✨ Key Features

- **🌐 25+ Supported Languages**: Complete support for Indic regional languages, East Asian languages, Middle Eastern languages, and European languages.
- **⚡ Dual-Provider Resilient Translation**: Primary Google GTX neural translation pipeline with automatic fallback to MyMemory API and an offline phrasebook.
- **🎙️ Real Text-to-Speech (TTS)**: Native speech synthesis using `window.speechSynthesis` with intelligent voice matching and locale mapping.
- **🎛️ Comprehensive Voice Controls**:
  - 🔊 Play / Pause / Resume / Stop / Replay
  - ⚡ Speed Slider (0.5x, 1.0x, 1.5x, 2.0x) with real-time display
  - 🎵 Voice Pitch Adjustment (0.5 to 1.5)
  - 🗣️ Dynamic Voice Selection dropdown populated per target language
- **🎤 Voice Input (Speech-to-Text)**: Dictate sentences directly into the translation box using browser speech recognition.
- **📜 Translation History**: Stores recent translations in `localStorage` (up to 20 items) with single-click replay, copy, and deletion.
- **⭐ Saved Favorites**: Star important translations to preserve them in a dedicated favorites list.
- **📋 Non-intrusive Copy Feedback**: Instant copy to clipboard with toast notifications and button state changes.
- **⇄ Language Swapping**: One-click bidirectional language swap with smooth rotation animation.
- **📱 Fully Responsive Design**: Seamlessly adapts across Desktop, Laptop, Tablet, and Mobile viewports.
- **♿ Accessible Architecture**: High contrast, ARIA landmarks, polite status announcements, and full keyboard navigation.

---

## 📁 Project Structure

```
multilingual-translator/
│
├── index.html                  # Main Application Entrypoint & Studio
│
├── pages/
│   ├── about.html              # Project Architecture & Documentation
│   └── history.html            # Dedicated History & Favorites Manager
│
├── css/
│   ├── style.css               # Core design tokens, typography, layout
│   ├── components.css          # Cards, buttons, sliders, toasts, badges
│   └── responsive.css          # Responsive breakpoints for mobile/tablet/desktop
│
├── js/
│   ├── languages.js            # Central catalog of 25+ supported languages
│   ├── speech.js               # Web Speech API engine (TTS & Voice Input)
│   ├── translator.js           # Translation orchestration controller
│   ├── history.js              # LocalStorage history manager (max 20)
│   ├── favorites.js            # LocalStorage favorites manager
│   ├── ui.js                   # DOM rendering, toasts, copy feedback
│   └── app.js                  # Main coordinator & keyboard shortcuts
│
├── services/
│   └── translationService.js   # Multi-tier translation API client
│
├── package.json                # Project metadata and npm scripts
└── README.md                   # Complete documentation
```

---

## 🌍 Supported Languages Matrix

| Flag | Language Name | Native Name | Code | Speech Code | Region |
|---|---|---|---|---|---|
| 🇮🇳 | **Tamil** | தமிழ் | `ta` | `ta-IN` | India / Sri Lanka |
| 🇮🇳 | **Hindi** | हिन्दी | `hi` | `hi-IN` | India |
| 🇺🇸 | **English** | English | `en` | `en-US` | Global |
| 🇮🇳 | **Telugu** | తెలుగు | `te` | `te-IN` | India |
| 🇮🇳 | **Kannada** | ಕನ್ನಡ | `kn` | `kn-IN` | India |
| 🇮🇳 | **Malayalam** | മലയാളം | `ml` | `ml-IN` | India |
| 🇮🇳 | **Bengali** | বাংলা | `bn` | `bn-IN` | India / Bangladesh |
| 🇮🇳 | **Marathi** | मराठी | `mr` | `mr-IN` | India |
| 🇮🇳 | **Gujarati** | ગુજરાતી | `gu` | `gu-IN` | India |
| 🇮🇳 | **Punjabi** | ਪੰਜਾਬੀ | `pa` | `pa-IN` | India / Pakistan |
| 🇵🇰 | **Urdu** | اردو | `ur` | `ur-PK` | Pakistan / India |
| 🇸🇦 | **Arabic** | العربية | `ar` | `ar-SA` | Middle East (RTL) |
| 🇫🇷 | **French** | Français | `fr` | `fr-FR` | France / Global |
| 🇩🇪 | **German** | Deutsch | `de` | `de-DE` | Germany / Europe |
| 🇪🇸 | **Spanish** | Español | `es` | `es-ES` | Spain / Latin America |
| 🇮🇹 | **Italian** | Italiano | `it` | `it-IT` | Italy |
| 🇧🇷 | **Portuguese** | Português | `pt` | `pt-BR` | Brazil / Portugal |
| 🇷🇺 | **Russian** | Русский | `ru` | `ru-RU` | Russia |
| 🇨🇳 | **Chinese (Simplified)** | 中文 (简体) | `zh-CN` | `zh-CN` | China |
| 🇯🇵 | **Japanese** | 日本語 | `ja` | `ja-JP` | Japan |
| 🇰🇷 | **Korean** | 한국어 | `ko` | `ko-KR` | South Korea |
| 🇹🇷 | **Turkish** | Türkçe | `tr` | `tr-TR` | Turkey |
| 🇳🇱 | **Dutch** | Nederlands | `nl` | `nl-NL` | Netherlands |
| 🇻🇳 | **Vietnamese** | Tiếng Việt | `vi` | `vi-VN` | Vietnam |
| 🇮🇩 | **Indonesian** | Bahasa Indonesia | `id` | `id-ID` | Indonesia |

---

## 🛠️ How Translation Works

1. **Input & Validation**: `TranslatorController` validates sentence length (max 1000 characters) and prevents empty requests.
2. **Multi-tier Translation Pipeline**:
   - **Tier 1 (Google GTX Endpoint)**: Directly calls Google's fast translation endpoint (`translate.googleapis.com/translate_a/single?client=gtx&sl=...&tl=...`). Concatenates multi-chunk sentences and returns language detection metadata.
   - **Tier 2 (MyMemory Translated API)**: If Tier 1 experiences rate limits or network issues, LinguaVoice automatically falls back to MyMemory API (`api.mymemory.translated.net`).
   - **Tier 3 (Offline Phrasebook)**: If offline, common greetings and phrases are resolved locally from an internal dictionary.
3. **Session Caching**: Cached in memory to ensure instantaneous response times on repeated queries.
4. **History & UI Dispatch**: Successful translations are saved to `localStorage` and sent to the speech subsystem.

---

## 🗣️ How Text-to-Speech (TTS) Works

1. **Engine Initialization**: `SpeechEngine` binds to `window.speechSynthesis` and listens for `onvoiceschanged`.
2. **Voice Matching Algorithm**:
   - Matches target locale (e.g. `ta-IN` for Tamil).
   - If no exact regional match exists on the host OS, matches by language prefix (e.g. `ta`).
   - If no local voice pack is installed, explicitly sets `utterance.lang = speechCode` so the browser invokes online TTS or default speech engines.
3. **Voice Controls & Playback**:
   - Configures `SpeechSynthesisUtterance` with customizable `rate` (0.5x–2.0x), `pitch`, `volume`, and selected voice.
   - Real-time animated waveform displays while audio is active.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> / <kbd>Cmd</kbd> + <kbd>Enter</kbd> | **Translate & Speak** (Translates and plays speech immediately) |
| <kbd>Alt</kbd> + <kbd>P</kbd> | **Play / Pause / Resume** speech audio |
| <kbd>Alt</kbd> + <kbd>S</kbd> | **Stop** speech playback |
| <kbd>Alt</kbd> + <kbd>X</kbd> | **Swap** source and target languages |
| <kbd>Alt</kbd> + <kbd>C</kbd> | **Clear** input text box |

---

## 🚀 How to Run the Project

### Option 1: Direct Browser Execution (No Installation Required)
Simply open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari).

### Option 2: Using Node / Local Server
```bash
# Start local development server
npx serve .
# Open http://localhost:3000
```

### Option 3: Python Built-in Server
```bash
python -m http.server 8000
# Open http://localhost:8000
```

---

## 🔑 API Configuration & Keys

**No API keys are required to use LinguaVoice out of the box!**  
The built-in multi-tier translation pipeline works freely without registration.

*Optional Custom API Setup*:  
If you wish to connect your own private LibreTranslate or Google Cloud Translation API instance:
```javascript
localStorage.setItem('linguavoice_custom_api_key', 'YOUR_API_KEY');
localStorage.setItem('linguavoice_custom_api_url', 'https://your-custom-translation-endpoint.com/translate');
```

---

## 🧪 Verification & Test Cases

1. **Test 1: English → Tamil**
   - *Input*: `"Hello, how are you?"`
   - *Target*: `Tamil (ta)`
   - *Expected Output*: `"வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?"`
   - *Audio*: Plays in Tamil (`ta-IN`) voice.

2. **Test 2: English → Hindi**
   - *Input*: `"Good morning, have a nice day."`
   - *Target*: `Hindi (hi)`
   - *Expected Output*: `"शुभ प्रभात, आपका दिन अच्छा रहे।"`
   - *Audio*: Plays in Hindi (`hi-IN`) voice.

3. **Test 3: English → Telugu**
   - *Input*: `"Welcome to our application."`
   - *Target*: `Telugu (te)`
   - *Expected Output*: `"మా అప్లికేషన్‌కు స్వాగతం."`
   - *Audio*: Plays in Telugu (`te-IN`) voice.

4. **Test 4: English → Malayalam**
   - *Input*: `"Thank you very much."`
   - *Target*: `Malayalam (ml)`
   - *Expected Output*: `"വളരെ നന്ദി."`
   - *Audio*: Plays in Malayalam (`ml-IN`) voice.

5. **Test 5: English → Japanese**
   - *Input*: `"Nice to meet you."`
   - *Target*: `Japanese (ja)`
   - *Expected Output*: `"はじめまして。"` / `"お会いできて嬉しいです。"`
   - *Audio*: Plays in Japanese (`ja-JP`) voice.

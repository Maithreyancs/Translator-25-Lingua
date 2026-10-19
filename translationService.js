/**
 * LinguaVoice - Translation Service
 * Multi-tier translation pipeline with Google Client5, Google GTX,
 * MyMemory API, Lingva API, automatic Unicode script detection,
 * and bidirectional multi-language dictionary.
 */

class TranslationService {
    constructor() {
        const getStorage = (k, def = '') => {
            try { return typeof localStorage !== 'undefined' ? (localStorage.getItem(k) ?? def) : def; } catch (e) { return def; }
        };
        this.cache = new Map();
        this.timeoutMs = 6000;
        this.customApiKey = getStorage('linguavoice_custom_api_key', '');
        this.customApiUrl = getStorage('linguavoice_custom_api_url', '');
        
        // Ollama Offline LLM Settings
        this.ollamaEnabled = getStorage('linguavoice_ollama_enabled', 'true') !== 'false';
        this.ollamaModel = getStorage('linguavoice_ollama_model', 'qwen2.5:1.5b');
        this.strictOfflineMode = getStorage('linguavoice_strict_offline', 'false') === 'true';

        // Build bidirectional multi-language lookup dictionary
        this.offlineDictionary = this._initComprehensiveDictionary();
    }

    /**
     * Check if Ollama is accessible and list models
     * @returns {Promise<{running: boolean, models: string[]}>}
     */
    async checkOllamaStatus() {
        const endpoints = ['/api/ollama/status', 'http://127.0.0.1:11434/api/tags'];
        for (const ep of endpoints) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 2000);
                const res = await fetch(ep, { signal: controller.signal });
                clearTimeout(timer);
                if (res.ok) {
                    const data = await res.json();
                    const models = (data.models || []).map(m => typeof m === 'string' ? m : m.name);
                    return { running: true, models, endpoint: ep };
                }
            } catch (e) {
                // try next
            }
        }
        return { running: false, models: [] };
    }

    /**
     * Provider 0: Local LLM via Ollama
     */
    async _translateWithOllama(text, sourceLang, targetLang, resolvedSource) {
        const sourceObj = typeof getLanguageByCode === 'function' ? getLanguageByCode(resolvedSource) : null;
        const targetObj = typeof getLanguageByCode === 'function' ? getLanguageByCode(targetLang) : null;
        
        const sourceName = sourceObj ? sourceObj.name : resolvedSource;
        const targetName = targetObj ? targetObj.name : targetLang;

        const maxTokens = Math.max(30, Math.min(100, Math.ceil(text.length * 2.5)));

        // Use Chat format (matches Qwen 2.5 ChatML natively for maximum accuracy and zero preamble)
        const chatBody = {
            model: this.ollamaModel || 'qwen2.5:1.5b',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional multilingual translator. Translate directly from ${sourceName} into ${targetName}. Output ONLY the translated sentence in ${targetName}. Do NOT include pronunciation, English text, or explanation.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            stream: false,
            options: {
                temperature: 0.1,
                top_p: 0.8,
                num_predict: maxTokens,
                num_ctx: 512,
                num_thread: 4,
                stop: ['<|im_end|>', '<|endoftext|>']
            }
        };

        const endpoints = [
            '/api/ollama/chat',
            'http://127.0.0.1:11434/api/chat',
            '/api/ollama/generate',
            'http://127.0.0.1:11434/api/generate'
        ];

        let lastErr = null;
        for (const ep of endpoints) {
            try {
                const isChat = ep.includes('/chat');
                const reqBody = isChat ? chatBody : {
                    model: this.ollamaModel || 'qwen2.5:1.5b',
                    prompt: `Translate directly to ${targetName}.\n${sourceName}: ${text}\n${targetName}:`,
                    stream: false,
                    options: chatBody.options
                };

                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 18000); // 18s allows cold load
                const res = await fetch(ep, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqBody),
                    signal: controller.signal
                });
                clearTimeout(timer);

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();
                let output = (isChat && data.message ? data.message.content : data.response) || '';
                output = output.trim();

                // Clean reasoning/thinking tags
                output = output.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                
                // Strip conversational preambles and prefix tags
                const prefixRegex = new RegExp(`^(${targetName}|${targetObj ? targetObj.name : ''}|translation|translated text):\\s*`, 'i');
                output = output.replace(prefixRegex, '').trim();
                
                // Remove outer quotes if wrapped in quotes
                if ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith('\'') && output.endsWith('\''))) {
                    output = output.slice(1, -1).trim();
                }

                if (output) {
                    return {
                        translatedText: output,
                        detectedSourceLang: resolvedSource,
                        provider: 'ollama',
                        model: this.ollamaModel
                    };
                }
            } catch (err) {
                lastErr = err;
            }
        }

        throw lastErr || new Error('Ollama translation failed');
    }

    /**
     * Detect probable language from text character unicode ranges
     * @param {string} text 
     * @returns {string} Language code e.g. 'ta', 'hi', 'te', 'ml', 'ja', 'zh-CN', 'ar', 'ru', 'en'
     */
    detectScriptLanguage(text) {
        if (!text) return 'en';

        // Tamil Unicode range (0B80-0BFF)
        if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
        // Telugu Unicode range (0C00-0C7F)
        if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
        // Kannada Unicode range (0C80-0CFF)
        if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
        // Malayalam Unicode range (0D00-0D7F)
        if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
        // Bengali Unicode range (0980-09FF)
        if (/[\u0980-\u09FF]/.test(text)) return 'bn';
        // Gujarati Unicode range (0A80-0AFF)
        if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
        // Punjabi / Gurmukhi (0A00-0A7F)
        if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
        // Devanagari (Hindi / Marathi) (0900-097F)
        if (/[\u0900-\u097F]/.test(text)) return 'hi';
        // Arabic / Urdu (0600-06FF, 0750-077F)
        if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
            if (/[\u0679\u0686\u0688\u0691\u06BA\u06BE\u06C1\u06D2]/.test(text)) return 'ur';
            return 'ar';
        }
        // Japanese (Hiragana / Katakana)
        if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
        // Korean (Hangul)
        if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return 'ko';
        // Chinese (Hanzi / CJK)
        if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN';
        // Russian / Cyrillic
        if (/[\u0400-\u04FF]/.test(text)) return 'ru';
        // French accents
        if (/\b(le|la|les|un|une|des|bonjour|merci|comment|vous|avec|pour)\b/i.test(text) || /[éèêëàâôûùïîç]/.test(text)) {
            return 'fr';
        }
        // Spanish accents & words
        if (/\b(el|la|los|las|un|una|hola|gracias|cómo|estás|por|para)\b/i.test(text) || /[ñáéíóú¿¡]/.test(text)) {
            return 'es';
        }
        // German words & umlauts
        if (/\b(der|die|das|ein|eine|hallo|danke|guten|morgen|wie|geht)\b/i.test(text) || /[äöüß]/.test(text)) {
            return 'de';
        }
        // Italian
        if (/\b(il|lo|la|i|gli|le|ciao|grazie|come|stai|buongiorno)\b/i.test(text)) {
            return 'it';
        }

        return 'en';
    }

    /**
     * Main translation entry point
     * @param {string} text - Text to translate (in ANY language)
     * @param {string} sourceLang - Source language code or 'auto'
     * @param {string} targetLang - Target language code
     * @returns {Promise<{translatedText: string, detectedSourceLang: string, provider: string, model?: string}>}
     */
    async translate(text, sourceLang = 'auto', targetLang = 'ta') {
        const trimmed = (text || '').trim();
        if (!trimmed) {
            throw new Error('Please enter text to translate.');
        }

        // Auto detect script if source is auto
        const detectedScriptLang = this.detectScriptLanguage(trimmed);
        const resolvedSource = sourceLang === 'auto' ? detectedScriptLang : sourceLang;

        // Check if source equals target
        if (resolvedSource === targetLang) {
            return {
                translatedText: trimmed,
                detectedSourceLang: resolvedSource,
                provider: 'identity'
            };
        }

        // Cache Key
        const cacheKey = `${this.ollamaEnabled ? 'ollama:' + this.ollamaModel + ':' : ''}${sourceLang}(${resolvedSource})->${targetLang}:${trimmed}`;
        if (this.cache.has(cacheKey)) {
            return {
                ...this.cache.get(cacheKey),
                cached: true
            };
        }

        let lastError = null;

        // 0. Primary Provider: Local LLM via Ollama (When Enabled)
        if (this.ollamaEnabled) {
            try {
                const ollamaResult = await this._translateWithOllama(trimmed, sourceLang, targetLang, resolvedSource);
                if (ollamaResult && ollamaResult.translatedText) {
                    this.cache.set(cacheKey, ollamaResult);
                    return ollamaResult;
                }
            } catch (err) {
                console.warn('Ollama local LLM failed:', err);
                lastError = err;
            }
        }

        // Check if device is offline (Wi-Fi disconnected or Strict Offline)
        const isOffline = this.strictOfflineMode || (typeof navigator !== 'undefined' && navigator.onLine === false);
        if (isOffline) {
            const offlineDict = this._lookupOffline(trimmed, resolvedSource, targetLang);
            if (offlineDict) {
                return {
                    translatedText: offlineDict,
                    detectedSourceLang: resolvedSource,
                    provider: 'smart-dictionary'
                };
            }
            throw new Error(`Offline Mode: Local LLM (${this.ollamaModel}) was unreachable. Please verify Ollama is running ('ollama serve').`);
        }

        // 1. Google Translate Client5 API (High reliability, CORS friendly)
        try {
            const client5Result = await this._translateWithGoogleClient5(trimmed, sourceLang, targetLang, resolvedSource);
            if (client5Result && client5Result.translatedText) {
                this.cache.set(cacheKey, client5Result);
                return client5Result;
            }
        } catch (err) {
            console.warn('Google Client5 provider failed, trying Google GTX:', err);
            lastError = err;
        }

        // 2. Google Translate GTX Endpoint
        try {
            const gtxResult = await this._translateWithGoogleGtx(trimmed, sourceLang, targetLang, resolvedSource);
            if (gtxResult && gtxResult.translatedText) {
                this.cache.set(cacheKey, gtxResult);
                return gtxResult;
            }
        } catch (err) {
            console.warn('Google GTX provider failed, trying MyMemory:', err);
            lastError = err;
        }

        // 3. MyMemory Translated API
        try {
            const myMemoryResult = await this._translateWithMyMemory(trimmed, resolvedSource, targetLang);
            if (myMemoryResult && myMemoryResult.translatedText) {
                this.cache.set(cacheKey, myMemoryResult);
                return myMemoryResult;
            }
        } catch (err) {
            console.warn('MyMemory provider failed, trying Lingva:', err);
            lastError = err;
        }

        // 4. Lingva Public API Endpoint
        try {
            const lingvaResult = await this._translateWithLingva(trimmed, sourceLang, targetLang, resolvedSource);
            if (lingvaResult && lingvaResult.translatedText) {
                this.cache.set(cacheKey, lingvaResult);
                return lingvaResult;
            }
        } catch (err) {
            console.warn('Lingva provider failed, checking dictionary:', err);
            lastError = err;
        }

        // 5. Smart Multi-Language Dictionary Lookup (Bidirectional across all languages)
        const offlineResult = this._lookupOffline(trimmed, resolvedSource, targetLang);
        if (offlineResult) {
            return {
                translatedText: offlineResult,
                detectedSourceLang: resolvedSource,
                provider: 'smart-dictionary'
            };
        }

        // If all network providers failed and no dictionary match
        throw new Error(
            lastError 
                ? `Translation service error: ${lastError.message}.` 
                : 'Unable to translate sentence. Please check your Ollama or internet connection.'
        );
    }

    /**
     * Provider 1: Google Translate Client5 API
     */
    async _translateWithGoogleClient5(text, sourceLang, targetLang, resolvedSource) {
        const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
        const tl = targetLang;
        const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            let translated = '';
            if (Array.isArray(data)) {
                if (typeof data[0] === 'string') {
                    translated = data.join(' ');
                } else if (Array.isArray(data[0]) && typeof data[0][0] === 'string') {
                    translated = data.map(item => Array.isArray(item) ? item[0] : item).join(' ');
                }
            } else if (data && data.sentences) {
                translated = data.sentences.map(s => s.trans).join('');
            }

            if (translated.trim()) {
                return {
                    translatedText: translated.trim(),
                    detectedSourceLang: resolvedSource || 'en',
                    provider: 'google-client5'
                };
            }

            throw new Error('Empty response from Google Client5');
        } catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }

    /**
     * Provider 2: Google GTX Endpoint
     */
    async _translateWithGoogleGtx(text, sourceLang, targetLang, resolvedSource) {
        const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
        const tl = targetLang;
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data || !Array.isArray(data) || !data[0]) {
                throw new Error('Invalid structure from Google GTX');
            }

            let fullTranslation = '';
            for (const chunk of data[0]) {
                if (chunk && chunk[0]) {
                    fullTranslation += chunk[0];
                }
            }

            const detectedSource = data[2] || resolvedSource || (sourceLang === 'auto' ? 'en' : sourceLang);

            if (fullTranslation.trim()) {
                return {
                    translatedText: fullTranslation.trim(),
                    detectedSourceLang: detectedSource,
                    provider: 'google-gtx'
                };
            }

            throw new Error('Empty translation from Google GTX');
        } catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }

    /**
     * Provider 3: MyMemory API
     */
    async _translateWithMyMemory(text, sourceLang, targetLang) {
        const sl = sourceLang || 'en';
        const tl = targetLang;
        const pair = `${sl}|${tl}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data && data.responseData && data.responseData.translatedText) {
                let trans = data.responseData.translatedText;
                trans = this._decodeHtmlEntities(trans);

                if (trans.startsWith('MYMEMORY WARNING:') || trans.startsWith('QUERY LENGTH LIMIT EXCEEDED')) {
                    throw new Error('MyMemory quota exceeded');
                }

                return {
                    translatedText: trans.trim(),
                    detectedSourceLang: sl,
                    provider: 'mymemory'
                };
            }

            throw new Error('Invalid MyMemory response');
        } catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }

    /**
     * Provider 4: Lingva Public API
     */
    async _translateWithLingva(text, sourceLang, targetLang, resolvedSource) {
        const sl = sourceLang === 'auto' ? (resolvedSource || 'en') : sourceLang;
        const tl = targetLang;
        const url = `https://lingva.ml/api/v1/${encodeURIComponent(sl)}/${encodeURIComponent(tl)}/${encodeURIComponent(text)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data && data.translation) {
                return {
                    translatedText: data.translation.trim(),
                    detectedSourceLang: data.info?.detectedSource || sl,
                    provider: 'lingva'
                };
            }

            throw new Error('Empty Lingva response');
        } catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }

    /**
     * Bidirectional offline dictionary lookup supporting input in ANY language!
     */
    _lookupOffline(text, sourceLang, targetLang) {
        const normalized = text.toLowerCase().trim().replace(/[.,!?;:"]/g, '');

        // 1. Direct index lookup in the multi-language dictionary
        if (this.offlineDictionary[normalized]) {
            const entry = this.offlineDictionary[normalized];
            if (entry[targetLang]) {
                return entry[targetLang];
            }
        }

        // 2. Reverse search through all concepts if user typed in Tamil, Hindi, Japanese, etc.
        for (const conceptKey in this.rawConcepts) {
            const translations = this.rawConcepts[conceptKey];
            for (const langCode in translations) {
                const phraseInLang = translations[langCode].toLowerCase().trim().replace(/[.,!?;:"]/g, '');
                if (phraseInLang === normalized) {
                    if (translations[targetLang]) {
                        return translations[targetLang];
                    }
                }
            }
        }

        return null;
    }

    _decodeHtmlEntities(text) {
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        return txt.value;
    }

    _initComprehensiveDictionary() {
        this.rawConcepts = {
            'hello': {
                'en': 'Hello',
                'ta': 'வணக்கம்',
                'hi': 'नमस्ते',
                'te': 'నమస్కారం',
                'kn': 'ನಮಸ್ಕಾರ',
                'ml': 'നമസ്കാരം',
                'bn': 'নমস্কার',
                'mr': 'नमस्कार',
                'gu': 'નમસ્તે',
                'pa': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ',
                'ur': 'السلام علیکم',
                'ar': 'مرحبا',
                'fr': 'Bonjour',
                'de': 'Hallo',
                'es': 'Hola',
                'it': 'Ciao',
                'pt': 'Olá',
                'ru': 'Здравствуйте',
                'zh-CN': '你好',
                'ja': 'こんにちは',
                'ko': '안녕하세요',
                'tr': 'Merhaba',
                'nl': 'Hallo',
                'vi': 'Xin chào',
                'id': 'Halo'
            },
            'how are you': {
                'en': 'How are you?',
                'ta': 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
                'hi': 'आप कैसे हैं?',
                'te': 'మీరు ఎలా ఉన్నారు?',
                'kn': 'ನೀವು ಹೇಗಿದ್ದೀರಿ?',
                'ml': 'സുഖമാണോ?',
                'bn': 'আপনি কেমন আছেন?',
                'mr': 'तुम्ही कसे आहात?',
                'gu': 'તમે કેમ છો?',
                'pa': 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?',
                'ur': 'آپ کیسے ہیں؟',
                'ar': 'كيف حالك؟',
                'fr': 'Comment allez-vous ?',
                'de': 'Wie geht es Ihnen?',
                'es': '¿Cómo estás?',
                'it': 'Come stai?',
                'pt': 'Como você está?',
                'ru': 'Как ваши дела?',
                'zh-CN': '你好吗？',
                'ja': 'お元気ですか？',
                'ko': '어떻게 지내세요?',
                'tr': 'Nasılsınız?',
                'nl': 'Hoe gaat het met u?',
                'vi': 'Bạn khỏe không?',
                'id': 'Bagaimana kabar Anda?'
            },
            'hello how are you': {
                'en': 'Hello, how are you?',
                'ta': 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?',
                'hi': 'नमस्ते, आप कैसे हैं?',
                'te': 'నమస్కారం, మీరు ఎలా ఉన్నారు?',
                'kn': 'ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?',
                'ml': 'നമസ്കാരം, സുഖമാണോ?',
                'bn': 'নমস্কার, আপনি কেমন আছেন?',
                'mr': 'नमस्कार, तुम्ही कसे आहात?',
                'gu': 'નમસ્તે, તમે કેમ છો?',
                'pa': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?',
                'ur': 'السلام علیکم، آپ کیسے ہیں؟',
                'ar': 'مرحبا، كيف حالك؟',
                'fr': 'Bonjour, comment allez-vous ?',
                'de': 'Hallo, wie geht es Ihnen?',
                'es': 'Hola, ¿cómo estás?',
                'it': 'Ciao, come stai?',
                'pt': 'Olá, como você está?',
                'ru': 'Здравствуйте, как ваши дела?',
                'zh-CN': '你好，你好吗？',
                'ja': 'こんにちは、お元気ですか？',
                'ko': '안녕하세요, 어떻게 지내세요?',
                'tr': 'Merhaba, nasılsınız?',
                'nl': 'Hallo, hoe gaat het met u?',
                'vi': 'Xin chào, bạn khỏe không?',
                'id': 'Halo, bagaimana kabar Anda?'
            },
            'good morning': {
                'en': 'Good morning',
                'ta': 'காலை வணக்கம்',
                'hi': 'शुभ प्रभात',
                'te': 'శుభోదయం',
                'kn': 'ಶುಭೋದಯ',
                'ml': 'സുപ്രഭാതം',
                'bn': 'সুপ্রভাত',
                'mr': 'शुभ प्रभात',
                'gu': 'શુભ સવાર',
                'pa': 'ਸ਼ੁਭ ਸਵੇਰ',
                'ur': 'صبح بخیر',
                'ar': 'صباح الخير',
                'fr': 'Bonjour',
                'de': 'Guten Morgen',
                'es': 'Buenos días',
                'it': 'Buongiorno',
                'pt': 'Bom dia',
                'ru': 'Доброе утро',
                'zh-CN': '早上好',
                'ja': 'おはようございます',
                'ko': '좋은 아침입니다',
                'tr': 'Günaydın',
                'nl': 'Goedemorgen',
                'vi': 'Chào buổi sáng',
                'id': 'Selamat pagi'
            },
            'good morning how are you': {
                'en': 'Good morning, how are you?',
                'ta': 'காலை வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?',
                'hi': 'शुभ प्रभात, आप कैसे हैं?',
                'te': 'శుభోదయం, మీరు ఎలా ఉన్నారు?',
                'kn': 'ಶುಭೋದಯ, ನೀವು ಹೇಗಿದ್ದೀರಿ?',
                'ml': 'സുപ്രഭാതം, സുഖമാണോ?',
                'bn': 'সুপ্রভাত, আপনি কেমন আছেন?',
                'mr': 'शुभ प्रभात, तुम्ही कसे आहात?',
                'gu': 'શુભ સવાર, તમે કેમ છો?',
                'pa': 'ਸ਼ੁਭ ਸਵੇਰ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?',
                'ur': 'صبح بخیر، آپ کیسے ہیں؟',
                'ar': 'صباح الخير، كيف حالك؟',
                'fr': 'Bonjour, comment allez-vous ?',
                'de': 'Guten Morgen, wie geht es Ihnen?',
                'es': 'Buenos días, ¿cómo estás?',
                'it': 'Buongiorno, come stai?',
                'pt': 'Bom dia, como você está?',
                'ru': 'Доброе утро, как ваши дела?',
                'zh-CN': '早上好，你好吗？',
                'ja': 'おはようございます、お元気ですか？',
                'ko': '좋은 아침입니다, 어떻게 지내세요?',
                'tr': 'Günaydın, nasılsınız?',
                'nl': 'Goedemorgen, hoe gaat het met u?',
                'vi': 'Chào buổi sáng, bạn khỏe không?',
                'id': 'Selamat pagi, bagaimana kabar Anda?'
            },
            'good morning have a nice day': {
                'en': 'Good morning, have a nice day.',
                'ta': 'காலை வணக்கம், நல்ல நாளாக அமையட்டும்.',
                'hi': 'शुभ प्रभात, आपका दिन अच्छा रहे।',
                'te': 'శుభోదయం, మీకు మంచి రోజు కావాలని కోరుకుంటున్నాను.',
                'kn': 'ಶುಭೋದಯ, ಒಳ್ಳೆಯ ದಿನವಾಗಲಿ.',
                'ml': 'സുപ്രഭാതം, നല്ലൊരു ദിനം ആശംസിക്കുന്നു.',
                'bn': 'সুপ্রভাত, আপনার দিনটি ভালো কাটুক।',
                'mr': 'शुभ प्रभात, तुमचा दिवस चांगला जावो.',
                'gu': 'શુભ સવાર, તમારો દિવસ સારો રહે.',
                'pa': 'ਸ਼ੁਭ ਸਵੇਰ, ਤੁਹਾਡਾ ਦਿਨ ਵਧੀਆ ਰਹੇ।',
                'ur': 'صبح بخیر، آپ کا دن اچھا گزرے۔',
                'ar': 'صباح الخير، أتمنى لك يوما جميلا.',
                'fr': 'Bonjour, passez une bonne journée.',
                'de': 'Guten Morgen, einen schönen Tag noch.',
                'es': 'Buenos días, que tengas un buen día.',
                'it': 'Buongiorno, buona giornata.',
                'pt': 'Bom dia, tenha um bom dia.',
                'ru': 'Доброе утро, хорошего дня.',
                'zh-CN': '早上好，祝你有美好的一天。',
                'ja': 'おはようございます、良い一日をお過ごしください。',
                'ko': '좋은 아침입니다, 좋은 하루 되세요.'
            },
            'welcome to our application': {
                'en': 'Welcome to our application.',
                'ta': 'எங்கள் பயன்பாட்டிற்கு வரவேற்கிறோம்.',
                'hi': 'हमारे एप्लिकेशन में आपका स्वागत है।',
                'te': 'మా అప్లికేషన్‌కు స్వాగతం.',
                'kn': 'ನಮ್ಮ ಅಪ್ಲಿಕೇಶನ್‌ಗೆ ಸುಸ್ವಾಗತ.',
                'ml': 'ഞങ്ങളുടെ ആപ്ലിക്കേഷനിലേക്ക് സ്വാഗതം.',
                'bn': 'আমাদের অ্যাপ্লিকেশনে স্বাগতম।',
                'mr': 'आमच्या ॲप्लिकेशनमध्ये आपले स्वागत आहे.',
                'gu': 'અમારી એપ્લિકેશનમાં આપનું સ્વાગત છે.',
                'pa': 'ਸਾਡੀ ਐਪਲੀਕੇਸ਼ਨ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ।',
                'ur': 'ہماری ایپلیکیشن میں خوش آمدید۔',
                'ar': 'مرحبا بكم في تطبيقنا.',
                'fr': 'Bienvenue dans notre application.',
                'de': 'Willkommen in unserer Anwendung.',
                'es': 'Bienvenido a nuestra aplicación.',
                'it': 'Benvenuto nella nostra applicazione.',
                'pt': 'Bem-vindo ao nosso aplicativo.',
                'ru': 'Добро пожаловать в наше приложение.',
                'zh-CN': '欢迎使用我们的应用程序。',
                'ja': '私たちのアプリケーションへようこそ。',
                'ko': '저희 애플리케이션에 오신 것을 환영합니다.'
            },
            'thank you very much': {
                'en': 'Thank you very much.',
                'ta': 'மிக்க நன்றி.',
                'hi': 'बहुत बहुत धन्यवाद।',
                'te': 'చాలా ధన్యవాదాలు.',
                'kn': 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು.',
                'ml': 'വളരെ നന്ദി.',
                'bn': 'আপনাকে অনেক ধন্যবাদ।',
                'mr': 'खूप खूप धन्यवाद.',
                'gu': 'ખૂબ ખૂબ આભાર.',
                'pa': 'ਬਹੁਤ ਬਹੁਤ ਧੰਨਵਾਦ।',
                'ur': 'بہت بہت شکریہ۔',
                'ar': 'شكرا جزيلا لك.',
                'fr': 'Merci beaucoup.',
                'de': 'Vielen Dank.',
                'es': 'Muchas gracias.',
                'it': 'Grazie mille.',
                'pt': 'Muito obrigado.',
                'ru': 'Большое спасибо.',
                'zh-CN': '非常感谢。',
                'ja': 'どうもありがとうございます。',
                'ko': '정말 감사합니다.'
            },
            'nice to meet you': {
                'en': 'Nice to meet you.',
                'ta': 'உங்களை சந்தித்ததில் மகிழ்ச்சி.',
                'hi': 'आपसे मिलकर अच्छा लगा।',
                'te': 'మిమ్మల్ని కలవడం ఆనందంగా ఉంది.',
                'kn': 'ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಲು ಸಂತೋಷವಾಗಿದೆ.',
                'ml': 'താങ്കളെ കണ്ടതിൽ സന്തോഷം.',
                'bn': 'আপনার সাথে দেখা করে ভালো লাগলো।',
                'mr': 'तुम्हाला भेटून आनंद झाला.',
                'gu': 'તમને મળીને આનંદ થયો.',
                'pa': 'ਤੁਹਾਨੂੰ ਮਿਲ ਕੇ ਖੁਸ਼ੀ ਹੋਈ।',
                'ur': 'آپ سے مل کر خوشی ہوئی۔',
                'ar': 'تشرفت بلقائك.',
                'fr': 'Ravi de vous rencontrer.',
                'de': 'Schön, Sie kennenzulernen.',
                'es': 'Encantado de conocerte.',
                'it': 'Piacere di conoscerti.',
                'pt': 'Prazer em conhecê-lo.',
                'ru': 'Приятно познакомиться.',
                'zh-CN': '很高兴认识你。',
                'ja': 'はじめまして、お会いできて嬉しいです。',
                'ko': '만나서 반갑습니다.'
            },
            'thank you': {
                'en': 'Thank you',
                'ta': 'நன்றி',
                'hi': 'धन्यवाद',
                'te': 'ధన్యవాదాలు',
                'kn': 'ಧನ್ಯವಾದಗಳು',
                'ml': 'നന്ദി',
                'bn': 'ধন্যবাদ',
                'mr': 'धन्यवाद',
                'gu': 'આભાર',
                'pa': 'ਧੰਨਵਾਦ',
                'ur': 'شکریہ',
                'ar': 'شكرا',
                'fr': 'Merci',
                'de': 'Danke',
                'es': 'Gracias',
                'it': 'Grazie',
                'pt': 'Obrigado',
                'ru': 'Спасибо',
                'zh-CN': '谢谢',
                'ja': 'ありがとうございます',
                'ko': '감사합니다'
            },
            'good night': {
                'en': 'Good night',
                'ta': 'இனிய இரவு',
                'hi': 'शुभ रात्रि',
                'te': 'శుభ రాత్రి',
                'kn': 'ಶುಭ ರಾತ್ರಿ',
                'ml': 'ശുഭരാത്രി',
                'bn': 'শুভ রাত্রি',
                'mr': 'शुभ रात्री',
                'gu': 'શુભ રાત્રિ',
                'pa': 'ਸ਼ੁਭ ਰਾਤ',
                'ur': 'شب بخیر',
                'ar': 'تصبح على خير',
                'fr': 'Bonne nuit',
                'de': 'Gute Nacht',
                'es': 'Buenas noches',
                'it': 'Buonanotte',
                'pt': 'Boa noite',
                'ru': 'Спокойной ночи',
                'zh-CN': '晚安',
                'ja': 'おやすみなさい',
                'ko': '안녕히 주무세요'
            }
        };

        // Build bidirectional index mapping every language phrase to all other languages
        const lookup = {};
        for (const conceptKey in this.rawConcepts) {
            const translations = this.rawConcepts[conceptKey];
            for (const lang in translations) {
                const phrase = translations[lang].toLowerCase().trim().replace(/[.,!?;:"]/g, '');
                if (!lookup[phrase]) {
                    lookup[phrase] = translations;
                }
            }
        }

        return lookup;
    }
}

// Global Singleton Instance
const translationService = new TranslationService();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TranslationService, translationService };
}

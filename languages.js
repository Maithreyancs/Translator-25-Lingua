/**
 * LinguaVoice - Central Language Configuration
 * Provides metadata, speech codes, native names, and helper functions
 * for all supported languages.
 */

const LANGUAGES = [
    {
        code: 'ta',
        name: 'Tamil',
        nativeName: 'தமிழ்',
        speechCode: 'ta-IN',
        flag: '🇮🇳',
        region: 'India / Sri Lanka',
        sample: 'வணக்கம்! நீங்கள் எப்படி இருக்கிறீர்கள்?'
    },
    {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        speechCode: 'hi-IN',
        flag: '🇮🇳',
        region: 'India',
        sample: 'नमस्ते! आप कैसे हैं?'
    },
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        speechCode: 'en-US',
        flag: '🇺🇸',
        region: 'Global',
        sample: 'Hello! How are you doing today?'
    },
    {
        code: 'te',
        name: 'Telugu',
        nativeName: 'తెలుగు',
        speechCode: 'te-IN',
        flag: '🇮🇳',
        region: 'India',
        sample: 'నమస్కారం! మీరు ఎలా ఉన్నారు?'
    },
    {
        code: 'kn',
        name: 'Kannada',
        nativeName: 'ಕನ್ನಡ',
        speechCode: 'kn-IN',
        flag: '🇮🇳',
        region: 'India',
        sample: 'ನಮಸ್ಕಾರ! ನೀವು ಹೇಗಿದ್ದೀರಿ?'
    },
    {
        code: 'ml',
        name: 'Malayalam',
        nativeName: 'മലയാളം',
        speechCode: 'ml-IN',
        flag: '🇮🇳',
        region: 'India',
        sample: 'നമസ്കാരം! സുഖമാണോ?'
    },
    {
        code: 'bn',
        name: 'Bengali',
        nativeName: 'বাংলা',
        speechCode: 'bn-IN',
        flag: '🇮🇳',
        region: 'India / Bangladesh',
        sample: 'নমস্কার! আপনি কেমন আছেন?'
    },
    {
        code: 'mr',
        name: 'Marathi',
        nativeName: 'मराठी',
        speechCode: 'mr-IN',
        flag: '🇮🇳',
        region: 'India',
        sample: 'नमस्कार! तुम्ही कसे आहात?'
    },
    {
        code: 'gu',
        name: 'Gujarati',
        nativeName: 'ગુજરાતી',
        speechCode: 'gu-IN',
        flag: '🇮🇳',
        region: 'India',
        sample: 'નમસ્તે! તમે કેમ છો?'
    },
    {
        code: 'pa',
        name: 'Punjabi',
        nativeName: 'ਪੰਜਾਬੀ',
        speechCode: 'pa-IN',
        flag: '🇮🇳',
        region: 'India / Pakistan',
        sample: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?'
    },
    {
        code: 'ur',
        name: 'Urdu',
        nativeName: 'اردو',
        speechCode: 'ur-PK',
        flag: '🇵🇰',
        region: 'Pakistan / India',
        direction: 'rtl',
        sample: 'السلام علیکم! آپ کیسے ہیں؟'
    },
    {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        speechCode: 'ar-SA',
        flag: '🇸🇦',
        region: 'Middle East',
        direction: 'rtl',
        sample: 'مرحبا! كيف حالك اليوم؟'
    },
    {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        speechCode: 'fr-FR',
        flag: '🇫🇷',
        region: 'France / Global',
        sample: 'Bonjour! Comment allez-vous aujourd\'hui?'
    },
    {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        speechCode: 'de-DE',
        flag: '🇩🇪',
        region: 'Germany / Europe',
        sample: 'Hallo! Wie geht es Ihnen heute?'
    },
    {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        speechCode: 'es-ES',
        flag: '🇪🇸',
        region: 'Spain / Latin America',
        sample: '¡Hola! ¿Cómo estás hoy?'
    },
    {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        speechCode: 'it-IT',
        flag: '🇮🇹',
        region: 'Italy',
        sample: 'Ciao! Come stai oggi?'
    },
    {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        speechCode: 'pt-BR',
        flag: '🇧🇷',
        region: 'Brazil / Portugal',
        sample: 'Olá! Como você está hoje?'
    },
    {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        speechCode: 'ru-RU',
        flag: '🇷🇺',
        region: 'Russia',
        sample: 'Здравствуйте! Как ваши дела?'
    },
    {
        code: 'zh-CN',
        name: 'Chinese (Simplified)',
        nativeName: '中文 (简体)',
        speechCode: 'zh-CN',
        flag: '🇨🇳',
        region: 'China',
        sample: '你好！你今天过得怎么样？'
    },
    {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        speechCode: 'ja-JP',
        flag: '🇯🇵',
        region: 'Japan',
        sample: 'こんにちは！今日はお元気ですか？'
    },
    {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        speechCode: 'ko-KR',
        flag: '🇰🇷',
        region: 'South Korea',
        sample: '안녕하세요! 오늘 어떻게 지내세요?'
    },
    {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        speechCode: 'tr-TR',
        flag: '🇹🇷',
        region: 'Turkey',
        sample: 'Merhaba! Bugün nasılsınız?'
    },
    {
        code: 'nl',
        name: 'Dutch',
        nativeName: 'Nederlands',
        speechCode: 'nl-NL',
        flag: '🇳🇱',
        region: 'Netherlands',
        sample: 'Hallo! Hoe gaat het met u vandaag?'
    },
    {
        code: 'vi',
        name: 'Vietnamese',
        nativeName: 'Tiếng Việt',
        speechCode: 'vi-VN',
        flag: '🇻🇳',
        region: 'Vietnam',
        sample: 'Xin chào! Bạn khỏe không hôm nay?'
    },
    {
        code: 'id',
        name: 'Indonesian',
        nativeName: 'Bahasa Indonesia',
        speechCode: 'id-ID',
        flag: '🇮🇩',
        region: 'Indonesia',
        sample: 'Halo! Bagaimana kabar Anda hari ini?'
    }
];

// Lookup Map for O(1) Access
const LANGUAGE_MAP = new Map();
LANGUAGES.forEach(lang => {
    LANGUAGE_MAP.set(lang.code, lang);
    if (lang.speechCode) {
        LANGUAGE_MAP.set(lang.speechCode, lang);
    }
    // Also map simple two-letter code for Chinese if zh-CN
    if (lang.code.includes('-')) {
        LANGUAGE_MAP.set(lang.code.split('-')[0], lang);
    }
});

/**
 * Get language object by language code or speech code
 * @param {string} code - e.g. 'ta', 'ta-IN', 'en', 'es'
 * @returns {object|null}
 */
function getLanguageByCode(code) {
    if (!code) return null;
    if (code === 'auto') {
        return {
            code: 'auto',
            name: 'Auto Detect',
            nativeName: 'স্বয়ংক্রিয় / தானியங்கி / Auto',
            speechCode: 'en-US',
            flag: '✨'
        };
    }
    return LANGUAGE_MAP.get(code) || LANGUAGE_MAP.get(code.toLowerCase()) || null;
}

/**
 * Get the speech synthesis code for a given language code
 * @param {string} code 
 * @returns {string} e.g. 'ta-IN'
 */
function getSpeechCode(code) {
    const lang = getLanguageByCode(code);
    return lang ? lang.speechCode : 'en-US';
}

/**
 * Get all supported target languages (excluding auto)
 * @returns {Array<object>}
 */
function getTargetLanguages() {
    return [...LANGUAGES];
}

/**
 * Get all supported source languages (including Auto Detect)
 * @returns {Array<object>}
 */
function getSourceLanguages() {
    return [
        {
            code: 'auto',
            name: 'Detect Language',
            nativeName: 'Auto Detect',
            speechCode: 'en-US',
            flag: '✨',
            region: 'Automatic'
        },
        ...LANGUAGES
    ];
}

// Export for module systems or attach to global window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LANGUAGES,
        LANGUAGE_MAP,
        getLanguageByCode,
        getSpeechCode,
        getTargetLanguages,
        getSourceLanguages
    };
}

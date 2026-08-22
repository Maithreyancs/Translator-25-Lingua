/**
 * LinguaVoice - Translator Controller
 * Handles user translation workflows, input validation,
 * history recording, and speech preparation.
 */

class TranslatorController {
    constructor() {
        this.isTranslating = false;
        this.lastTranslation = null;
        this.currentSourceLang = 'auto';
        this.currentTargetLang = 'ta'; // Default to Tamil as in requirements

        this.onTranslateStart = null;
        this.onTranslateSuccess = null;
        this.onTranslateError = null;
    }

    /**
     * Set source language code ('auto' or 'en', 'ta', etc.)
     */
    setSourceLanguage(code) {
        this.currentSourceLang = code || 'auto';
    }

    /**
     * Set target language code ('ta', 'hi', 'en', etc.)
     */
    setTargetLanguage(code) {
        this.currentTargetLang = code || 'en';
    }

    /**
     * Swap source and target languages
     * Returns { newSource, newTarget }
     */
    swapLanguages() {
        // If source is auto, fallback to English when swapping
        const effectiveSource = this.currentSourceLang === 'auto' ? 'en' : this.currentSourceLang;
        const temp = effectiveSource;
        this.currentSourceLang = this.currentTargetLang;
        this.currentTargetLang = temp;

        return {
            source: this.currentSourceLang,
            target: this.currentTargetLang
        };
    }

    /**
     * Translate sentence and optionally trigger speech
     * @param {string} text 
     * @param {boolean} autoSpeakAfterTranslate 
     * @returns {Promise<object>}
     */
    async translateSentence(text, autoSpeakAfterTranslate = false) {
        const trimmed = (text || '').trim();
        
        if (!trimmed) {
            const err = new Error('Please enter a sentence to translate.');
            if (typeof this.onTranslateError === 'function') {
                this.onTranslateError(err);
            }
            throw err;
        }

        if (trimmed.length > 1000) {
            const err = new Error('Sentence is too long (maximum 1000 characters).');
            if (typeof this.onTranslateError === 'function') {
                this.onTranslateError(err);
            }
            throw err;
        }

        if (this.isTranslating) {
            return; // Avoid duplicate simultaneous requests
        }

        this.isTranslating = true;
        if (typeof this.onTranslateStart === 'function') {
            this.onTranslateStart({ text: trimmed, source: this.currentSourceLang, target: this.currentTargetLang });
        }

        try {
            const result = await translationService.translate(
                trimmed,
                this.currentSourceLang,
                this.currentTargetLang
            );

            const speechCode = getSpeechCode(this.currentTargetLang);

            this.lastTranslation = {
                originalText: trimmed,
                translatedText: result.translatedText,
                sourceLang: this.currentSourceLang,
                detectedSourceLang: result.detectedSourceLang,
                targetLang: this.currentTargetLang,
                speechCode: speechCode,
                provider: result.provider,
                timestamp: new Date().toISOString()
            };

            // Record into history
            historyManager.addItem(
                this.lastTranslation.sourceLang === 'auto' ? this.lastTranslation.detectedSourceLang : this.lastTranslation.sourceLang,
                this.lastTranslation.targetLang,
                this.lastTranslation.originalText,
                this.lastTranslation.translatedText,
                speechCode
            );

            if (typeof this.onTranslateSuccess === 'function') {
                this.onTranslateSuccess(this.lastTranslation);
            }

            // If auto-speak requested (e.g. from "Translate & Speak" button), trigger TTS
            if (autoSpeakAfterTranslate && result.translatedText) {
                speechEngine.speak(result.translatedText, speechCode);
            }

            return this.lastTranslation;
        } catch (error) {
            console.error('Translation error:', error);
            if (typeof this.onTranslateError === 'function') {
                this.onTranslateError(error);
            }
            throw error;
        } finally {
            this.isTranslating = false;
        }
    }
}

const translatorController = new TranslatorController();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TranslatorController, translatorController };
}

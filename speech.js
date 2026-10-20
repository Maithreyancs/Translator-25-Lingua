/**
 * LinguaVoice - Speech Engine
 * Dual-engine audio synthesis combining Web Speech API with High-Fidelity Chunked Audio TTS.
 * Supports long paragraphs (1,000+ characters), multiple sentences, and authentic regional speech
 * for Tamil, Hindi, Telugu, Malayalam, Japanese, and all 25+ supported languages.
 */

class SpeechEngine {
    constructor() {
        this.synth = window.speechSynthesis || null;
        this.voices = [];
        this.utterance = null;
        this.audioPlayer = null; // Current active Audio element
        
        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.currentText = '';
        this.currentSpeechCode = 'ta-IN';
        this.selectedVoiceIndex = -1;
        this.activeEngine = 'synthesis'; // 'synthesis' or 'audio'
        
        // Chunked queue management for long texts
        this.speechChunks = [];
        this.currentChunkIndex = 0;

        // Voice Settings
        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;

        // Callbacks for UI updates
        this.onStateChange = null;
        this.onVoicesLoaded = null;
        this.onError = null;

        // Speech Recognition (Microphone input)
        this.recognition = null;
        this.isListening = false;

        this._init();
    }

    _init() {
        if (this.synth) {
            this._loadVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this._loadVoices();
            }
        }

        // Setup Speech Recognition if available
        this._initSpeechRecognition();
    }

    _loadVoices() {
        if (!this.synth) return;
        this.voices = this.synth.getVoices() || [];
        if (typeof this.onVoicesLoaded === 'function') {
            this.onVoicesLoaded(this.voices);
        }
    }

    /**
     * Split long text into natural sentence chunks (max ~140 chars) for safe TTS streaming
     * @param {string} text 
     * @param {number} maxChars 
     * @returns {Array<string>}
     */
    splitIntoSpeechChunks(text, maxChars = 130) {
        const trimmed = (text || '').trim();
        if (!trimmed) return [];
        if (trimmed.length <= maxChars) return [trimmed];

        // Split by full stops, question marks, exclamation marks, or newlines
        const sentences = trimmed.match(/[^.!?\n\r]+[.!?\n\r]*/g) || [trimmed];
        const chunks = [];

        for (let s of sentences) {
            s = s.trim();
            if (!s) continue;

            if (s.length <= maxChars) {
                chunks.push(s);
            } else {
                // Split by commas, colons, semicolons
                const subPhrases = s.match(/[^,;:，；、]+[,;:，；、]*/g) || [s];
                for (let sub of subPhrases) {
                    sub = sub.trim();
                    if (!sub) continue;
                    if (sub.length <= maxChars) {
                        chunks.push(sub);
                    } else {
                        // Split by whitespace
                        const words = sub.split(/\s+/);
                        let current = '';
                        for (const word of words) {
                            if ((current + ' ' + word).trim().length <= maxChars) {
                                current = (current + ' ' + word).trim();
                            } else {
                                if (current) chunks.push(current);
                                current = word;
                            }
                        }
                        if (current) chunks.push(current);
                    }
                }
            }
        }

        return chunks.length > 0 ? chunks : [trimmed.slice(0, maxChars)];
    }

    /**
     * Get available system voices filtered for a specific language or speech code
     */
    getVoicesForLanguage(speechCode) {
        if (!this.voices || this.voices.length === 0) {
            this._loadVoices();
        }

        if (!speechCode) return this.voices;

        const langRoot = speechCode.split('-')[0].toLowerCase();
        const targetLocale = speechCode.toLowerCase().replace('_', '-');

        // 1. Exact locale match (e.g. 'ta-in')
        let matching = this.voices.filter(v => v.lang.toLowerCase().replace('_', '-') === targetLocale);

        // 2. Prefix match (e.g. any 'ta' voice)
        if (matching.length === 0) {
            matching = this.voices.filter(v => v.lang.toLowerCase().startsWith(langRoot));
        }

        return matching;
    }

    /**
     * Find best single voice for language
     */
    getBestVoiceForLanguage(speechCode) {
        const matching = this.getVoicesForLanguage(speechCode);
        if (matching.length > 0) {
            const preferred = matching.find(v => 
                v.name.includes('Google') || 
                v.name.includes('Natural') || 
                v.name.includes('Neural') || 
                v.name.includes('Online')
            ) || matching[0];
            return preferred;
        }
        return null;
    }

    /**
     * Speak text in specified language with automatic chunking and dual-engine fallback
     * @param {string} text - Text to speak (short or long paragraphs)
     * @param {string} speechCode - Target locale code (e.g. 'ta-IN', 'hi-IN', 'ja-JP')
     * @param {object} options - Optional overrides { rate, pitch, voiceIndex }
     */
    speak(text, speechCode = 'ta-IN', options = {}) {
        const trimmed = (text || '').trim();
        if (!trimmed) {
            if (typeof this.onError === 'function') {
                this.onError('No text available to speak.');
            }
            return;
        }

        // Stop any current playback
        this.stop();

        this.currentText = trimmed;
        this.currentSpeechCode = speechCode;
        this.speechChunks = this.splitIntoSpeechChunks(trimmed, 130);
        this.currentChunkIndex = 0;

        const matchingVoices = this.getVoicesForLanguage(speechCode);
        const hasNativeVoice = matchingVoices.length > 0;
        const userSelectedSpecificVoice = (options.voiceIndex !== undefined && options.voiceIndex >= 0);

        // If native system voice exists or user explicitly selected a voice, use Web Speech API
        if (hasNativeVoice || userSelectedSpecificVoice) {
            this._startWebSpeechQueue(options, matchingVoices);
        } else {
            // Otherwise, use High-Fidelity Chunked Audio TTS to guarantee authentic speech
            this._startAudioQueue(options.rate !== undefined ? options.rate : this.rate);
        }
    }

    /**
     * Web Speech API: Sequential chunk playback
     */
    _startWebSpeechQueue(options, matchingVoices) {
        if (!this.synth) {
            this._startAudioQueue(options.rate || this.rate);
            return;
        }

        this.activeEngine = 'synthesis';
        this.isPlaying = true;
        this.isPaused = false;
        this._notifyStateChange('playing');

        this._playNextWebSpeechChunk(options, matchingVoices);
    }

    _playNextWebSpeechChunk(options, matchingVoices) {
        if (!this.isPlaying) return;

        if (this.currentChunkIndex >= this.speechChunks.length) {
            this.isPlaying = false;
            this.isPaused = false;
            this._notifyStateChange('idle');
            return;
        }

        const chunkText = this.speechChunks[this.currentChunkIndex];
        this.utterance = new SpeechSynthesisUtterance(chunkText);
        this.utterance.lang = this.currentSpeechCode;
        this.utterance.rate = options.rate !== undefined ? options.rate : this.rate;
        this.utterance.pitch = options.pitch !== undefined ? options.pitch : this.pitch;
        this.utterance.volume = options.volume !== undefined ? options.volume : this.volume;

        if (options.voiceIndex !== undefined && options.voiceIndex >= 0 && matchingVoices[options.voiceIndex]) {
            this.utterance.voice = matchingVoices[options.voiceIndex];
        } else {
            const bestVoice = this.getBestVoiceForLanguage(this.currentSpeechCode);
            if (bestVoice) {
                this.utterance.voice = bestVoice;
            }
        }

        this.utterance.onend = () => {
            if (this.isPlaying && !this.isPaused) {
                this.currentChunkIndex++;
                this._playNextWebSpeechChunk(options, matchingVoices);
            }
        };

        this.utterance.onerror = (event) => {
            if (event.error !== 'canceled' && event.error !== 'interrupted') {
                console.warn('SpeechSynthesis error, falling back to Audio TTS queue:', event);
                this._startAudioQueue(this.rate);
            } else {
                this.isPlaying = false;
                this.isPaused = false;
                this._notifyStateChange('idle');
            }
        };

        try {
            this.synth.speak(this.utterance);
        } catch (e) {
            console.warn('Web Speech invocation failed, trying Audio TTS queue:', e);
            this._startAudioQueue(this.rate);
        }
    }

    /**
     * Chunked High-Fidelity Audio TTS: Sequential playback for long text
     */
    _startAudioQueue(rate = 1.0) {
        this.activeEngine = 'audio';
        this.isPlaying = true;
        this.isPaused = false;
        this._notifyStateChange('playing');

        this._playNextAudioChunk(rate);
    }

    _playNextAudioChunk(rate = 1.0) {
        if (!this.isPlaying) return;

        if (this.currentChunkIndex >= this.speechChunks.length) {
            this.isPlaying = false;
            this.isPaused = false;
            this._notifyStateChange('idle');
            return;
        }

        const chunkText = this.speechChunks[this.currentChunkIndex];
        const langRoot = this.currentSpeechCode.split('-')[0].toLowerCase();
        
        // Use local /api/tts proxy if on HTTP/HTTPS, or direct Google TTS if on file://
        const isHttp = typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:');
        const primaryTtsUrl = isHttp
            ? `/api/tts?tl=${encodeURIComponent(langRoot)}&q=${encodeURIComponent(chunkText)}`
            : `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langRoot)}&client=tw-ob&q=${encodeURIComponent(chunkText)}`;

        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        this.audioPlayer = new Audio(primaryTtsUrl);
        this.audioPlayer.playbackRate = Math.max(0.5, Math.min(2.0, rate));

        this.audioPlayer.onplay = () => {
            this.isPlaying = true;
            this.isPaused = false;
            this._notifyStateChange('playing');
        };

        this.audioPlayer.onended = () => {
            if (this.isPlaying && !this.isPaused) {
                this.currentChunkIndex++;
                this._playNextAudioChunk(rate);
            }
        };

        let hasFallenBackToDirectGoogle = false;

        const fallbackToSpeechSynthesis = () => {
            if (this.synth) {
                try {
                    const availableVoices = this.getVoicesForLanguage(this.currentSpeechCode);
                    const fallbackUtterance = new SpeechSynthesisUtterance(this.currentText);
                    fallbackUtterance.lang = this.currentSpeechCode;
                    if (availableVoices.length > 0) {
                        fallbackUtterance.voice = availableVoices[0];
                    }
                    fallbackUtterance.rate = rate;
                    fallbackUtterance.pitch = this.pitch;
                    fallbackUtterance.volume = this.volume;
                    fallbackUtterance.onend = () => {
                        this.isPlaying = false;
                        this.isPaused = false;
                        this._notifyStateChange('idle');
                    };
                    fallbackUtterance.onerror = () => {
                        this.isPlaying = false;
                        this.isPaused = false;
                        this._notifyStateChange('idle');
                    };
                    this.synth.speak(fallbackUtterance);
                    return true;
                } catch (synthErr) {
                    console.warn('SpeechSynthesis fallback error:', synthErr);
                }
            }
            return false;
        };

        const handleFatalAudioError = (err) => {
            console.warn(`Audio TTS failed:`, err);
            // If there are more chunks in a long text, try advancing
            if (this.currentChunkIndex < this.speechChunks.length - 1) {
                this.currentChunkIndex++;
                this._playNextAudioChunk(rate);
                return;
            }

            // Otherwise, fallback to native SpeechSynthesis
            if (fallbackToSpeechSynthesis()) {
                return;
            }

            this.isPlaying = false;
            this.isPaused = false;
            this._notifyStateChange('idle');
            if (typeof this.onError === 'function') {
                const langObj = typeof getLanguageByCode === 'function' ? getLanguageByCode(this.currentSpeechCode.split('-')[0]) : null;
                const langName = langObj ? langObj.name : this.currentSpeechCode;
                this.onError(`Audio playback for ${langName} failed. Please check your connection or install local voice packs.`);
            }
        };

        this.audioPlayer.onerror = (e) => {
            // If local /api/tts proxy returned 404/error on HTTP, retry with direct Google TTS before giving up
            if (isHttp && !hasFallenBackToDirectGoogle) {
                hasFallenBackToDirectGoogle = true;
                const directGoogleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langRoot)}&client=tw-ob&q=${encodeURIComponent(chunkText)}`;
                if (this.audioPlayer) {
                    this.audioPlayer.pause();
                }
                this.audioPlayer = new Audio(directGoogleUrl);
                this.audioPlayer.playbackRate = Math.max(0.5, Math.min(2.0, rate));
                this.audioPlayer.onended = () => {
                    if (this.isPlaying && !this.isPaused) {
                        this.currentChunkIndex++;
                        this._playNextAudioChunk(rate);
                    }
                };
                this.audioPlayer.onerror = (err2) => handleFatalAudioError(err2);
                const retryPromise = this.audioPlayer.play();
                if (retryPromise !== undefined) {
                    retryPromise.catch(err2 => handleFatalAudioError(err2));
                }
                return;
            }

            handleFatalAudioError(e);
        };

        const playPromise = this.audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('Audio play error (user interaction or autoplay restriction):', err);
                if (isHttp && !hasFallenBackToDirectGoogle) {
                    hasFallenBackToDirectGoogle = true;
                    this.audioPlayer.onerror(err);
                } else if (!fallbackToSpeechSynthesis()) {
                    this.isPlaying = false;
                    this.isPaused = false;
                    this._notifyStateChange('idle');
                }
            });
        }
    }

    /**
     * Pause ongoing playback
     */
    pause() {
        if (this.activeEngine === 'synthesis' && this.synth && this.isPlaying && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
            this._notifyStateChange('paused');
        } else if (this.activeEngine === 'audio' && this.audioPlayer && !this.audioPlayer.paused) {
            this.audioPlayer.pause();
            this.isPaused = true;
            this._notifyStateChange('paused');
        }
    }

    /**
     * Resume paused playback
     */
    resume() {
        if (this.activeEngine === 'synthesis' && this.synth && this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            this._notifyStateChange('playing');
        } else if (this.activeEngine === 'audio' && this.audioPlayer && this.audioPlayer.paused) {
            this.audioPlayer.play();
            this.isPaused = false;
            this._notifyStateChange('playing');
        }
    }

    /**
     * Stop all speech & reset queue
     */
    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
            this.audioPlayer = null;
        }
        this.stopVoiceInput();
        this.speechChunks = [];
        this.currentChunkIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this._notifyStateChange('idle');
    }

    /**
     * Replay the current translation
     */
    replay(options = {}) {
        if (this.currentText) {
            this.speak(this.currentText, this.currentSpeechCode, options);
        }
    }

    setRate(newRate) {
        this.rate = parseFloat(newRate);
        if (this.utterance) {
            this.utterance.rate = this.rate;
        }
        if (this.audioPlayer) {
            this.audioPlayer.playbackRate = this.rate;
        }
    }

    setPitch(newPitch) {
        this.pitch = parseFloat(newPitch);
        if (this.utterance) {
            this.utterance.pitch = this.pitch;
        }
    }

    setVolume(newVolume) {
        this.volume = parseFloat(newVolume);
        if (this.utterance) {
            this.utterance.volume = this.volume;
        }
        if (this.audioPlayer) {
            this.audioPlayer.volume = this.volume;
        }
    }

    _notifyStateChange(state) {
        if (typeof this.onStateChange === 'function') {
            this.onStateChange({
                state,
                isPlaying: this.isPlaying,
                isPaused: this.isPaused,
                currentText: this.currentText,
                speechCode: this.currentSpeechCode,
                currentChunk: this.currentChunkIndex + 1,
                totalChunks: this.speechChunks.length || 1
            });
        }
    }

    // ==========================================
    // Speech Recognition (Speech-to-Text)
    // ==========================================

    _initSpeechRecognition() {
        const SpeechRec = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition || null);
        this.recognitionSupported = Boolean(SpeechRec);
    }

    stopVoiceInput() {
        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (e) {}
            this.recognition = null;
        }
        this.isListening = false;
    }

    toggleVoiceInput(langCode = 'en-US', onResult, onState) {
        const SpeechRec = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition || null);
        if (!SpeechRec) {
            if (typeof this.onError === 'function') {
                this.onError('Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
            }
            return;
        }

        if (this.isListening) {
            this.stopVoiceInput();
            if (typeof onState === 'function') onState(false);
            return;
        }

        try {
            // Ensure previous recognition instance is cleanly terminated
            if (this.recognition) {
                try { this.recognition.abort(); } catch (e) {}
                this.recognition = null;
            }

            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.lang = (!langCode || langCode === 'auto') ? 'en-US' : langCode;
            this.recognition = recognition;

            this.isListening = true;
            if (typeof onState === 'function') onState(true);

            recognition.onresult = (event) => {
                let accumulatedFinal = '';
                let interimTranscript = '';

                // Loop from 0 to results.length to preserve all earlier recognized sentences
                for (let i = 0; i < event.results.length; ++i) {
                    const res = event.results[i];
                    if (res.isFinal) {
                        accumulatedFinal += res[0].transcript + ' ';
                    } else {
                        interimTranscript += res[0].transcript;
                    }
                }

                const fullTranscript = (accumulatedFinal + interimTranscript).trim();
                if (typeof onResult === 'function' && fullTranscript) {
                    onResult(fullTranscript, Boolean(accumulatedFinal && !interimTranscript));
                }
            };

            recognition.onerror = (event) => {
                console.warn('Voice input error:', event.error);
                if (event.error === 'no-speech') {
                    // Normal silence timeout; do not alert user
                    return;
                }

                this.isListening = false;
                if (typeof onState === 'function') onState(false);

                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    if (typeof this.onError === 'function') {
                        this.onError('Microphone permission was denied. Please allow microphone access in your browser settings.');
                    }
                    return;
                }
                if (event.error === 'network') {
                    if (typeof this.onError === 'function') {
                        this.onError('Voice recognition network error. Web Speech in Chrome/Edge requires an active internet connection to speech servers.');
                    }
                    return;
                }
                if (event.error === 'audio-capture') {
                    if (typeof this.onError === 'function') {
                        this.onError('No microphone was detected. Please check your microphone hardware connection.');
                    }
                    return;
                }
                if (typeof this.onError === 'function') {
                    this.onError(`Voice input error: ${event.error}`);
                }
            };

            recognition.onend = () => {
                this.isListening = false;
                if (typeof onState === 'function') onState(false);
            };

            recognition.start();
        } catch (err) {
            console.error('Error starting speech recognition:', err);
            this.isListening = false;
            if (typeof onState === 'function') onState(false);
            if (typeof this.onError === 'function') {
                this.onError(`Could not start microphone: ${err.message || err}`);
            }
        }
    }
}

// Global Singleton Engine
const speechEngine = new SpeechEngine();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpeechEngine, speechEngine };
}

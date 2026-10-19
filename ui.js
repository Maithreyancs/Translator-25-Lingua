/**
 * LinguaVoice - UI Controller
 * Manages DOM updates, notifications, language dropdown rendering,
 * copy tooltips, history/favorites rendering, and component states.
 */

class UIController {
    constructor() {
        this.elements = {};
    }

    cacheElements() {
        this.elements = {
            // Source & Target Selectors
            sourceLangSelect: document.getElementById('source-lang-select'),
            targetLangSelect: document.getElementById('target-lang-select'),
            swapLangsBtn: document.getElementById('swap-langs-btn'),
            
            // Text Input Section
            sourceTextInput: document.getElementById('source-text-input'),
            charCounter: document.getElementById('char-counter'),
            wordCounter: document.getElementById('word-counter'),
            clearInputBtn: document.getElementById('clear-input-btn'),
            micBtn: document.getElementById('mic-btn'),
            fileInput: document.getElementById('file-input'),
            quickPhrasesContainer: document.getElementById('quick-phrases-container'),

            // Primary Translation Buttons
            translateSpeakBtn: document.getElementById('translate-speak-btn'),
            translateOnlyBtn: document.getElementById('translate-only-btn'),
            translateSpinner: document.getElementById('translate-spinner'),
            translateBtnText: document.getElementById('translate-btn-text'),

            // Output / Target Section
            outputCard: document.getElementById('output-card'),
            targetTextDisplay: document.getElementById('target-text-display'),
            targetLangBadge: document.getElementById('target-lang-badge'),
            targetCharCount: document.getElementById('target-char-count'),
            outputPlaceholder: document.getElementById('output-placeholder'),
            outputContent: document.getElementById('output-content'),
            
            // Output Action Buttons
            copyTranslationBtn: document.getElementById('copy-translation-btn'),
            favoriteBtn: document.getElementById('favorite-btn'),
            playTranslationBtn: document.getElementById('play-translation-btn'),
            pauseSpeechBtn: document.getElementById('pause-speech-btn'),
            resumeSpeechBtn: document.getElementById('resume-speech-btn'),
            stopSpeechBtn: document.getElementById('stop-speech-btn'),
            replaySpeechBtn: document.getElementById('replay-speech-btn'),
            
            // Voice Settings
            voiceSelect: document.getElementById('voice-select'),
            voiceCountHint: document.getElementById('voice-count-hint'),
            speedSlider: document.getElementById('speed-slider'),
            speedDisplay: document.getElementById('speed-display'),
            pitchSlider: document.getElementById('pitch-slider'),
            pitchDisplay: document.getElementById('pitch-display'),
            
            // Status & Feedback
            statusPill: document.getElementById('status-pill'),
            statusMessage: document.getElementById('status-message'),
            speechIndicator: document.getElementById('speech-indicator'),
            
            // History & Favorites Tabs / Drawer
            tabBtns: document.querySelectorAll('.drawer-tab-btn'),
            tabPanes: document.querySelectorAll('.tab-pane'),
            historyList: document.getElementById('history-list'),
            favoritesList: document.getElementById('favorites-list'),
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            clearFavoritesBtn: document.getElementById('clear-favorites-btn'),
            historyBadgeCount: document.getElementById('history-badge-count'),
            favoritesBadgeCount: document.getElementById('favorites-badge-count'),

            // Offline LLM Controls
            ollamaToggle: document.getElementById('ollama-toggle'),
            ollamaStatusBadge: document.getElementById('ollama-status-badge'),
            ollamaStatusDot: document.getElementById('ollama-status-dot'),
            ollamaStatusText: document.getElementById('ollama-status-text'),
            ollamaModelSelect: document.getElementById('ollama-model-select'),
            refreshOllamaBtn: document.getElementById('refresh-ollama-btn'),
            strictOfflineToggle: document.getElementById('strict-offline-toggle'),
            providerBadge: document.getElementById('provider-badge'),

            // Toast Notifications
            toastContainer: document.getElementById('toast-container')
        };
    }

    /**
     * Populate Source and Target dropdowns
     */
    populateLanguageDropdowns(selectedSource = 'auto', selectedTarget = 'ta') {
        const sourceOptions = getSourceLanguages();
        const targetOptions = getTargetLanguages();

        // Populate Source Select
        if (this.elements.sourceLangSelect) {
            this.elements.sourceLangSelect.innerHTML = sourceOptions.map(lang => `
                <option value="${lang.code}" ${lang.code === selectedSource ? 'selected' : ''}>
                    ${lang.flag || '🌐'} ${lang.name} ${lang.nativeName && lang.nativeName !== lang.name ? '(' + lang.nativeName + ')' : ''}
                </option>
            `).join('');
        }

        // Populate Target Select
        if (this.elements.targetLangSelect) {
            this.elements.targetLangSelect.innerHTML = targetOptions.map(lang => `
                <option value="${lang.code}" ${lang.code === selectedTarget ? 'selected' : ''}>
                    ${lang.flag || '🌐'} ${lang.name} ${lang.nativeName && lang.nativeName !== lang.name ? '(' + lang.nativeName + ')' : ''}
                </option>
            `).join('');
        }
    }

    /**
     * Update available voices dropdown based on selected target language
     */
    updateVoiceOptions(targetLanguageCode) {
        if (!this.elements.voiceSelect) return;

        const speechCode = getSpeechCode(targetLanguageCode);
        const voices = speechEngine.getVoicesForLanguage(speechCode);
        const targetLang = getLanguageByCode(targetLanguageCode);

        this.elements.voiceSelect.innerHTML = '';

        if (voices.length === 0) {
            this.elements.voiceSelect.innerHTML = `<option value="-1">Auto (${targetLang ? targetLang.name : 'Target'} Voice Engine)</option>`;
            if (this.elements.voiceCountHint) {
                this.elements.voiceCountHint.textContent = `Using system speech engine for ${speechCode}`;
            }
        } else {
            voices.forEach((voice, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.textContent = `${voice.name} (${voice.lang})`;
                this.elements.voiceSelect.appendChild(opt);
            });

            if (this.elements.voiceCountHint) {
                this.elements.voiceCountHint.textContent = `${voices.length} voice${voices.length > 1 ? 's' : ''} available for ${targetLang ? targetLang.name : 'this language'}`;
            }
        }
    }

    /**
     * Update Character & Word Counters for input, and auto-detect text direction
     */
    updateInputCounter(text = '') {
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

        if (this.elements.sourceTextInput) {
            // Auto-detect RTL for Arabic / Urdu
            if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
                this.elements.sourceTextInput.setAttribute('dir', 'rtl');
            } else {
                this.elements.sourceTextInput.setAttribute('dir', 'ltr');
            }
        }

        if (this.elements.charCounter) {
            this.elements.charCounter.textContent = `${charCount} / 1000 characters`;
            if (charCount > 900) {
                this.elements.charCounter.classList.add('warning');
            } else {
                this.elements.charCounter.classList.remove('warning');
            }
        }

        if (this.elements.wordCounter) {
            this.elements.wordCounter.textContent = `${wordCount} word${wordCount !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Display translated result in the Output card
     */
    displayTranslation(translationData) {
        if (!translationData) return;

        const { originalText, translatedText, targetLang, detectedSourceLang, sourceLang } = translationData;
        const targetLangObj = getLanguageByCode(targetLang);
        const sourceLangObj = getLanguageByCode(sourceLang === 'auto' ? detectedSourceLang : sourceLang);

        if (this.elements.outputPlaceholder) {
            this.elements.outputPlaceholder.style.display = 'none';
        }
        if (this.elements.outputContent) {
            this.elements.outputContent.style.display = 'block';
        }

        if (this.elements.targetTextDisplay) {
            this.elements.targetTextDisplay.textContent = translatedText;
            
            // RTL support for Arabic / Urdu
            if (targetLangObj && targetLangObj.direction === 'rtl') {
                this.elements.targetTextDisplay.setAttribute('dir', 'rtl');
                this.elements.targetTextDisplay.classList.add('rtl-text');
            } else {
                this.elements.targetTextDisplay.setAttribute('dir', 'ltr');
                this.elements.targetTextDisplay.classList.remove('rtl-text');
            }
        }

        if (this.elements.targetLangBadge) {
            this.elements.targetLangBadge.innerHTML = `
                ${targetLangObj ? targetLangObj.flag : '🌐'} ${targetLangObj ? targetLangObj.name : targetLang}
                ${targetLangObj?.nativeName ? `• <span class="badge-native">${targetLangObj.nativeName}</span>` : ''}
            `;
        }

        if (this.elements.targetCharCount) {
            this.elements.targetCharCount.textContent = `${translatedText.length} characters`;
        }

        // Show translation provider pill
        if (this.elements.providerBadge) {
            this.elements.providerBadge.style.display = 'inline-flex';
            if (translationData.provider === 'ollama') {
                this.elements.providerBadge.className = 'provider-pill ollama';
                this.elements.providerBadge.innerHTML = `<span aria-hidden="true">🤖</span> Ollama (${translationData.model || 'LLM'})`;
            } else if (translationData.provider === 'smart-dictionary') {
                this.elements.providerBadge.className = 'provider-pill dictionary';
                this.elements.providerBadge.innerHTML = `<span aria-hidden="true">📖</span> Offline Dictionary`;
            } else {
                this.elements.providerBadge.className = 'provider-pill cloud';
                this.elements.providerBadge.innerHTML = `<span aria-hidden="true">🌐</span> Cloud Neural`;
            }
        }

        // Update Favorite star state
        this.updateFavoriteButtonState(originalText, targetLang);

        // Update Voice options for target language
        this.updateVoiceOptions(targetLang);

        // Enable output controls
        this.setPlaybackButtonsEnabled(true);
    }

    /**
     * Set loading state during translation with live seconds timer
     */
    setLoading(isLoading) {
        if (this._loadingTimer) {
            clearInterval(this._loadingTimer);
            this._loadingTimer = null;
        }

        if (this.elements.translateSpeakBtn) {
            this.elements.translateSpeakBtn.disabled = isLoading;
        }
        if (this.elements.translateOnlyBtn) {
            this.elements.translateOnlyBtn.disabled = isLoading;
        }
        if (this.elements.translateSpinner) {
            this.elements.translateSpinner.style.display = isLoading ? 'inline-block' : 'none';
        }

        if (isLoading) {
            const isOllama = typeof translationService !== 'undefined' && translationService.ollamaEnabled;
            const modelName = (typeof translationService !== 'undefined' && translationService.ollamaModel) || 'LLM';
            let elapsed = 0;

            const updateProgress = () => {
                if (this.elements.translateBtnText) {
                    this.elements.translateBtnText.textContent = isOllama 
                        ? `Translating (${modelName}${elapsed > 0 ? ' • ' + elapsed + 's' : ''})...`
                        : `Translating...`;
                }
                if (this.elements.statusMessage) {
                    if (isOllama) {
                        if (elapsed > 12) {
                            this.elements.statusMessage.textContent = `Generating on CPU (${elapsed}s)... (Tip: qwen2.5:1.5b is 10x faster)`;
                        } else {
                            this.elements.statusMessage.textContent = `Local LLM generating on CPU (${elapsed}s)...`;
                        }
                    } else {
                        this.elements.statusMessage.textContent = `Translating sentence...`;
                    }
                }
            };

            updateProgress();
            this._loadingTimer = setInterval(() => {
                elapsed++;
                updateProgress();
            }, 1000);
        } else {
            if (this.elements.translateBtnText) {
                this.elements.translateBtnText.textContent = 'Translate & Speak';
            }
            if (this.elements.statusMessage) {
                this.elements.statusMessage.textContent = 'Ready';
            }
        }

        if (this.elements.outputCard) {
            if (isLoading) {
                this.elements.outputCard.classList.add('is-translating');
            } else {
                this.elements.outputCard.classList.remove('is-translating');
            }
        }
    }

    /**
     * Update Ollama Status in UI
     */
    updateOllamaStatus(status) {
        const { running, models = [], selectedModel = 'qwen3.5:4b' } = status;
        if (this.elements.ollamaStatusDot) {
            this.elements.ollamaStatusDot.className = `status-indicator-dot ${running ? 'online' : 'offline'}`;
        }
        if (this.elements.ollamaStatusText) {
            this.elements.ollamaStatusText.textContent = running 
                ? `Ollama Connected (${models.length} model${models.length === 1 ? '' : 's'})` 
                : 'Ollama Offline (Run "ollama serve")';
        }
        if (this.elements.ollamaModelSelect) {
            if (models.length > 0) {
                this.elements.ollamaModelSelect.innerHTML = models.map(m => `
                    <option value="${m}" ${m === selectedModel ? 'selected' : ''}>${m}</option>
                `).join('');
            } else {
                this.elements.ollamaModelSelect.innerHTML = `<option value="${selectedModel}">${selectedModel}</option>`;
            }
        }
    }

    /**
     * Update Playback Buttons based on speech state
     */
    updateSpeechUI(speechState) {
        const { state, isPlaying, isPaused } = speechState;

        if (this.elements.playTranslationBtn) {
            this.elements.playTranslationBtn.style.display = (isPlaying && !isPaused) ? 'none' : 'inline-flex';
        }
        if (this.elements.pauseSpeechBtn) {
            this.elements.pauseSpeechBtn.style.display = (isPlaying && !isPaused) ? 'inline-flex' : 'none';
        }
        if (this.elements.resumeSpeechBtn) {
            this.elements.resumeSpeechBtn.style.display = isPaused ? 'inline-flex' : 'none';
        }
        if (this.elements.stopSpeechBtn) {
            this.elements.stopSpeechBtn.disabled = !isPlaying && !isPaused;
        }

        // Waveform / Speaking indicator
        if (this.elements.speechIndicator) {
            if (isPlaying && !isPaused) {
                this.elements.speechIndicator.classList.add('active');
            } else {
                this.elements.speechIndicator.classList.remove('active');
            }
        }

        // Status update
        if (this.elements.statusMessage) {
            if (state === 'playing') {
                this.elements.statusMessage.textContent = 'Speaking translation aloud...';
            } else if (state === 'paused') {
                this.elements.statusMessage.textContent = 'Speech paused';
            } else {
                this.elements.statusMessage.textContent = 'Ready';
            }
        }
    }

    setPlaybackButtonsEnabled(enabled) {
        const buttons = [
            this.elements.copyTranslationBtn,
            this.elements.favoriteBtn,
            this.elements.playTranslationBtn,
            this.elements.replaySpeechBtn
        ];
        buttons.forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });
    }

    updateFavoriteButtonState(originalText, targetLang) {
        if (!this.elements.favoriteBtn) return;
        const isFav = favoritesManager.isFavorite(originalText, targetLang);
        if (isFav) {
            this.elements.favoriteBtn.classList.add('is-favorite');
            this.elements.favoriteBtn.setAttribute('title', 'Remove from Favorites');
            this.elements.favoriteBtn.innerHTML = '<span aria-hidden="true">⭐</span> Favorited';
        } else {
            this.elements.favoriteBtn.classList.remove('is-favorite');
            this.elements.favoriteBtn.setAttribute('title', 'Save to Favorites');
            this.elements.favoriteBtn.innerHTML = '<span aria-hidden="true">☆</span> Favorite';
        }
    }

    /**
     * Render History List in Drawer/Tab
     */
    renderHistory() {
        if (!this.elements.historyList) return;
        const items = historyManager.getAll();

        if (this.elements.historyBadgeCount) {
            this.elements.historyBadgeCount.textContent = items.length;
        }

        if (items.length === 0) {
            this.elements.historyList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon" aria-hidden="true">📜</span>
                    <p class="empty-title">No translation history yet</p>
                    <p class="empty-subtitle">Your recent translations will appear here (up to 20).</p>
                </div>
            `;
            if (this.elements.clearHistoryBtn) this.elements.clearHistoryBtn.disabled = true;
            return;
        }

        if (this.elements.clearHistoryBtn) this.elements.clearHistoryBtn.disabled = false;

        this.elements.historyList.innerHTML = items.map(item => {
            const srcLang = getLanguageByCode(item.sourceLang);
            const tgtLang = getLanguageByCode(item.targetLang);
            const isFav = favoritesManager.isFavorite(item.originalText, item.targetLang);

            return `
                <div class="history-card" data-id="${item.id}">
                    <div class="history-card-header">
                        <div class="history-lang-badges">
                            <span class="badge badge-source">${srcLang ? srcLang.flag : '🌐'} ${srcLang ? srcLang.name : item.sourceLang}</span>
                            <span class="lang-arrow" aria-hidden="true">➔</span>
                            <span class="badge badge-target">${tgtLang ? tgtLang.flag : '🌐'} ${tgtLang ? tgtLang.name : item.targetLang}</span>
                        </div>
                        <span class="history-time">${item.formattedTime}</span>
                    </div>

                    <div class="history-card-body">
                        <p class="history-orig" title="Original sentence">${this._escapeHtml(item.originalText)}</p>
                        <p class="history-trans" title="Translated sentence">${this._escapeHtml(item.translatedText)}</p>
                    </div>

                    <div class="history-card-actions">
                        <button class="btn-chip btn-replay-history" data-id="${item.id}" title="Play speech">
                            <span aria-hidden="true">🔊</span> Listen
                        </button>
                        <button class="btn-chip btn-copy-history" data-text="${this._escapeHtml(item.translatedText)}" title="Copy translation">
                            <span aria-hidden="true">📋</span> Copy
                        </button>
                        <button class="btn-chip btn-favorite-history ${isFav ? 'active' : ''}" data-id="${item.id}" title="Toggle favorite">
                            <span aria-hidden="true">${isFav ? '⭐' : '☆'}</span> ${isFav ? 'Saved' : 'Save'}
                        </button>
                        <button class="btn-chip btn-chip-danger btn-delete-history" data-id="${item.id}" title="Delete item">
                            <span aria-hidden="true">🗑️</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render Favorites List in Drawer/Tab
     */
    renderFavorites() {
        if (!this.elements.favoritesList) return;
        const items = favoritesManager.getAll();

        if (this.elements.favoritesBadgeCount) {
            this.elements.favoritesBadgeCount.textContent = items.length;
        }

        if (items.length === 0) {
            this.elements.favoritesList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon" aria-hidden="true">⭐</span>
                    <p class="empty-title">No saved favorites</p>
                    <p class="empty-subtitle">Click the star button on any translation to save it here for quick access.</p>
                </div>
            `;
            if (this.elements.clearFavoritesBtn) this.elements.clearFavoritesBtn.disabled = true;
            return;
        }

        if (this.elements.clearFavoritesBtn) this.elements.clearFavoritesBtn.disabled = false;

        this.elements.favoritesList.innerHTML = items.map(item => {
            const srcLang = getLanguageByCode(item.sourceLang);
            const tgtLang = getLanguageByCode(item.targetLang);

            return `
                <div class="history-card favorite-card" data-id="${item.id}">
                    <div class="history-card-header">
                        <div class="history-lang-badges">
                            <span class="badge badge-source">${srcLang ? srcLang.flag : '🌐'} ${srcLang ? srcLang.name : item.sourceLang}</span>
                            <span class="lang-arrow" aria-hidden="true">➔</span>
                            <span class="badge badge-target">${tgtLang ? tgtLang.flag : '🌐'} ${tgtLang ? tgtLang.name : item.targetLang}</span>
                        </div>
                        <span class="favorite-star-badge" aria-hidden="true">⭐</span>
                    </div>

                    <div class="history-card-body">
                        <p class="history-orig">${this._escapeHtml(item.originalText)}</p>
                        <p class="history-trans">${this._escapeHtml(item.translatedText)}</p>
                    </div>

                    <div class="history-card-actions">
                        <button class="btn-chip btn-replay-favorite" data-id="${item.id}" title="Play speech">
                            <span aria-hidden="true">🔊</span> Listen
                        </button>
                        <button class="btn-chip btn-copy-favorite" data-text="${this._escapeHtml(item.translatedText)}" title="Copy translation">
                            <span aria-hidden="true">📋</span> Copy
                        </button>
                        <button class="btn-chip btn-chip-danger btn-delete-favorite" data-id="${item.id}" title="Remove from favorites">
                            <span aria-hidden="true">🗑️</span> Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Non-intrusive Toast Notification
     */
    showToast(message, type = 'info', duration = 3000) {
        if (!this.elements.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';
        if (type === 'copied') icon = '📋';

        toast.innerHTML = `
            <span class="toast-icon" aria-hidden="true">${icon}</span>
            <span class="toast-message">${this._escapeHtml(message)}</span>
        `;

        this.elements.toastContainer.appendChild(toast);

        // Trigger entrance animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Copy text to clipboard with animated feedback
     */
    async copyToClipboard(text, targetButton = null) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers / non-https
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            if (targetButton) {
                const originalHtml = targetButton.innerHTML;
                targetButton.innerHTML = '<span aria-hidden="true">✅</span> Copied!';
                targetButton.classList.add('copied');
                setTimeout(() => {
                    targetButton.innerHTML = originalHtml;
                    targetButton.classList.remove('copied');
                }, 2000);
            }

            this.showToast('Copied to clipboard!', 'success', 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
            this.showToast('Failed to copy text.', 'error');
        }
    }

    _escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }
}

const uiController = new UIController();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIController, uiController };
}

/**
 * LinguaVoice - Main Application Controller
 * Initializes all modules, wires event handlers, manages keyboard shortcuts,
 * and coordinates data flow between Translation, Speech, History, and UI.
 */

document.addEventListener('DOMContentLoaded', () => {
    LinguaVoiceApp.init();
});

const LinguaVoiceApp = {
    init() {
        console.log('Initializing LinguaVoice...');

        // 1. Cache UI Elements
        uiController.cacheElements();

        // 2. Initialize Language Dropdowns (Default: Auto Detect -> Tamil)
        const defaultSource = 'auto';
        const defaultTarget = 'ta';
        translatorController.setSourceLanguage(defaultSource);
        translatorController.setTargetLanguage(defaultTarget);
        uiController.populateLanguageDropdowns(defaultSource, defaultTarget);
        uiController.updateVoiceOptions(defaultTarget);

        // 3. Connect Speech Engine Callbacks
        speechEngine.onVoicesLoaded = (voices) => {
            uiController.updateVoiceOptions(translatorController.currentTargetLang);
        };

        speechEngine.onStateChange = (state) => {
            uiController.updateSpeechUI(state);
        };

        speechEngine.onError = (errMsg) => {
            uiController.showToast(errMsg, 'error');
        };

        // 4. Connect Translator Callbacks
        translatorController.onTranslateStart = () => {
            uiController.setLoading(true);
        };

        translatorController.onTranslateSuccess = (data) => {
            uiController.setLoading(false);
            uiController.displayTranslation(data);
            uiController.renderHistory();
            uiController.showToast(`Translated to ${getLanguageByCode(data.targetLang)?.name || data.targetLang}!`, 'success', 2500);
        };

        translatorController.onTranslateError = (err) => {
            uiController.setLoading(false);
            uiController.showToast(err.message || 'Translation failed.', 'error', 4000);
        };

        // 5. Setup Event Listeners & Shortcuts
        this.attachEventListeners();
        this.setupKeyboardShortcuts();

        // 6. Initial Render of History & Favorites
        uiController.renderHistory();
        uiController.renderFavorites();
        uiController.updateInputCounter('');

        // 7. Initialize Ollama Offline LLM Engine
        this.initOllama();

        // 8. Register Offline Service Worker for 100% browser caching
        if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
            navigator.serviceWorker.register('./service-worker.js').then((reg) => {
                console.log('ServiceWorker registered successfully (Offline ready):', reg.scope);
            }).catch((err) => {
                console.log('ServiceWorker registration skipped:', err);
            });
        }

        console.log('LinguaVoice Ready.');
    },

    async initOllama() {
        const el = uiController.elements;
        if (el.ollamaToggle) {
            el.ollamaToggle.checked = translationService.ollamaEnabled;
        }
        if (el.strictOfflineToggle) {
            el.strictOfflineToggle.checked = translationService.strictOfflineMode;
        }

        try {
            const status = await translationService.checkOllamaStatus();
            
            // Prefer lightning-fast non-reasoning models (e.g. qwen2.5:1.5b) over slow thinking models (qwen3.5:4b)
            let chosenModel = translationService.ollamaModel;
            const fastModel = status.models.find(m => m.includes('qwen2.5:1.5b')) || status.models.find(m => m.includes('qwen2.5'));
            
            if (fastModel && (!chosenModel || chosenModel.includes('qwen3.5') || !status.models.includes(chosenModel))) {
                chosenModel = fastModel;
                translationService.ollamaModel = chosenModel;
                try { localStorage.setItem('linguavoice_ollama_model', chosenModel); } catch (e) {}
            } else if (status.models.length > 0 && !status.models.includes(chosenModel)) {
                chosenModel = status.models[0];
                translationService.ollamaModel = chosenModel;
                try { localStorage.setItem('linguavoice_ollama_model', chosenModel); } catch (e) {}
            }

            uiController.updateOllamaStatus({
                running: status.running,
                models: status.models,
                selectedModel: chosenModel
            });
        } catch (err) {
            uiController.updateOllamaStatus({ running: false, models: [] });
        }
    },

    attachEventListeners() {
        const el = uiController.elements;

        // --- Text Input & Counters ---
        if (el.sourceTextInput) {
            el.sourceTextInput.addEventListener('input', (e) => {
                uiController.updateInputCounter(e.target.value);
            });
        }

        if (el.clearInputBtn) {
            el.clearInputBtn.addEventListener('click', () => {
                this.clearInput();
            });
        }

        // --- Language Selectors ---
        if (el.sourceLangSelect) {
            el.sourceLangSelect.addEventListener('change', (e) => {
                const sourceCode = e.target.value;
                translatorController.setSourceLanguage(sourceCode);
                const currentInput = el.sourceTextInput ? el.sourceTextInput.value.trim() : '';
                if (currentInput) {
                    translatorController.translateSentence(currentInput, false);
                }
            });
        }

        if (el.targetLangSelect) {
            el.targetLangSelect.addEventListener('change', (e) => {
                const targetCode = e.target.value;
                translatorController.setTargetLanguage(targetCode);
                uiController.updateVoiceOptions(targetCode);

                // Update the target badge immediately
                const targetLangObj = getLanguageByCode(targetCode);
                if (el.targetLangBadge) {
                    el.targetLangBadge.innerHTML = `
                        ${targetLangObj ? targetLangObj.flag : '🌐'} ${targetLangObj ? targetLangObj.name : targetCode}
                        ${targetLangObj?.nativeName ? `• <span class="badge-native">${targetLangObj.nativeName}</span>` : ''}
                    `;
                }
                
                // If there is already input text, re-translate to new target language
                const currentInput = el.sourceTextInput ? el.sourceTextInput.value.trim() : '';
                if (currentInput) {
                    translatorController.translateSentence(currentInput, false);
                }
            });
        }

        if (el.swapLangsBtn) {
            el.swapLangsBtn.addEventListener('click', () => {
                this.handleSwapLanguages();
            });
        }

        // --- Translation Triggers ---
        if (el.translateSpeakBtn) {
            el.translateSpeakBtn.addEventListener('click', () => {
                this.handleTranslate(true);
            });
        }

        if (el.translateOnlyBtn) {
            el.translateOnlyBtn.addEventListener('click', () => {
                this.handleTranslate(false);
            });
        }

        // --- Speech Playback Controls ---
        if (el.playTranslationBtn) {
            el.playTranslationBtn.addEventListener('click', () => {
                this.handlePlayTranslation();
            });
        }

        if (el.pauseSpeechBtn) {
            el.pauseSpeechBtn.addEventListener('click', () => {
                speechEngine.pause();
            });
        }

        if (el.resumeSpeechBtn) {
            el.resumeSpeechBtn.addEventListener('click', () => {
                speechEngine.resume();
            });
        }

        if (el.stopSpeechBtn) {
            el.stopSpeechBtn.addEventListener('click', () => {
                speechEngine.stop();
            });
        }

        if (el.replaySpeechBtn) {
            el.replaySpeechBtn.addEventListener('click', () => {
                this.handlePlayTranslation();
            });
        }

        // --- Voice Sliders & Settings ---
        if (el.speedSlider) {
            el.speedSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                speechEngine.setRate(val);
                if (el.speedDisplay) {
                    el.speedDisplay.textContent = `${val.toFixed(1)}x`;
                }
            });
        }

        if (el.pitchSlider) {
            el.pitchSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                speechEngine.setPitch(val);
                if (el.pitchDisplay) {
                    el.pitchDisplay.textContent = val.toFixed(1);
                }
            });
        }

        if (el.voiceSelect) {
            el.voiceSelect.addEventListener('change', (e) => {
                speechEngine.selectedVoiceIndex = parseInt(e.target.value, 10);
            });
        }

        // --- Copy & Favorite Actions ---
        if (el.copyTranslationBtn) {
            el.copyTranslationBtn.addEventListener('click', () => {
                if (translatorController.lastTranslation) {
                    uiController.copyToClipboard(translatorController.lastTranslation.translatedText, el.copyTranslationBtn);
                }
            });
        }

        if (el.favoriteBtn) {
            el.favoriteBtn.addEventListener('click', () => {
                if (translatorController.lastTranslation) {
                    const { sourceLang, targetLang, originalText, translatedText, speechCode } = translatorController.lastTranslation;
                    const isNowFav = favoritesManager.toggle(sourceLang, targetLang, originalText, translatedText, speechCode);
                    uiController.updateFavoriteButtonState(originalText, targetLang);
                    uiController.renderFavorites();
                    uiController.renderHistory();
                    uiController.showToast(isNowFav ? 'Added to Favorites ⭐' : 'Removed from Favorites', isNowFav ? 'success' : 'info');
                }
            });
        }

        // --- Microphone / Speech Recognition ---
        if (el.micBtn) {
            el.micBtn.addEventListener('click', () => {
                const sourceCode = translatorController.currentSourceLang;
                const speechCode = sourceCode === 'auto' ? 'en-US' : getSpeechCode(sourceCode);
                
                speechEngine.toggleVoiceInput(
                    speechCode,
                    (transcript) => {
                        if (el.sourceTextInput) {
                            el.sourceTextInput.value = transcript;
                            uiController.updateInputCounter(transcript);
                        }
                    },
                    (isListening) => {
                        if (isListening) {
                            el.micBtn.classList.add('recording');
                            el.micBtn.setAttribute('title', 'Listening... Click to stop');
                            uiController.showToast('Listening... Speak now', 'info', 2000);
                        } else {
                            el.micBtn.classList.remove('recording');
                            el.micBtn.setAttribute('title', 'Speak input (Microphone)');
                            if (el.sourceTextInput && el.sourceTextInput.value.trim().length > 0) {
                                uiController.showToast('Voice transcribed!', 'success', 2000);
                            }
                        }
                    }
                );
            });
        }

        // --- Quick File Upload (.txt) ---
        if (el.fileInput) {
            el.fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!file.name.endsWith('.txt')) {
                    uiController.showToast('Please select a valid .txt plain text file.', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    if (el.sourceTextInput) {
                        const content = event.target.result.slice(0, 1000);
                        el.sourceTextInput.value = content;
                        uiController.updateInputCounter(content);
                        uiController.showToast(`Loaded "${file.name}"`, 'success');
                    }
                };
                reader.onerror = () => {
                    uiController.showToast('Error reading file.', 'error');
                };
                reader.readAsText(file);
                e.target.value = '';
            });
        }

        // --- Quick Sample Phrases ---
        const sampleButtons = document.querySelectorAll('.sample-chip');
        sampleButtons.forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.getAttribute('data-text');
                const source = chip.getAttribute('data-source') || 'auto';
                const target = chip.getAttribute('data-target') || 'ta';
                if (el.sourceTextInput && text) {
                    el.sourceTextInput.value = text;
                    uiController.updateInputCounter(text);
                    
                    if (el.sourceLangSelect) {
                        el.sourceLangSelect.value = source;
                        translatorController.setSourceLanguage(source);
                    }
                    
                    if (el.targetLangSelect) {
                        el.targetLangSelect.value = target;
                        translatorController.setTargetLanguage(target);
                        uiController.updateVoiceOptions(target);

                        const targetLangObj = getLanguageByCode(target);
                        if (el.targetLangBadge) {
                            el.targetLangBadge.innerHTML = `
                                ${targetLangObj ? targetLangObj.flag : '🌐'} ${targetLangObj ? targetLangObj.name : target}
                                ${targetLangObj?.nativeName ? `• <span class="badge-native">${targetLangObj.nativeName}</span>` : ''}
                            `;
                        }
                    }
                    this.handleTranslate(true);
                }
            });
        });

        // --- Tab Switching (History vs Favorites) ---
        if (el.tabBtns) {
            el.tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetTab = btn.getAttribute('data-tab');
                    el.tabBtns.forEach(b => b.classList.remove('active'));
                    el.tabPanes.forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    const activePane = document.getElementById(`${targetTab}-pane`);
                    if (activePane) activePane.classList.add('active');
                });
            });
        }

        // --- History Card Actions Delegation ---
        if (el.historyList) {
            el.historyList.addEventListener('click', (e) => {
                const replayBtn = e.target.closest('.btn-replay-history');
                const copyBtn = e.target.closest('.btn-copy-history');
                const favBtn = e.target.closest('.btn-favorite-history');
                const deleteBtn = e.target.closest('.btn-delete-history');
                const historyCard = e.target.closest('.history-card');

                if (replayBtn) {
                    e.stopPropagation();
                    const id = replayBtn.getAttribute('data-id');
                    const item = historyManager.getItemById(id);
                    if (item) {
                        speechEngine.speak(item.translatedText, item.speechCode);
                    }
                    return;
                }

                if (copyBtn) {
                    e.stopPropagation();
                    const text = copyBtn.getAttribute('data-text');
                    uiController.copyToClipboard(text, copyBtn);
                    return;
                }

                if (favBtn) {
                    e.stopPropagation();
                    const id = favBtn.getAttribute('data-id');
                    const item = historyManager.getItemById(id);
                    if (item) {
                        favoritesManager.toggle(item.sourceLang, item.targetLang, item.originalText, item.translatedText, item.speechCode);
                        uiController.renderHistory();
                        uiController.renderFavorites();
                        if (translatorController.lastTranslation) {
                            uiController.updateFavoriteButtonState(
                                translatorController.lastTranslation.originalText,
                                translatorController.lastTranslation.targetLang
                            );
                        }
                    }
                    return;
                }

                if (deleteBtn) {
                    e.stopPropagation();
                    const id = deleteBtn.getAttribute('data-id');
                    historyManager.deleteItem(id);
                    uiController.renderHistory();
                    uiController.showToast('Item removed from history.', 'info', 2000);
                    return;
                }

                // If user clicks on the card body, load into editor
                if (historyCard) {
                    const id = historyCard.getAttribute('data-id');
                    const item = historyManager.getItemById(id);
                    if (item && el.sourceTextInput) {
                        el.sourceTextInput.value = item.originalText;
                        uiController.updateInputCounter(item.originalText);
                        if (el.sourceLangSelect) el.sourceLangSelect.value = item.sourceLang;
                        if (el.targetLangSelect) el.targetLangSelect.value = item.targetLang;
                        translatorController.setSourceLanguage(item.sourceLang);
                        translatorController.setTargetLanguage(item.targetLang);
                        uiController.updateVoiceOptions(item.targetLang);
                        translatorController.translateSentence(item.originalText, false);
                        uiController.showToast('Loaded translation from history', 'info', 2000);
                    }
                }
            });
        }

        // --- Favorites Card Actions Delegation ---
        if (el.favoritesList) {
            el.favoritesList.addEventListener('click', (e) => {
                const replayBtn = e.target.closest('.btn-replay-favorite');
                const copyBtn = e.target.closest('.btn-copy-favorite');
                const deleteBtn = e.target.closest('.btn-delete-favorite');

                if (replayBtn) {
                    e.stopPropagation();
                    const id = replayBtn.getAttribute('data-id');
                    const item = favoritesManager.getAll().find(f => f.id === id);
                    if (item) {
                        speechEngine.speak(item.translatedText, item.speechCode);
                    }
                    return;
                }

                if (copyBtn) {
                    e.stopPropagation();
                    const text = copyBtn.getAttribute('data-text');
                    uiController.copyToClipboard(text, copyBtn);
                    return;
                }

                if (deleteBtn) {
                    e.stopPropagation();
                    const id = deleteBtn.getAttribute('data-id');
                    favoritesManager.remove(id);
                    uiController.renderFavorites();
                    uiController.renderHistory();
                    if (translatorController.lastTranslation) {
                        uiController.updateFavoriteButtonState(
                            translatorController.lastTranslation.originalText,
                            translatorController.lastTranslation.targetLang
                        );
                    }
                    uiController.showToast('Removed from favorites.', 'info', 2000);
                }
            });
        }

        // --- Clear Buttons ---
        if (el.clearHistoryBtn) {
            el.clearHistoryBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your translation history?')) {
                    historyManager.clear();
                    uiController.renderHistory();
                    uiController.showToast('Translation history cleared.', 'info');
                }
            });
        }

        if (el.clearFavoritesBtn) {
            el.clearFavoritesBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all saved favorites?')) {
                    favoritesManager.clear();
                    uiController.renderFavorites();
                    uiController.renderHistory();
                    if (translatorController.lastTranslation) {
                        uiController.updateFavoriteButtonState(
                            translatorController.lastTranslation.originalText,
                            translatorController.lastTranslation.targetLang
                        );
                    }
                    uiController.showToast('Favorites cleared.', 'info');
                }
            });
        }

        // --- Offline LLM Engine Controls ---
        if (el.ollamaToggle) {
            el.ollamaToggle.addEventListener('change', (e) => {
                translationService.ollamaEnabled = e.target.checked;
                localStorage.setItem('linguavoice_ollama_enabled', e.target.checked);
                uiController.showToast(
                    e.target.checked ? 'Offline LLM Mode Enabled (Ollama)' : 'Cloud Translation Mode Enabled',
                    'info',
                    2000
                );
            });
        }

        if (el.ollamaModelSelect) {
            el.ollamaModelSelect.addEventListener('change', (e) => {
                translationService.ollamaModel = e.target.value;
                localStorage.setItem('linguavoice_ollama_model', e.target.value);
                uiController.showToast(`Active LLM Model: ${e.target.value}`, 'success', 2000);
            });
        }

        if (el.strictOfflineToggle) {
            el.strictOfflineToggle.addEventListener('change', (e) => {
                translationService.strictOfflineMode = e.target.checked;
                localStorage.setItem('linguavoice_strict_offline', e.target.checked);
                uiController.showToast(
                    e.target.checked ? 'Strict Offline Mode Active (Zero cloud calls)' : 'Cloud fallback permitted',
                    'info',
                    2500
                );
            });
        }

        if (el.refreshOllamaBtn) {
            el.refreshOllamaBtn.addEventListener('click', async () => {
                uiController.showToast('Checking Ollama status...', 'info', 1500);
                await this.initOllama();
                uiController.showToast('Ollama status updated!', 'success', 2000);
            });
        }
    },

    handleTranslate(autoSpeak = false) {
        const text = uiController.elements.sourceTextInput ? uiController.elements.sourceTextInput.value.trim() : '';
        if (!text) {
            uiController.showToast('Please enter a sentence to translate.', 'error');
            if (uiController.elements.sourceTextInput) uiController.elements.sourceTextInput.focus();
            return;
        }
        translatorController.translateSentence(text, autoSpeak);
    },

    handlePlayTranslation() {
        if (!translatorController.lastTranslation || !translatorController.lastTranslation.translatedText) {
            uiController.showToast('No translated text available to play.', 'error');
            return;
        }

        const voiceIndex = uiController.elements.voiceSelect ? parseInt(uiController.elements.voiceSelect.value, 10) : -1;
        const rate = uiController.elements.speedSlider ? parseFloat(uiController.elements.speedSlider.value) : 1.0;
        const pitch = uiController.elements.pitchSlider ? parseFloat(uiController.elements.pitchSlider.value) : 1.0;

        speechEngine.speak(
            translatorController.lastTranslation.translatedText,
            translatorController.lastTranslation.speechCode,
            { voiceIndex, rate, pitch }
        );
    },

    handleSwapLanguages() {
        const swapped = translatorController.swapLanguages();
        
        if (uiController.elements.sourceLangSelect) {
            uiController.elements.sourceLangSelect.value = swapped.source;
        }
        if (uiController.elements.targetLangSelect) {
            uiController.elements.targetLangSelect.value = swapped.target;
        }

        uiController.updateVoiceOptions(swapped.target);

        // If there was a translation result, swap the text boxes too
        if (translatorController.lastTranslation && translatorController.lastTranslation.translatedText) {
            const previousTrans = translatorController.lastTranslation.translatedText;
            if (uiController.elements.sourceTextInput) {
                uiController.elements.sourceTextInput.value = previousTrans;
                uiController.updateInputCounter(previousTrans);
            }
            // Trigger translation in the reverse direction
            this.handleTranslate(false);
        }

        uiController.showToast(`Swapped: ${getLanguageByCode(swapped.source)?.name} ⇄ ${getLanguageByCode(swapped.target)?.name}`, 'info', 2000);
    },

    clearInput() {
        if (uiController.elements.sourceTextInput) {
            uiController.elements.sourceTextInput.value = '';
            uiController.updateInputCounter('');
            uiController.elements.sourceTextInput.focus();
        }
        speechEngine.stop();
        uiController.showToast('Input cleared.', 'info', 1500);
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter or Cmd+Enter: Translate & Speak
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleTranslate(true);
                return;
            }

            // Alt+P: Play / Pause
            if (e.altKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                if (speechEngine.isPlaying && !speechEngine.isPaused) {
                    speechEngine.pause();
                } else if (speechEngine.isPaused) {
                    speechEngine.resume();
                } else {
                    this.handlePlayTranslation();
                }
                return;
            }

            // Alt+S: Stop speech
            if (e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                speechEngine.stop();
                return;
            }

            // Alt+X: Swap languages
            if (e.altKey && (e.key === 'x' || e.key === 'X')) {
                e.preventDefault();
                this.handleSwapLanguages();
                return;
            }

            // Alt+C: Clear input
            if (e.altKey && (e.key === 'c' || e.key === 'C')) {
                if (document.activeElement !== uiController.elements.sourceTextInput) {
                    e.preventDefault();
                    this.clearInput();
                }
            }
        });
    }
};

window.LinguaVoiceApp = LinguaVoiceApp;

/**
 * LinguaVoice - History Management
 * Manages translation history in browser localStorage (up to 20 items).
 */

class HistoryManager {
    constructor(storageKey = 'linguavoice_history', maxItems = 20) {
        this.storageKey = storageKey;
        this.maxItems = maxItems;
        this.history = [];
        this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            this.history = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(this.history)) {
                this.history = [];
            }
        } catch (e) {
            console.error('Failed to load history from localStorage:', e);
            this.history = [];
        }
        return this.history;
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save history to localStorage:', e);
        }
    }

    /**
     * Add new translation item to history
     */
    addItem(sourceLang, targetLang, originalText, translatedText, speechCode = '') {
        if (!originalText || !translatedText) return null;

        // Prevent exact consecutive duplicates
        if (this.history.length > 0) {
            const first = this.history[0];
            if (first.originalText === originalText && first.targetLang === targetLang && first.translatedText === translatedText) {
                return first;
            }
        }

        const item = {
            id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            sourceLang,
            targetLang,
            originalText: originalText.trim(),
            translatedText: translatedText.trim(),
            speechCode: speechCode || getSpeechCode(targetLang),
            timestamp: new Date().toISOString(),
            formattedTime: this._formatTime(new Date())
        };

        this.history.unshift(item);

        // Keep within limit
        if (this.history.length > this.maxItems) {
            this.history = this.history.slice(0, this.maxItems);
        }

        this.save();
        return item;
    }

    deleteItem(id) {
        this.history = this.history.filter(item => item.id !== id);
        this.save();
        return this.history;
    }

    clear() {
        this.history = [];
        this.save();
        return this.history;
    }

    getAll() {
        return this.history;
    }

    getItemById(id) {
        return this.history.find(item => item.id === id) || null;
    }

    _formatTime(date) {
        try {
            return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                month: 'short',
                day: 'numeric'
            }).format(date);
        } catch (e) {
            return date.toLocaleTimeString();
        }
    }
}

const historyManager = new HistoryManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HistoryManager, historyManager };
}

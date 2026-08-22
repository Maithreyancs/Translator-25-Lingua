/**
 * LinguaVoice - Favorites Management
 * Manages starred/saved translations in browser localStorage.
 */

class FavoritesManager {
    constructor(storageKey = 'linguavoice_favorites') {
        this.storageKey = storageKey;
        this.favorites = [];
        this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            this.favorites = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(this.favorites)) {
                this.favorites = [];
            }
        } catch (e) {
            console.error('Failed to load favorites from localStorage:', e);
            this.favorites = [];
        }
        return this.favorites;
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
        } catch (e) {
            console.error('Failed to save favorites to localStorage:', e);
        }
    }

    /**
     * Add an item to favorites
     */
    add(sourceLang, targetLang, originalText, translatedText, speechCode = '') {
        if (!originalText || !translatedText) return null;

        // Check if already in favorites
        const existing = this.favorites.find(
            f => f.originalText.toLowerCase() === originalText.trim().toLowerCase() && f.targetLang === targetLang
        );
        if (existing) return existing;

        const fav = {
            id: 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            sourceLang,
            targetLang,
            originalText: originalText.trim(),
            translatedText: translatedText.trim(),
            speechCode: speechCode || getSpeechCode(targetLang),
            timestamp: new Date().toISOString(),
            formattedTime: this._formatTime(new Date())
        };

        this.favorites.unshift(fav);
        this.save();
        return fav;
    }

    /**
     * Remove by ID
     */
    remove(id) {
        this.favorites = this.favorites.filter(item => item.id !== id);
        this.save();
        return this.favorites;
    }

    /**
     * Toggle favorite status based on text and target language
     * @returns {boolean} true if now favorited, false if removed
     */
    toggle(sourceLang, targetLang, originalText, translatedText, speechCode = '') {
        const existing = this.find(originalText, targetLang);
        if (existing) {
            this.remove(existing.id);
            return false;
        } else {
            this.add(sourceLang, targetLang, originalText, translatedText, speechCode);
            return true;
        }
    }

    /**
     * Check if a translation is already favorited
     */
    isFavorite(originalText, targetLang) {
        return Boolean(this.find(originalText, targetLang));
    }

    /**
     * Find favorite object
     */
    find(originalText, targetLang) {
        if (!originalText) return null;
        const norm = originalText.trim().toLowerCase();
        return this.favorites.find(f => f.originalText.toLowerCase() === norm && f.targetLang === targetLang) || null;
    }

    getAll() {
        return this.favorites;
    }

    clear() {
        this.favorites = [];
        this.save();
        return this.favorites;
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

const favoritesManager = new FavoritesManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FavoritesManager, favoritesManager };
}

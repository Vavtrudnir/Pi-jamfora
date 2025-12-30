// Pi Calculator Pro - Storage Management
// Standalone version with localStorage support

class StorageManager {
    constructor() {
        this.keys = {
            history: 'piCalculationHistory',
            settings: 'piCalculatorSettings',
            version: 'piCalculatorVersion'
        };
        this.currentVersion = '1.0.0';
        
        this.init();
    }

    init() {
        // Check for version upgrades
        this.checkVersion();
        
        // Cleanup old data if needed
        this.cleanup();
    }

    checkVersion() {
        const storedVersion = localStorage.getItem(this.keys.version);
        
        if (!storedVersion || storedVersion !== this.currentVersion) {
            console.log(`Upgrading from version ${storedVersion || 'unknown'} to ${this.currentVersion}`);
            this.migrateData(storedVersion);
            localStorage.setItem(this.keys.version, this.currentVersion);
        }
    }

    migrateData(fromVersion) {
        // Handle data migration between versions
        if (!fromVersion) {
            // First time installation
            console.log('First time installation detected');
        } else if (fromVersion.startsWith('0.')) {
            // Migrate from version 0.x to 1.x
            console.log('Migrating from legacy version');
            this.migrateFromLegacy();
        }
    }

    migrateFromLegacy() {
        // Handle any legacy data migration here
        try {
            const legacyHistory = localStorage.getItem('piHistory');
            if (legacyHistory) {
                // Convert legacy format to new format
                const history = JSON.parse(legacyHistory);
                this.saveHistory(history);
                localStorage.removeItem('piHistory');
            }
        } catch (error) {
            console.warn('Failed to migrate legacy data:', error);
        }
    }

    cleanup() {
        // Clean up any corrupted or invalid data
        try {
            // Validate and clean history
            const history = this.loadHistory();
            const validHistory = history.filter(item => 
                item && 
                item.pi && 
                item.digits && 
                item.timestamp &&
                !isNaN(new Date(item.timestamp).getTime())
            );
            
            if (validHistory.length !== history.length) {
                console.log(`Cleaned up ${history.length - validHistory.length} invalid history items`);
                this.saveHistory(validHistory);
            }

            // Validate settings
            const settings = this.loadSettings();
            const validSettings = {
                autoSaveHistory: Boolean(settings.autoSaveHistory),
                showVisualization: Boolean(settings.showVisualization),
                soundEffects: Boolean(settings.soundEffects),
                maxDecimals: Number(settings.maxDecimals) || 10000000,
                darkMode: Boolean(settings.darkMode)
            };
            
            this.saveSettings(validSettings);
            
        } catch (error) {
            console.warn('Cleanup failed:', error);
        }
    }

    // History management
    saveHistory(history) {
        try {
            const data = JSON.stringify(history);
            localStorage.setItem(this.keys.history, data);
            return true;
        } catch (error) {
            console.error('Failed to save history:', error);
            return false;
        }
    }

    loadHistory() {
        try {
            const data = localStorage.getItem(this.keys.history);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    addToHistory(calculation) {
        try {
            const history = this.loadHistory();
            
            // Add new calculation to the beginning
            history.unshift(calculation);
            
            // Limit history size (keep last 100 items)
            if (history.length > 100) {
                history.splice(100);
            }
            
            this.saveHistory(history);
            return true;
        } catch (error) {
            console.error('Failed to add to history:', error);
            return false;
        }
    }

    removeFromHistory(index) {
        try {
            const history = this.loadHistory();
            if (index >= 0 && index < history.length) {
                history.splice(index, 1);
                this.saveHistory(history);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to remove from history:', error);
            return false;
        }
    }

    clearHistory() {
        try {
            localStorage.removeItem(this.keys.history);
            return true;
        } catch (error) {
            console.error('Failed to clear history:', error);
            return false;
        }
    }

    // Settings management
    saveSettings(settings) {
        try {
            const data = JSON.stringify(settings);
            localStorage.setItem(this.keys.settings, data);
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    loadSettings() {
        try {
            const data = localStorage.getItem(this.keys.settings);
            return data ? JSON.parse(data) : this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            autoSaveHistory: true,
            showVisualization: false,
            soundEffects: false,
            maxDecimals: 10000000,
            darkMode: false
        };
    }

    // Export/Import functionality
    exportData() {
        try {
            const data = {
                version: this.currentVersion,
                exportDate: new Date().toISOString(),
                settings: this.loadSettings(),
                history: this.loadHistory()
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            if (!data.version || !data.settings) {
                throw new Error('Invalid data format');
            }
            
            // Import settings
            if (data.settings) {
                this.saveSettings(data.settings);
            }
            
            // Import history
            if (data.history && Array.isArray(data.history)) {
                this.saveHistory(data.history);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    // Storage info
    getStorageInfo() {
        try {
            const info = {
                quota: navigator.storage?.estimate ? null : 'Unknown',
                usage: 'Unknown',
                historySize: 0,
                settingsSize: 0,
                totalSize: 0
            };

            // Calculate sizes
            const history = localStorage.getItem(this.keys.history);
            const settings = localStorage.getItem(this.keys.settings);
            
            info.historySize = history ? history.length : 0;
            info.settingsSize = settings ? settings.length : 0;
            info.totalSize = info.historySize + info.settingsSize;

            // Get quota if available
            if (navigator.storage && navigator.storage.estimate) {
                navigator.storage.estimate().then(estimate => {
                    info.quota = estimate.quota;
                    info.usage = estimate.usage;
                });
            }

            return info;
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return {
                quota: 'Unknown',
                usage: 'Unknown',
                historySize: 0,
                settingsSize: 0,
                totalSize: 0
            };
        }
    }

    // Utility methods
    clearAllData() {
        try {
            localStorage.removeItem(this.keys.history);
            localStorage.removeItem(this.keys.settings);
            localStorage.removeItem(this.keys.version);
            return true;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            return false;
        }
    }

    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Backup and restore
    createBackup() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                version: this.currentVersion,
                data: {
                    history: this.loadHistory(),
                    settings: this.loadSettings()
                }
            };
            
            return btoa(JSON.stringify(backup)); // Base64 encode for safe storage
        } catch (error) {
            console.error('Failed to create backup:', error);
            return null;
        }
    }

    restoreBackup(backupString) {
        try {
            const backup = JSON.parse(atob(backupString)); // Base64 decode
            
            if (!backup.data || !backup.version) {
                throw new Error('Invalid backup format');
            }
            
            // Restore data
            if (backup.data.history) {
                this.saveHistory(backup.data.history);
            }
            
            if (backup.data.settings) {
                this.saveSettings(backup.data.settings);
            }
            
            console.log(`Restored backup from ${backup.timestamp}`);
            return true;
        } catch (error) {
            console.error('Failed to restore backup:', error);
            return false;
        }
    }
}

// Initialize storage manager
const storageManager = new StorageManager();

// Export for global access
window.storageManager = storageManager;

// Pi Calculator Pro - Storage and Data Management Module
// Local storage, IndexedDB, and data persistence

class PiStorageManager {
    constructor() {
        this.dbName = 'PiCalculatorDB';
        this.dbVersion = 1;
        this.db = null;
        this.cacheName = 'pi-calculator-v1';
        
        this.init();
    }

    async init() {
        await this.initIndexedDB();
        await this.initCache();
        this.setupEventListeners();
    }

    // IndexedDB initialization
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('calculations')) {
                    const calculationStore = db.createObjectStore('calculations', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    calculationStore.createIndex('timestamp', 'timestamp', { unique: false });
                    calculationStore.createIndex('digits', 'digits', { unique: false });
                    calculationStore.createIndex('algorithm', 'algorithm', { unique: false });
                }

                if (!db.objectStoreNames.contains('piDigits')) {
                    const digitsStore = db.createObjectStore('piDigits', { 
                        keyPath: 'range' 
                    });
                    digitsStore.createIndex('startDigit', 'startDigit', { unique: false });
                    digitsStore.createIndex('endDigit', 'endDigit', { unique: false });
                }

                if (!db.objectStoreNames.contains('benchmarks')) {
                    const benchmarkStore = db.createObjectStore('benchmarks', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    benchmarkStore.createIndex('algorithm', 'algorithm', { unique: false });
                    benchmarkStore.createIndex('digits', 'digits', { unique: false });
                }
            };
        });
    }

    // Cache initialization for PWA
    async initCache() {
        if ('caches' in window) {
            try {
                this.cache = await caches.open(this.cacheName);
            } catch (error) {
                console.warn('Cache initialization failed:', error);
            }
        }
    }

    setupEventListeners() {
        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'piCalculatorHistory') {
                this.notifyHistoryUpdate();
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    }

    // Calculation storage
    async saveCalculation(calculationData) {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calculations'], 'readwrite');
            const store = transaction.objectStore('calculations');
            
            const request = store.add({
                ...calculationData,
                timestamp: new Date().toISOString(),
                id: Date.now()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getCalculations(limit = 50, offset = 0) {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calculations'], 'readonly');
            const store = transaction.objectStore('calculations');
            const index = store.index('timestamp');
            
            const request = index.openCursor(null, 'prev');
            const results = [];
            let count = 0;
            let skipped = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && count < limit) {
                    if (skipped >= offset) {
                        results.push(cursor.value);
                        count++;
                    } else {
                        skipped++;
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async deleteCalculation(id) {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calculations'], 'readwrite');
            const store = transaction.objectStore('calculations');
            
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async clearCalculations() {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calculations'], 'readwrite');
            const store = transaction.objectStore('calculations');
            
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Pi digits storage for caching
    async savePiDigits(startDigit, endDigit, digits) {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['piDigits'], 'readwrite');
            const store = transaction.objectStore('piDigits');
            
            const request = store.put({
                range: `${startDigit}-${endDigit}`,
                startDigit,
                endDigit,
                digits,
                timestamp: new Date().toISOString()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPiDigits(startDigit, endDigit) {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['piDigits'], 'readonly');
            const store = transaction.objectStore('piDigits');
            
            const request = store.get(`${startDigit}-${endDigit}`);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Benchmark storage
    async saveBenchmark(benchmarkData) {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['benchmarks'], 'readwrite');
            const store = transaction.objectStore('benchmarks');
            
            const request = store.add({
                ...benchmarkData,
                timestamp: new Date().toISOString(),
                id: Date.now()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getBenchmarks(algorithm = null) {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['benchmarks'], 'readonly');
            const store = transaction.objectStore('benchmarks');
            
            let request;
            if (algorithm) {
                const index = store.index('algorithm');
                request = index.getAll(algorithm);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Cache management for PWA
    async cacheResource(url, response) {
        if (!this.cache) return false;

        try {
            await this.cache.put(url, response.clone());
            return true;
        } catch (error) {
            console.warn('Failed to cache resource:', error);
            return false;
        }
    }

    async getCachedResource(url) {
        if (!this.cache) return null;

        try {
            const response = await this.cache.match(url);
            return response;
        } catch (error) {
            console.warn('Failed to get cached resource:', error);
            return null;
        }
    }

    async clearCache() {
        if (!this.cache) return false;

        try {
            await this.cache.delete('/');
            return true;
        } catch (error) {
            console.warn('Failed to clear cache:', error);
            return false;
        }
    }

    // Data export/import
    async exportData() {
        const calculations = await this.getCalculations(1000); // Export all
        const benchmarks = await this.getBenchmarks();
        
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            calculations,
            benchmarks,
            settings: JSON.parse(localStorage.getItem('piCalculatorSettings') || '{}')
        };

        return exportData;
    }

    async importData(importData) {
        try {
            // Validate import data
            if (!importData.version || !importData.calculations) {
                throw new Error('Invalid import data format');
            }

            // Clear existing data
            await this.clearCalculations();

            // Import calculations
            for (const calculation of importData.calculations) {
                await this.saveCalculation(calculation);
            }

            // Import benchmarks
            if (importData.benchmarks) {
                for (const benchmark of importData.benchmarks) {
                    await this.saveBenchmark(benchmark);
                }
            }

            // Import settings
            if (importData.settings) {
                localStorage.setItem('piCalculatorSettings', JSON.stringify(importData.settings));
            }

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    // Storage optimization
    async optimizeStorage() {
        if (!this.db) return;

        // Clean up old calculations (keep only last 100)
        const calculations = await this.getCalculations(1000);
        if (calculations.length > 100) {
            const toDelete = calculations.slice(100);
            for (const calc of toDelete) {
                await this.deleteCalculation(calc.id);
            }
        }

        // Clean up old benchmarks (keep only last 50)
        const benchmarks = await this.getBenchmarks();
        if (benchmarks.length > 50) {
            const toDelete = benchmarks.slice(50);
            for (const benchmark of toDelete) {
                await this.deleteBenchmark(benchmark.id);
            }
        }
    }

    async deleteBenchmark(id) {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['benchmarks'], 'readwrite');
            const store = transaction.objectStore('benchmarks');
            
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Storage statistics
    async getStorageStats() {
        if (!this.db) return null;

        return new Promise((resolve) => {
            const calculations = this.db.transaction(['calculations']).objectStore('calculations');
            const piDigits = this.db.transaction(['piDigits']).objectStore('piDigits');
            const benchmarks = this.db.transaction(['benchmarks']).objectStore('benchmarks');

            let stats = {
                calculations: 0,
                piDigits: 0,
                benchmarks: 0,
                totalSize: 0
            };

            Promise.all([
                this.countRecords(calculations).then(count => { stats.calculations = count; }),
                this.countRecords(piDigits).then(count => { stats.piDigits = count; }),
                this.countRecords(benchmarks).then(count => { stats.benchmarks = count; })
            ]).then(() => {
                resolve(stats);
            });
        });
    }

    countRecords(store) {
        return new Promise((resolve) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
        });
    }

    // Event handlers
    notifyHistoryUpdate() {
        window.dispatchEvent(new CustomEvent('historyUpdated', {
            detail: { source: 'storage' }
        }));
    }

    handleOnlineStatusChange(isOnline) {
        const status = isOnline ? 'online' : 'offline';
        console.log(`Application is ${status}`);
        
        // Show toast notification
        if (window.app) {
            window.app.showToast(
                isOnline ? 'Ansluten till internet' : 'Arbetar offline',
                isOnline ? 'success' : 'warning'
            );
        }

        // Sync data when coming back online
        if (isOnline) {
            this.syncData();
        }
    }

    async syncData() {
        // Placeholder for cloud synchronization
        console.log('Syncing data with cloud...');
    }

    // Lazy loading for Pi digits
    async loadPiDigitsRange(startDigit, count) {
        // Check cache first
        const cached = await this.getPiDigits(startDigit, startDigit + count - 1);
        if (cached) {
            return cached.digits;
        }

        // If not in cache, you would fetch from an API or calculate
        // For now, return null to indicate it needs to be calculated
        return null;
    }

    // Memory management
    checkMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            return {
                used: Math.round(memory.usedJSHeapSize / 1048576), // MB
                total: Math.round(memory.totalJSHeapSize / 1048576), // MB
                limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
            };
        }
        return null;
    }

    // Cleanup on page unload
    cleanup() {
        if (this.db) {
            this.db.close();
        }
    }
}

// Initialize storage manager
let storageManager;

document.addEventListener('DOMContentLoaded', () => {
    storageManager = new PiStorageManager();
    window.storageManager = storageManager;

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        storageManager.cleanup();
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PiStorageManager;
}

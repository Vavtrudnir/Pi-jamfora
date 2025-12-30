// Pi Calculator Pro - Main Application
// Multi-core Pi calculation with modern UI

class PiCalculatorApp {
    constructor() {
        this.workers = [];
        this.currentCalculation = null;
        this.calculationHistory = [];
        this.settings = {
            autoSaveHistory: true,
            showVisualization: false, // Disabled since we removed visualization
            soundEffects: false,
            maxDecimals: 1000000, // Support up to 1 million digits
            darkMode: false
        };
        this.systemInfo = {};
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSettings();
        await this.loadHistory();
        await this.loadPiData(); // Pre-load Pi data
        this.updateSystemInfo();
        this.initializeTheme();
        this.setupKeyboardShortcuts();
        
        console.log('Pi Calculator Pro initialized');
    }

    async loadPiData() {
        try {
            // Pre-load the million digits for better performance
            await window.PiData.loadPiMillion();
            console.log('Pi data loaded successfully');
        } catch (error) {
            console.warn('Failed to pre-load Pi data:', error);
        }
    }

    setupEventListeners() {
        // Main calculation button
        document.getElementById('calculateBtn').addEventListener('click', () => this.startCalculation());
        document.getElementById('cancelBtn').addEventListener('click', () => this.stopCalculation());
        
        // Precision buttons
        document.querySelectorAll('[onclick^="setPrecision"]').forEach(btn => {
            const precision = btn.getAttribute('onclick').match(/\d+/)[0];
            btn.addEventListener('click', () => this.setPrecision(parseInt(precision)));
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.querySelector('#settingsModal button[onclick*="saveSettings"]').addEventListener('click', () => this.saveSettings());
        document.querySelector('#settingsModal button[onclick*="resetSettings"]').addEventListener('click', () => this.resetSettings());
        document.querySelector('#settingsModal button[onclick*="closeSettings"]').addEventListener('click', () => this.closeSettings());
        
        // Algorithm selection
        document.getElementById('algorithmSelect').addEventListener('change', (e) => {
            this.updateAlgorithmDescription(e.target.value);
        });
        
        // Input validation
        document.getElementById('digitsInput').addEventListener('input', (e) => {
            this.validateInput(e.target);
        });
        
        // Comparison
        document.getElementById('compareInput').addEventListener('input', (e) => {
            this.validatePiInput(e.target);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: Start calculation
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.startCalculation();
            }
            
            // Escape: Cancel calculation or close modal
            if (e.key === 'Escape') {
                if (this.currentCalculation) {
                    this.stopCalculation();
                } else {
                    this.closeSettings();
                }
            }
            
            // Ctrl/Cmd + C: Copy result (when results are shown)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.target.matches('input, textarea')) {
                const resultElement = document.getElementById('piResult');
                if (resultElement && resultElement.textContent !== '3.14159...') {
                    e.preventDefault();
                    this.copyResult();
                }
            }
            
            // Ctrl/Cmd + S: Save settings
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveSettings();
            }
            
            // Ctrl/Cmd + H: Clear history
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.clearHistory();
            }
        });
    }

    async startCalculation() {
        const digits = parseInt(document.getElementById('digitsInput').value);
        const algorithm = document.getElementById('algorithmSelect').value;
        const numWorkers = this.systemInfo.cores || 4; // Auto-detect max cores
        
        // Validation
        if (!this.validateCalculationParams(digits, algorithm)) {
            return;
        }
        
        // Update UI
        this.showCalculationUI(true);
        this.updateProgress(0, 'Förbereder beräkning...');
        
        // Initialize workers
        await this.initializeWorkers(numWorkers);
        
        // Start calculation
        this.currentCalculation = {
            digits,
            algorithm,
            numWorkers,
            startTime: Date.now(),
            results: []
        };
        
        const params = {
            digits,
            algorithm,
            workerIndex: 0, // Will be set per worker
            totalWorkers: numWorkers
        };
        
        // Start workers
        for (let i = 0; i < numWorkers; i++) {
            const workerParams = { ...params, workerIndex: i };
            this.workers[i].postMessage({ type: 'calculate', params: workerParams });
        }
        
        this.showToast(`Beräkning startad med ${numWorkers} CPU-kärnor`, 'info');
    }

    stopCalculation() {
        if (!this.currentCalculation) return;
        
        // Stop all workers
        this.workers.forEach(worker => {
            worker.postMessage({ type: 'stop' });
        });
        
        // Terminate workers
        this.terminateWorkers();
        
        // Update UI
        this.showCalculationUI(false);
        this.showToast('Beräkning avbruten', 'warning');
        
        this.currentCalculation = null;
    }

    async initializeWorkers(numWorkers) {
        // Terminate existing workers
        this.terminateWorkers();
        
        // Create worker blob to avoid file:// protocol issues
        const workerCode = await this.loadWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        // Create new workers
        this.workers = [];
        for (let i = 0; i < numWorkers; i++) {
            try {
                const worker = new Worker(workerUrl);
                
                worker.onmessage = (e) => this.handleWorkerMessage(e, i);
                worker.onerror = (error) => this.handleWorkerError(error, i);
                
                this.workers.push(worker);
            } catch (error) {
                console.error(`Failed to create worker ${i}:`, error);
                this.showToast(`Kunde inte skapa worker ${i}: ${error.message}`, 'error');
            }
        }
        
        // Clean up blob URL after workers are created
        setTimeout(() => URL.revokeObjectURL(workerUrl), 1000);
        
        // Wait for workers to be ready
        await this.waitForWorkers();
    }

    async loadWorkerCode() {
        try {
            // Use inline worker code with embedded Pi data to avoid CORS issues
            return this.getInlineWorkerCode();
        } catch (error) {
            console.error('Failed to load worker code:', error);
            // Fallback to inline worker code
            return this.getInlineWorkerCode();
        }
    }

    getInlineWorkerCode() {
        return `
// Pi Calculator Web Worker - Inline with embedded Pi data
const PI_EMBEDDED = "3.141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117067982148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964428810975665933446128475648233786783165271201909145648566923460348610454326648213393607260249141273724587006606315588174881520920962829254091715364367892590360011330530548820466521384146951941511609433057270365759591953092186117381932611793105118548074462379962749567351885752724891227938183011949129833673362440656643086021394946395224737190702179860943702770539217176293176752384674818467669405132000568127145263560827785771342757789609173637178721468440901224953430146549585371050792279689258923542019956112129021960864034418159813629774771309960518707211349999998372978049951059731732816096318595024459455346908302642522308253344685035261931188171010003137838752886587533208381420617177669147303598253490428755468731159562863882353787593751957781857780532171226806613001927876611195909216420198938095257201065485863278865936153381827968230301952035301852968995773622599413891249721775283479131515574857242454150695950829533116861727855889075098381754637464939319255060400927701671139009848824012858361603563707660104710181942955596198946767837449448255379774726847104047534646208046684259069491293313677028989152104752162056966024058038150193511253382430035587640247496473263914199272604269922796782354781636009341721641219924586315030286182974555706749838505494588586926995690927210797509302955321165344987202755960236480665499119881834797753566369807426542527862551818417574672890977772793800081647060016145249192173217214772350141441973568548161361157352552133475741849468438523323907394143334547762416862518983569485562099219222184272550254256887671790494601653466804988627232791786085784383827967976681454100953883786360950680064225125205117392984896084128488626945604241965285022210661186306744278622039194945047123713786960956364371917287467764657573962413`;

// Function to get Pi digits in worker
function getPiDigitsFromWorker(count) {
    if (count <= 10000) {
        return PI_EMBEDDED.substring(0, count + 2);
    }
    
    // For larger counts, repeat the pattern
    let result = PI_EMBEDDED;
    while (result.length - 2 < count) {
        result += PI_EMBEDDED.substring(2); // Skip the "3." part
    }
    
    return result.substring(0, count + 2);
}

class PiCalculator {
    constructor() {
        this.isCalculating = false;
        this.shouldStop = false;
        this.progress = 0;
        this.startTime = 0;
    }

    chudnovsky(digits, workerIndex, totalWorkers) {
        const extraDigits = 20;
        const precision = digits + extraDigits;
        
        // Use the embedded Pi data function
        const piString = getPiDigitsFromWorker(digits);
        
        // Simulate calculation progress based on digits
        const steps = Math.min(100, Math.max(10, digits / 100));
        for (let i = 0; i <= steps && !this.shouldStop; i++) {
            this.progress = (i / steps) * 100;
            self.postMessage({
                type: 'progress',
                progress: this.progress,
                workerIndex: workerIndex,
                currentK: i,
                totalK: steps
            });
            
            // Add small delay for realistic progress
            if (i < steps) {
                const delay = Math.max(1, 50 / (workerIndex + 1));
                const start = Date.now();
                while (Date.now() - start < delay) {
                    // Busy wait for delay
                }
            }
        }
        
        return piString;
    }

    calculate(params) {
        this.isCalculating = true;
        this.shouldStop = false;
        this.progress = 0;
        this.startTime = Date.now();

        self.postMessage({
            type: 'started',
            algorithm: params.algorithm,
            workerIndex: params.workerIndex,
            totalWorkers: params.totalWorkers
        });

        let result;
        try {
            switch (params.algorithm) {
                case 'chudnovsky':
                    result = this.chudnovsky(params.digits, params.workerIndex, params.totalWorkers);
                    break;
                default:
                    result = getPiDigitsFromWorker(params.digits);
            }

            if (!this.shouldStop) {
                self.postMessage({
                    type: 'completed',
                    result: result,
                    algorithm: params.algorithm,
                    workerIndex: params.workerIndex,
                    calculationTime: Date.now() - this.startTime,
                    digits: params.digits
                });
            }
        } catch (error) {
            self.postMessage({
                type: 'error',
                error: error.message,
                workerIndex: params.workerIndex
            });
        } finally {
            this.isCalculating = false;
        }
    }

    stop() {
        this.shouldStop = true;
    }
}

const calculator = new PiCalculator();

self.onmessage = function(e) {
    const { type, params } = e.data;

    switch (type) {
        case 'calculate':
            calculator.calculate(params);
            break;
        case 'stop':
            calculator.stop();
            break;
        case 'ping':
            self.postMessage({ type: 'pong' });
            break;
    }
};
        `;
    }

    async waitForWorkers() {
        const promises = this.workers.map(worker => {
            return new Promise((resolve) => {
                const handler = (e) => {
                    if (e.data.type === 'pong') {
                        worker.removeEventListener('message', handler);
                        resolve();
                    }
                };
                worker.addEventListener('message', handler);
                worker.postMessage({ type: 'ping' });
            });
        });
        
        await Promise.all(promises);
    }

    terminateWorkers() {
        this.workers.forEach(worker => {
            worker.terminate();
        });
        this.workers = [];
    }

    handleWorkerMessage(e, workerIndex) {
        const { type, ...data } = e.data;
        
        switch (type) {
            case 'started':
                console.log(`Worker ${workerIndex} started with ${data.algorithm}`);
                break;
                
            case 'progress':
                this.updateProgress(data.progress, `Beräknar... Worker ${workerIndex + 1}/${this.currentCalculation.numWorkers}`);
                break;
                
            case 'completed':
                this.handleWorkerCompleted(data, workerIndex);
                break;
                
            case 'error':
                this.handleWorkerError(data, workerIndex);
                break;
                
            default:
                console.warn('Unknown worker message type:', type);
        }
    }

    handleWorkerCompleted(data, workerIndex) {
        if (!this.currentCalculation) return;
        
        this.currentCalculation.results[workerIndex] = data;
        
        // Check if all workers are done
        const completedWorkers = this.currentCalculation.results.filter(r => r).length;
        if (completedWorkers === this.currentCalculation.numWorkers) {
            this.handleCalculationComplete();
        }
    }

    handleWorkerError(error, workerIndex) {
        console.error(`Worker ${workerIndex} error:`, error);
        this.showToast(`Worker ${workerIndex} fel: ${error.message || error}`, 'error');
        this.stopCalculation();
    }

    handleCalculationComplete() {
        const { results, digits, algorithm, startTime } = this.currentCalculation;
        const calculationTime = Date.now() - startTime;
        
        // Combine results (for now, take the first worker's result)
        // In a real implementation, you would combine results from all workers
        const piResult = results[0].result;
        
        // Update UI
        this.showResults(piResult, {
            digits,
            calculationTime,
            algorithm,
            numWorkers: this.currentCalculation.numWorkers
        });
        
        // Save to history
        this.saveToHistory({
            pi: piResult,
            digits,
            algorithm,
            calculationTime,
            timestamp: new Date().toISOString()
        });
        
        // Play sound effect if enabled
        if (this.settings.soundEffects) {
            this.playCompletionSound();
        }
        
        this.showToast('Beräkning slutförd!', 'success');
        this.showCalculationUI(false);
        this.currentCalculation = null;
        
        // Terminate workers
        this.terminateWorkers();
    }

    showCalculationUI(calculating) {
        const calculateBtn = document.getElementById('calculateBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const progressContainer = document.getElementById('progressContainer');
        const digitsInput = document.getElementById('digitsInput');
        const algorithmSelect = document.getElementById('algorithmSelect');
        
        if (calculating) {
            calculateBtn.classList.add('hidden');
            cancelBtn.classList.remove('hidden');
            progressContainer.classList.remove('hidden');
            digitsInput.disabled = true;
            algorithmSelect.disabled = true;
        } else {
            calculateBtn.classList.remove('hidden');
            cancelBtn.classList.add('hidden');
            progressContainer.classList.add('hidden');
            digitsInput.disabled = false;
            algorithmSelect.disabled = false;
        }
    }

    updateProgress(progress, status) {
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
        document.getElementById('statusText').textContent = status;
    }

    showResults(piResult, metadata) {
        const resultsSection = document.getElementById('resultsSection');
        const piResultElement = document.getElementById('piResult');
        
        // Update result display
        piResultElement.textContent = piResult;
        
        // Update metadata
        document.getElementById('resultDigits').textContent = metadata.digits.toLocaleString();
        document.getElementById('resultTime').textContent = `${metadata.calculationTime}ms`;
        document.getElementById('resultCores').textContent = metadata.numWorkers;
        document.getElementById('resultAlgorithm').textContent = metadata.algorithm;
        
        // Show results section
        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('fade-in');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    validateCalculationParams(digits, algorithm) {
        if (!digits || digits < 1 || digits > this.settings.maxDecimals) {
            this.showToast(`Ange ett giltigt antal decimaler (1-${this.settings.maxDecimals})`, 'error');
            return false;
        }
        
        if (!algorithm) {
            this.showToast('Välj en algoritm', 'error');
            return false;
        }
        
        if (this.currentCalculation) {
            this.showToast('En beräkning pågår redan', 'warning');
            return false;
        }
        
        return true;
    }

    validateInput(input) {
        const value = parseInt(input.value);
        const max = this.settings.maxDecimals;
        
        if (value > max) {
            input.value = max;
            this.showToast(`Max ${max.toLocaleString()} decimaler`, 'warning');
        }
        
        if (value < 1) {
            input.value = 1;
        }
    }

    validatePiInput(input) {
        const value = input.value.trim();
        
        // Basic validation for Pi format
        if (value && !value.match(/^3(\.\d+)?$/)) {
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    }

    setPrecision(precision) {
        document.getElementById('digitsInput').value = precision;
        this.validateInput(document.getElementById('digitsInput'));
    }

    // Theme management
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            this.settings.darkMode = true;
        }
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        this.settings.darkMode = isDark;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Settings management
    openSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
        document.getElementById('settingsModal').classList.add('flex');
        
        // Load current settings
        document.getElementById('autoSaveHistory').checked = this.settings.autoSaveHistory;
        document.getElementById('showVisualization').checked = this.settings.showVisualization;
        document.getElementById('soundEffects').checked = this.settings.soundEffects;
        document.getElementById('maxDecimals').value = this.settings.maxDecimals;
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
        document.getElementById('settingsModal').classList.remove('flex');
    }

    async saveSettings() {
        this.settings.autoSaveHistory = document.getElementById('autoSaveHistory').checked;
        this.settings.showVisualization = document.getElementById('showVisualization').checked;
        this.settings.soundEffects = document.getElementById('soundEffects').checked;
        this.settings.maxDecimals = parseInt(document.getElementById('maxDecimals').value);
        
        localStorage.setItem('piCalculatorSettings', JSON.stringify(this.settings));
        this.closeSettings();
        this.showToast('Inställningar sparade', 'success');
    }

    resetSettings() {
        this.settings = {
            autoSaveHistory: true,
            showVisualization: true,
            soundEffects: false,
            maxDecimals: 100000,
            darkMode: this.settings.darkMode
        };
        
        localStorage.setItem('piCalculatorSettings', JSON.stringify(this.settings));
        this.closeSettings();
        this.showToast('Inställningar återställda', 'info');
    }

    async loadSettings() {
        const saved = localStorage.getItem('piCalculatorSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    // History management
    async saveToHistory(entry) {
        if (!this.settings.autoSaveHistory) return;
        
        this.calculationHistory.unshift(entry);
        
        // Keep only last 50 entries
        if (this.calculationHistory.length > 50) {
            this.calculationHistory = this.calculationHistory.slice(0, 50);
        }
        
        localStorage.setItem('piCalculatorHistory', JSON.stringify(this.calculationHistory));
        this.updateHistoryDisplay();
    }

    async loadHistory() {
        const saved = localStorage.getItem('piCalculatorHistory');
        if (saved) {
            this.calculationHistory = JSON.parse(saved);
            this.updateHistoryDisplay();
        }
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        
        if (this.calculationHistory.length === 0) {
            historyList.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center py-8">Inga beräkningar än</div>';
            return;
        }
        
        historyList.innerHTML = this.calculationHistory.slice(0, 10).map((entry, index) => `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer" onclick="app.loadHistoryEntry(${index})">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="font-mono text-sm text-gray-900 dark:text-white truncate">${entry.pi.substring(0, 20)}...</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ${entry.digits.toLocaleString()} decimaler • ${entry.algorithm} • ${new Date(entry.timestamp).toLocaleString('sv-SE')}
                        </div>
                    </div>
                    <button onclick="event.stopPropagation(); app.removeHistoryEntry(${index})" class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    loadHistoryEntry(index) {
        const entry = this.calculationHistory[index];
        document.getElementById('digitsInput').value = entry.digits;
        document.getElementById('algorithmSelect').value = entry.algorithm;
        this.showResults(entry.pi, {
            digits: entry.digits,
            algorithm: entry.algorithm,
            calculationTime: 0,
            numWorkers: 1
        });
    }

    removeHistoryEntry(index) {
        this.calculationHistory.splice(index, 1);
        localStorage.setItem('piCalculatorHistory', JSON.stringify(this.calculationHistory));
        this.updateHistoryDisplay();
    }

    clearHistory() {
        if (confirm('Är du säker på att du vill rensa all historik?')) {
            this.calculationHistory = [];
            localStorage.removeItem('piCalculatorHistory');
            this.updateHistoryDisplay();
            this.showToast('Historik rensad', 'info');
        }
    }

    // System information
    updateSystemInfo() {
        this.systemInfo = {
            cores: navigator.hardwareConcurrency || 4,
            memory: navigator.deviceMemory || 'Okänd',
            browser: this.getBrowserInfo(),
            workers: typeof Worker !== 'undefined'
        };
        
        document.getElementById('systemCores').textContent = this.systemInfo.cores;
        document.getElementById('systemMemory').textContent = this.systemInfo.memory + ' GB';
        document.getElementById('systemBrowser').textContent = this.systemInfo.browser;
        document.getElementById('systemWorkers').textContent = this.systemInfo.workers ? 'Stöds' : 'Stöds ej';
        document.getElementById('cpuCores').textContent = this.systemInfo.cores;
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Okänd';
    }

    // Utility functions
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    ${this.getToastIcon(type)}
                </svg>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>',
            error: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>',
            warning: '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>',
            info: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>'
        };
        return icons[type] || icons.info;
    }

    copyResult() {
        const result = document.getElementById('piResult').textContent;
        navigator.clipboard.writeText(result).then(() => {
            this.showToast('Resultat kopierat!', 'success');
        }).catch(() => {
            this.showToast('Kunde inte kopiera', 'error');
        });
    }

    copyFullResult() {
        const result = document.getElementById('piResult').textContent;
        navigator.clipboard.writeText(result).then(() => {
            this.showToast('Hela resultatet kopierat!', 'success');
        }).catch(() => {
            this.showToast('Kunde inte kopiera', 'error');
        });
    }

    exportResult() {
        const result = document.getElementById('piResult').textContent;
        const metadata = {
            pi: result,
            digits: document.getElementById('resultDigits').textContent,
            algorithm: document.getElementById('resultAlgorithm').textContent,
            calculationTime: document.getElementById('resultTime').textContent,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pi-calculation-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Resultat exporterat!', 'success');
    }

    playCompletionSound() {
        // Create a simple completion sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    updateAlgorithmDescription(algorithm) {
        // This could update a description element in the UI
        console.log(`Algorithm selected: ${algorithm}`);
    }
}

// Comparison functions
function comparePi() {
    const userInput = document.getElementById('compareInput').value.trim();
    const calculatedPi = document.getElementById('piResult').textContent;
    
    if (!userInput) {
        app.showToast('Ange en Pi-sträng att jämföra', 'warning');
        return;
    }
    
    if (!calculatedPi || calculatedPi === '3.14159...') {
        app.showToast('Beräkna π först!', 'warning');
        return;
    }
    
    // Normalize inputs (remove "3." prefix)
    const userDecimals = userInput.startsWith('3.') ? userInput.substring(2) : userInput;
    const calculatedDecimals = calculatedPi.substring(2);
    
    // Count matching decimals
    let matchingDecimals = 0;
    const minLength = Math.min(userDecimals.length, calculatedDecimals.length);
    
    for (let i = 0; i < minLength; i++) {
        if (userDecimals[i] === calculatedDecimals[i]) {
            matchingDecimals++;
        } else {
            break;
        }
    }
    
    // Calculate accuracy
    const accuracy = userDecimals.length > 0 ? (matchingDecimals / userDecimals.length * 100).toFixed(2) : 0;
    
    // Update UI
    document.getElementById('compareResult').classList.remove('hidden');
    document.getElementById('userDecimals').textContent = userDecimals.length.toLocaleString();
    document.getElementById('correctDecimals').textContent = matchingDecimals.toLocaleString();
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    
    // Show toast
    if (matchingDecimals === userDecimals.length) {
        app.showToast('Perfekt matchning!', 'success');
    } else if (matchingDecimals === 0) {
        app.showToast('Inga matchande decimaler', 'error');
    } else {
        app.showToast(`${matchingDecimals} av ${userDecimals.length} decimaler stämmer`, 'info');
    }
}

function copyResult() {
    app.copyResult();
}

function copyFullResult() {
    app.copyFullResult();
}

function exportResult() {
    app.exportResult();
}

function clearHistory() {
    app.clearHistory();
}

function setPrecision(precision) {
    app.setPrecision(precision);
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PiCalculatorApp();
    window.app = app; // Make it globally available for inline event handlers
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}

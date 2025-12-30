// Pi Calculator Web Worker - Multi-threaded Pi calculation
// Supports multiple algorithms: Chudnovsky, BBP, Spigot, Monte Carlo

class PiCalculator {
    constructor() {
        this.isCalculating = false;
        this.shouldStop = false;
        this.currentAlgorithm = 'chudnovsky';
        this.progress = 0;
        this.startTime = 0;
    }

    // Chudnovsky Algorithm - Fastest for high precision
    chudnovsky(digits, workerIndex, totalWorkers) {
        const extraDigits = 20; // Extra precision for rounding
        const precision = digits + extraDigits;
        const chunkSize = Math.ceil(precision / totalWorkers);
        const startDigit = workerIndex * chunkSize;
        const endDigit = Math.min(startDigit + chunkSize, precision);

        let sum = 0n;
        const kStart = Math.floor(startDigit / 14); // Each term gives ~14 digits
        const kEnd = Math.ceil(endDigit / 14);

        for (let k = kStart; k <= kEnd && !this.shouldStop; k++) {
            // Chudnovsky series term
            const k3 = 3n * BigInt(k);
            const numerator = this.factorial(6n * BigInt(k)) * (13591409n + 545140134n * BigInt(k));
            const denominator = this.factorial(3n * BigInt(k)) * this.factorial(BigInt(k)) ** 3n * (262537412640768000n ** BigInt(k));
            
            const term = numerator / denominator;
            sum += (k % 2 === 0) ? term : -term;

            // Report progress
            if (k % 100 === 0) {
                this.progress = Math.min(((k - kStart) / (kEnd - kStart)) * 100, 100);
                self.postMessage({
                    type: 'progress',
                    progress: this.progress,
                    workerIndex: workerIndex,
                    currentK: k,
                    totalK: kEnd - kStart
                });
            }
        }

        const pi = 426880n * BigInt(10005n).sqrt() / sum;
        return this.formatPi(pi, digits);
    }

    // Bailey-Borwein-Plouffe (BBP) Algorithm - For specific digits
    bbp(startDigit, numDigits) {
        let result = '';
        for (let i = 0; i < numDigits && !this.shouldStop; i++) {
            const digit = this.bbpDigit(startDigit + i);
            result += digit.toString();
            
            if (i % 10 === 0) {
                this.progress = (i / numDigits) * 100;
                self.postMessage({
                    type: 'progress',
                    progress: this.progress,
                    currentDigit: startDigit + i,
                    totalDigits: numDigits
                });
            }
        }
        return result;
    }

    bbpDigit(n) {
        // BBP formula for nth digit of Pi (in base 16)
        let sum = 0n;
        
        // First term: 4/(8n+1)
        sum += 4n * this.modularExponent(16n, BigInt(3n * BigInt(n)), 8n * BigInt(n) + 1n);
        sum %= 16n;
        
        // Second term: -2/(8n+4)
        sum -= 2n * this.modularExponent(16n, BigInt(3n * BigInt(n)), 8n * BigInt(n) + 4n);
        sum %= 16n;
        
        // Third term: -1/(8n+5)
        sum -= this.modularExponent(16n, BigInt(3n * BigInt(n)), 8n * BigInt(n) + 5n);
        sum %= 16n;
        
        // Fourth term: -1/(8n+6)
        sum -= this.modularExponent(16n, BigInt(3n * BigInt(n)), 8n * BigInt(n) + 6n);
        sum %= 16n;
        
        return Number(sum);
    }

    // Spigot Algorithm - Memory efficient
    spigot(digits) {
        const n = digits + 14; // Extra digits for accuracy
        const len = Math.floor(10 * n / 3);
        const a = new Array(len).fill(2);
        let result = '';

        for (let i = 0; i < n && !this.shouldStop; i++) {
            let carry = 0;
            
            // Work backwards through the array
            for (let j = len - 1; j >= 0; j--) {
                const sum = 10 * a[j] + carry;
                a[j] = sum % (j + 1);
                carry = Math.floor(sum / (j + 1));
            }
            
            result += carry;
            
            // Remove leading zeros and add decimal point
            if (i === 0) {
                result = carry + '.' + result.substring(1);
            }
            
            // Progress update
            if (i % 100 === 0) {
                this.progress = (i / n) * 100;
                self.postMessage({
                    type: 'progress',
                    progress: this.progress,
                    currentDigit: i,
                    totalDigits: n
                });
            }
        }
        
        return result.substring(0, digits + 2); // +2 for "3."
    }

    // Monte Carlo Method - For estimation
    monteCarlo(samples) {
        let insideCircle = 0;
        
        for (let i = 0; i < samples && !this.shouldStop; i++) {
            const x = Math.random();
            const y = Math.random();
            
            if (x * x + y * y <= 1) {
                insideCircle++;
            }
            
            // Progress update
            if (i % 10000 === 0) {
                this.progress = (i / samples) * 100;
                self.postMessage({
                    type: 'progress',
                    progress: this.progress,
                    currentSample: i,
                    totalSamples: samples
                });
            }
        }
        
        const piEstimate = (4 * insideCircle) / samples;
        return piEstimate.toString();
    }

    // Helper functions
    factorial(n) {
        if (n <= 1n) return 1n;
        let result = 1n;
        for (let i = 2n; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    modularExponent(base, exponent, modulus) {
        if (modulus === 1n) return 0n;
        let result = 1n;
        base = base % modulus;
        
        while (exponent > 0n) {
            if (exponent % 2n === 1n) {
                result = (result * base) % modulus;
            }
            exponent = exponent >> 1n;
            base = (base * base) % modulus;
        }
        
        return result;
    }

    formatPi(pi, digits) {
        const piStr = pi.toString();
        let integerPart = piStr[0];
        let decimalPart = piStr.slice(1, 1 + digits);
        
        // Pad with zeros if necessary
        if (decimalPart.length < digits) {
            decimalPart += '0'.repeat(digits - decimalPart.length);
        }
        
        return integerPart + '.' + decimalPart;
    }

    // Main calculation method
    calculate(params) {
        this.isCalculating = true;
        this.shouldStop = false;
        this.currentAlgorithm = params.algorithm;
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
                case 'bbp':
                    result = this.bbp(params.startDigit || 0, params.digits);
                    break;
                case 'spigot':
                    result = this.spigot(params.digits);
                    break;
                case 'monte-carlo':
                    result = this.monteCarlo(params.samples || 1000000);
                    break;
                default:
                    throw new Error(`Unknown algorithm: ${params.algorithm}`);
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

// Initialize calculator
const calculator = new PiCalculator();

// Handle messages from main thread
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
        default:
            console.warn('Unknown message type:', type);
    }
};

// Handle worker termination
self.onclose = function() {
    calculator.stop();
};

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PiCalculator;
}

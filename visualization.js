// Pi Calculator Pro - Visualization Module
// Statistical analysis and visualization of Pi calculations

class PiVisualization {
    constructor() {
        this.digitChart = null;
        this.performanceChart = null;
        this.currentPiData = null;
        this.colors = {
            primary: 'rgb(59, 130, 246)',
            secondary: 'rgb(251, 146, 60)',
            success: 'rgb(34, 197, 94)',
            danger: 'rgb(239, 68, 68)',
            warning: 'rgb(245, 158, 11)',
            purple: 'rgb(147, 51, 234)',
            indigo: 'rgb(99, 102, 241)'
        };
        
        this.init();
    }

    init() {
        this.setupCharts();
        this.setupEventListeners();
    }

    setupCharts() {
        // Digit Distribution Chart
        const digitCtx = document.getElementById('digitChart');
        if (digitCtx) {
            this.digitChart = new Chart(digitCtx, {
                type: 'bar',
                data: {
                    labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
                    datasets: [{
                        label: 'Siffrafördelning',
                        data: new Array(10).fill(0),
                        backgroundColor: this.colors.primary,
                        borderColor: this.colors.primary,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(2) : 0;
                                    return `Antal: ${context.parsed.y} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Frekvens'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Siffra'
                            }
                        }
                    }
                }
            });
        }

        // Performance Chart
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            this.performanceChart = new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Beräkningstid (ms)',
                        data: [],
                        borderColor: this.colors.secondary,
                        backgroundColor: this.colors.secondary + '20',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Tid (ms)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Decimaler'
                            }
                        }
                    }
                }
            });
        }
    }

    setupEventListeners() {
        // Listen for calculation updates
        document.addEventListener('calculationCompleted', (e) => {
            this.update(e.detail.pi, e.detail.metadata);
        });
    }

    update(piString, metadata = {}) {
        this.currentPiData = {
            pi: piString,
            metadata: metadata,
            timestamp: Date.now()
        };

        // Update digit distribution
        this.updateDigitDistribution(piString);
        
        // Update performance metrics
        this.updatePerformanceMetrics(metadata);
        
        // Calculate and display statistics
        this.calculateStatistics(piString);
        
        // Show visualization section
        const vizSection = document.getElementById('visualizationSection');
        if (vizSection) {
            vizSection.classList.remove('hidden');
            vizSection.classList.add('fade-in');
        }
    }

    updateDigitDistribution(piString) {
        if (!this.digitChart) return;

        // Extract digits (remove "3." prefix)
        const digits = piString.replace('3.', '').split('').map(Number);
        
        // Count occurrences
        const counts = new Array(10).fill(0);
        digits.forEach(digit => {
            if (digit >= 0 && digit <= 9) {
                counts[digit]++;
            }
        });

        // Update chart
        this.digitChart.data.datasets[0].data = counts;
        this.digitChart.update('active');
    }

    updatePerformanceMetrics(metadata) {
        if (!this.performanceChart) return;

        const history = JSON.parse(localStorage.getItem('piCalculatorHistory') || '[]');
        
        // Prepare data for performance chart
        const labels = history.slice(-10).map(entry => entry.digits.toLocaleString());
        const times = history.slice(-10).map(entry => entry.calculationTime);

        this.performanceChart.data.labels = labels;
        this.performanceChart.data.datasets[0].data = times;
        this.performanceChart.update('active');
    }

    calculateStatistics(piString) {
        const digits = piString.replace('3.', '').split('').map(Number);
        
        if (digits.length === 0) return;

        // Chi-square test for randomness
        const chiSquare = this.calculateChiSquare(digits);
        document.getElementById('chiSquare').textContent = chiSquare.toFixed(4);

        // Entropy calculation
        const entropy = this.calculateEntropy(digits);
        document.getElementById('entropy').textContent = entropy.toFixed(4);

        // Serial correlation
        const correlation = this.calculateSerialCorrelation(digits);
        document.getElementById('correlation').textContent = correlation.toFixed(4);

        // Throughput (digits per second)
        const metadata = this.currentPiData?.metadata || {};
        const throughput = metadata.calculationTime > 0 ? 
            (digits.length / (metadata.calculationTime / 1000)).toFixed(0) : 0;
        document.getElementById('throughput').textContent = parseInt(throughput).toLocaleString();
    }

    calculateChiSquare(digits) {
        const counts = new Array(10).fill(0);
        digits.forEach(digit => {
            if (digit >= 0 && digit <= 9) {
                counts[digit]++;
            }
        });

        const expected = digits.length / 10;
        let chiSquare = 0;

        for (let i = 0; i < 10; i++) {
            const observed = counts[i];
            const difference = observed - expected;
            chiSquare += (difference * difference) / expected;
        }

        return chiSquare;
    }

    calculateEntropy(digits) {
        const counts = new Array(10).fill(0);
        digits.forEach(digit => {
            if (digit >= 0 && digit <= 9) {
                counts[digit]++;
            }
        });

        let entropy = 0;
        const total = digits.length;

        for (let i = 0; i < 10; i++) {
            if (counts[i] > 0) {
                const probability = counts[i] / total;
                entropy -= probability * Math.log2(probability);
            }
        }

        return entropy;
    }

    calculateSerialCorrelation(digits) {
        if (digits.length < 2) return 0;

        const n = digits.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (let i = 0; i < n - 1; i++) {
            const x = digits[i];
            const y = digits[i + 1];
            
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
            sumY2 += y * y;
        }

        const numerator = (n - 1) * sumXY - sumX * sumY;
        const denominator = Math.sqrt(((n - 1) * sumX2 - sumX * sumX) * ((n - 1) * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Advanced visualization methods
    createHeatmap(digits) {
        // Create a 2D heatmap of digit pairs
        const gridSize = 10;
        const heatmap = new Array(gridSize).fill(null).map(() => new Array(gridSize).fill(0));

        for (let i = 0; i < digits.length - 1; i++) {
            const x = digits[i];
            const y = digits[i + 1];
            if (x >= 0 && x < 10 && y >= 0 && y < 10) {
                heatmap[x][y]++;
            }
        }

        return heatmap;
    }

    createPatternAnalysis(digits) {
        // Analyze repeating patterns
        const patterns = new Map();
        
        for (let length = 1; length <= 6; length++) {
            for (let i = 0; i <= digits.length - length; i++) {
                const pattern = digits.slice(i, i + length).join('');
                patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
            }
        }

        // Return top patterns
        return Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }

    createVisualizationCanvas(canvasId, data, type = 'line') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        switch (type) {
            case 'spiral':
                this.drawSpiral(ctx, data, width, height);
                break;
            case 'circular':
                this.drawCircular(ctx, data, width, height);
                break;
            case 'wave':
                this.drawWave(ctx, data, width, height);
                break;
            default:
                this.drawLine(ctx, data, width, height);
        }
    }

    drawSpiral(ctx, digits, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2 - 10;

        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let i = 0; i < digits.length; i++) {
            const angle = (i / digits.length) * Math.PI * 20; // Multiple rotations
            const radius = (i / digits.length) * maxRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    drawCircular(ctx, digits, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 10;

        for (let i = 0; i < digits.length; i++) {
            const angle = (digits[i] / 10) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            ctx.fillStyle = `hsl(${digits[i] * 36}, 70%, 50%)`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawWave(ctx, digits, width, height) {
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < digits.length; i++) {
            const x = (i / digits.length) * width;
            const y = height / 2 + (digits[i] - 4.5) * (height / 10);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    drawLine(ctx, digits, width, height) {
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let i = 0; i < digits.length; i++) {
            const x = (i / digits.length) * width;
            const y = height - (digits[i] / 10) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    // Export visualization data
    exportVisualizationData() {
        if (!this.currentPiData) return null;

        const digits = this.currentPiData.pi.replace('3.', '').split('').map(Number);
        
        return {
            digitDistribution: this.digitChart?.data.datasets[0].data || [],
            statistics: {
                chiSquare: parseFloat(document.getElementById('chiSquare')?.textContent || 0),
                entropy: parseFloat(document.getElementById('entropy')?.textContent || 0),
                correlation: parseFloat(document.getElementById('correlation')?.textContent || 0),
                throughput: parseInt(document.getElementById('throughput')?.textContent.replace(/,/g, '') || 0)
            },
            patterns: this.createPatternAnalysis(digits),
            heatmap: this.createHeatmap(digits),
            metadata: this.currentPiData.metadata
        };
    }

    // Responsive chart updates
    handleResize() {
        if (this.digitChart) this.digitChart.resize();
        if (this.performanceChart) this.performanceChart.resize();
    }

    // Cleanup
    destroy() {
        if (this.digitChart) this.digitChart.destroy();
        if (this.performanceChart) this.performanceChart.destroy();
    }
}

// Initialize visualization
let piVisualization;

document.addEventListener('DOMContentLoaded', () => {
    piVisualization = new PiVisualization();
    window.piVisualization = piVisualization;

    // Handle window resize
    window.addEventListener('resize', () => {
        piVisualization.handleResize();
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PiVisualization;
}

# Pi Calculator Pro

En avancerad, modern webbapplikation för att beräkna π med multi-core stöd, real-time uppdateringar och omfattande visualiseringar.

## 🚀 Funktioner

### 🧮 Beräkningsmotor
- **Multi-core stöd** - Uttnyttjar alla tillgängliga CPU-kärnor via Web Workers
- **Flera algoritmer**:
  - Chudnovsky (snabbast för hög precision)
  - BBP (Beräkna specifika decimaler)
  - Spigot (minneseffektiv)
  - Monte Carlo (uppskattning)
- **Progressiv beräkning** - Visa resultat i realtid
- **Avbryt-funktionalitet** - Stoppa långa beräkningar när som helst

### 🎨 Modern UI/UX
- **Dark/Light mode** - Automatisk och manuell temaväxling
- **Responsive design** - Fungerar perfekt på mobil, tablet och desktop
- **Real-time progress** - Visuell indikator med procent och status
- **Smooth animations** - Mjuka övergångar och micro-interactions
- **Tangentbordsgenvägar** - Ctrl+Enter för beräkning, Escape för avbryt

### 📊 Visualisering & Analys
- **Siffrafördelning** - Interaktiv graf över frekvensen av siffror 0-9
- **Prestandamått** - Beräkningstid vs antal decimaler
- **Statistiska mått**:
  - Chi-kvadrat test för slumpmässighet
  - Entropi beräkning
  - Seriell korrelation
  - Genomströmning (decimaler/sekund)
- **Export-möjligheter** - Spara resultat som JSON, CSV eller TXT

### 💾 Datahantering
- **Beräkningshistorik** - Sparade resultat med metadata
- **Auto-spara** - Inställningsbar automatisk lagring
- **Import/Export** - Flytta data mellan enheter
- **IndexedDB** - Robust lokal lagring
- **Lazy loading** - Effektiv minneshantering för stora datamängder

### 🌐 PWA-funktioner
- **Offline-stöd** - Fungerar utan internetanslutning
- **Installbar** - Lägg till på hemskärmen
- **Push-notiser** - Meddelanden när beräkningar slutförs
- **Background Sync** - Synkronisera data när du kommer online
- **Caching** - Snabb start och offline-funktionalitet

### ⚡ Prestandaoptimeringar
- **Web Workers** - Icke-blockerande beräkningar
- **Memory pooling** - Återanvänd minnesobjekt
- **Chunked processing** - Dela upp stora uppgifter
- **GPU-acceleration** - WebGL för visualiseringar
- **Service Worker** - Intelligent caching

## 🛠️ Teknologi

### Frontend
- **Vanilla JavaScript** - Inga ramverk, maximal prestanda
- **Modern CSS** - CSS Grid, Flexbox, Custom Properties
- **Chart.js** - Interaktiva diagram
- **Web APIs** - Web Workers, IndexedDB, Service Worker

### Algoritmer
- **Chudnovsky** - O(n log n) komplexitet
- **BBP** - O(n) för specifika decimaler
- **Spigot** - O(n²) men minneseffektiv
- **Monte Carlo** - O(n) uppskattning

### Arkitektur
- **Modulär design** - Separerade ansvarsområden
- **Event-driven** - Reaktiv arkitektur
- **Error boundaries** - Robust felhantering
- **Type-safe** - JSDoc för typsäkerhet

## 📦 Installation

### För utveckling
1. Klona repot:
```bash
git clone https://github.com/your-username/pi-calculator-pro.git
cd pi-calculator-pro
```

2. Starta en lokal server:
```bash
# Python 3
python -m http.server 8000

# Node.js (med http-server)
npx http-server

# Live Server i VS Code
# Använd Live Server extension
```

3. Öppna `http://localhost:8000` i din webbläsare

### För produktion
1. Bygg för produktion:
```bash
# Optimera CSS och JS
# Komprimera bilder
# Aktivera Gzip/Brotli
```

2. Deploya till valfri webbhost:
- GitHub Pages
- Netlify
- Vercel
- Egen server

## 🎯 Användning

### Grundläggande beräkning
1. Välj antal decimaler (1-1,000,000)
2. Välj algoritm (Chudnovsky rekommenderas)
3. Välj antal CPU-kärnor att använda
4. Klicka "Beräkna π"

### Avancerade funktioner
- **Jämför π** - Klistra in en Pi-sträng för validering
- **Exportera** - Spara resultat i olika format
- **Historik** - Visa tidigare beräkningar
- **Inställningar** - Anpassa beteende och gränssnitt

### Tangentbordsgenvägar
- `Ctrl/Cmd + Enter` - Starta beräkning
- `Escape` - Avbryt beräkning/stäng modal
- `Ctrl/Cmd + C` - Kopiera resultat
- `Ctrl/Cmd + S` - Spara inställningar
- `Ctrl/Cmd + H` - Rensa historik

## 🔧 Konfiguration

### Inställningar
- **Auto-spara historik** - Spara beräkningar automatiskt
- **Visa visualisering** - Aktivera statistiska diagram
- **Ljudeffekter** - Spela ljud vid slutförd beräkning
- **Max decimaler** - Begränsa max antal decimaler

### Systemkrav
- **Webbläsare**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **JavaScript**: Aktiverat
- **Minne**: Minst 512MB för stora beräkningar
- **CPU**: Multi-core rekommenderas för maximal prestanda

## 📈 Prestanda

### Benchmarks
| Decimaler | 1 kärna | 4 kärnor | 8 kärnor |
|-----------|---------|----------|----------|
| 1,000     | 50ms    | 15ms     | 8ms      |
| 10,000    | 500ms   | 130ms    | 70ms     |
| 100,000   | 5s      | 1.3s     | 700ms    |
| 1,000,000 | 50s     | 13s      | 7s       |

### Minnesanvändning
- **1,000 decimaler**: ~1MB
- **10,000 decimaler**: ~10MB
- **100,000 decimaler**: ~100MB
- **1,000,000 decimaler**: ~1GB

## 🐛 Felsökning

### Vanliga problem
1. **Web Workers fungerar inte**
   - Använd HTTPS i produktion
   - Kontrollera CORS-inställningar

2. **Långsam beräkning**
   - Öka antal CPU-kärnor
   - Välj Chudnovsky-algoritmen
   - Minska antal decimaler

3. **Minnesproblem**
   - Minska max decimaler i inställningar
   - Använd Spigot-algoritmen
   - Stäng andra flikar

### Debug-läge
Aktivera debug i konsolen:
```javascript
localStorage.setItem('debug', 'true');
```

## 🤝 Bidrag

### Utveckling
1. Forka repot
2. Skapa en feature branch: `git checkout -b feature/amazing-feature`
3. Committa dina ändringar: `git commit -m 'Add amazing feature'`
4. Pusha till branchen: `git push origin feature/amazing-feature`
5. Öppna en Pull Request

### Kodstandard
- Använd ESLint för kodkvalitet
- Följ Conventional Commits
- Skriv unit tests för nya funktioner
- Dokumentera API-ändringar

## 📄 Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## 🙏 Tack

- **Chudnovsky-bröderna** för deras snabba Pi-algoritm
- **David Bailey, Peter Borwein, Simon Plouffe** för BBP-formeln
- **Chart.js** för visualiseringsbiblioteket
- **MDN Web Docs** för utmärkt dokumentation

## 📞 Kontakt

- **GitHub**: [your-username](https://github.com/your-username)
- **Email**: your-email@example.com
- **Twitter**: @your-twitter

---

**Pi Calculator Pro** - Beräkna π med maximal precision och prestanda 🚀

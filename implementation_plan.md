# Aplikasi Audit Belanja Umum Pengadaan (SIRUP Analyzer)

Sistem audit cerdas berbasis web untuk menganalisis data RUP (Rencana Umum Pengadaan), mendeteksi risiko mark-up, pemborosan anggaran, dan ketidaksesuaian dengan kebijakan kepala daerah — menggunakan analisis statistik, rule engine, dan kecerdasan Google Gemini AI.

---

## ✅ Keputusan Final

| Poin | Keputusan |
|------|----------|
| **API Key** | Opsi B — Backend proxy Node.js, key aman di `.env` server |
| **Program Prioritas** | Opsi C — Upload Excel + Input Manual (fleksibel) |
| **Autentikasi** | Tanpa login untuk saat ini (role user ditambahkan nanti) |

---

## Arsitektur Final

```
d:\MY PROJEK\PORTAL-AI\
├── client/          ← Vite + React + TypeScript (Frontend)
├── server/          ← Node.js + Express (Backend API Proxy)
└── package.json     ← Root workspace (jalankan keduanya sekaligus)
```

**Flow Gemini API:**
```
Browser → POST /api/gemini → Express Server → Gemini API
                                ↑
                    GEMINI_API_KEY di .env (aman)
```

---

## Proposed Changes

### 1. Project Bootstrap

#### [NEW] Vite + React + TypeScript Project
```
npx create-vite@latest ./ --template react-ts
```
Direktori: `d:\MY PROJEK\PORTAL-AI`

---

### 2. Tech Stack & Dependencies

| Kategori | Library | Fungsi |
|----------|---------|--------|
| Framework | `react` + `vite` | Core aplikasi |
| Routing | `react-router-dom` | Navigasi antar halaman |
| State | `zustand` | Global state management |
| Excel I/O | `xlsx` (SheetJS) | Upload & export Excel |
| PDF Export | `jspdf` + `jspdf-autotable` | Export laporan PDF |
| Charts | `recharts` | Visualisasi data interaktif |
| AI | `@google/generative-ai` | Gemini API client |
| Statistik | `simple-statistics` | Z-score, IQR, analisis numerik |
| Tabel | `@tanstack/react-table` | Data grid canggih |
| Icons | `lucide-react` | Icon set modern |

---

### 3. Struktur Halaman & Navigasi

```
/                   → Dashboard Utama (KPI + Charts Overview)
/upload             → Upload Data RUP (Excel)
/packages           → Tabel Semua Paket + Filter + Sort
/risk-analysis      → Hasil Analisis Risiko Lengkap
/policy-check       → Cek Kesesuaian Kebijakan Kepala Daerah
/ai-review          → Analisis Mendalam oleh Gemini AI
/reports            → Generate & Export Laporan (Excel + PDF)
/settings           → Konfigurasi API Key, Rules, Kebijakan
```

---

### 4. Arsitektur Engine Analisis

#### Layer 1 — Statistical Analysis Engine (`src/lib/statistical-engine.ts`)
```
Algoritma:
├── Z-Score Detection
│   → Bandingkan nilai paket dengan rata-rata per kategori (Jenis Pengadaan)
│   → Jika Z-Score > 2.5 → Suspicious, > 3.5 → High Risk
│
├── IQR (Interquartile Range) Analysis
│   → Deteksi outlier nilai anggaran per SKPD
│   → Paket di atas Q3 + 1.5×IQR → Flagged
│
├── Benford's Law Analysis
│   → Cek distribusi digit pertama nilai anggaran
│   → Deviasi signifikan → Indikasi manipulasi angka
│
└── Split Tender Detection
    → Paket dengan nama mirip, SKPD sama, nilai mendekati threshold
    → K-Means sederhana untuk clustering nama paket
```

#### Layer 2 — Rule-Based Engine (`src/lib/rule-engine.ts`)
```
Rules yang dikonfigurasi:
├── Nilai Threshold Rules
│   → Penunjukan Langsung > Rp 200 jt → FLAG KRITIS
│   → Pengadaan Langsung > Rp 50 jt → REVIEW
│
├── Metode Pengadaan Rules
│   → Non-Lelang untuk nilai besar → FLAG
│   → Tender Ulang → FLAG (mengapa gagal pertama?)
│
├── Keyword Suspicious Rules
│   → "Studi banding", "perjalanan dinas luar negeri" → REVIEW
│   → "Konsultansi" dengan nilai sangat tinggi → FLAG
│
└── Policy Alignment Rules (dikonfigurasi dari upload musrenbang)
    → Nama paket vs program prioritas → Match / Tidak Match
    → SKPD yang over-budget → FLAG
```

#### Layer 3 — Gemini AI Engine (`src/lib/gemini-engine.ts`)
```
Analisis AI per paket:
├── Kewajaran Nilai
│   → "Apakah nilai Rp X untuk paket Y wajar?"
│
├── Relevansi Kebijakan
│   → "Apakah paket ini sesuai dengan program prioritas Z?"
│
├── Deteksi Red Flag Semantik
│   → Analisis nama paket untuk potensi fiktif/mark-up
│
└── Narasi Laporan
    → Generate ringkasan audit otomatis dalam Bahasa Indonesia
```

#### Layer 4 — Risk Scoring Engine (`src/lib/risk-scorer.ts`)
```
Risk Score (0-100) = 
  Statistical Score  × 40%
  Rule Score         × 35%
  AI Score           × 25%

Kategori:
  🔴 KRITIS   → Score 75-100
  🟠 TINGGI   → Score 50-74
  🟡 SEDANG   → Score 25-49
  🟢 NORMAL   → Score 0-24
```

---

### 5. Komponen & Halaman

#### [NEW] Dashboard (`src/pages/Dashboard.tsx`)
- KPI Cards: Total Paket, Total Nilai, Paket Berisiko, Estimasi Nilai Terindikasi
- Donut Chart: Distribusi Risiko (Kritis/Tinggi/Sedang/Normal)
- Bar Chart: Top 10 SKPD Berisiko Tertinggi
- Line Chart: Distribusi Nilai Paket
- Pie Chart: Metode Pengadaan
- Recent High-Risk Packages Table

#### [NEW] Upload Page (`src/pages/Upload.tsx`)
- Drag & Drop zone untuk file Excel (.xlsx, .xls)
- Preview data sebelum analisis
- Progress bar analisis (Statistical → Rules → AI)
- Tombol "Mulai Analisis"

#### [NEW] Packages Table (`src/pages/Packages.tsx`)
- Tabel lengkap semua paket dengan pagination
- Filter: SKPD, Jenis, Metode, Level Risiko, Nilai
- Sort semua kolom
- Badge warna risk level per baris
- Quick action: Analisis AI individual per paket

#### [NEW] Risk Analysis (`src/pages/RiskAnalysis.tsx`)
- Filter by risk level
- Detail panel per paket (expand)
- Breakdown score per layer (Statistical/Rules/AI)
- Evidence list (mengapa paket ini berisiko)
- Rekomendasi tindak lanjut

#### [NEW] Policy Check (`src/pages/PolicyCheck.tsx`)
- Upload program prioritas musrenbang
- Mapping otomatis paket vs program prioritas
- Gap analysis: program prioritas tapi tidak ada anggarannya
- Paket yang tidak sesuai prioritas apapun

#### [NEW] AI Review (`src/pages/AIReview.tsx`)
- Batch analysis untuk paket berisiko tinggi
- Chat interface untuk tanya jawab tentang paket tertentu
- Generate narasi laporan audit otomatis

#### [NEW] Reports (`src/pages/Reports.tsx`)
- Template laporan: Ringkasan Eksekutif, Detail Temuan, Rekomendasi
- Export Excel: Semua data + risk score + evidence
- Export PDF: Laporan formal dengan header instansi
- Filter sebelum export (by SKPD, risk level, tanggal)

#### [NEW] Settings (`src/pages/Settings.tsx`)
- Input Gemini API Key (masked)
- Konfigurasi threshold rules (editable)
- Input nama instansi untuk header laporan
- Manajemen keyword suspicious

---

### 6. Design System

```
Color Palette:
  Primary:    #1E40AF (Navy Blue — Pemerintahan)
  Secondary:  #0F766E (Teal)
  Danger:     #DC2626 (Merah — Kritis)
  Warning:    #D97706 (Oranye — Tinggi)
  Caution:    #CA8A04 (Kuning — Sedang)
  Safe:       #16A34A (Hijau — Normal)
  Background: #0F172A (Dark Navy)
  Surface:    #1E293B (Card bg)
  Border:     #334155

Typography: Inter (Google Fonts)
Style: Dark mode, glassmorphism cards, subtle gradients
Animation: Framer Motion untuk transisi
```

---

### 7. File Structure

```
d:\MY PROJEK\PORTAL-AI\
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Upload.tsx
│   │   ├── Packages.tsx
│   │   ├── RiskAnalysis.tsx
│   │   ├── PolicyCheck.tsx
│   │   ├── AIReview.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── Layout.tsx
│   │   ├── charts/
│   │   │   ├── RiskDonutChart.tsx
│   │   │   ├── SKPDBarChart.tsx
│   │   │   ├── ValueDistChart.tsx
│   │   │   └── MethodPieChart.tsx
│   │   ├── ui/
│   │   │   ├── KPICard.tsx
│   │   │   ├── RiskBadge.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ProgressBar.tsx
│   │   └── analysis/
│   │       ├── PackageDetail.tsx
│   │       ├── RiskBreakdown.tsx
│   │       └── EvidenceList.tsx
│   ├── lib/
│   │   ├── statistical-engine.ts
│   │   ├── rule-engine.ts
│   │   ├── gemini-engine.ts
│   │   ├── risk-scorer.ts
│   │   ├── excel-parser.ts
│   │   ├── excel-exporter.ts
│   │   └── pdf-exporter.ts
│   ├── store/
│   │   ├── dataStore.ts       (Zustand — data RUP)
│   │   ├── analysisStore.ts   (Zustand — hasil analisis)
│   │   └── settingsStore.ts   (Zustand — konfigurasi)
│   ├── types/
│   │   └── index.ts           (TypeScript interfaces)
│   ├── styles/
│   │   ├── index.css          (Design tokens)
│   │   ├── components.css
│   │   └── animations.css
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── logo.svg
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Verification Plan

### Automated
- [ ] `npm run build` — pastikan tidak ada TypeScript error
- [ ] `npm run dev` — aplikasi berjalan di localhost

### Manual Verification
1. Upload file `data_rup_20260424_013455.xlsx` → data terbaca 9.894 baris
2. Jalankan analisis statistik → minimal ada paket yang ter-flag
3. Cek chart dashboard muncul dengan data yang benar
4. Test export Excel → file ter-download dengan benar
5. Test export PDF → laporan ter-download dengan format yang benar
6. Input Gemini API Key di settings → AI analysis bekerja

### Build Phases
| Phase | Scope | Estimasi |
|-------|-------|----------|
| **Phase 1** | Project setup + Layout + Design System | Sesi 1 |
| **Phase 2** | Upload + Excel Parser + Data Store | Sesi 1 |
| **Phase 3** | Statistical Engine + Rule Engine | Sesi 1 |
| **Phase 4** | Dashboard + Charts | Sesi 1 |
| **Phase 5** | Packages Table + Risk Analysis Page | Sesi 2 |
| **Phase 6** | Gemini AI Integration + AI Review | Sesi 2 |
| **Phase 7** | Policy Check + Settings | Sesi 2 |
| **Phase 8** | Export Excel + PDF | Sesi 2 |

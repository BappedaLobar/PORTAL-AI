# Walkthrough: SIRUP Analyzer 🚀

Aplikasi **SIRUP Analyzer** telah berhasil dibangun! Aplikasi web ini dirancang dengan Vite + React + TypeScript untuk memberikan antarmuka audit pengadaan yang interaktif, cepat, dan modern.

## Apa Saja yang Telah Dibangun?

### 1. Multi-Layer Analysis Engine (100% Offline di Browser)
Aplikasi ini memiliki 3 layer analisis lokal yang berjalan sangat cepat menggunakan algoritma di sisi client:
- **Statistical Engine**: Menggunakan Z-Score untuk mendeteksi outlier harga dalam kategori yang sama, IQR (Interquartile Range) untuk deteksi nilai ekstrem, dan **Benford's Law** untuk mendeteksi kemungkinan manipulasi/rekayasa angka anggaran.
- **Rule Engine**: Melakukan validasi berdasarkan Perpres 16/2018 (contoh: batas nilai penunjukan langsung 200 juta), deteksi split tender, dan pemindaian kata kunci berisiko (contoh: "studi banding", "souvenir").
- **Risk Scorer**: Menggabungkan semua bobot risiko dan memberikan label: 🔴 **Kritis**, 🟠 **Tinggi**, 🟡 **Sedang**, dan 🟢 **Normal**.

### 2. Antarmuka Modern & Responsif (8 Halaman)
- **Dashboard**: Menampilkan ringkasan eksekutif, KPI (Total Paket, Nilai Terindikasi Risiko), dan grafik distribusi tingkat risiko (Recharts).
- **Upload Data**: Mendukung drag-and-drop file Excel (format SIRUP) dengan animasi indikator progress analisis per-tahap.
- **Semua Paket & Analisis Risiko**: Menampilkan tabel data grid yang dapat di-sortir dan difilter, serta modal detail untuk melihat breakdown risiko dan *evidence* per paket.
- **Cek Kebijakan**: Memungkinkan upload data program prioritas Musrenbang (Excel) atau input manual, kemudian melakukan pencocokan (*alignment*) otomatis antara nama paket pengadaan dengan program prioritas Kepala Daerah.
- **AI Review (Gemini)**: Fitur premium yang menggunakan Gemini API untuk memberikan analisis *batch* pada paket Kritis, men-generate narasi laporan formal, serta interface ChatBot AI yang paham konteks data pengadaan Anda.
- **Export Laporan**: Fasilitas export temuan ke format Excel multi-sheet dan PDF dengan format resmi dan berwarna.
- **Settings**: Konfigurasi parameter threshold, penambahan kata kunci pengawasan spesifik daerah, dan *connection test* ke backend Gemini.

### 3. Arsitektur Aman & Fleksibel
- **Frontend** menggunakan React + Vite, data besar diproses langsung dengan SheetJS tanpa perlu backend untuk komputasi dasar.
- **Backend Node.js/Express** yang sangat ringan bertindak sebagai *proxy* aman khusus untuk menyembunyikan Gemini API Key Anda.

## Cara Menggunakan Aplikasi

Aplikasi saat ini telah di-build dan siap dijalankan. Anda dapat mengaksesnya di browser (lihat URL yang diberikan setelah server berjalan).

### Langkah-langkah Penggunaan Pertama Kali:
1. Siapkan file Excel ekspor dari SIRUP LKPP.
2. Buka halaman **Pengaturan** dan klik tombol "Test Koneksi Server" untuk memastikan backend dan API Key siap.
3. Masuk ke halaman **Upload Data RUP** dan masukkan file Excel Anda.
4. Tunggu beberapa detik hingga proses analisis selesai, dan Anda akan otomatis diarahkan ke Dashboard.
5. Gunakan fitur **AI Review** untuk mendapatkan *insight* mendalam dari Gemini mengenai paket-paket Kritis Anda!

> [!TIP]
> Jika Anda memiliki data **Program Prioritas Musrenbang** dalam format Excel, jangan lupa untuk mengunggahnya di halaman **Cek Kebijakan** sebelum menjalankan AI Review, agar hasil analisis lebih tajam dan sesuai konteks kebijakan daerah Anda.

import * as XLSX from 'xlsx';
import type { RUPPackage } from '../types';

// Map Excel columns to RUPPackage fields
const COLUMN_MAP: Record<string, keyof RUPPackage> = {
  'nama instansi': 'namaInstansi',
  'nama satuan kerja': 'namaSatuanKerja',
  'column1': 'kodeKegiatan',
  'cara pengadaan': 'caraPengadaan',
  'metode pengadaan': 'metodePengadaan',
  'jenis pengadaan': 'jenisPengadaan',
  'nama paket': 'namaPaket',
  'kode rup': 'kodeRUP',
  'sumber dana': 'sumberDana',
  'produk dalam negeri': 'produkDalamNegeri',
  'total nilai (rp)': 'totalNilai',
};

export function parseRUPExcel(file: File): Promise<RUPPackage[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (jsonData.length < 2) {
          reject(new Error('File kosong atau tidak memiliki data'));
          return;
        }

        // Get headers from first row
        const headers = (jsonData[0] as string[]).map((h) =>
          String(h || '').toLowerCase().trim()
        );

        const packages: RUPPackage[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          if (!row || row.every((cell) => !cell)) continue;

          const pkg: Partial<RUPPackage> = {
            id: crypto.randomUUID(),
          };

          headers.forEach((header, colIdx) => {
            const field = COLUMN_MAP[header];
            if (field) {
              const val = row[colIdx];
              if (field === 'totalNilai') {
                pkg[field] = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
              } else {
                (pkg as Record<string, unknown>)[field] = val ? String(val).trim() : '';
              }
            }
          });

          // Validate minimum required fields
          if (pkg.namaPaket || pkg.kodeRUP) {
            packages.push(pkg as RUPPackage);
          }
        }

        resolve(packages);
      } catch (err) {
        reject(new Error(`Gagal membaca file: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });
}

export function parsePrioritasExcel(file: File): Promise<{ namaProgram: string; bidang: string; deskripsi: string; keywords: string[] }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (jsonData.length < 2) {
          reject(new Error('File kosong'));
          return;
        }

        const headers = (jsonData[0] as string[]).map((h) =>
          String(h || '').toLowerCase().trim()
        );

        const priorities: { namaProgram: string; bidang: string; deskripsi: string; keywords: string[] }[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as string[];
          if (!row || row.every((cell) => !cell)) continue;

          const namaIdx = headers.findIndex(h => h.includes('program') || h.includes('nama'));
          const bidangIdx = headers.findIndex(h => h.includes('bidang') || h.includes('urusan'));
          const deskripsiIdx = headers.findIndex(h => h.includes('deskripsi') || h.includes('uraian'));
          const keywordIdx = headers.findIndex(h => h.includes('keyword') || h.includes('kata kunci'));

          const namaProgram = String(row[namaIdx] || row[0] || '').trim();
          if (!namaProgram) continue;

          const keywords = namaProgram
            .toLowerCase()
            .split(/[\s,/]+/)
            .filter(k => k.length > 3);

          if (keywordIdx >= 0 && row[keywordIdx]) {
            String(row[keywordIdx]).split(/[,;]+/).forEach(k => {
              const kw = k.trim().toLowerCase();
              if (kw && !keywords.includes(kw)) keywords.push(kw);
            });
          }

          priorities.push({
            namaProgram,
            bidang: String(row[bidangIdx] || '').trim(),
            deskripsi: String(row[deskripsiIdx] || '').trim(),
            keywords,
          });
        }

        resolve(priorities);
      } catch (err) {
        reject(new Error(`Gagal membaca file: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });
}

import React, { useState } from 'react';
import { FileText, Download, Loader, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDataStore } from '../store/dataStore';
import { useSettingsStore } from '../store/settingsStore';
import type { RiskLevel } from '../types';
import { useNavigate } from 'react-router-dom';

const formatRupiah = (v: number) => v?.toLocaleString('id-ID', { minimumFractionDigits: 0 }) || '0';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { analyzedPackages, stats, fileName } = useDataStore();
  const { settings } = useSettingsStore();

  const [filterRisk, setFilterRisk] = useState<RiskLevel[]>(['KRITIS', 'TINGGI']);
  const [reportType, setReportType] = useState<'all' | 'risk' | 'policy'>('risk');
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const filtered = analyzedPackages.filter(p =>
    filterRisk.length === 0 || filterRisk.includes(p.riskLevel!)
  );

  const toggleFilter = (level: RiskLevel) => {
    setFilterRisk(prev => prev.includes(level)
      ? prev.filter(l => l !== level)
      : [...prev, level]);
  };

  const handleExportExcel = async () => {
    setExportingXlsx(true);
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['LAPORAN AUDIT PENGADAAN BARANG/JASA'],
        ['Instansi:', settings.instansiName],
        ['Tahun Anggaran:', settings.tahunAnggaran],
        ['File Data:', fileName || '-'],
        ['Tanggal Analisis:', stats?.analyzedAt ? new Date(stats.analyzedAt).toLocaleString('id-ID') : '-'],
        [],
        ['RINGKASAN EKSEKUTIF'],
        ['Total Paket', stats?.totalPackages || 0],
        ['Total Nilai Anggaran (Rp)', stats?.totalValue || 0],
        ['Paket Risiko Kritis', stats?.criticalCount || 0],
        ['Paket Risiko Tinggi', stats?.highCount || 0],
        ['Paket Risiko Sedang', stats?.mediumCount || 0],
        ['Paket Normal', stats?.normalCount || 0],
        ['Estimasi Nilai Terindikasi (Rp)', stats?.suspiciousValue || 0],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

      // Detail Sheet
      const detailHeaders = [
        'No', 'Kode RUP', 'Nama Paket', 'SKPD', 'Cara Pengadaan',
        'Metode Pengadaan', 'Jenis Pengadaan', 'Sumber Dana',
        'Total Nilai (Rp)', 'Risk Score', 'Level Risiko',
        'Jumlah Temuan', 'Ringkasan Temuan'
      ];
      const detailRows = filtered.map((pkg, i) => [
        i + 1, pkg.kodeRUP || '-', pkg.namaPaket || '-', pkg.namaSatuanKerja || '-',
        pkg.caraPengadaan || '-', pkg.metodePengadaan || '-', pkg.jenisPengadaan || '-',
        pkg.sumberDana || '-', pkg.totalNilai || 0, pkg.riskScore || 0, pkg.riskLevel || '-',
        pkg.riskFlags?.length || 0,
        pkg.riskFlags?.slice(0, 3).map(f => f.code.replace(/_/g, ' ')).join('; ') || '-'
      ]);
      const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Temuan');

      // SKPD Summary Sheet
      const skpdMap = new Map<string, { total: number; critical: number; high: number; value: number }>();
      filtered.forEach(p => {
        const skpd = p.namaSatuanKerja || 'Unknown';
        if (!skpdMap.has(skpd)) skpdMap.set(skpd, { total: 0, critical: 0, high: 0, value: 0 });
        const d = skpdMap.get(skpd)!;
        d.total++;
        d.value += p.totalNilai || 0;
        if (p.riskLevel === 'KRITIS') d.critical++;
        if (p.riskLevel === 'TINGGI') d.high++;
      });
      const skpdHeaders = ['SKPD', 'Total Paket', 'Kritis', 'Tinggi', 'Total Nilai (Rp)'];
      const skpdRows = Array.from(skpdMap.entries()).map(([name, d]) =>
        [name, d.total, d.critical, d.high, d.value]
      ).sort((a, b) => (b[2] as number) - (a[2] as number));
      const wsSkpd = XLSX.utils.aoa_to_sheet([skpdHeaders, ...skpdRows]);
      XLSX.utils.book_append_sheet(wb, wsSkpd, 'Rekapitulasi SKPD');

      const fileName2 = `LAPORAN_AUDIT_RUP_${settings.tahunAnggaran}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName2);
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 297, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN AUDIT PENGADAAN BARANG/JASA', 148.5, 20, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(settings.instansiName + ' | Tahun Anggaran ' + settings.tahunAnggaran, 148.5, 28, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')} | File: ${fileName || '-'}`, 148.5, 35, { align: 'center' });

      // KPI Summary
      const kpiY = 45;
      const kpiData = [
        ['Total Paket', (stats?.totalPackages || 0).toLocaleString('id-ID')],
        ['Total Nilai', `Rp ${formatRupiah(stats?.totalValue || 0)}`],
        ['Paket Kritis', (stats?.criticalCount || 0).toString()],
        ['Paket Tinggi', (stats?.highCount || 0).toString()],
        ['Nilai Terindikasi', `Rp ${formatRupiah(stats?.suspiciousValue || 0)}`],
      ];
      autoTable(doc, {
        startY: kpiY,
        head: [['Metrik', 'Nilai']],
        body: kpiData,
        margin: { left: 14 },
        tableWidth: 80,
        styles: { textColor: [255,255,255], fillColor: [17, 24, 39], fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [30, 41, 59] },
      });

      // Detail Table
      const tableData = filtered.slice(0, 200).map((pkg, i) => [
        i + 1,
        pkg.kodeRUP || '-',
        (pkg.namaPaket || '').substring(0, 60),
        (pkg.namaSatuanKerja || '').substring(0, 35),
        pkg.metodePengadaan || '-',
        `Rp ${formatRupiah(pkg.totalNilai || 0)}`,
        pkg.riskScore || 0,
        pkg.riskLevel || '-',
      ]);

      autoTable(doc, {
        startY: 110,
        head: [['No', 'Kode RUP', 'Nama Paket', 'SKPD', 'Metode', 'Nilai (Rp)', 'Score', 'Level']],
        body: tableData,
        styles: { textColor: [255,255,255], fillColor: [17, 24, 39], fontSize: 8, overflow: 'ellipsize' },
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 80 },
          3: { cellWidth: 55 },
          4: { cellWidth: 35 },
          5: { cellWidth: 30 },
          6: { cellWidth: 15 },
          7: { cellWidth: 18 },
        },
        didDrawCell: (data) => {
          if (data.column.index === 7 && data.section === 'body') {
            const level = String(data.cell.raw);
            const color = level === 'KRITIS' ? [239, 68, 68] :
              level === 'TINGGI' ? [249, 115, 22] :
              level === 'SEDANG' ? [234, 179, 8] : [34, 197, 94];
            doc.setFillColor(...(color as [number, number, number]));
            doc.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.text(level, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
          }
        }
      });

      const pdfFileName = `LAPORAN_AUDIT_RUP_${settings.tahunAnggaran}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(pdfFileName);
    } finally {
      setExportingPdf(false);
    }
  };

  if (!analyzedPackages.length) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h1>Export Laporan</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon"><FileText size={40} /></div>
          <h3>Belum Ada Data</h3>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/upload')}>Upload Data</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Export Laporan</h1>
        <p>Buat dan download laporan audit dalam format Excel atau PDF</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Filter Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>⚙️ Pengaturan Export</div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Tipe Laporan</label>
              <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value as typeof reportType)}>
                <option value="risk">Laporan Risiko (Filter Level)</option>
                <option value="all">Semua Paket</option>
              </select>
            </div>

            {reportType === 'risk' && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Filter Level Risiko</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {(['KRITIS', 'TINGGI', 'SEDANG', 'NORMAL'] as RiskLevel[]).map(level => (
                    <label key={level} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={filterRisk.includes(level)}
                        onChange={() => toggleFilter(level)}
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {level === 'KRITIS' ? '🔴' : level === 'TINGGI' ? '🟠' : level === 'SEDANG' ? '🟡' : '🟢'} {level}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.78rem' }}>
                          ({analyzedPackages.filter(p => p.riskLevel === level).length} paket)
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              padding: '12px 14px', background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, marginBottom: 16
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data yang akan diekspor:</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: 4 }}>
                {reportType === 'all' ? analyzedPackages.length : filtered.length} paket
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary w-full"
                onClick={handleExportExcel}
                disabled={exportingXlsx}
              >
                {exportingXlsx
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Membuat Excel...</>
                  : <><FileSpreadsheet size={16} /> Export Excel (.xlsx)</>}
              </button>
              <button
                className="btn btn-secondary w-full"
                onClick={handleExportPdf}
                disabled={exportingPdf}
              >
                {exportingPdf
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Membuat PDF...</>
                  : <><Download size={16} /> Export PDF</>}
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>📋 Preview Laporan</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kode RUP</th>
                  <th>Nama Paket</th>
                  <th>SKPD</th>
                  <th>Metode</th>
                  <th style={{ textAlign: 'right' }}>Nilai (Rp)</th>
                  <th>Score</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {(reportType === 'all' ? analyzedPackages : filtered).slice(0, 15).map((pkg, i) => (
                  <tr key={pkg.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontSize: '0.78rem' }}>{pkg.kodeRUP || '-'}</td>
                    <td className="truncate text-primary" style={{ maxWidth: 250 }} title={pkg.namaPaket}>{pkg.namaPaket}</td>
                    <td className="truncate" style={{ maxWidth: 150 }}>{pkg.namaSatuanKerja}</td>
                    <td style={{ fontSize: '0.8rem' }}>{pkg.metodePengadaan}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {pkg.totalNilai?.toLocaleString('id-ID')}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{pkg.riskScore}</td>
                    <td>
                      <span className={`badge badge-${pkg.riskLevel?.toLowerCase()}`}>{pkg.riskLevel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 15 && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
              Preview menampilkan 15 dari {reportType === 'all' ? analyzedPackages.length : filtered.length} baris
            </p>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

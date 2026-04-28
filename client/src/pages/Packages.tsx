import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, X, ExternalLink } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { RiskBadge } from '../components/ui/RiskBadge';
import type { RiskLevel, RUPPackage } from '../types';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 25;

const formatRupiah = (v: number) => {
  if (!v) return 'Rp 0';
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

export const PackagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { analyzedPackages, fetchPackages } = useDataStore();

  useEffect(() => {
    if (analyzedPackages.length === 0) {
      fetchPackages();
    }
  }, [analyzedPackages.length, fetchPackages]);
  const [search, setSearch] = useState('');
  const [filterSKPD, setFilterSKPD] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterMetode, setFilterMetode] = useState('');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | ''>('');
  const [sortKey, setSortKey] = useState<keyof RUPPackage>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const skpdList = useMemo(() => [...new Set(analyzedPackages.map(p => p.namaSatuanKerja))].sort(), [analyzedPackages]);
  const jenisList = useMemo(() => [...new Set(analyzedPackages.map(p => p.jenisPengadaan))].filter(Boolean).sort(), [analyzedPackages]);
  const metodeList = useMemo(() => [...new Set(analyzedPackages.map(p => p.metodePengadaan))].filter(Boolean).sort(), [analyzedPackages]);

  const filtered = useMemo(() => {
    let result = [...analyzedPackages];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.namaPaket || '').toLowerCase().includes(q) ||
        (p.namaSatuanKerja || '').toLowerCase().includes(q) ||
        (p.kodeRUP || '').includes(q)
      );
    }
    if (filterSKPD) result = result.filter(p => p.namaSatuanKerja === filterSKPD);
    if (filterJenis) result = result.filter(p => p.jenisPengadaan === filterJenis);
    if (filterMetode) result = result.filter(p => p.metodePengadaan === filterMetode);
    if (filterRisk) result = result.filter(p => p.riskLevel === filterRisk);

    result.sort((a, b) => {
      const va = (a[sortKey] as number | string) ?? 0;
      const vb = (b[sortKey] as number | string) ?? 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return result;
  }, [analyzedPackages, search, filterSKPD, filterJenis, filterMetode, filterRisk, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (key: keyof RUPPackage) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: keyof RUPPackage }) => {
    if (sortKey !== k) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const hasActiveFilters = filterSKPD || filterJenis || filterMetode || filterRisk;
  const clearFilters = () => { setFilterSKPD(''); setFilterJenis(''); setFilterMetode(''); setFilterRisk(''); setSearch(''); setPage(1); };

  if (!analyzedPackages.length) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h1>Semua Paket</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: 40 }}>📦</div>
          <h3>Belum Ada Data</h3>
          <p>Upload file RUP terlebih dahulu</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/upload')}>Upload Data</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Semua Paket</h1>
          <p>{filtered.length.toLocaleString('id-ID')} paket{filtered.length !== analyzedPackages.length ? ` dari ${analyzedPackages.length.toLocaleString('id-ID')}` : ''} ditampilkan</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card section-gap" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Cari nama paket, SKPD, kode RUP..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            className={`btn btn-secondary btn-sm ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={{ gap: 6, borderColor: showFilters ? 'var(--color-primary)' : undefined }}
          >
            <Filter size={15} /> Filter {hasActiveFilters && <span className="nav-badge" style={{ marginLeft: 0 }}>!</span>}
          </button>
          {hasActiveFilters && (
            <button className="btn btn-secondary btn-sm" onClick={clearFilters} style={{ color: 'var(--color-kritis)' }}>
              <X size={14} /> Reset
            </button>
          )}
        </div>

        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">SKPD</label>
              <select className="form-select" value={filterSKPD} onChange={e => { setFilterSKPD(e.target.value); setPage(1); }}>
                <option value="">Semua SKPD</option>
                {skpdList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jenis Pengadaan</label>
              <select className="form-select" value={filterJenis} onChange={e => { setFilterJenis(e.target.value); setPage(1); }}>
                <option value="">Semua Jenis</option>
                {jenisList.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Metode Pengadaan</label>
              <select className="form-select" value={filterMetode} onChange={e => { setFilterMetode(e.target.value); setPage(1); }}>
                <option value="">Semua Metode</option>
                {metodeList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Level Risiko</label>
              <select className="form-select" value={filterRisk} onChange={e => { setFilterRisk(e.target.value as RiskLevel | ''); setPage(1); }}>
                <option value="">Semua Level</option>
                <option value="KRITIS">🔴 Kritis</option>
                <option value="TINGGI">🟠 Tinggi</option>
                <option value="SEDANG">🟡 Sedang</option>
                <option value="NORMAL">🟢 Normal</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th className="sortable" onClick={() => handleSort('namaPaket')}>Nama Paket <SortIcon k="namaPaket" /></th>
              <th className="sortable" onClick={() => handleSort('namaSatuanKerja')}>SKPD <SortIcon k="namaSatuanKerja" /></th>
              <th className="sortable" onClick={() => handleSort('metodePengadaan')}>Metode <SortIcon k="metodePengadaan" /></th>
              <th className="sortable" onClick={() => handleSort('jenisPengadaan')}>Jenis <SortIcon k="jenisPengadaan" /></th>
              <th className="sortable" onClick={() => handleSort('totalNilai')} style={{ textAlign: 'right' }}>Nilai (Rp) <SortIcon k="totalNilai" /></th>
              <th className="sortable" onClick={() => handleSort('riskScore')} style={{ textAlign: 'center' }}>Score <SortIcon k="riskScore" /></th>
              <th>Level</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((pkg, i) => (
              <tr key={pkg.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {(page - 1) * ITEMS_PER_PAGE + i + 1}
                </td>
                <td className="truncate text-primary" style={{ maxWidth: 300 }} title={pkg.namaPaket}>
                  {pkg.kodeRUP ? (
                    <a href={`https://data.inaproc.id/rup?kode=${pkg.kodeRUP}&sumber=${pkg.caraPengadaan?.toLowerCase().includes('swakelola') ? 'Swakelola' : 'Penyedia'}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>
                      {pkg.namaPaket}
                    </a>
                  ) : (
                    pkg.namaPaket
                  )}
                </td>
                <td className="truncate" style={{ maxWidth: 180 }} title={pkg.namaSatuanKerja}>
                  {pkg.namaSatuanKerja}
                </td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{pkg.metodePengadaan}</td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{pkg.jenisPengadaan}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatRupiah(pkg.totalNilai)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    fontWeight: 800, fontSize: '0.9rem',
                    color: pkg.riskLevel === 'KRITIS' ? 'var(--color-kritis)' :
                      pkg.riskLevel === 'TINGGI' ? 'var(--color-tinggi)' :
                        pkg.riskLevel === 'SEDANG' ? 'var(--color-sedang)' : 'var(--color-normal)'
                  }}>
                    {pkg.riskScore ?? 0}
                  </span>
                </td>
                <td><RiskBadge level={pkg.riskLevel!} /></td>
                <td>
                  <button
                    className="btn btn-secondary btn-icon btn-sm"
                    onClick={() => navigate('/risk-analysis', { state: { pkgId: pkg.id } })}
                    title="Lihat detail"
                  >
                    <ExternalLink size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(1)}>«</button>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
            return (
              <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)}>
                {p}
              </button>
            );
          })}
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            Hal {page} / {totalPages}
          </span>
        </div>
      )}
    </div>
  );
};

import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_URL || "file:/tmp/data.sqlite",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDB() {
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      namaPaket TEXT, namaSatuanKerja TEXT, caraPengadaan TEXT,
      metodePengadaan TEXT, jenisPengadaan TEXT, totalNilai REAL,
      sumberDana TEXT, produkDalamNegeri TEXT, kodeRUP TEXT,
      riskScore REAL, riskLevel TEXT, findings TEXT,
      recommendations TEXT, policyAlignment TEXT, summary TEXT,
      markupIndicators TEXT, wasteIndicators TEXT
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, config TEXT)`);
    await db.execute(`INSERT OR IGNORE INTO settings (id, config) VALUES (1, '{}')`);
    console.log('✅ DB Ready');
  } catch (err) {
    console.error('❌ DB Init Error:', err.message);
  }
}
initDB().catch(console.error);

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

async function callAI(prompt, provider, options = {}, isJsonFormat = false) {
  const { geminiModel, ollamaModel, ollamaBaseUrl, ollamaApiKey, anthropicModel, customModel, customBaseUrl, customApiKey } = options;

  if (provider === 'ollama') {
    const baseUrl = ollamaBaseUrl || 'http://localhost:11434';
    const headers = { 'Content-Type': 'application/json' };
    if (ollamaApiKey) headers['Authorization'] = `Bearer ${ollamaApiKey}`;
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST', headers,
      body: JSON.stringify({ model: ollamaModel || 'llama3', prompt, stream: false, format: isJsonFormat ? "json" : undefined })
    });
    if (!res.ok) throw new Error(`Ollama Error: ${res.statusText}`);
    const data = await res.json();
    return data.response || "";
  } else if (provider === 'anthropic') {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY belum dikonfigurasi");
    const systemMatch = prompt.match(/Anda adalah[^.]+\./i);
    const systemPrompt = systemMatch ? systemMatch[0] : "Anda adalah asisten AI profesional.";
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: anthropicModel || 'claude-3-7-sonnet-20250219', max_tokens: 4000, system: systemPrompt, messages: [{ role: 'user', content: prompt }] })
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Anthropic Error: ${e.error?.message || res.statusText}`); }
    const data = await res.json();
    return data.content[0].text || "";
  } else if (provider === 'custom') {
    const apiKey = process.env.CUSTOM_API_KEY || process.env.GROQ_API_KEY || customApiKey;
    let baseUrl = process.env.CUSTOM_BASE_URL || customBaseUrl || 'https://api.openai.com/v1';
    
    if (apiKey && apiKey.startsWith('gsk_') && baseUrl === 'https://api.openai.com/v1') {
      baseUrl = 'https://api.groq.com/openai/v1';
    }

    let model = customModel || process.env.CUSTOM_MODEL || 'gpt-4o-mini';
    if (baseUrl === 'https://api.groq.com/openai/v1' && model === 'gpt-4o-mini') {
        model = 'llama3-70b-8192'; // default groq model if not specified
    }

    if (!apiKey) throw new Error(`Custom/Groq API Key belum dikonfigurasi`);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false, response_format: isJsonFormat && !model?.startsWith('o1') ? { type: "json_object" } : undefined })
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Custom Error: ${e.error?.message || res.statusText}`); }
    const data = await res.json();
    return data.choices[0].message.content || "";
  } else {
    const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

function extractJSON(text, isArray = false) {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const targetText = codeBlockMatch ? codeBlockMatch[1] : cleaned;
  if (isArray) {
    const arrayMatch = targetText.match(/\[[\s\S]*\]/);
    if (arrayMatch) { try { return JSON.parse(arrayMatch[0]); } catch (e) {} }
  }
  const objectMatch = targetText.match(/\{[\s\S]*\}/);
  if (objectMatch) { try { const obj = JSON.parse(objectMatch[0]); return isArray ? [obj] : obj; } catch (e) {} }
  return null;
}

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const result = await db.execute('SELECT COUNT(*) as count FROM packages');
    res.json({ 
      status: 'ok', 
      message: 'SIRUP Analyzer Backend Running', 
      dbSize: result.rows[0].count,
      hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const result = await db.execute('SELECT config FROM settings WHERE id = 1');
    const row = result.rows[0];
    res.json({ success: true, settings: row && row.config ? JSON.parse(row.config) : {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    await db.execute({ sql: 'UPDATE settings SET config = ? WHERE id = 1', args: [JSON.stringify(req.body)] });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/packages', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM packages');
    const parsed = result.rows.map(p => ({
      ...p,
      findings: p.findings ? JSON.parse(p.findings) : [],
      recommendations: p.recommendations ? JSON.parse(p.recommendations) : [],
      markupIndicators: p.markupIndicators ? JSON.parse(p.markupIndicators) : [],
      wasteIndicators: p.wasteIndicators ? JSON.parse(p.wasteIndicators) : []
    }));
    res.json({ success: true, packages: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/packages/bulk', async (req, res) => {
  const { packages, append } = req.body;
  if (!Array.isArray(packages)) return res.status(400).json({ error: 'Invalid data format' });
  try {
    if (!append) await db.execute('DELETE FROM packages');
    const statements = packages.map(p => ({
      sql: `INSERT INTO packages (namaPaket, namaSatuanKerja, caraPengadaan, metodePengadaan, jenisPengadaan, totalNilai, sumberDana, produkDalamNegeri, kodeRUP, riskScore, riskLevel, findings, recommendations, policyAlignment, summary, markupIndicators, wasteIndicators) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.namaPaket||null, p.namaSatuanKerja||null, p.caraPengadaan||null, p.metodePengadaan||null, p.jenisPengadaan||null, p.totalNilai||0, p.sumberDana||null, p.produkDalamNegeri||null, p.kodeRUP||null, p.riskScore||0, p.riskLevel||'NORMAL', JSON.stringify(p.findings||[]), JSON.stringify(p.recommendations||[]), p.policyAlignment||null, p.summary||null, JSON.stringify(p.markupIndicators||[]), JSON.stringify(p.wasteIndicators||[])]
    }));
    for (let i = 0; i < statements.length; i += 100) {
      await db.batch(statements.slice(i, i + 100), "write");
    }
    res.json({ success: true, count: packages.length });
  } catch (error) {
    console.error('Bulk Insert Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/packages', async (req, res) => {
  try {
    await db.execute('DELETE FROM packages');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gemini/analyze', async (req, res) => {
  try {
    const { packageData, context, aiProvider, analysisInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = analysisInstructions || customInstructions;
    const prompt = `Anda adalah auditor pengadaan pemerintah yang berpengalaman di Indonesia.
${instructions ? `\n**Instruksi Tambahan:**\n${instructions}\n` : ''}
Analisis paket pengadaan berikut dan berikan penilaian risiko:
- Nama Paket: ${packageData.namaPaket}
- SKPD: ${packageData.namaSatuanKerja}
- Cara Pengadaan: ${packageData.caraPengadaan}
- Metode Pengadaan: ${packageData.metodePengadaan}
- Jenis Pengadaan: ${packageData.jenisPengadaan}
- Nilai: Rp ${packageData.totalNilai?.toLocaleString('id-ID')}
- Sumber Dana: ${packageData.sumberDana}
- Produk Dalam Negeri: ${packageData.produkDalamNegeri}
${context ? `**Konteks Program Prioritas:**\n${context}` : ''}
Berikan analisis dalam format JSON:
{"riskScore":<0-100>,"riskLevel":"<NORMAL|SEDANG|TINGGI|KRITIS>","findings":["<temuan>"],"recommendations":["<rekomendasi>"],"policyAlignment":"<SESUAI|TIDAK_SESUAI|PERLU_REVIEW>","summary":"<ringkasan>","markupIndicators":["<indikator>"],"wasteIndicators":["<indikator>"]}`;
    const text = await callAI(prompt, aiProvider, { ...aiOptions, customInstructions }, true);
    const analysis = extractJSON(text, false);
    if (!analysis) throw new Error('Format respon AI tidak valid');
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gemini/batch', async (req, res) => {
  try {
    const { packages, priorities, aiProvider, analysisInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = analysisInstructions || customInstructions;
    const packageList = packages.slice(0, 10).map((p, i) =>
      `${i+1}. ${p.namaPaket} | ${p.namaSatuanKerja} | Rp ${p.totalNilai?.toLocaleString('id-ID')} | ${p.metodePengadaan}`
    ).join('\n');
    const prompt = `Anda adalah auditor pengadaan pemerintah Indonesia yang ahli.
${instructions ? `\n**Instruksi Tambahan:**\n${instructions}\n` : ''}
Analisis setiap paket berikut:
${packageList}
${priorities?.length ? `Program Prioritas:\n${priorities.slice(0,10).join('\n')}` : ''}
Berikan dalam format JSON array:
[{"index":<1-based>,"riskScore":<0-100>,"riskLevel":"<NORMAL|SEDANG|TINGGI|KRITIS>","mainConcern":"<singkat>","detailedAnalysis":"<3-5 kalimat>","policyAlignment":"<SESUAI|TIDAK_SESUAI|PERLU_REVIEW>"}]`;
    const text = await callAI(prompt, aiProvider, { ...aiOptions, customInstructions }, true);
    const analyses = extractJSON(text, true);
    if (!analyses) throw new Error('Format respon AI tidak valid');
    res.json({ success: true, analyses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gemini/report', async (req, res) => {
  try {
    const { summary, topRisks, instansi, period, aiProvider, reportInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = reportInstructions || customInstructions;
    const prompt = `Anda adalah auditor pemerintah yang membuat laporan audit resmi dalam Bahasa Indonesia.
${instructions ? `\n**Instruksi Tambahan:**\n${instructions}\n` : ''}
Buat narasi laporan audit pengadaan untuk:
- Instansi: ${instansi || 'Pemerintah Daerah'}
- Periode: ${period || '2026'}
- Total Paket: ${summary.totalPackages}
- Total Nilai: Rp ${summary.totalValue?.toLocaleString('id-ID')}
- Paket Kritis: ${summary.criticalCount}
- Paket Tinggi: ${summary.highCount}
Top Risiko: ${topRisks?.slice(0,5).map((r,i)=>`${i+1}. ${r.namaPaket} - ${r.namaSatuanKerja}`).join('\n')}
Buat laporan dengan: 1) Ringkasan Eksekutif 2) Temuan Utama 3) Rekomendasi 4) Kesimpulan`;
    const narrative = await callAI(prompt, aiProvider, aiOptions, false);
    res.json({ success: true, narrative });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gemini/chat', async (req, res) => {
  try {
    const { message, context, aiProvider, analysisInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = analysisInstructions || customInstructions;
    const systemContext = `Anda adalah asisten audit pengadaan pemerintah Indonesia yang ahli dalam Perpres 16/2018, deteksi mark-up, dan analisis RUP.
${instructions ? `**Instruksi Khusus:**\n${instructions}\n` : ''}
${context ? `Konteks: ${context}` : ''}`;
    const response = await callAI(`${systemContext}\n\nPertanyaan: ${message}`, aiProvider, aiOptions, false);
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api', router);
app.use('/', router);

export default app;

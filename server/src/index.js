import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_URL || "file:data.sqlite",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize Database Tables
async function initDB() {
  console.log('🔄 Initializing Database...');
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        namaPaket TEXT,
        namaSatuanKerja TEXT,
        caraPengadaan TEXT,
        metodePengadaan TEXT,
        jenisPengadaan TEXT,
        totalNilai REAL,
        sumberDana TEXT,
        produkDalamNegeri TEXT,
        kodeRUP TEXT,
        riskScore REAL,
        riskLevel TEXT,
        findings TEXT,
        recommendations TEXT,
        policyAlignment TEXT,
        summary TEXT,
        markupIndicators TEXT,
        wasteIndicators TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        config TEXT
      )
    `);
    
    await db.execute(`INSERT OR IGNORE INTO settings (id, config) VALUES (1, '{}')`);
    console.log('✅ Database Initialized Successfully');
  } catch (err) {
    console.error('❌ Database Initialization Failed:', err);
  }
}

initDB().catch(console.error);

const app = express();
const PORT = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Allow all origins in production for Vercel deployment
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// AI Route Helper
// AI Route Helper
async function callAI(prompt, provider, options = {}, isJsonFormat = false) {
  console.log(`🤖 AI Request - Provider: ${provider}, Model: ${options.anthropicModel || options.customModel || options.ollamaModel || options.geminiModel}`);
  const { 
    geminiModel, 
    ollamaModel, ollamaBaseUrl, ollamaApiKey,
    anthropicModel,
    customModel, customBaseUrl, customApiKey
  } = options;

  if (provider === 'ollama') {
    try {
      const baseUrl = ollamaBaseUrl || 'http://localhost:11434';
      const headers = { 'Content-Type': 'application/json' };
      if (ollamaApiKey) headers['Authorization'] = `Bearer ${ollamaApiKey}`;

      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: ollamaModel || 'llama3',
          prompt: prompt,
          stream: false,
          format: isJsonFormat ? "json" : undefined
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama Error: ${errText || res.statusText}`);
      }
      const data = await res.json();
      return data.response || "";
    } catch (err) {
      throw new Error(`Koneksi ke Ollama gagal: ${err.message}. Pastikan URL dan Model benar.`);
    }
  } else if (provider === 'anthropic') {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY belum dikonfigurasi di file server/.env");
    try {
      // Create a system prompt variation for Anthropic since it prefers explicit system role
      const systemMatch = prompt.match(/Anda adalah[^.]+\./i);
      const systemPrompt = systemMatch ? systemMatch[0] : "Anda adalah asisten AI profesional.";
      
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: anthropicModel || 'claude-3-7-sonnet-20250219',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Anthropic API Error: ${errData.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return data.content[0].text || "";
    } catch (err) {
      throw new Error(`Koneksi ke Anthropic gagal: ${err.message}`);
    }
  } else if (provider === 'custom') {
    const apiKey = process.env.CUSTOM_API_KEY || process.env.GROQ_API_KEY || customApiKey;
    
    const baseUrl = process.env.CUSTOM_BASE_URL || customBaseUrl || 'https://api.openai.com/v1';
    
    const model = customModel || process.env.CUSTOM_MODEL || 'gpt-4o-mini';

    if (!apiKey) throw new Error(`Custom/Groq API Key belum dikonfigurasi di server/.env atau Pengaturan.`);
    
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          response_format: isJsonFormat && !model?.startsWith('o1') ? { type: "json_object" } : undefined
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Custom Error: ${errData.error?.message || res.statusText}`);
      }
      const data = await res.json();
      return data.choices[0].message.content || "";
    } catch (err) {
      throw new Error(`Koneksi ke Custom Provider gagal: ${err.message}`);
    }
  } else {
    const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

// Helper to extract JSON from AI response
function extractJSON(text, isArray = false) {
  // Remove DeepSeek reasoning blocks if present
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Try to find JSON in markdown code blocks first
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const targetText = codeBlockMatch ? codeBlockMatch[1] : cleaned;

  // Try to find array first if requested
  if (isArray) {
    const arrayMatch = targetText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e) {}
    }
  }

  // Try to find object
  const objectMatch = targetText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const obj = JSON.parse(objectMatch[0]);
      return isArray ? [obj] : obj;
    } catch (e) {}
  }
  
  return null;
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.execute('SELECT COUNT(*) as count FROM packages');
    res.json({ 
      status: 'ok', 
      message: 'SIRUP Analyzer Backend Running',
      hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
      dbSize: result.rows[0].count
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Database Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const result = await db.execute('SELECT config FROM settings WHERE id = 1');
    const row = result.rows[0];
    res.json({ success: true, settings: row && row.config ? JSON.parse(row.config) : {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const configStr = JSON.stringify(req.body);
    await db.execute({
      sql: 'UPDATE settings SET config = ? WHERE id = 1',
      args: [configStr]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/packages', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM packages');
    const packages = result.rows;
    // Parse JSON strings back to objects
    const parsed = packages.map(p => ({
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

app.post('/api/packages/bulk', async (req, res) => {
  const { packages } = req.body;
  if (!Array.isArray(packages)) return res.status(400).json({ error: 'Invalid data format' });

  try {
    // Clear old data first
    await db.execute('DELETE FROM packages');

    // Prepare batch statements
    const statements = packages.map(p => ({
      sql: `INSERT INTO packages (
        namaPaket, namaSatuanKerja, caraPengadaan, metodePengadaan, jenisPengadaan, 
        totalNilai, sumberDana, produkDalamNegeri, kodeRUP, riskScore, riskLevel, 
        findings, recommendations, policyAlignment, summary, markupIndicators, wasteIndicators
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.namaPaket || null,
        p.namaSatuanKerja || null,
        p.caraPengadaan || null,
        p.metodePengadaan || null,
        p.jenisPengadaan || null,
        p.totalNilai || 0,
        p.sumberDana || null,
        p.produkDalamNegeri || null,
        p.kodeRUP || null,
        p.riskScore || 0,
        p.riskLevel || 'NORMAL',
        JSON.stringify(p.findings || []),
        JSON.stringify(p.recommendations || []),
        p.policyAlignment || null,
        p.summary || null,
        JSON.stringify(p.markupIndicators || []),
        JSON.stringify(p.wasteIndicators || [])
      ]
    }));

    // Execute in batches of 100 to avoid limits
    for (let i = 0; i < statements.length; i += 100) {
      const chunk = statements.slice(i, i + 100);
      await db.batch(chunk, "write");
    }

    res.json({ success: true, count: packages.length });
  } catch (error) {
    console.error('Bulk Insert Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/packages', async (req, res) => {
  try {
    await db.execute('DELETE FROM packages');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze single package
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { packageData, context, aiProvider, analysisInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = analysisInstructions || customInstructions;

    const prompt = `Anda adalah auditor pengadaan pemerintah yang berpengalaman di Indonesia.
${instructions ? `\n**Instruksi Tambahan:**\n${instructions}\n` : ''}

Analisis paket pengadaan berikut dan berikan penilaian risiko:

**Data Paket:**
- Nama Paket: ${packageData.namaPaket}
- SKPD: ${packageData.namaSatuanKerja}
- Cara Pengadaan: ${packageData.caraPengadaan}
- Metode Pengadaan: ${packageData.metodePengadaan}
- Jenis Pengadaan: ${packageData.jenisPengadaan}
- Nilai: Rp ${packageData.totalNilai?.toLocaleString('id-ID')}
- Sumber Dana: ${packageData.sumberDana}
- Produk Dalam Negeri: ${packageData.produkDalamNegeri}

${context ? `**Konteks Program Prioritas:**\n${context}` : ''}

Berikan analisis dalam format JSON berikut (pastikan valid JSON):
{
  "riskScore": <angka 0-100>,
  "riskLevel": "<NORMAL|SEDANG|TINGGI|KRITIS>",
  "findings": ["<temuan 1>", "<temuan 2>"],
  "recommendations": ["<rekomendasi 1>", "<rekomendasi 2>"],
  "policyAlignment": "<SESUAI|TIDAK_SESUAI|PERLU_REVIEW>",
  "summary": "<ringkasan singkat dalam 2-3 kalimat>",
  "markupIndicators": ["<indikator mark-up jika ada>"],
  "wasteIndicators": ["<indikator pemborosan jika ada>"]
}`;

    const text = await callAI(prompt, aiProvider, { ...aiOptions, customInstructions }, true);
    
    const analysis = extractJSON(text, false);
    if (!analysis) {
      console.error('❌ Gagal mengekstrak JSON. Raw AI text:', text);
      throw new Error('Format respon AI tidak valid (Gagal mengekstrak JSON)');
    }
    
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch analyze multiple packages
app.post('/api/gemini/batch', async (req, res) => {
  try {
    const { packages, priorities, aiProvider, analysisInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = analysisInstructions || customInstructions;

    const packageList = packages.slice(0, 10).map((p, i) => 
      `${i+1}. ${p.namaPaket} | ${p.namaSatuanKerja} | Rp ${p.totalNilai?.toLocaleString('id-ID')} | ${p.metodePengadaan}`
    ).join('\n');

    const prompt = `Anda adalah auditor pengadaan pemerintah Indonesia yang ahli.
${instructions ? `\n**Instruksi Tambahan:**\n${instructions}\n` : ''}

Lakukan analisis mendalam untuk setiap paket pengadaan berikut:

${packageList}

${priorities?.length ? `Program Prioritas Kepala Daerah:\n${priorities.slice(0,10).join('\n')}` : ''}

Untuk setiap paket, berikan analisis dalam format JSON array (Pastikan "detailedAnalysis" berisi penjelasan naratif 3-5 kalimat tentang mengapa paket tersebut berisiko atau aman):
[
  {
    "index": <nomor urut 1-based>,
    "riskScore": <0-100>,
    "riskLevel": "<NORMAL|SEDANG|TINGGI|KRITIS>",
    "mainConcern": "<kekhawatiran utama singkat>",
    "detailedAnalysis": "<analisis mendalam dan penjelasan naratif 3-5 kalimat dalam Bahasa Indonesia>",
    "policyAlignment": "<SESUAI|TIDAK_SESUAI|PERLU_REVIEW>"
  }
]`;

    const text = await callAI(prompt, aiProvider, { ...aiOptions, customInstructions }, true);
    
    const analyses = extractJSON(text, true);
    if (!analyses) {
      console.error('❌ Gagal mengekstrak JSON Array. Raw AI text:', text);
      throw new Error('Format respon AI tidak valid (Gagal mengekstrak JSON Array)');
    }
    
    res.json({ success: true, analyses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate audit report narrative
app.post('/api/gemini/report', async (req, res) => {
  try {
    const { summary, topRisks, instansi, period, aiProvider, reportInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = reportInstructions || customInstructions;

    const prompt = `Anda adalah auditor pemerintah yang membuat laporan audit resmi dalam Bahasa Indonesia.
${instructions ? `\n**Instruksi Tambahan:**\n${instructions}\n` : ''}

Buat narasi laporan audit pengadaan untuk:
- Instansi: ${instansi || 'Pemerintah Daerah'}
- Periode: ${period || '2026'}
- Total Paket Dianalisis: ${summary.totalPackages}
- Total Nilai: Rp ${summary.totalValue?.toLocaleString('id-ID')}
- Paket Berisiko Kritis: ${summary.criticalCount}
- Paket Berisiko Tinggi: ${summary.highCount}
- Estimasi Nilai Terindikasi: Rp ${summary.suspiciousValue?.toLocaleString('id-ID')}

Top Temuan Risiko Tinggi:
${topRisks?.slice(0,5).map((r, i) => `${i+1}. ${r.namaPaket} - ${r.namaSatuanKerja} - Rp ${r.totalNilai?.toLocaleString('id-ID')}`).join('\n')}

Buat laporan naratif profesional yang mencakup:
1. Ringkasan Eksekutif (2-3 paragraf)
2. Temuan Utama (dalam format poin)
3. Rekomendasi Tindak Lanjut (dalam format poin)
4. Kesimpulan (1 paragraf)

Format sebagai teks biasa yang formal dan profesional.`;

    const narrative = await callAI(prompt, aiProvider, aiOptions, false);
    
    res.json({ success: true, narrative });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chat with AI about specific package or general questions
app.post('/api/gemini/chat', async (req, res) => {
  console.log('💬 Incoming Chat Request');
  try {
    const { message, context, aiProvider, analysisInstructions, customInstructions, ...aiOptions } = req.body;
    const instructions = analysisInstructions || customInstructions;

    const systemContext = `Anda adalah asisten audit pengadaan pemerintah Indonesia yang ahli dalam:
- Peraturan pengadaan barang/jasa pemerintah (Perpres 16/2018 dan perubahannya)
- Deteksi mark-up harga dan pemborosan anggaran
- Analisis RUP (Rencana Umum Pengadaan)
- Kebijakan pengadaan daerah

${instructions ? `**Instruksi Khusus Anda:**\n${instructions}\n` : ''}
${context ? `Konteks data saat ini:\n${context}` : ''}

Jawab pertanyaan dalam Bahasa Indonesia yang jelas dan profesional.`;

    const response = await callAI(`${systemContext}\n\nPertanyaan: ${message}`, aiProvider, aiOptions, false);
    
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ SIRUP Analyzer Backend running on http://localhost:${PORT}`);
  });
}

export default app;

import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No API Key found.");
    return;
  }
  
  try {
    // We use the global fetch available in Node.js 18+
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    
    if (data.models) {
      const modelNames = data.models.map(m => m.name).filter(n => n.includes('gemini'));
      console.log("AVAILABLE GEMINI MODELS:");
      console.log(modelNames);
    } else {
      console.log("Error or no models found:", data);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

checkModels();

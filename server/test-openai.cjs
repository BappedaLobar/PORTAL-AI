const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const keyMatch = envFile.match(/OPENAI_API_KEY=(.+)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

async function testOpenAI() {
  console.log('Testing OpenAI with key starting with:', apiKey.substring(0, 15) + '...');
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Test ping' }],
      stream: false
    })
  });
  
  const text = await res.text();
  console.log('Status:', res.status, res.statusText);
  console.log('Response body:', text);
}

testOpenAI();

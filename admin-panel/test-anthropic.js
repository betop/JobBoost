#!/usr/bin/env node

// Test Anthropic API connection
// Usage: node test-anthropic.js <your-api-key>

const apiKey = process.argv[2] || process.env.ANTHROPIC_API_KEY;

if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
  console.error('❌ No valid API key provided');
  console.error('Usage: node test-anthropic.js sk-ant-xxxxx');
  console.error('Or set ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

console.log('🔑 Testing API key:', apiKey.slice(0, 15) + '...');

const testPayload = {
  model: "claude-3-5-haiku-20241022",  // Correct model name
  max_tokens: 100,
  messages: [
    {
      role: "user",
      content: "Reply with just: OK"
    }
  ]
};

fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify(testPayload),
})
  .then(async (res) => {
    console.log('📡 Response status:', res.status);
    const data = await res.json();
    
    if (res.ok) {
      console.log('✅ API key is valid!');
      console.log('🤖 Claude response:', data.content?.[0]?.text);
      console.log('\n✨ Test successful - you can use this key in .env.local');
    } else {
      console.error('❌ API request failed');
      console.error('Error:', JSON.stringify(data, null, 2));
    }
  })
  .catch((err) => {
    console.error('❌ Network error:', err.message);
  });

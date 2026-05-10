#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';

const tests = [
  { name: '服务器响应', test: () => makeRequest('/') },
  { name: '主入口加载', test: () => makeRequest('/index.html') },
  { name: '道具配置JSON', test: () => makeRequest('/src/data/props/props.json') },
  { name: '音效配置JSON', test: () => makeRequest('/src/data/audio/sounds.json') },
];

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🚀 道具系统集成测试\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const result = await t.test();
      if (result.status === 200) {
        console.log(`✅ ${t.name}: 通过 (${result.status})`);
        if (result.data && result.data.includes('props')) {
          console.log(`   内容预览: ${result.data.substring(0, 100)}...`);
        }
        passed++;
      } else {
        console.log(`❌ ${t.name}: 失败 (${result.status})`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${t.name}: 错误 - ${e.message}`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

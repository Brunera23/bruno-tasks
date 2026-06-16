const fs = require('fs');
const http = require('http');

async function fetchHtml() {
  return new Promise((resolve) => {
    http.get('http://localhost:8082/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
  });
}

async function run() {
  const html1 = await fetchHtml();
  console.log('Original length:', html1.length);
  
  const original = fs.readFileSync('index.html', 'utf8');
  fs.writeFileSync('index.html', original + '\n<!-- TEST -->');
  
  const html2 = await fetchHtml();
  console.log('Modified length:', html2.length);
  
  fs.writeFileSync('index.html', original);
  process.exit(0);
}

run();

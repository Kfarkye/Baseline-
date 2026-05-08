const http = require('http');
setTimeout(() => {
  http.get('http://localhost:3000/api/get-errors', res => {
    let b = '';
    res.on('data', d => b += d);
    res.on('end', () => console.log('ERRORS:', b));
  });
}, 2000);

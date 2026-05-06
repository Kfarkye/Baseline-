import http from 'http';

http.get('http://localhost:3000/api/stream/odds?sport=upcoming', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let count = 0;
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk.toString().substring(0, 500)}`);
    count++;
    if (count > 0) process.exit(0);
  });
}).on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

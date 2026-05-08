const http = require('http');
http.get('http://localhost:3000/src/components/ArtifactRenderer.tsx', res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log('BODY:', b.slice(0, 1500)));
});

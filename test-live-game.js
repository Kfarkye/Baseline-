const http = require('http');

http.get('http://localhost:3000/api/odds', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const odds = JSON.parse(data);
    const liveGames = odds.filter(o => o.status === 'live');
    if (liveGames.length > 0) {
      console.log(JSON.stringify(liveGames[0].situation_detail, null, 2));
    } else {
      console.log('No live games');
    }
  });
});

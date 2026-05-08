import axios from 'axios';

axios.get('http://localhost:3000/api/odds').then(res => {
  const odds = res.data;
  const liveGames = odds.filter((o: any) => o.status === 'live');
  if (liveGames.length > 0) {
    console.log(JSON.stringify(liveGames[0].situation_detail, null, 2));
  } else {
    console.log('No live games');
  }
}).catch(console.error);

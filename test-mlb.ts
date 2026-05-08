import axios from 'axios';

async function testMLB() {
  const date = new Date().toISOString().split('T')[0];
  const scheduleRes = await axios.get(`https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${date}`);
  const games = scheduleRes.data.dates[0].games;
  for (const game of games) {
    if (game.status.abstractGameState === 'Live') {
      const liveRes = await axios.get(`https://statsapi.mlb.com/api/v1.1/game/${game.gamePk}/feed/live`);
      const payload = liveRes.data.liveData.plays.currentPlay;
      console.log('MLB Live Play:', JSON.stringify(payload, null, 2));
      break;
    }
  }
}
testMLB();

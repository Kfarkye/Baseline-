import axios from 'axios';

async function mapSummary() {
  try {
    const res = await axios.get(`http://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=401815248`);
    const boxscore = res.data.boxscore;
    const pitchingStats = boxscore.teams[0].statistics.find((s:any) => s.name === 'pitching');
    console.log(JSON.stringify(pitchingStats, null, 2));
    const players = boxscore.players;
    if (players && players[0] && players[0].statistics) {
       console.log('Player 1 stats:', JSON.stringify(players[0].statistics, null, 2));
    }
    console.log("Plays:", JSON.stringify(res.data.plays?.slice(0, 1), null, 2));
  } catch(e) { console.error(e); }
}
mapSummary();

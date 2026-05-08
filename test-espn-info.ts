import axios from 'axios';

async function test() {
  try {
    const mlbRes4 = await axios.get(`https://statsapi.mlb.com/api/v1/teams/stats?sportId=1&stats=season&group=pitching&season=2026`);
    
    if (mlbRes4.data.stats[0]?.splits?.length > 0) {
        console.log("First team in league:", mlbRes4.data.stats[0].splits[0].team);
        console.log("Second team in league:", mlbRes4.data.stats[0].splits[1].team);
    }
    
  } catch (e: any) {
    if (e.response) {
      console.error("MLB API fetch error status", e.response.status);
    } else {
      console.error("MLB API fetch error", e.message);
    }
  }
}
test();

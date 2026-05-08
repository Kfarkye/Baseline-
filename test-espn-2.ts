import axios from 'axios';

async function mapSituation() {
  try {
    const dates = [
      new Date().toISOString().split('T')[0].replace(/-/g, ''), // Today
    ];
    const res = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dates[0]}`);
    const events = res.data.events;
    for (const event of events) {
      if (event.competitions[0].status.type.state === 'in') {
        const comp = event.competitions[0];
        console.log(JSON.stringify(comp.situation, null, 2));
      }
    }
  } catch(e) { console.error(e); }
}
mapSituation();

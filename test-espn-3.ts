import axios from 'axios';

async function mapBoxscore() {
  try {
    const dates = [
      new Date().toISOString().split('T')[0].replace(/-/g, ''), // Today
    ];
    const res = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dates[0]}`);
    const events = res.data.events;
    for (const event of events) {
      if (event.competitions[0].status.type.state === 'in') {
        const comp = event.competitions[0];
        console.log(Object.keys(comp));
        if (comp.boxscore) {
          console.log(JSON.stringify(comp.boxscore, null, 2));
        } else {
          console.log('No boxscore in scoreboard summary. Let us fetch the event directly: ', event.links[0].href);
          const ev = (await axios.get(event.links[0].href)).data;
          console.log(Object.keys(ev));
          if (ev.boxscore) console.log(JSON.stringify(ev.boxscore, null, 2).substring(0, 1000));
        }
        break;
      }
    }
  } catch(e) { console.error(e); }
}
mapBoxscore();

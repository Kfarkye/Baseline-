import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events');
    const items = res.data.items;
    for (const item of items) {
      const eventRes = await axios.get(item.$ref);
      const event = eventRes.data;
      if (event.competitions[0].status.type.state === 'in') {
        console.log(JSON.stringify(event.competitions[0].situation, null, 2));
        break;
      }
    }
  } catch(e) {
    console.error(e);
  }
}
test();

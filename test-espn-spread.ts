import axios from 'axios';
async function test() {
  const dates = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const res = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dates}`);
  if (res.data.events.length > 0) {
      console.log(JSON.stringify(res.data.events[0].competitions[0].odds, null, 2));
  }
}
test();

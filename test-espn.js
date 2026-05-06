import axios from "axios";

async function test() {
  try {
    const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard');
    const events = response.data.events;
    
    console.log("Events count:", events.length);
    const data = events.slice(0, 2).map(e => ({
      status: e.status.type.state,
      commence_time: e.date,
      title: e.name
    }));
    console.log("Sample:", data);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();

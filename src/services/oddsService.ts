import axios from 'axios';

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Market {
  key: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

export interface MarketDataStatus {
  state: "grounded" | "partial" | "failed";
  code?: string;
  message?: string;
  allowed_output?: string;
}

export interface SportOdds {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_score?: string;
  away_score?: string;
  status?: string;
  score?: string;
  situation?: string;
  context?: string;
  home_pitcher?: string;
  away_pitcher?: string;
  home_pitcher_headshot?: string;
  away_pitcher_headshot?: string;
  home_pitcher_record?: string;
  away_pitcher_record?: string;
  venue?: string;
  result_context?: string;
  event_id?: string;
  source_url?: string;
  fetched_at?: string;
  market_data_status?: MarketDataStatus;
  inning?: number | string;
  inning_half?: string;
  espn_grounding?: unknown;
  bookmakers: Bookmaker[];
}

export async function fetchCurrentOdds(): Promise<SportOdds[]> {
  try {
    const response = await axios.get('/api/odds', {
      params: { sport: 'upcoming' }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching odds:', error);
    return [];
  }
}

export function listenToLiveOdds(callback: (odds: SportOdds[]) => void): () => void {
  const eventSource = new EventSource('/api/stream/odds?sport=upcoming');
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      callback(data);
    } catch (err) {
      console.error('Failed to parse odds stream data:', err);
    }
  };

  eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
  };

  // Return unsubscribe function
  return () => {
    eventSource.close();
  };
}

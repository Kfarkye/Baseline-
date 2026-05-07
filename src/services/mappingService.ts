
/**
 * CANONICAL MAPPING SERVICE
 * 
 * Purpose: Stateless registry for O(1) identifier normalization.
 * Maps disparate Provider IDs to a single Canonical System ID.
 */

export interface TeamIdentity {
  id: string;          // Canonical ID (e.g., 'nyy')
  fullName: string;    // Display Name
  abbreviation: string; // Canonical Abbreviation
  espnId: string;      // ESPN Provider ID
  mlbId: string;       // MLB Stats API ID
  kalshiTicker?: string; // Kalshi Series Suffix (e.g., 'Yankees')
}

// MLB Canonical Registry
export const CANONICAL_MLB_TEAMS: TeamIdentity[] = [
  { id: 'ari', fullName: 'Arizona Diamondbacks', abbreviation: 'ARI', espnId: '15', mlbId: '109', kalshiTicker: 'Diamondbacks' },
  { id: 'atl', fullName: 'Atlanta Braves', abbreviation: 'ATL', espnId: '15', mlbId: '144', kalshiTicker: 'Braves' },
  { id: 'bal', fullName: 'Baltimore Orioles', abbreviation: 'BAL', espnId: '1', mlbId: '110', kalshiTicker: 'Orioles' },
  { id: 'bos', fullName: 'Boston Red Sox', abbreviation: 'BOS', espnId: '2', mlbId: '111', kalshiTicker: 'Red Sox' },
  { id: 'chc', fullName: 'Chicago Cubs', abbreviation: 'CHC', espnId: '16', mlbId: '112', kalshiTicker: 'Chicago C' },
  { id: 'cws', fullName: 'Chicago White Sox', abbreviation: 'CHW', espnId: '4', mlbId: '145', kalshiTicker: 'Chicago W' },
  { id: 'cin', fullName: 'Cincinnati Reds', abbreviation: 'CIN', espnId: '17', mlbId: '113', kalshiTicker: 'Reds' },
  { id: 'cle', fullName: 'Cleveland Guardians', abbreviation: 'CLE', espnId: '5', mlbId: '114', kalshiTicker: 'Guardians' },
  { id: 'col', fullName: 'Colorado Rockies', abbreviation: 'COL', espnId: '27', mlbId: '115', kalshiTicker: 'Rockies' },
  { id: 'det', fullName: 'Detroit Tigers', abbreviation: 'DET', espnId: '6', mlbId: '116', kalshiTicker: 'Tigers' },
  { id: 'hou', fullName: 'Houston Astros', abbreviation: 'HOU', espnId: '18', mlbId: '117', kalshiTicker: 'Astros' },
  { id: 'kcr', fullName: 'Kansas City Royals', abbreviation: 'KC', espnId: '7', mlbId: '118', kalshiTicker: 'Kansas City' },
  { id: 'laa', fullName: 'Los Angeles Angels', abbreviation: 'LAA', espnId: '3', mlbId: '108', kalshiTicker: 'Angels' },
  { id: 'lad', fullName: 'Los Angeles Dodgers', abbreviation: 'LAD', espnId: '19', mlbId: '119', kalshiTicker: 'Dodgers' },
  { id: 'mia', fullName: 'Miami Marlins', abbreviation: 'MIA', espnId: '28', mlbId: '146', kalshiTicker: 'Marlins' },
  { id: 'mil', fullName: 'Milwaukee Brewers', abbreviation: 'MIL', espnId: '8', mlbId: '158', kalshiTicker: 'Brewers' },
  { id: 'min', fullName: 'Minnesota Twins', abbreviation: 'MIN', espnId: '9', mlbId: '142', kalshiTicker: 'Twins' },
  { id: 'nym', fullName: 'New York Mets', abbreviation: 'NYM', espnId: '21', mlbId: '121', kalshiTicker: 'New York M' },
  { id: 'nyy', fullName: 'New York Yankees', abbreviation: 'NYY', espnId: '10', mlbId: '147', kalshiTicker: 'New York Y' },
  { id: 'oak', fullName: 'Oakland Athletics', abbreviation: 'OAK', espnId: '11', mlbId: '133', kalshiTicker: 'Athletics' },
  { id: 'phi', fullName: 'Philadelphia Phillies', abbreviation: 'PHI', espnId: '22', mlbId: '143', kalshiTicker: 'Phillies' },
  { id: 'pit', fullName: 'Pittsburgh Pirates', abbreviation: 'PIT', espnId: '23', mlbId: '134', kalshiTicker: 'Pirates' },
  { id: 'sdp', fullName: 'San Diego Padres', abbreviation: 'SD', espnId: '25', mlbId: '135', kalshiTicker: 'Padres' },
  { id: 'sfg', fullName: 'San Francisco Giants', abbreviation: 'SF', espnId: '26', mlbId: '137', kalshiTicker: 'Giants' },
  { id: 'sea', fullName: 'Seattle Mariners', abbreviation: 'SEA', espnId: '12', mlbId: '136', kalshiTicker: 'Mariners' },
  { id: 'stl', fullName: 'St. Louis Cardinals', abbreviation: 'STL', espnId: '24', mlbId: '138', kalshiTicker: 'Cardinals' },
  { id: 'tbr', fullName: 'Tampa Bay Rays', abbreviation: 'TB', espnId: '30', mlbId: '139', kalshiTicker: 'Tampa Bay' },
  { id: 'tex', fullName: 'Texas Rangers', abbreviation: 'TEX', espnId: '13', mlbId: '140', kalshiTicker: 'Rangers' },
  { id: 'tor', fullName: 'Toronto Blue Jays', abbreviation: 'TOR', espnId: '14', mlbId: '141', kalshiTicker: 'Blue Jays' },
  { id: 'wsh', fullName: 'Washington Nationals', abbreviation: 'WSH', espnId: '20', mlbId: '120', kalshiTicker: 'Nationals' },
];

// O(1) Lookup Maps
const MAPPING_BY_ESPN_ID = new Map(CANONICAL_MLB_TEAMS.map(t => [t.espnId, t]));
const MAPPING_BY_MLB_ID = new Map(CANONICAL_MLB_TEAMS.map(t => [t.mlbId, t]));
const MAPPING_BY_KALSHI_TICKER = new Map(CANONICAL_MLB_TEAMS.filter(t => t.kalshiTicker).map(t => [t.kalshiTicker!, t]));

export function getTeamByEspnId(id: string) { return MAPPING_BY_ESPN_ID.get(id); }
export function getTeamByMlbId(id: string) { return MAPPING_BY_MLB_ID.get(id); }
export function getTeamByKalshiTicker(ticker: string) { return MAPPING_BY_KALSHI_TICKER.get(ticker); }

export function getCanonicalTeam(provider: 'espn' | 'mlb' | 'kalshi', val: string) {
  if (provider === 'espn') return getTeamByEspnId(val);
  if (provider === 'mlb') return getTeamByMlbId(val);
  if (provider === 'kalshi') return getTeamByKalshiTicker(val);
  return null;
}


/**
 * STADIUM REGISTRY
 * 
 * Maps every MLB park to its physical properties:
 * - Coordinates (Lat/Long)
 * - Elevation (ft)
 * - Center Field Bearing (Degrees from North)
 * 
 * Note: Bearing defines the line from Home Plate to Center Field.
 */

export interface Stadium {
  name: string;
  city: string;
  lat: number;
  lng: number;
  elevation: number;
  bearing: number; // 0 = North, 90 = East, 180 = South, 270 = West
  isRetractable: boolean;
  isDome: boolean;
}

export const MLB_STADIUMS: Record<string, Stadium> = {
  'ARI': { name: 'Chase Field', city: 'Phoenix', lat: 33.4455, lng: -112.0667, elevation: 1059, bearing: 0, isRetractable: true, isDome: false },
  'ATL': { name: 'Truist Park', city: 'Atlanta', lat: 33.8907, lng: -84.4678, elevation: 1050, bearing: 25, isRetractable: false, isDome: false },
  'BAL': { name: 'Oriole Park at Camden Yards', city: 'Baltimore', lat: 39.2840, lng: -76.6215, elevation: 30, bearing: 45, isRetractable: false, isDome: false },
  'BOS': { name: 'Fenway Park', city: 'Boston', lat: 42.3467, lng: -71.0972, elevation: 20, bearing: 55, isRetractable: false, isDome: false },
  'CHC': { name: 'Wrigley Field', city: 'Chicago', lat: 41.9484, lng: -87.6553, elevation: 600, bearing: 45, isRetractable: false, isDome: false },
  'CWS': { name: 'Guaranteed Rate Field', city: 'Chicago', lat: 41.8299, lng: -87.6339, elevation: 595, bearing: 45, isRetractable: false, isDome: false },
  'CIN': { name: 'Great American Ball Park', city: 'Cincinnati', lat: 39.0975, lng: -84.5071, elevation: 483, bearing: 140, isRetractable: false, isDome: false },
  'CLE': { name: 'Progressive Field', city: 'Cleveland', lat: 41.4962, lng: -81.6852, elevation: 651, bearing: 60, isRetractable: false, isDome: false },
  'COL': { name: 'Coors Field', city: 'Denver', lat: 39.7559, lng: -104.9942, elevation: 5200, bearing: 345, isRetractable: false, isDome: false },
  'DET': { name: 'Comerica Park', city: 'Detroit', lat: 42.3390, lng: -83.0485, elevation: 602, bearing: 45, isRetractable: false, isDome: false },
  'HOU': { name: 'Minute Maid Park', city: 'Houston', lat: 29.7573, lng: -95.3555, elevation: 38, bearing: 0, isRetractable: true, isDome: false },
  'KC':  { name: 'Kauffman Stadium', city: 'Kansas City', lat: 39.0517, lng: -94.4803, elevation: 872, bearing: 45, isRetractable: false, isDome: false },
  'LAA': { name: 'Angel Stadium', city: 'Anaheim', lat: 33.8003, lng: -117.8827, elevation: 160, bearing: 45, isRetractable: false, isDome: false },
  'LAD': { name: 'Dodger Stadium', city: 'Los Angeles', lat: 34.0739, lng: -118.2400, elevation: 502, bearing: 25, isRetractable: false, isDome: false },
  'MIA': { name: 'loanDepot park', city: 'Miami', lat: 25.7783, lng: -80.2197, elevation: 15, bearing: 0, isRetractable: true, isDome: false },
  'MIL': { name: 'American Family Field', city: 'Milwaukee', lat: 43.0285, lng: -87.9712, elevation: 594, bearing: 0, isRetractable: true, isDome: false },
  'MIN': { name: 'Target Field', city: 'Minneapolis', lat: 44.9817, lng: -93.2778, elevation: 840, bearing: 45, isRetractable: false, isDome: false },
  'NYM': { name: 'Citi Field', city: 'New York', lat: 40.7571, lng: -73.8458, elevation: 13, bearing: 45, isRetractable: false, isDome: false },
  'NYY': { name: 'Yankee Stadium', city: 'New York', lat: 40.8296, lng: -73.9262, elevation: 54, bearing: 45, isRetractable: false, isDome: false },
  'OAK': { name: 'Oakland Coliseum', city: 'Oakland', lat: 37.7516, lng: -122.2005, elevation: 42, bearing: 20, isRetractable: false, isDome: false },
  'PHI': { name: 'Citizens Bank Park', city: 'Philadelphia', lat: 39.9061, lng: -75.1665, elevation: 21, bearing: 45, isRetractable: false, isDome: false },
  'PIT': { name: 'PNC Park', city: 'Pittsburgh', lat: 40.4469, lng: -80.0057, elevation: 743, bearing: 45, isRetractable: false, isDome: false },
  'SD':  { name: 'Petco Park', city: 'San Diego', lat: 32.7073, lng: -117.1566, elevation: 15, bearing: 20, isRetractable: false, isDome: false },
  'SF':  { name: 'Oracle Park', city: 'San Francisco', lat: 37.7786, lng: -122.3893, elevation: 10, bearing: 60, isRetractable: false, isDome: false },
  'SEA': { name: 'T-Mobile Park', city: 'Seattle', lat: 47.5914, lng: -122.3325, elevation: 10, bearing: 45, isRetractable: true, isDome: false },
  'STL': { name: 'Busch Stadium', city: 'St. Louis', lat: 38.6226, lng: -90.1928, elevation: 455, bearing: 140, isRetractable: false, isDome: false },
  'TB':  { name: 'Tropicana Field', city: 'St. Petersburg', lat: 27.7682, lng: -82.6534, elevation: 44, bearing: 0, isRetractable: false, isDome: true },
  'TEX': { name: 'Globe Life Field', city: 'Arlington', lat: 32.7473, lng: -97.0842, elevation: 613, bearing: 0, isRetractable: true, isDome: false },
  'TOR': { name: 'Rogers Centre', city: 'Toronto', lat: 43.6414, lng: -79.3894, elevation: 250, bearing: 0, isRetractable: true, isDome: false },
  'WSH': { name: 'Nationals Park', city: 'Washington', lat: 38.8730, lng: -77.0074, elevation: 25, bearing: 150, isRetractable: false, isDome: false },
};

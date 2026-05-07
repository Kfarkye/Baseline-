
import { getTeamByEspnId, getTeamByKalshiTicker } from './src/services/mappingService';

console.log('--- Phase 1: Canonical Mapping Test ---');

// Test ESPN Path
const yankeesEspn = getTeamByEspnId('10');
console.log('ESPN Result (ID 10):', yankeesEspn?.fullName === 'New York Yankees' ? '✅ PASS' : '❌ FAIL');

// Test Kalshi Path
const yankeesKalshi = getTeamByKalshiTicker('New York Y');
console.log('Kalshi Result ("New York Y"):', yankeesKalshi?.id === 'nyy' ? '✅ PASS' : '❌ FAIL');

// Test Join Logic (What the server does)
const match = yankeesEspn?.id === yankeesKalshi?.id;
console.log('O(1) Join Logic:', match ? '✅ PROVED (Match found via Canonical ID)' : '❌ FAIL');

console.log('---------------------------------------');

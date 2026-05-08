
import { MLB_STADIUMS } from '../constants/stadiums.ts';

export interface WeatherVector {
  temp: number;
  condition: string;
  windSpeed: number;
  windDirection: number; // Degrees from
  relativeAngle: number; // 0 = Out to CF, 180 = In to Home
  description: string;
  stadiumName: string;
  elevation: number;
}

/**
 * WEATHER VECTOR SERVICE
 * Statelessly calculates Wind-to-Field impact using NWS Point Forecasts.
 */
export async function getStadiumWeather(teamAbbr: string): Promise<WeatherVector | null> {
  const stadium = MLB_STADIUMS[teamAbbr];
  if (!stadium) return null;

  // Toronto is in Canada and outside the NWS API's coverage.
  // Instead of waiting for a 504 Gateway Timeout, we can return a default Dome response immediately.
  if (teamAbbr === 'TOR') {
    return {
      temp: 72,
      condition: "Controlled Environment",
      windSpeed: 0,
      windDirection: 0,
      relativeAngle: 0,
      description: "Controlled Environment (Dome)",
      stadiumName: stadium.name,
      elevation: stadium.elevation
    };
  }

  try {
    // 1. Get NWS Point (Points are cacheable/stable)
    const pointResponse = await fetch(`https://api.weather.gov/points/${stadium.lat},${stadium.lng}`, {
      headers: { 'User-Agent': 'StatelessSportsOracle/1.0' }
    });
    
    if (pointResponse.status === 404) {
      console.warn(`Weather data not available for ${stadium.name} (likely outside NWS coverage)`);
      return null;
    }
    
    if (!pointResponse.ok) {
      console.warn(`NWS API Error (${pointResponse.status}): ${pointResponse.statusText} for ${stadium.name}`);
      return null;
    }

    const pointData = await pointResponse.json();
    if (!pointData.properties || !pointData.properties.forecastHourly) {
      console.warn(`NWS API Error: Invalid point data for ${stadium.lat},${stadium.lng}`);
      return null;
    }
    
    const forecastUrl = pointData.properties.forecastHourly;

    // 2. Get Hourly Forecast
    const forecastResponse = await fetch(forecastUrl, {
      headers: { 'User-Agent': 'StatelessSportsOracle/1.0' }
    });
    
    if (!forecastResponse.ok) {
      console.warn(`NWS Forecast API Error (${forecastResponse.status}): ${forecastResponse.statusText}`);
      return null;
    }

    const forecastData = await forecastResponse.json();
    if (!forecastData.properties || !forecastData.properties.periods || forecastData.properties.periods.length === 0) {
      console.warn(`NWS Forecast API Error: Invalid forecast data`);
      return null;
    }

    const current = forecastData.properties.periods[0];

    // 3. Extract Wind
    // NWS wind is e.g. "10 mph" or "NW 10 mph"
    const windSpeedMatch = current.windSpeed.match(/\d+/);
    const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[0]) : 0;
    
    // NWS provides windDirection (e.g., "NW")
    const dirMap: Record<string, number> = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5, 'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5, 'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };
    const windDirDeg = dirMap[current.windDirection] || 0;

    // 4. Vector Math
    const windBlowingTo = (windDirDeg + 180) % 360;
    const relativeAngle = (windBlowingTo - stadium.bearing + 360) % 360;

    let vectorDesc = "";
    if (stadium.isDome) {
      vectorDesc = "Controlled Environment (Dome)";
    } else {
      if (windSpeed < 4) vectorDesc = "Calm / Negligible";
      else if (relativeAngle > 315 || relativeAngle <= 45) vectorDesc = `Wind Out to CF (${windSpeed}mph)`;
      else if (relativeAngle > 135 && relativeAngle <= 225) vectorDesc = `Wind In from CF (${windSpeed}mph)`;
      else if (relativeAngle > 45 && relativeAngle <= 135) vectorDesc = `Left-to-Right Crosswind (${windSpeed}mph)`;
      else vectorDesc = `Right-to-Left Crosswind (${windSpeed}mph)`;
    }

    return {
      temp: current.temperature,
      condition: current.shortForecast,
      windSpeed,
      windDirection: windDirDeg,
      relativeAngle,
      description: vectorDesc,
      stadiumName: stadium.name,
      elevation: stadium.elevation
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      console.warn(`Weather data not reachable for ${teamAbbr} (Network or Timeout).`);
    } else {
      console.warn(`Weather fetch failed for ${teamAbbr}:`, error);
    }
    return null;
  }
}

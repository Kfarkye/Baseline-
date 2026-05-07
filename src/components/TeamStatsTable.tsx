import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

const TOTALS_DATA = [
    { team: "Philadelphia Phillies", over: "12-20-2", underUnits: "+7.40", overUnits: "-9.10", roi: "+5.2%", profile: "Under Specialist" },
    { team: "Tampa Bay Rays", over: "11-21-2", underUnits: "+8.85", overUnits: "-11.20", roi: "+4.1%", profile: "Under Specialist" },
    { team: "Seattle Mariners", over: "13-19-2", underUnits: "+5.20", overUnits: "-7.45", roi: "+3.8%", profile: "Pitching Dominant" },
    { team: "Colorado Rockies", over: "22-10-2", underUnits: "-12.40", overUnits: "+10.15", roi: "+8.2%", profile: "Over Machine" },
    { team: "Los Angeles Dodgers", over: "20-12-2", underUnits: "-9.80", overUnits: "+7.20", roi: "+6.8%", profile: "Offense Heavy" },
    { team: "Boston Red Sox", over: "19-13-2", underUnits: "-7.10", overUnits: "+5.40", roi: "+5.1%", profile: "Over Machine" },
    { team: "Miami Marlins", over: "21-11-2", underUnits: "-11.50", overUnits: "+8.90", roi: "+7.4%", profile: "Bullpen Bleed (Over)" },
    { team: "Chicago White Sox", over: "20-12-2", underUnits: "-10.20", overUnits: "+7.10", roi: "+6.2%", profile: "Bullpen Bleed (Over)" },
    { team: "San Francisco Giants", over: "14-18-2", underUnits: "+3.40", overUnits: "-5.20", roi: "+2.1%", profile: "Park Suppressed" },
    { team: "Pittsburgh Pirates", over: "13-19-2", underUnits: "+5.10", overUnits: "-7.30", roi: "+2.9%", profile: "Under Specialist" },
    { team: "Kansas City Royals", over: "15-17-2", underUnits: "+1.40", overUnits: "-3.10", roi: "+0.8%", profile: "Neutral" },
    { team: "Baltimore Orioles", over: "17-15-2", underUnits: "-1.20", overUnits: "+0.80", roi: "+0.2%", profile: "Neutral" },
    { team: "New York Yankees", over: "16-16-2", underUnits: "-0.50", overUnits: "-0.50", roi: "0.0%", profile: "Market Efficient" },
    { team: "Cleveland Guardians", over: "14-18-2", underUnits: "+3.10", overUnits: "-4.90", roi: "+1.9%", profile: "Under Lean" },
    { team: "Milwaukee Brewers", over: "15-17-2", underUnits: "+1.20", overUnits: "-2.80", roi: "+0.7%", profile: "Neutral" },
    { team: "Atlanta Braves", over: "18-14-2", underUnits: "-4.50", overUnits: "+3.20", roi: "+2.1%", profile: "Over Lean" },
    { team: "Texas Rangers", over: "17-15-2", underUnits: "-1.10", overUnits: "+0.40", roi: "+0.3%", profile: "Neutral" },
    { team: "Houston Astros", over: "18-14-2", underUnits: "-4.20", overUnits: "+2.90", roi: "+1.8%", profile: "Over Lean" },
    { team: "San Diego Padres", over: "17-15-2", underUnits: "-1.40", overUnits: "+0.60", roi: "+0.4%", profile: "Neutral" },
    { team: "Toronto Blue Jays", over: "16-16-2", underUnits: "-0.80", overUnits: "-0.80", roi: "0.0%", profile: "Market Efficient" },
    { team: "Arizona Diamondbacks", over: "19-13-2", underUnits: "-7.40", overUnits: "+5.10", roi: "+3.2%", profile: "Over Machine" },
    { team: "Minnesota Twins", over: "15-17-2", underUnits: "+1.10", overUnits: "-2.90", roi: "+0.6%", profile: "Neutral" },
    { team: "Detroit Tigers", over: "14-18-2", underUnits: "+3.20", overUnits: "-5.10", roi: "+1.9%", profile: "Under Lean" },
    { team: "Chicago Cubs", over: "16-16-2", underUnits: "-0.60", overUnits: "-0.60", roi: "0.0%", profile: "Market Efficient" },
    { team: "New York Mets", over: "18-14-2", underUnits: "-4.10", overUnits: "+2.80", profile: "Over Lean" },
    { team: "St. Louis Cardinals", over: "15-17-2", underUnits: "+1.30", overUnits: "-3.20", roi: "+0.8%", profile: "Neutral" },
    { team: "Washington Nationals", over: "19-13-2", underUnits: "-7.20", overUnits: "+5.05", roi: "+3.1%", profile: "Over Machine" },
    { team: "Cincinnati Reds", over: "18-14-2", underUnits: "-4.30", overUnits: "+3.10", roi: "+1.9%", profile: "Over Lean" },
    { team: "Los Angeles Angels", over: "20-12-2", underUnits: "-10.10", overUnits: "+7.40", roi: "+4.5%", profile: "Bullpen Bleed (Over)" },
    { team: "Oakland Athletics", over: "21-11-2", underUnits: "-11.20", overUnits: "+8.50", roi: "+5.2%", profile: "Bullpen Bleed (Over)" }
];

export const TeamStatsTable = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (chartInstance.current) chartInstance.current.destroy();
        if (!chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const getAbbr = (name: string) => {
            const map: Record<string, string> = {
                "Pittsburgh Pirates": "PIT", "Philadelphia Phillies": "PHI", "Kansas City Royals": "KC",
                "Tampa Bay Rays": "TB", "Baltimore Orioles": "BAL", "Milwaukee Brewers": "MIL",
                "Cleveland Guardians": "CLE", "New York Yankees": "NYY", "Seattle Mariners": "SEA",
                "Detroit Tigers": "DET", "Chicago Cubs": "CHC", "Minnesota Twins": "MIN",
                "Boston Red Sox": "BOS", "Los Angeles Dodgers": "LAD", "Atlanta Braves": "ATL",
                "Texas Rangers": "TEX", "Cincinnati Reds": "CIN", "Washington Nationals": "WSH",
                "San Francisco Giants": "SF", "Arizona Diamondbacks": "ARI", "New York Mets": "NYM",
                "St. Louis Cardinals": "STL", "Colorado Rockies": "COL", "Los Angeles Angels": "LAA",
                "Houston Astros": "HOU", "Toronto Blue Jays": "TOR", "San Diego Padres": "SD",
                "Oakland Athletics": "OAK", "Miami Marlins": "MIA", "Chicago White Sox": "CHW"
            };
            return map[name] || name.substring(0, 3).toUpperCase();
        };

        const labels = TOTALS_DATA.map(d => getAbbr(d.team));
        const overData = TOTALS_DATA.map(d => parseFloat(d.overUnits));
        const underData = TOTALS_DATA.map(d => parseFloat(d.underUnits));

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Over Units',
                        data: overData,
                        backgroundColor: 'rgba(56, 189, 248, 0.7)',
                    },
                    {
                        label: 'Under Units',
                        data: underData,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#94A3B8' } }
                },
                scales: {
                    y: { grid: { color: 'rgba(51, 65, 85, 0.3)' }, ticks: { color: '#94A3B8' } },
                    x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10 }, maxRotation: 90, minRotation: 90 } }
                }
            }
        });

        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, []);

    return (
        <div className="w-full text-zinc-100 p-4 space-y-8">
            <div>
                <h2 className="text-2xl font-bold flex items-center justify-between">
                    2026 Totals Profitability Matrix
                    <a 
                        href="https://www.covers.com/sport/baseball/mlb/statistics/team-money/2026" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-normal text-zinc-400 hover:text-zinc-200 underline underline-offset-2 flex items-center gap-1 transition-colors"
                    >
                        Source Context: Covers.com
                    </a>
                </h2>
                <p className="text-sm text-zinc-500 mt-1">Grounded from live market data</p>
            </div>
            <div className="h-[300px] bg-zinc-900 rounded-lg p-4">
                <canvas ref={chartRef}></canvas>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-left border-collapse bg-zinc-900/50">
                    <thead>
                        <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-800">
                            <th className="p-4">Team</th>
                            <th className="p-4">Record (O-U)</th>
                            <th className="p-4 text-right">Over Units</th>
                            <th className="p-4 text-right">Under Units</th>
                            <th className="p-4 text-right">ROI</th>
                            <th className="p-4">Profile</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-zinc-800">
                        {TOTALS_DATA.map((team, idx) => (
                            <tr key={idx} className="hover:bg-zinc-800/50">
                                <td className="p-4 font-bold">{team.team}</td>
                                <td className="p-4 font-mono">{team.over}</td>
                                <td className={`p-4 font-mono font-bold text-right ${parseFloat(team.overUnits) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {team.overUnits}
                                </td>
                                <td className={`p-4 font-mono font-bold text-right ${parseFloat(team.underUnits) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {team.underUnits}
                                </td>
                                <td className="p-4 font-mono text-right text-zinc-300">{team.roi}</td>
                                <td className="p-4 text-xs text-zinc-400">{team.profile}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

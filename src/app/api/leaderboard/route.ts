import { NextResponse } from 'next/server';
import { getGlobalStats } from '@/lib/games';

export async function GET() {
  const stats = await getGlobalStats();
  
  // Sort models by wins for the leaderboard
  const modelLeaderboard = stats.modelStats 
    ? Object.entries(stats.modelStats)
        .map(([model, s]) => ({ model, ...s }))
        .sort((a, b) => b.wins - a.wins)
    : [];
  
  return NextResponse.json({
    humanWins: stats.humanWins,
    agentWins: stats.agentWins,
    ties: stats.ties,
    totalGames: stats.totalGames,
    modelLeaderboard,  // Per-model stats sorted by wins
  });
}

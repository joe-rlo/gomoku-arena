import { NextResponse } from 'next/server';
import { getGlobalStats } from '@/lib/games';

export async function GET() {
  const stats = await getGlobalStats();
  
  return NextResponse.json({
    humanWins: stats.humanWins,
    agentWins: stats.agentWins,
    ties: stats.ties,
    totalGames: stats.totalGames,
  });
}

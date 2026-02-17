import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as 'human' | 'agent' | null;
  
  const leaderboard = getLeaderboard(type || undefined);
  const stats = getStats();
  
  return NextResponse.json({
    leaderboard,
    stats,
    humanVsAgentWinRate: stats.totalGames > 0 
      ? Math.round((stats.humanWins / (stats.humanWins + stats.agentWins)) * 100)
      : 50,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getGameByInviteCode } from '@/lib/games';

// GET /api/game/check?code=XXXX - Check if invite code is valid
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }
  
  const game = getGameByInviteCode(code);
  
  if (!game) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }
  
  if (game.gameOver) {
    return NextResponse.json({ error: 'Game is already over' }, { status: 400 });
  }
  
  if (game.players[1] && game.players[2]) {
    return NextResponse.json({ error: 'Game is full' }, { status: 400 });
  }
  
  return NextResponse.json({
    id: game.id,
    players: game.players,
    availableSlot: game.players[1] ? 2 : 1,
  });
}

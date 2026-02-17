import { NextRequest, NextResponse } from 'next/server';
import { getGame } from '@/lib/games';

// GET /api/game/[id] - Get game state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = await getGame(id);
  
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    id: game.id,
    board: game.board,
    currentPlayer: game.currentPlayer,
    movesRemaining: game.movesRemaining,
    players: game.players,
    winner: game.winner,
    gameOver: game.gameOver,
    moveHistory: game.moveHistory,
  });
}

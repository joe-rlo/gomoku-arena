import { NextRequest, NextResponse } from 'next/server';
import { submitMove, getGame } from '@/lib/games';
import { Player } from '@/lib/game';

interface MoveRequest {
  player: number;
  row: number;
  col: number;
}

// POST /api/game/[id]/move - Submit a move
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Check game exists first
  const existingGame = getGame(id);
  if (!existingGame) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  
  let body: MoveRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  // Validate request
  if (body.player !== 1 && body.player !== 2) {
    return NextResponse.json({ error: 'Player must be 1 or 2' }, { status: 400 });
  }
  
  if (typeof body.row !== 'number' || typeof body.col !== 'number') {
    return NextResponse.json({ error: 'Row and col must be numbers' }, { status: 400 });
  }
  
  // Submit the move
  const result = submitMove(id, body.player as Player, body.row, body.col);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  const game = result.game!;
  
  return NextResponse.json({
    success: true,
    board: game.board,
    currentPlayer: game.currentPlayer,
    movesRemaining: game.movesRemaining,
    winner: game.winner,
    gameOver: game.gameOver,
    message: game.gameOver 
      ? (game.winner ? `Player ${game.winner} wins!` : 'Game ended in a draw')
      : `Move accepted. Player ${game.currentPlayer}'s turn.`,
  });
}

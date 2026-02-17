import { NextRequest, NextResponse } from 'next/server';
import { 
  Board, 
  Player, 
  isValidMove, 
  checkWin, 
  BOARD_SIZE 
} from '@/lib/game';

interface MoveRequest {
  board: number[][];
  player: 1 | 2;
}

interface MoveResponse {
  row: number;
  col: number;
}

interface ErrorResponse {
  error: string;
}

/**
 * POST /api/move
 * 
 * Agent endpoint for making moves.
 * 
 * Request body:
 * {
 *   "board": [[0,0,1,...], ...],  // 15x15 grid, 0=empty, 1=black, 2=white
 *   "player": 1                    // Which player the agent is (1=black, 2=white)
 * }
 * 
 * Response:
 * {
 *   "row": 7,
 *   "col": 8
 * }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<MoveResponse | ErrorResponse>> {
  try {
    const body: MoveRequest = await request.json();
    
    // Validate board
    if (!body.board || !Array.isArray(body.board) || body.board.length !== BOARD_SIZE) {
      return NextResponse.json(
        { error: `Board must be a ${BOARD_SIZE}x${BOARD_SIZE} array` },
        { status: 400 }
      );
    }
    
    for (const row of body.board) {
      if (!Array.isArray(row) || row.length !== BOARD_SIZE) {
        return NextResponse.json(
          { error: `Each row must have ${BOARD_SIZE} cells` },
          { status: 400 }
        );
      }
      for (const cell of row) {
        if (cell !== 0 && cell !== 1 && cell !== 2) {
          return NextResponse.json(
            { error: 'Cells must be 0 (empty), 1 (black), or 2 (white)' },
            { status: 400 }
          );
        }
      }
    }
    
    // Validate player
    if (body.player !== 1 && body.player !== 2) {
      return NextResponse.json(
        { error: 'Player must be 1 or 2' },
        { status: 400 }
      );
    }
    
    const board = body.board as Board;
    const player = body.player as Player;
    
    // Find a move using simple AI logic
    const move = findBestMove(board, player);
    
    if (!move) {
      return NextResponse.json(
        { error: 'No valid moves available' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ row: move[0], col: move[1] });
    
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

function findBestMove(board: Board, player: Player): [number, number] | null {
  const validMoves: [number, number][] = [];
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        validMoves.push([r, c]);
      }
    }
  }
  
  if (validMoves.length === 0) return null;
  
  // Check if we can win
  for (const [r, c] of validMoves) {
    const testBoard = board.map(row => [...row]) as Board;
    testBoard[r][c] = player;
    if (checkWin(testBoard, r, c, player)) {
      return [r, c];
    }
  }
  
  // Check if we need to block
  const opponent: Player = player === 1 ? 2 : 1;
  for (const [r, c] of validMoves) {
    const testBoard = board.map(row => [...row]) as Board;
    testBoard[r][c] = opponent;
    if (checkWin(testBoard, r, c, opponent)) {
      return [r, c];
    }
  }
  
  // Score moves based on position and neighbors
  const scoredMoves = validMoves.map(([r, c]) => {
    let score = 0;
    
    // Prefer center
    const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
    score += (14 - centerDist);
    
    // Prefer moves near existing pieces
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          if (board[nr][nc] === player) score += 3;
          if (board[nr][nc] === opponent) score += 1;
        }
      }
    }
    
    return { move: [r, c] as [number, number], score };
  });
  
  scoredMoves.sort((a, b) => b.score - a.score);
  
  // Add some randomness among top moves
  const topMoves = scoredMoves.slice(0, Math.min(5, scoredMoves.length));
  return topMoves[Math.floor(Math.random() * topMoves.length)].move;
}

// GET endpoint for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'Gomoku Arena API',
    version: '1.0.0',
    endpoints: {
      'POST /api/move': {
        description: 'Get AI move for a board position',
        request: {
          board: '15x15 array of 0 (empty), 1 (black), 2 (white)',
          player: '1 (black) or 2 (white)',
        },
        response: {
          row: 'Row index (0-14)',
          col: 'Column index (0-14)',
        },
      },
    },
  });
}

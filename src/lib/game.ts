// Gomoku game logic

export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;

export type Player = 1 | 2; // 1 = Black, 2 = White
export type Cell = 0 | Player;
export type Board = Cell[][];

export interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player | null;
  winningCells: [number, number][] | null;
  moveHistory: [number, number][];
  gameOver: boolean;
}

export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
}

export function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 1,
    winner: null,
    winningCells: null,
    moveHistory: [],
    gameOver: false,
  };
}

export function isValidMove(board: Board, row: number, col: number): boolean {
  return (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE &&
    board[row][col] === 0
  );
}

export function makeMove(state: GameState, row: number, col: number): GameState | null {
  if (state.gameOver || !isValidMove(state.board, row, col)) {
    return null;
  }

  const newBoard = state.board.map(r => [...r]);
  newBoard[row][col] = state.currentPlayer;

  const winResult = checkWin(newBoard, row, col, state.currentPlayer);
  
  return {
    board: newBoard,
    currentPlayer: state.currentPlayer === 1 ? 2 : 1,
    winner: winResult ? state.currentPlayer : null,
    winningCells: winResult,
    moveHistory: [...state.moveHistory, [row, col]],
    gameOver: winResult !== null || isBoardFull(newBoard),
  };
}

function isBoardFull(board: Board): boolean {
  return board.every(row => row.every(cell => cell !== 0));
}

const DIRECTIONS = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

export function checkWin(
  board: Board,
  row: number,
  col: number,
  player: Player
): [number, number][] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const cells: [number, number][] = [[row, col]];
    
    // Check in positive direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        cells.push([r, c]);
      } else {
        break;
      }
    }
    
    // Check in negative direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        cells.push([r, c]);
      } else {
        break;
      }
    }
    
    if (cells.length >= WIN_LENGTH) {
      return cells;
    }
  }
  
  return null;
}

// Simple AI for demo - random valid move with some basic strategy
export function getAIMove(board: Board, player: Player): [number, number] | null {
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
    const testBoard = board.map(row => [...row]);
    testBoard[r][c] = player;
    if (checkWin(testBoard, r, c, player)) {
      return [r, c];
    }
  }
  
  // Check if we need to block
  const opponent: Player = player === 1 ? 2 : 1;
  for (const [r, c] of validMoves) {
    const testBoard = board.map(row => [...row]);
    testBoard[r][c] = opponent;
    if (checkWin(testBoard, r, c, opponent)) {
      return [r, c];
    }
  }
  
  // Prefer center-ish moves
  const centerMoves = validMoves.filter(([r, c]) => 
    r >= 5 && r <= 9 && c >= 5 && c <= 9
  );
  
  const pool = centerMoves.length > 0 ? centerMoves : validMoves;
  return pool[Math.floor(Math.random() * pool.length)];
}

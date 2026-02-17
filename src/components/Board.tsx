'use client';

import { Board as BoardType, BOARD_SIZE, Player } from '@/lib/game';

interface BoardProps {
  board: BoardType;
  onCellClick: (row: number, col: number) => void;
  disabled?: boolean;
  winningCells?: [number, number][] | null;
  lastMove?: [number, number] | null;
}

export default function Board({ 
  board, 
  onCellClick, 
  disabled,
  winningCells,
  lastMove
}: BoardProps) {
  const isWinningCell = (row: number, col: number) => {
    return winningCells?.some(([r, c]) => r === row && c === col);
  };
  
  const isLastMove = (row: number, col: number) => {
    return lastMove && lastMove[0] === row && lastMove[1] === col;
  };

  return (
    <div className="w-full max-w-[min(90vw,500px)] mx-auto aspect-square">
      <div 
        className="grid gap-0 bg-amber-200 p-2 rounded-lg shadow-lg"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => onCellClick(rowIndex, colIndex)}
              disabled={disabled || cell !== 0}
              className={`
                aspect-square flex items-center justify-center
                border border-amber-400/50 relative
                ${cell === 0 ? 'hover:bg-amber-300/50 cursor-pointer' : 'cursor-default'}
                ${disabled ? 'cursor-not-allowed' : ''}
                touch-manipulation
              `}
              style={{ minHeight: 0 }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-full h-px bg-amber-700/40" />
                <div className="absolute h-full w-px bg-amber-700/40" />
              </div>
              
              {/* Stone */}
              {cell !== 0 && (
                <div
                  className={`
                    w-[85%] h-[85%] rounded-full z-10 transition-all duration-150
                    ${cell === 1 
                      ? 'bg-gradient-to-br from-gray-700 to-black shadow-md' 
                      : 'bg-gradient-to-br from-white to-gray-200 shadow-md border border-gray-300'
                    }
                    ${isWinningCell(rowIndex, colIndex) ? 'ring-4 ring-green-400 ring-opacity-75' : ''}
                    ${isLastMove(rowIndex, colIndex) ? 'ring-2 ring-blue-400' : ''}
                  `}
                />
              )}
              
              {/* Hover indicator */}
              {cell === 0 && !disabled && (
                <div className="absolute w-[60%] h-[60%] rounded-full bg-gray-400/20 opacity-0 hover:opacity-100 z-10" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

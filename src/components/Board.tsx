'use client';

import { Board as BoardType, BOARD_SIZE } from '@/lib/game';

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
        className="grid gap-[2px] bg-amber-700 p-[2px] rounded-lg shadow-lg"
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
                bg-amber-100 relative
                ${cell === 0 ? 'hover:bg-amber-200 cursor-pointer' : 'cursor-default'}
                ${disabled ? 'cursor-not-allowed' : ''}
                touch-manipulation
              `}
              style={{ minHeight: 0 }}
            >
              {/* Stone */}
              {cell !== 0 && (
                <div
                  className={`
                    w-[80%] h-[80%] rounded-full transition-all duration-150
                    ${cell === 1 
                      ? 'bg-gradient-to-br from-gray-600 to-gray-900 shadow-lg' 
                      : 'bg-gradient-to-br from-white to-gray-100 shadow-lg border border-gray-300'
                    }
                    ${isWinningCell(rowIndex, colIndex) ? 'ring-4 ring-green-500' : ''}
                    ${isLastMove(rowIndex, colIndex) ? 'ring-2 ring-blue-500' : ''}
                  `}
                />
              )}
              
              {/* Hover indicator for empty cells */}
              {cell === 0 && !disabled && (
                <div className="absolute w-[50%] h-[50%] rounded-full bg-gray-400/30 opacity-0 hover:opacity-100" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

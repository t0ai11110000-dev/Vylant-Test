import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trophy, X, Circle, Play, Maximize2, Minimize2 } from 'lucide-react';

interface VylantTicTacToeProps {
  isDarkMode: boolean;
}

type SquareValue = 'X' | 'O' | null;

const VylantTicTacToe: React.FC<VylantTicTacToeProps> = ({ isDarkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING'>('IDLE');
  
  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [winner, setWinner] = useState<{ symbol: SquareValue; line: number[] | null } | null>(null);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('vylant_ttt_wins');
    return saved ? parseInt(saved, 10) : 0;
  });

  const calculateWinner = (squares: SquareValue[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diags
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { symbol: squares[a], line: lines[i] };
      }
    }
    return null;
  };

  const handleBotMove = useCallback((currentBoard: SquareValue[]) => {
    if (winner || currentBoard.every(sq => sq !== null)) return;

    setIsBotThinking(true);
    
    // Simulate thinking delay
    setTimeout(() => {
      const emptySquares = currentBoard.map((sq, i) => sq === null ? i : null).filter((sq): sq is number => sq !== null);
      if (emptySquares.length === 0) return;

      // Basic AI: Try to win, then block, then random
      const winLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];

      const findBestMove = (symbol: SquareValue) => {
        for (const line of winLines) {
          const [a, b, c] = line;
          const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
          const count = vals.filter(v => v === symbol).length;
          const emptyCount = vals.filter(v => v === null).length;
          if (count === 2 && emptyCount === 1) {
            return line[vals.indexOf(null)];
          }
        }
        return null;
      };

      let move = findBestMove('O'); // Try to win
      if (move === null) move = findBestMove('X'); // Block player
      if (move === null) move = emptySquares[Math.floor(Math.random() * emptySquares.length)]; // Random

      const newBoard = currentBoard.slice();
      newBoard[move as number] = 'O';
      setBoard(newBoard);
      setXIsNext(true);
      setIsBotThinking(false);

      const win = calculateWinner(newBoard);
      if (win) {
        setWinner(win);
      } else if (newBoard.every(sq => sq !== null)) {
        setWinner({ symbol: null, line: null });
      }
    }, 600);
  }, [winner]);

  const handleClick = (i: number) => {
    if (gameState !== 'PLAYING' || winner || board[i] || !xIsNext || isBotThinking) return;
    const newBoard = board.slice();
    newBoard[i] = 'X';
    setBoard(newBoard);
    setXIsNext(false);
    
    const win = calculateWinner(newBoard);
    if (win) {
      setWinner(win);
      if (win.symbol === 'X') {
        const newScore = highScore + 1;
        setHighScore(newScore);
        localStorage.setItem('vylant_ttt_wins', newScore.toString());
      }
    } else if (newBoard.every(sq => sq !== null)) {
      setWinner({ symbol: null, line: null }); // Draw
    } else {
      handleBotMove(newBoard);
    }
  };

  const resetGame = (startImmediately = false) => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setWinner(null);
    setGameState(startImmediately ? 'PLAYING' : 'IDLE');
  };

  const isDraw = winner && winner.symbol === null;

  return (
    <div ref={containerRef} className={`relative w-full aspect-square flex flex-col items-center justify-center p-4 rounded-2xl ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={toggleFullScreen} className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 border border-white/10 text-white">
          {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
        {board.map((square, i) => {
          const isWinningSquare = winner?.line?.includes(i);
          return (
            <motion.button
              key={i}
              whileHover={{ scale: square ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(i)}
              className={`aspect-square rounded-xl flex items-center justify-center text-2xl border transition-all ${
                isWinningSquare 
                  ? 'bg-vylant-blue border-vylant-blue text-white shadow-lg shadow-vylant-blue/40' 
                  : isDarkMode 
                    ? 'bg-slate-800 border-white/5 text-white hover:border-white/10' 
                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 shadow-sm'
              }`}
            >
              <AnimatePresence mode="wait">
                {square === 'X' && (
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} key="X">
                    <X size={32} strokeWidth={3} className={isWinningSquare ? 'text-white' : 'text-blue-500'} />
                  </motion.div>
                )}
                {square === 'O' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key="O">
                    <Circle size={28} strokeWidth={3} className={isWinningSquare ? 'text-white' : 'text-rose-500'} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${xIsNext && !winner ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' : 'opacity-40'}`}>
             <X size={12} /> You
           </div>
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${!xIsNext && !winner ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 'opacity-40'}`}>
             <Circle size={12} /> {isBotThinking ? 'Thinking...' : 'Bot'}
           </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Trophy size={12} className="text-amber-400" />
          <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Wins: {highScore}</span>
        </div>
      </div>

      <AnimatePresence>
        {gameState === 'IDLE' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] text-white p-4 rounded-2xl`}
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mb-4"
            >
               <img 
                 src="https://i.imgur.com/H3OS5zA.png" 
                 className="w-20 h-20 object-contain" 
                 referrerPolicy="no-referrer"
               />
            </motion.div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-1">Vylant TicTacToe</h4>
            <p className="text-[10px] mb-4 opacity-80">Challenge the Vylant Bot</p>
            <button 
              onClick={() => setGameState('PLAYING')}
              className="bg-vylant-blue px-8 py-2 rounded-xl font-bold text-xs shadow-xl shadow-vylant-blue/20 hover:scale-105 transition-transform"
            >
              Play Now
            </button>
          </motion.div>
        )}

        {winner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl text-white p-4"
          >
            <h4 className="text-2xl font-black uppercase tracking-tighter mb-4 text-center">
              {isDraw ? "It's a Draw!" : winner.symbol === 'X' ? "You Won!" : "Bot Won!"}
            </h4>
            <button 
              onClick={() => resetGame(true)}
              className="flex items-center gap-2 bg-vylant-blue px-6 py-2 rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-vylant-blue/20"
            >
              <RotateCcw size={14} /> Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VylantTicTacToe;

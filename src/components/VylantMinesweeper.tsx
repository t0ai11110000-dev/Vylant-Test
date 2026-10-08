import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trophy, Bomb, Flag, Play, Maximize2, Minimize2 } from 'lucide-react';

interface VylantMinesweeperProps {
 isDarkMode: boolean;
}

interface Cell {
 x: number;
 y: number;
 isMine: boolean;
 isRevealed: boolean;
 isFlagged: boolean;
 neighborCount: number;
}

const GRID_SIZE = 10;
const MINE_COUNT = 15;

const VylantMinesweeper: React.FC<VylantMinesweeperProps> = ({ isDarkMode }) => {
 const containerRef = useRef<HTMLDivElement>(null);
 const [isFullScreen, setIsFullScreen] = useState(false);
 const [grid, setGrid] = useState<Cell[][]>([]);
 // ... rest of the code

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
 const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
 const [highScore, setHighScore] = useState(() => {
  const saved = localStorage.getItem('vylant_mines_highs');
  return saved ? parseInt(saved, 10) : 0;
 });

 const initGrid = useCallback((startImmediately = true) => {
  // Basic grid
  let newGrid: Cell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
   let row: Cell[] = [];
   for (let x = 0; x < GRID_SIZE; x++) {
    row.push({ x, y, isMine: false, isRevealed: false, isFlagged: false, neighborCount: 0 });
   }
   newGrid.push(row);
  }

  // Place mines
  let minesPlaced = 0;
  while (minesPlaced < MINE_COUNT) {
   const x = Math.floor(Math.random() * GRID_SIZE);
   const y = Math.floor(Math.random() * GRID_SIZE);
   if (!newGrid[y][x].isMine) {
    newGrid[y][x].isMine = true;
    minesPlaced++;
   }
  }

  // Calculate neighbors
  for (let y = 0; y < GRID_SIZE; y++) {
   for (let x = 0; x < GRID_SIZE; x++) {
    if (newGrid[y][x].isMine) continue;
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
     for (let dx = -1; dx <= 1; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE && newGrid[ny][nx].isMine) {
       count++;
      }
     }
    }
    newGrid[y][x].neighborCount = count;
   }
  }
  setGrid(newGrid);
  if (startImmediately) setGameState('PLAYING');
 }, []);

 useEffect(() => {
  // Only init grid logic, don't auto-start if in IDLE
  const generateInitialGrid = () => {
   let newGrid: Cell[][] = [];
   for (let y = 0; y < GRID_SIZE; y++) {
    let row: Cell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
     row.push({ x, y, isMine: false, isRevealed: false, isFlagged: false, neighborCount: 0 });
    }
    newGrid.push(row);
   }
   setGrid(newGrid);
  };
  generateInitialGrid();
 }, []);

 const revealCell = (x: number, y: number) => {
  if (gameState !== 'PLAYING' || grid[y][x].isRevealed || grid[y][x].isFlagged) return;

  const newGrid = [...grid.map(row => [...row])];
  
  if (newGrid[y][x].isMine) {
   setGameState('LOST');
   // Reveal all mines
   newGrid.forEach(row => row.forEach(cell => { if (cell.isMine) cell.isRevealed = true; }));
   setGrid(newGrid);
   return;
  }

  const revealRecursive = (cx: number, cy: number) => {
   if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE || newGrid[cy][cx].isRevealed || newGrid[cy][cx].isFlagged) return;
   newGrid[cy][cx].isRevealed = true;
   if (newGrid[cy][cx].neighborCount === 0) {
    for (let dy = -1; dy <= 1; dy++) {
     for (let dx = -1; dx <= 1; dx++) {
      revealRecursive(cx + dx, cy + dy);
     }
    }
   }
  };

  revealRecursive(x, y);
  setGrid(newGrid);

  // Check Win
  let hiddenNonMines = 0;
  newGrid.forEach(row => row.forEach(cell => { if (!cell.isMine && !cell.isRevealed) hiddenNonMines++; }));
  if (hiddenNonMines === 0) {
   setGameState('WON');
   const newScore = highScore + 1;
   setHighScore(newScore);
   localStorage.setItem('vylant_mines_highs', newScore.toString());
  }
 };

 const toggleFlag = (e: React.MouseEvent, x: number, y: number) => {
  e.preventDefault();
  if (gameState !== 'PLAYING' || grid[y][x].isRevealed) return;
  const newGrid = [...grid.map(row => [...row])];
  newGrid[y][x].isFlagged = !newGrid[y][x].isFlagged;
  setGrid(newGrid);
 };

 return (
  <div ref={containerRef} className={`relative w-full aspect-square flex flex-col items-center justify-center p-2 rounded-2xl ${isDarkMode ? 'bg-navy-900/50' : 'bg-navy-50'}`}>
   <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
    <button onClick={toggleFullScreen} className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 border border-white/10 text-white">
     {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
   </div>
   <div className="grid grid-cols-10 gap-1 w-full h-full max-w-[320px] max-h-[320px]">
    {grid.map((row, y) => row.map((cell, x) => (
     <button
      key={`${x}-${y}`}
      onClick={() => revealCell(x, y)}
      onContextMenu={(e) => toggleFlag(e, x, y)}
      className={`aspect-square flex items-center justify-center rounded-sm text-[10px] font-bold transition-all border ${
       cell.isRevealed
        ? cell.isMine 
         ? 'bg-red-500 border-red-600 text-white animate-bounce' 
         : isDarkMode ? 'bg-navy-800 border-white/5 text-blue-400' : 'bg-navy-200 border-navy-300 text-blue-600'
        : cell.isFlagged
         ? 'bg-amber-500/20 border-amber-500/30 text-amber-500'
         : isDarkMode ? 'bg-navy-700 border-white/5 hover:bg-navy-600' : 'bg-white border-navy-200 hover:bg-navy-100'
      }`}
     >
      {cell.isRevealed && !cell.isMine && cell.neighborCount > 0 && cell.neighborCount}
      {cell.isRevealed && cell.isMine && <Bomb size={10} />}
      {!cell.isRevealed && cell.isFlagged && <Flag size={10} fill="currentColor" />}
     </button>
    )))}
   </div>

   <div className="mt-4 flex items-center gap-2">
    <Trophy size={12} className="text-amber-400" />
    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Wins: {highScore}</span>
   </div>

   <AnimatePresence>
    {gameState === 'IDLE' && (
     <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#171e33]/90 backdrop-blur-sm text-white p-6 rounded-2xl"
     >
      <motion.div 
       animate={{ y: [0, -10, 0] }}
       transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
       className="mb-6 p-4 bg-vylant-blue/20 rounded-2xl border border-vylant-blue/30 rotate-12"
      >
        <Bomb size={40} className="text-vylant-blue" />
      </motion.div>
      <h4 className="text-xl font-black uppercase tracking-tight mb-1">Vylant Mines</h4>
      <p className="text-[10px] mb-8 text-white/50 uppercase font-bold tracking-widest leading-relaxed max-w-[160px] text-center">Strategic Clearance System</p>
      <button 
       onClick={initGrid}
       className="group relative flex items-center gap-2 bg-vylant-blue px-8 py-3 rounded-xl font-bold text-xs shadow-xl shadow-vylant-blue/25 hover:scale-105 active:scale-95 transition-all"
      >
       <Play size={16} fill="white" />
       <span>PLAY NOW</span>
      </button>
     </motion.div>
    )}

    {gameState !== 'PLAYING' && gameState !== 'IDLE' && (
     <motion.div 
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 rounded-2xl text-white p-4`}
     >
       <h4 className={`text-2xl font-black uppercase mb-4 ${gameState === 'WON' ? 'text-emerald-500' : 'text-red-500'}`}>
        {gameState === 'WON' ? 'Grid Cleared!' : 'BOOM!'}
       </h4>
       <button onClick={initGrid} className="flex items-center gap-2 bg-vylant-blue px-6 py-2 rounded-xl font-bold text-xs shadow-xl shadow-vylant-blue/20">
        <RotateCcw size={14} /> Restart
       </button>
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 );
};

export default VylantMinesweeper;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Minimize2, Play, RotateCcw, Trophy } from 'lucide-react';

import { MinigameTextureConfig } from './MinigameTexturesModal';

interface Point {
 x: number;
 y: number;
}

interface VylantSnakeProps {
 isDarkMode: boolean;
 customTexture?: MinigameTextureConfig;
}

const VylantSnake: React.FC<VylantSnakeProps> = ({ isDarkMode, customTexture }) => {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const containerRef = useRef<HTMLDivElement>(null);
 const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER'>('IDLE');
 const gameStateRef = useRef(gameState);
 useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

 const [score, setScore] = useState(0);
 const scoreRef = useRef(score);
 useEffect(() => { scoreRef.current = score; }, [score]);
 const [highScore, setHighScore] = useState(() => {
  const saved = localStorage.getItem('vylant_snake_highscore');
  return saved ? parseInt(saved, 10) : 0;
 });
 const [isFullScreen, setIsFullScreen] = useState(false);
 const logoImageRef = useRef<HTMLImageElement | null>(null);

 useEffect(() => {
  const imgSrc = customTexture?.snakeHeadTexture || 'https://i.imgur.com/H3OS5zA.png';
  const img = new Image();
  img.src = imgSrc;
  img.referrerPolicy = 'no-referrer';
  img.onload = () => {
   logoImageRef.current = img;
  };
 }, [customTexture?.snakeHeadTexture]);

 // Game Constants
 const GRID_SIZE = 20;
 const INITIAL_SPEED = 150; // ms
 
 // Mutable Game State
 const gameRef = useRef({
  snake: [{ x: 10, y: 10 }] as Point[],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food: { x: 5, y: 5 },
  lastUpdate: 0,
  animationId: 0,
 });

 const generateFood = useCallback((snake: Point[]) => {
  let newFood: Point;
  while (true) {
   newFood = {
    x: Math.floor(Math.random() * 20),
    y: Math.floor(Math.random() * 20),
   };
   // Check if food is on snake
   if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
    break;
   }
  }
  return newFood;
 }, []);

 const resetGame = useCallback((startImmediately = false) => {
  const initialSnake = [{ x: 10, y: 10 }];
  gameRef.current = {
   snake: initialSnake,
   direction: { x: 1, y: 0 },
   nextDirection: { x: 1, y: 0 },
   food: generateFood(initialSnake),
   lastUpdate: performance.now(),
   animationId: gameRef.current.animationId,
  };
  setScore(0);
  scoreRef.current = 0;
  setGameState(startImmediately ? 'PLAYING' : 'IDLE');
  gameStateRef.current = startImmediately ? 'PLAYING' : 'IDLE';
 }, [generateFood]);

 const handleKeyDown = useCallback((e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
   return;
  }

  const { direction } = gameRef.current;
  if (gameState === 'IDLE' && e.code === 'Space') {
   setGameState('PLAYING');
   gameStateRef.current = 'PLAYING';
   return;
  }
  if (gameState === 'GAME_OVER' && e.code === 'Space') {
   resetGame(true);
   return;
  }

  switch(e.code) {
   case 'ArrowUp':
    if (direction.y === 0) gameRef.current.nextDirection = { x: 0, y: -1 };
    break;
   case 'ArrowDown':
    if (direction.y === 0) gameRef.current.nextDirection = { x: 0, y: 1 };
    break;
   case 'ArrowLeft':
    if (direction.x === 0) gameRef.current.nextDirection = { x: -1, y: 0 };
    break;
   case 'ArrowRight':
    if (direction.x === 0) gameRef.current.nextDirection = { x: 1, y: 0 };
    break;
  }
 }, [gameState, resetGame]);

 useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
 }, [handleKeyDown]);

 const update = (time: number) => {
  if (gameStateRef.current !== 'PLAYING') return;

  const game = gameRef.current;
  const speed = Math.max(70, INITIAL_SPEED - (scoreRef.current * 2));

  if (time - game.lastUpdate < speed) return;
  game.lastUpdate = time;
  game.direction = game.nextDirection;

  const head = game.snake[0];
  const newHead = { x: head.x + game.direction.x, y: head.y + game.direction.y };

  // Wall Collision
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
   setGameState('GAME_OVER');
   gameStateRef.current = 'GAME_OVER';
   return;
  }

  // Body Collision
  if (game.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
   setGameState('GAME_OVER');
   gameStateRef.current = 'GAME_OVER';
   return;
  }

  game.snake.unshift(newHead);

  // Food Collision
  if (newHead.x === game.food.x && newHead.y === game.food.y) {
   const newScore = scoreRef.current + 1;
   setScore(newScore);
   scoreRef.current = newScore;
   game.food = generateFood(game.snake);
  } else {
   game.snake.pop();
  }
 };

 const draw = () => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const cellW = canvas.width / GRID_SIZE;
  const cellH = canvas.height / GRID_SIZE;

  // Background
  ctx.fillStyle = customTexture?.snakeBgColor || (isDarkMode ? '#0f172a' : '#f8fafc');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid (Subtle)
  ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
   ctx.beginPath(); ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, canvas.height); ctx.stroke();
   ctx.beginPath(); ctx.moveTo(0, i * cellH); ctx.lineTo(canvas.width, i * cellH); ctx.stroke();
  }

  // Food
  ctx.fillStyle = '#ef4444'; // Red
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
  ctx.beginPath();
  ctx.arc(
   gameRef.current.food.x * cellW + cellW / 2,
   gameRef.current.food.y * cellH + cellH / 2,
   cellW / 3, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  // Snake
  gameRef.current.snake.forEach((segment, i) => {
   const isHead = i === 0;
   
   if (isHead && logoImageRef.current) {
    ctx.save();
    const centerX = segment.x * cellW + cellW / 2;
    const centerY = segment.y * cellH + cellH / 2;
    ctx.translate(centerX, centerY);
    
    // Rotate head based on direction
    const { direction } = gameRef.current;
    const angle = Math.atan2(direction.y, direction.x);
    ctx.rotate(angle);
    
    ctx.drawImage(
     logoImageRef.current, 
     -cellW / 2 - 2, 
     -cellH / 2 - 2, 
     cellW + 4, 
     cellH + 4
    );
    ctx.restore();
   } else {
    ctx.fillStyle = customTexture?.snakeBodyColor || (isHead ? '#3b82f6' : (isDarkMode ? '#1e40af' : '#60a5fa'));
    const padding = isHead ? 2 : (3 + i * 0.1); // Slightly tapering tail
    ctx.beginPath();
    ctx.roundRect(
     segment.x * cellW + padding,
     segment.y * cellH + padding,
     cellW - padding * 2,
     cellH - padding * 2,
     isHead ? 6 : 4
    );
    ctx.fill();

    // Eyes on head fallback
    if (isHead && !logoImageRef.current) {
     ctx.fillStyle = 'white';
     const { direction } = gameRef.current;
     const eyeSize = 3;
     if (direction.x !== 0) {
       ctx.fillRect(segment.x * cellW + (direction.x > 0 ? 12 : 4), segment.y * cellH + 5, eyeSize, eyeSize);
       ctx.fillRect(segment.x * cellW + (direction.x > 0 ? 12 : 4), segment.y * cellH + 12, eyeSize, eyeSize);
     } else {
       ctx.fillRect(segment.x * cellW + 5, segment.y * cellH + (direction.y > 0 ? 12 : 4), eyeSize, eyeSize);
       ctx.fillRect(segment.x * cellW + 12, segment.y * cellH + (direction.y > 0 ? 12 : 4), eyeSize, eyeSize);
     }
    }
   }
  });
 };

 const gameLoop = useCallback((time: number) => {
  update(time);
  draw();
  gameRef.current.animationId = requestAnimationFrame(gameLoop);
 }, [isDarkMode, generateFood]);

 useEffect(() => {
  gameRef.current.animationId = requestAnimationFrame(gameLoop);
  return () => cancelAnimationFrame(gameRef.current.animationId);
 }, [gameLoop]);

 useEffect(() => {
  if (score > highScore) {
   setHighScore(score);
   localStorage.setItem('vylant_snake_highscore', score.toString());
  }
 }, [score, highScore]);

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

 return (
  <div 
   ref={containerRef}
   className={`relative w-full overflow-hidden rounded-2xl group ${
    isFullScreen ? 'h-screen w-screen rounded-none bg-navy-950' : 'aspect-square bg-black/5'
   }`}
  >
   <canvas 
    ref={canvasRef}
    width={400}
    height={400}
    className="w-full h-full object-contain"
   />

   {/* Control Helpers (Mobile/Click) */}
   {gameState === 'PLAYING' && !isFullScreen && (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-0">
     <div /> <div onClick={() => gameRef.current.nextDirection = { x: 0, y: -1 }} /> <div />
     <div onClick={() => gameRef.current.nextDirection = { x: -1, y: 0 }} /> <div /> <div onClick={() => gameRef.current.nextDirection = { x: 1, y: 0 }} />
     <div /> <div onClick={() => gameRef.current.nextDirection = { x: 0, y: 1 }} /> <div />
    </div>
   )}

   {/* Overlays */}
   <AnimatePresence>
    {gameState === 'IDLE' && (
     <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] text-white p-4`}
     >
      <motion.div 
       animate={{ y: [0, -10, 0] }}
       transition={{ repeat: Infinity, duration: 2 }}
       className={isFullScreen ? 'mb-4' : 'mb-2'}
      >
        {logoImageRef.current ? (
         <img 
          src="https://i.imgur.com/H3OS5zA.png" 
          className={isFullScreen ? 'w-20 h-20 object-contain' : 'w-14 h-14 object-contain'} 
          referrerPolicy="no-referrer"
         />
        ) : (
         <Play size={isFullScreen ? 48 : 32} fill="currentColor" className="mb-4 text-blue-400" />
        )}
      </motion.div>
      <h4 className={`${isFullScreen ? 'text-xl' : 'text-sm'} font-black uppercase tracking-widest mb-1`}>Vylant Snake</h4>
      <p className={`${isFullScreen ? 'text-sm mb-6' : 'text-[10px] mb-3'} opacity-80`}>Use Arrows or Swipe to Move</p>
      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
       <Trophy size={14} className="text-amber-400" />
       <span className="text-[10px] font-bold">Best: {highScore}</span>
      </div>
      <button 
       onClick={() => {
        setGameState('PLAYING');
        gameStateRef.current = 'PLAYING';
       }}
       className="mt-4 bg-vylant-blue px-6 py-2 rounded-xl font-bold text-xs"
      >Play Now</button>
     </motion.div>
    )}

    {gameState === 'GAME_OVER' && (
     <motion.div 
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white ${isFullScreen ? 'p-6' : 'p-2'}`}
     >
      <h4 className={`${isFullScreen ? 'text-4xl mb-2' : 'text-xl mb-1'} font-black text-red-500 uppercase tracking-tighter`}>Crashed!</h4>
      <div className={`bg-white/10 w-full max-w-[160px] rounded-2xl border border-white/10 text-center ${isFullScreen ? 'p-4 mb-6' : 'p-2 mb-3'}`}>
       <p className="text-[10px] uppercase opacity-60 font-bold mb-0.5">Score</p>
       <p className={`${isFullScreen ? 'text-3xl mb-4' : 'text-xl mb-2'} font-black text-blue-400`}>{score}</p>
       <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5 font-bold text-[10px]">
        <Trophy size={12} className="text-amber-400" />
        <span>Best: {highScore}</span>
       </div>
      </div>
      <button onClick={() => resetGame(true)} className={`flex items-center gap-2 bg-blue-600 px-6 py-2 rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/20`}>
       <RotateCcw size={14} /> Restart
      </button>
     </motion.div>
    )}
   </AnimatePresence>

   <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <button onClick={toggleFullScreen} className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 border border-white/10 text-white">
     {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
   </div>

   {gameState === 'PLAYING' && (
    <div className="absolute top-3 left-3 pointer-events-none opacity-50">
     <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold">
      Score: {score}
     </div>
    </div>
   )}
  </div>
 );
};

export default VylantSnake;

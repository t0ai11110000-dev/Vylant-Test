export interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl?: string;
  category: string;
  tags: string[];
  width?: number;
  height?: number;
  source?: string;
}

export interface GifCategory {
  id: string;
  name: string;
  emoji: string;
}

export const GIF_CATEGORIES: GifCategory[] = [
  { id: 'trending', name: 'Trending', emoji: '🔥' },
  { id: 'reactions', name: 'Reactions', emoji: '💬' },
  { id: 'memes', name: 'Memes', emoji: '🐸' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'anime', name: 'Anime', emoji: '✨' },
  { id: 'cats', name: 'Cats & Pets', emoji: '🐱' },
  { id: 'celebrate', name: 'Celebrate', emoji: '🎉' },
  { id: 'dance', name: 'Dancing', emoji: '💃' },
  { id: 'love', name: 'Love & Hugs', emoji: '💖' },
  { id: 'sad', name: 'Sad & Cry', emoji: '🥺' },
  { id: 'rage', name: 'Rage & Angry', emoji: '💢' },
  { id: 'lol', name: 'LOL & Laugh', emoji: '😂' }
];

export const CURATED_GIFS: GifItem[] = [
  // Trending & Classic Reactions
  {
    id: 'popcorn-eating',
    title: 'Michael Jackson Eating Popcorn',
    url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
    category: 'reactions',
    tags: ['popcorn', 'michael jackson', 'thriller', 'drama', 'watching', 'movie', 'spectating', 'tea', 'trending']
  },
  {
    id: 'mind-blown',
    title: 'Mind Blown Explosion',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    category: 'reactions',
    tags: ['mind blown', 'brain', 'explosion', 'shock', 'wow', 'crazy', 'insane', 'reaction', 'tim and eric', 'trending']
  },
  {
    id: 'cheers-dicaprio',
    title: 'Leonardo DiCaprio Great Gatsby Cheers',
    url: 'https://media.giphy.com/media/GCLlQnV7dXZ2E/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/GCLlQnV7dXZ2E/giphy.gif',
    category: 'reactions',
    tags: ['cheers', 'gatsby', 'leonardo dicaprio', 'champagne', 'congrats', 'toast', 'celebrate', 'salute', 'trending']
  },
  {
    id: 'confused-travolta',
    title: 'Confused John Travolta Pulp Fiction',
    url: 'https://media.giphy.com/media/g01ZnwspvissuQ08aN/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/g01ZnwspvissuQ08aN/giphy.gif',
    category: 'reactions',
    tags: ['confused', 'travolta', 'lost', 'where', 'what', 'pulp fiction', 'searching', 'empty', 'trending']
  },
  {
    id: 'homer-bush',
    title: 'Homer Simpson Backs Into Bush',
    url: 'https://media.giphy.com/media/a93jwI0wkWTQs/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/a93jwI0wkWTQs/giphy.gif',
    category: 'memes',
    tags: ['homer', 'simpsons', 'bush', 'disappear', 'hide', 'bye', 'awkward', 'retreat', 'leaving', 'trending']
  },
  {
    id: 'this-is-fine',
    title: 'This Is Fine Dog Fire Chaos',
    url: 'https://media.giphy.com/media/9M5jK4GXmD5o1irGrF/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/9M5jK4GXmD5o1irGrF/giphy.gif',
    category: 'memes',
    tags: ['this is fine', 'fire', 'dog', 'burning', 'chaos', 'calm', 'everything is okay', 'panic', 'trending']
  },
  {
    id: 'thumbs-up-chuck',
    title: 'Thumbs Up Chuck Norris Approves',
    url: 'https://media.giphy.com/media/mgqefqwSbToPe/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/mgqefqwSbToPe/giphy.gif',
    category: 'reactions',
    tags: ['thumbs up', 'approve', 'good', 'yes', 'great', 'ok', 'agree', 'nod']
  },
  {
    id: 'roll-safe-think',
    title: 'Roll Safe Smart Head Tap',
    url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
    category: 'memes',
    tags: ['smart', 'think', 'big brain', 'genius', 'idea', 'logic', 'head tap', 'roll safe', 'trending']
  },
  {
    id: 'cat-vibing-jam',
    title: 'Cat Vibing Jamming to Music',
    url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
    category: 'cats',
    tags: ['cat', 'vibing', 'dance', 'music', 'bop', 'nod', 'headbang', 'jam', 'trending']
  },
  {
    id: 'bongo-cat-fast',
    title: 'Bongo Cat Playing Drums',
    url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif',
    category: 'cats',
    tags: ['bongo cat', 'cat', 'drums', 'fast', 'keyboard', 'cute', 'music', 'typing']
  },
  {
    id: 'kermit-tea-sip',
    title: 'Kermit None of My Business Tea',
    url: 'https://media.giphy.com/media/3o85xGocUH8RY0WoKs/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o85xGocUH8RY0WoKs/giphy.gif',
    category: 'memes',
    tags: ['kermit', 'tea', 'sip', 'shade', 'drama', 'none of my business', 'frog', 'smug', 'trending']
  },
  {
    id: 'carlton-dance',
    title: 'Carlton Dance Fresh Prince',
    url: 'https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif',
    category: 'dance',
    tags: ['carlton', 'dance', 'happy', 'fresh prince', 'groove', 'celebrate', 'moves', 'joy']
  },
  {
    id: 'spongebob-rainbow',
    title: 'SpongeBob Imagination Rainbow',
    url: 'https://media.giphy.com/media/BQUITFiYVtNte/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/BQUITFiYVtNte/giphy.gif',
    category: 'memes',
    tags: ['spongebob', 'imagination', 'rainbow', 'magic', 'sparkle', 'cartoon', 'idea']
  },
  {
    id: 'drake-no-yes',
    title: 'Drake Hotline Bling Approval',
    url: 'https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif',
    category: 'reactions',
    tags: ['drake', 'yes', 'no', 'approve', 'disapprove', 'meme', 'hotline bling', 'point']
  },
  {
    id: 'success-kid',
    title: 'Success Kid Fist Pump',
    url: 'https://media.giphy.com/media/nXxOjZrbnbRxS/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/nXxOjZrbnbRxS/giphy.gif',
    category: 'celebrate',
    tags: ['success', 'win', 'fist pump', 'victory', 'kid', 'yes', 'proud', 'achieve']
  },
  {
    id: 'facepalm-picard',
    title: 'Captain Picard Facepalm',
    url: 'https://media.giphy.com/media/xsF1FSDbjguis/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/xsF1FSDbjguis/giphy.gif',
    category: 'reactions',
    tags: ['facepalm', 'picard', 'star trek', 'disappointed', 'sigh', 'stupid', 'unbelievable']
  },
  {
    id: 'laughing-leo',
    title: 'Leonardo DiCaprio Laughing Django',
    url: 'https://media.giphy.com/media/O5NyCibf93upy/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/O5NyCibf93upy/giphy.gif',
    category: 'lol',
    tags: ['laugh', 'lol', 'haha', 'leo', 'django', 'funny', 'hilarious', 'evil laugh']
  },
  {
    id: 'high-five-office',
    title: 'The Office High Five Jim & Pam',
    url: 'https://media.giphy.com/media/5wWf7H0qoWaNnkZBucU/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/5wWf7H0qoWaNnkZBucU/giphy.gif',
    category: 'celebrate',
    tags: ['high five', 'the office', 'teamwork', 'great job', 'nice', 'friend', 'together']
  },
  {
    id: 'anya-smug-heh',
    title: 'Anya Forger Heh Smug Smile',
    url: 'https://media.giphy.com/media/FWAcpJsFT9mVRv0e7a/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/FWAcpJsFT9mVRv0e7a/giphy.gif',
    category: 'anime',
    tags: ['anya', 'spy x family', 'heh', 'smug', 'smile', 'anime', 'cute', 'funny', 'plan', 'trending']
  },
  {
    id: 'sailor-moon-sparkle',
    title: 'Sailor Moon Transformation Sparkle',
    url: 'https://media.giphy.com/media/26gBjmGEsrFQlj8g8/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26gBjmGEsrFQlj8g8/giphy.gif',
    category: 'anime',
    tags: ['sailor moon', 'anime', 'sparkle', 'aesthetic', 'magical', 'transform', 'retro anime']
  },
  {
    id: 'super-saiyan-goku',
    title: 'Goku Super Saiyan Power Up',
    url: 'https://media.giphy.com/media/ul1omlrGG6kpO/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/ul1omlrGG6kpO/giphy.gif',
    category: 'anime',
    tags: ['goku', 'dragon ball', 'super saiyan', 'power up', 'hype', 'energy', 'fire', 'anime', 'trending']
  },
  {
    id: 'naruto-run',
    title: 'Naruto Running Fast',
    url: 'https://media.giphy.com/media/JRlqKEzTDKci5JPcaL/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/JRlqKEzTDKci5JPcaL/giphy.gif',
    category: 'anime',
    tags: ['naruto', 'run', 'fast', 'speed', 'anime', 'ninja', 'hurry', 'rush']
  },
  {
    id: 'gamer-rage-quit',
    title: 'Gamer Keyboard Smash Rage Quit',
    url: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif',
    category: 'gaming',
    tags: ['rage', 'keyboard', 'smash', 'gamer', 'gaming', 'angry', 'lost', 'tilt', 'destroy']
  },
  {
    id: 'gaming-gg-victory',
    title: 'Victory Royale GG Game Over',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    category: 'gaming',
    tags: ['gg', 'good game', 'victory', 'win', 'gaming', 'winner', 'fortnite', 'esports']
  },
  {
    id: 'among-us-emergency',
    title: 'Among Us Emergency Meeting Button',
    url: 'https://media.giphy.com/media/ysiCYZUJZZ3wS5JsbC/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/ysiCYZUJZZ3wS5JsbC/giphy.gif',
    category: 'gaming',
    tags: ['among us', 'emergency', 'sus', 'impostor', 'meeting', 'gaming', 'red', 'vote']
  },
  {
    id: 'minecraft-villager-trade',
    title: 'Minecraft Villager Nod Hmmm',
    url: 'https://media.giphy.com/media/u07sqapcowkWAMvW98/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/u07sqapcowkWAMvW98/giphy.gif',
    category: 'gaming',
    tags: ['minecraft', 'villager', 'trade', 'hmmm', 'nod', 'gaming', 'emerald', 'deal']
  },
  {
    id: 'cute-dog-happy-wag',
    title: 'Happy Golden Retriever Wagging Tail',
    url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif',
    category: 'cats',
    tags: ['dog', 'puppy', 'happy', 'wag', 'golden retriever', 'cute', 'excited', 'good boy', 'pet']
  },
  {
    id: 'sad-cat-crying',
    title: 'Sad Cat Crying Tears',
    url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
    category: 'sad',
    tags: ['sad', 'cry', 'tears', 'cat', 'crying', 'heartbroken', 'pain', 'upset', 'depressed']
  },
  {
    id: 'crying-squidward',
    title: 'Squidward Crying Tears Waterfall',
    url: 'https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif',
    category: 'sad',
    tags: ['sad', 'squidward', 'spongebob', 'cry', 'alone', 'depressed', 'gloomy']
  },
  {
    id: 'confetti-party-celebration',
    title: 'Minions Confetti Party Celebration',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    category: 'celebrate',
    tags: ['party', 'confetti', 'celebrate', 'minions', 'birthday', 'woohoo', 'yay', 'holiday']
  },
  {
    id: 'dancing-duck-shuba',
    title: 'Dancing Duck Shuba Shuba',
    url: 'https://media.giphy.com/media/vP5gXvSXJ2olG/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/vP5gXvSXJ2olG/giphy.gif',
    category: 'dance',
    tags: ['duck', 'dance', 'shuba', 'groove', 'cute', 'hololive', 'vibe', 'happy']
  },
  {
    id: 'love-heart-eyes',
    title: 'Cat With Heart Eyes Sending Love',
    url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
    category: 'love',
    tags: ['love', 'heart', 'cat', 'cute', 'affection', 'hug', 'kiss', 'crush', 'adorable']
  },
  {
    id: 'pepe-clap-applause',
    title: 'Pepe The Frog Clapping Applause',
    url: 'https://media.giphy.com/media/nbvFVPiEiJH6hOGGsB/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/nbvFVPiEiJH6hOGGsB/giphy.gif',
    category: 'memes',
    tags: ['pepe', 'clap', 'applause', 'bravo', 'congrats', 'well done', 'standing ovation']
  },
  {
    id: 'shocked-pikachu',
    title: 'Shocked Pikachu Open Mouth Face',
    url: 'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif',
    category: 'reactions',
    tags: ['pikachu', 'shocked', 'surprised', 'pokemon', 'gasp', 'unbelievable', 'meme']
  },
  {
    id: 'gigachad-smile',
    title: 'Gigachad Looking Fresh and Smiling',
    url: 'https://media.giphy.com/media/CAYVZA5NRb529kKQUc/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/CAYVZA5NRb529kKQUc/giphy.gif',
    category: 'memes',
    tags: ['gigachad', 'chad', 'based', 'handsome', 'legend', 'king', 'sigma']
  },
  {
    id: 'excited-jonah-hill',
    title: 'Jonah Hill Screaming Excited Flap',
    url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    category: 'celebrate',
    tags: ['excited', 'jonah hill', 'screaming', 'hype', 'yay', 'cannot wait', 'happy']
  }
];

export function getFavoriteGifs(): GifItem[] {
  try {
    const raw = localStorage.getItem('vylant_favorite_gifs');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveFavoriteGif(gif: GifItem): GifItem[] {
  const current = getFavoriteGifs();
  const exists = current.some(g => g.id === gif.id || g.url === gif.url);
  let updated: GifItem[];
  if (exists) {
    updated = current.filter(g => g.id !== gif.id && g.url !== gif.url);
  } else {
    updated = [gif, ...current].slice(0, 50);
  }
  try {
    localStorage.setItem('vylant_favorite_gifs', JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function isGifFavorited(gifUrl: string): boolean {
  const current = getFavoriteGifs();
  return current.some(g => g.url === gifUrl);
}

export function getRecentGifs(): GifItem[] {
  try {
    const raw = localStorage.getItem('vylant_recent_gifs');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function addRecentGif(gif: GifItem): GifItem[] {
  const current = getRecentGifs();
  const filtered = current.filter(g => g.url !== gif.url && g.id !== gif.id);
  const updated = [gif, ...filtered].slice(0, 40);
  try {
    localStorage.setItem('vylant_recent_gifs', JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function filterGifs(query: string, category: string): GifItem[] {
  const cleanQ = query.trim().toLowerCase();
  
  if (category === 'favorites') {
    const favs = getFavoriteGifs();
    if (!cleanQ) return favs;
    return favs.filter(g => 
      g.title.toLowerCase().includes(cleanQ) || 
      g.tags.some(t => t.toLowerCase().includes(cleanQ))
    );
  }

  if (category === 'recents') {
    const recs = getRecentGifs();
    if (!cleanQ) return recs;
    return recs.filter(g => 
      g.title.toLowerCase().includes(cleanQ) || 
      g.tags.some(t => t.toLowerCase().includes(cleanQ))
    );
  }

  let pool = CURATED_GIFS;
  if (category && category !== 'trending' && category !== 'all') {
    pool = pool.filter(g => g.category === category);
  }

  if (!cleanQ) return pool;

  return pool.filter(g => 
    g.title.toLowerCase().includes(cleanQ) || 
    g.tags.some(t => t.toLowerCase().includes(cleanQ)) ||
    g.category.toLowerCase().includes(cleanQ)
  );
}

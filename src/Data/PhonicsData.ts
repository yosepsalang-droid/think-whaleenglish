// src/data/PhonicsData.ts

export interface PhonicsWord {
    id: number;
    day: number;      // 진도 (Day 1 ~ Day 7)
    letter: string;   // 알파벳
    word: string;     // 영어 단어
    icon: string;     // 이모지(그림)
    sound: string;    // TTS가 읽어줄 소리
  }
  
  export const PHONICS_DB: PhonicsWord[] = [
    // 🌟 Day 1 (Aa, Bb, Cc, Dd)
    { id: 1, day: 1, letter: 'Aa', word: 'apple', icon: '🍎', sound: 'apple' },
    { id: 2, day: 1, letter: 'Aa', word: 'ant', icon: '🐜', sound: 'ant' },
    { id: 3, day: 1, letter: 'Aa', word: 'alligator', icon: '🐊', sound: 'alligator' },
    
    { id: 4, day: 1, letter: 'Bb', word: 'bear', icon: '🐻', sound: 'bear' },
    { id: 5, day: 1, letter: 'Bb', word: 'bus', icon: '🚌', sound: 'bus' },
    { id: 6, day: 1, letter: 'Bb', word: 'banana', icon: '🍌', sound: 'banana' },
    
    { id: 7, day: 1, letter: 'Cc', word: 'cat', icon: '🐱', sound: 'cat' },
    { id: 8, day: 1, letter: 'Cc', word: 'cup', icon: '☕', sound: 'cup' },
    { id: 9, day: 1, letter: 'Cc', word: 'cake', icon: '🍰', sound: 'cake' },
    
    { id: 10, day: 1, letter: 'Dd', word: 'dog', icon: '🐶', sound: 'dog' },
    { id: 11, day: 1, letter: 'Dd', word: 'duck', icon: '🦆', sound: 'duck' },
    { id: 12, day: 1, letter: 'Dd', word: 'dinosaur', icon: '🦕', sound: 'dinosaur' },
  
    // 🌟 Day 2 (Ee, Ff, Gg, Hh)
    { id: 13, day: 2, letter: 'Ee', word: 'egg', icon: '🥚', sound: 'egg' },
    { id: 14, day: 2, letter: 'Ee', word: 'elephant', icon: '🐘', sound: 'elephant' },
    { id: 15, day: 2, letter: 'Ee', word: 'envelope', icon: '✉️', sound: 'envelope' },
  
    { id: 16, day: 2, letter: 'Ff', word: 'fish', icon: '🐟', sound: 'fish' },
    { id: 17, day: 2, letter: 'Ff', word: 'frog', icon: '🐸', sound: 'frog' },
    { id: 18, day: 2, letter: 'Ff', word: 'fox', icon: '🦊', sound: 'fox' },
  
    { id: 19, day: 2, letter: 'Gg', word: 'goat', icon: '🐐', sound: 'goat' },
    { id: 20, day: 2, letter: 'Gg', word: 'gorilla', icon: '🦍', sound: 'gorilla' },
    { id: 21, day: 2, letter: 'Gg', word: 'grape', icon: '🍇', sound: 'grape' },
  
    { id: 22, day: 2, letter: 'Hh', word: 'hat', icon: '🎩', sound: 'hat' },
    { id: 23, day: 2, letter: 'Hh', word: 'house', icon: '🏠', sound: 'house' },
    { id: 24, day: 2, letter: 'Hh', word: 'horse', icon: '🐴', sound: 'horse' },
  
    // 🌟 Day 3 (Ii, Jj, Kk, Ll)
    { id: 25, day: 3, letter: 'Ii', word: 'igloo', icon: '🧊', sound: 'igloo' },
    { id: 26, day: 3, letter: 'Ii', word: 'iguana', icon: '🦎', sound: 'iguana' },
    { id: 27, day: 3, letter: 'Ii', word: 'ink', icon: '✒️', sound: 'ink' },
  
    { id: 28, day: 3, letter: 'Jj', word: 'jam', icon: '🍯', sound: 'jam' },
    { id: 29, day: 3, letter: 'Jj', word: 'juice', icon: '🧃', sound: 'juice' },
    { id: 30, day: 3, letter: 'Jj', word: 'jellyfish', icon: '🪼', sound: 'jellyfish' },
  
    { id: 31, day: 3, letter: 'Kk', word: 'kangaroo', icon: '🦘', sound: 'kangaroo' },
    { id: 32, day: 3, letter: 'Kk', word: 'koala', icon: '🐨', sound: 'koala' },
    { id: 33, day: 3, letter: 'Kk', word: 'key', icon: '🔑', sound: 'key' },
  
    { id: 34, day: 3, letter: 'Ll', word: 'lion', icon: '🦁', sound: 'lion' },
    { id: 35, day: 3, letter: 'Ll', word: 'lemon', icon: '🍋', sound: 'lemon' },
    { id: 36, day: 3, letter: 'Ll', word: 'leaf', icon: '🍃', sound: 'leaf' },
  
    // 🌟 Day 4 (Mm, Nn, Oo, Pp)
    { id: 37, day: 4, letter: 'Mm', word: 'monkey', icon: '🐒', sound: 'monkey' },
    { id: 38, day: 4, letter: 'Mm', word: 'mouse', icon: '🐭', sound: 'mouse' },
    { id: 39, day: 4, letter: 'Mm', word: 'moon', icon: '🌕', sound: 'moon' },
  
    { id: 40, day: 4, letter: 'Nn', word: 'nut', icon: '🥜', sound: 'nut' },
    { id: 41, day: 4, letter: 'Nn', word: 'nest', icon: '🪹', sound: 'nest' },
    { id: 42, day: 4, letter: 'Nn', word: 'nose', icon: '👃', sound: 'nose' },
  
    { id: 43, day: 4, letter: 'Oo', word: 'octopus', icon: '🐙', sound: 'octopus' },
    { id: 44, day: 4, letter: 'Oo', word: 'orange', icon: '🍊', sound: 'orange' },
    { id: 45, day: 4, letter: 'Oo', word: 'owl', icon: '🦉', sound: 'owl' },
  
    { id: 46, day: 4, letter: 'Pp', word: 'pig', icon: '🐷', sound: 'pig' },
    { id: 47, day: 4, letter: 'Pp', word: 'penguin', icon: '🐧', sound: 'penguin' },
    { id: 48, day: 4, letter: 'Pp', word: 'pizza', icon: '🍕', sound: 'pizza' },
  
    // 🌟 Day 5 (Qq, Rr, Ss, Tt)
    { id: 49, day: 5, letter: 'Qq', word: 'queen', icon: '👸', sound: 'queen' },
    { id: 50, day: 5, letter: 'Qq', word: 'quilt', icon: '🛏️', sound: 'quilt' },
    { id: 51, day: 5, letter: 'Qq', word: 'quiet', icon: '🤫', sound: 'quiet' },
  
    { id: 52, day: 5, letter: 'Rr', word: 'rabbit', icon: '🐰', sound: 'rabbit' },
    { id: 53, day: 5, letter: 'Rr', word: 'robot', icon: '🤖', sound: 'robot' },
    { id: 54, day: 5, letter: 'Rr', word: 'ring', icon: '💍', sound: 'ring' },
  
    { id: 55, day: 5, letter: 'Ss', word: 'sun', icon: '☀️', sound: 'sun' },
    { id: 56, day: 5, letter: 'Ss', word: 'snake', icon: '🐍', sound: 'snake' },
    { id: 57, day: 5, letter: 'Ss', word: 'star', icon: '⭐', sound: 'star' },
  
    { id: 58, day: 5, letter: 'Tt', word: 'tiger', icon: '🐯', sound: 'tiger' },
    { id: 59, day: 5, letter: 'Tt', word: 'tree', icon: '🌳', sound: 'tree' },
    { id: 60, day: 5, letter: 'Tt', word: 'train', icon: '🚂', sound: 'train' },
  
    // 🌟 Day 6 (Uu, Vv, Ww, Xx)
    { id: 61, day: 6, letter: 'Uu', word: 'umbrella', icon: '☂️', sound: 'umbrella' },
    { id: 62, day: 6, letter: 'Uu', word: 'up', icon: '⬆️', sound: 'up' },
    { id: 63, day: 6, letter: 'Uu', word: 'uniform', icon: '🥋', sound: 'uniform' },
  
    { id: 64, day: 6, letter: 'Vv', word: 'van', icon: '🚐', sound: 'van' },
    { id: 65, day: 6, letter: 'Vv', word: 'vest', icon: '🦺', sound: 'vest' },
    { id: 66, day: 6, letter: 'Vv', word: 'violin', icon: '🎻', sound: 'violin' },
  
    { id: 67, day: 6, letter: 'Ww', word: 'water', icon: '💧', sound: 'water' },
    { id: 68, day: 6, letter: 'Ww', word: 'wolf', icon: '🐺', sound: 'wolf' },
    { id: 69, day: 6, letter: 'Ww', word: 'watermelon', icon: '🍉', sound: 'watermelon' },
  
    { id: 70, day: 6, letter: 'Xx', word: 'x-ray', icon: '🦴', sound: 'x-ray' },
    { id: 71, day: 6, letter: 'Xx', word: 'box', icon: '📦', sound: 'box' },
    { id: 72, day: 6, letter: 'Xx', word: 'six', icon: '6️⃣', sound: 'six' },
  
    // 🌟 Day 7 (Yy, Zz)
    { id: 73, day: 7, letter: 'Yy', word: 'yo-yo', icon: '🪀', sound: 'yo-yo' },
    { id: 74, day: 7, letter: 'Yy', word: 'yellow', icon: '🟡', sound: 'yellow' },
    { id: 75, day: 7, letter: 'Yy', word: 'yogurt', icon: '🍦', sound: 'yogurt' },
  
    { id: 76, day: 7, letter: 'Zz', word: 'zebra', icon: '🦓', sound: 'zebra' },
    { id: 77, day: 7, letter: 'Zz', word: 'zoo', icon: '🎪', sound: 'zoo' },
    { id: 78, day: 7, letter: 'Zz', word: 'zero', icon: '0️⃣', sound: 'zero' }
  ];
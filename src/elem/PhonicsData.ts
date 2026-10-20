export interface PhonicsWord {
  id: number; day: number; letter: string; word: string; icon: string; sound: string;
}

// 💡 교재 기반 단어 리스트 (yarn -> yellow 변경 완료)
export const PHONICS_DB: PhonicsWord[] = [
  // Day 1 (Lesson 01 Aa~Cc)
  { id: 1, day: 1, letter: 'Aa', word: 'ant', icon: '🐜', sound: 'ant' },
  { id: 2, day: 1, letter: 'Aa', word: 'apple', icon: '🍎', sound: 'apple' },
  { id: 3, day: 1, letter: 'Aa', word: 'alligator', icon: '🐊', sound: 'alligator' },
  { id: 4, day: 1, letter: 'Bb', word: 'ball', icon: '🏀', sound: 'ball' },
  { id: 5, day: 1, letter: 'Bb', word: 'backpack', icon: '🎒', sound: 'backpack' },
  { id: 6, day: 1, letter: 'Bb', word: 'banana', icon: '🍌', sound: 'banana' },
  { id: 7, day: 1, letter: 'Cc', word: 'cat', icon: '🐱', sound: 'cat' },
  { id: 8, day: 1, letter: 'Cc', word: 'cup', icon: '☕', sound: 'cup' },
  { id: 9, day: 1, letter: 'Cc', word: 'car', icon: '🚗', sound: 'car' },

  // Day 2 (Lesson 02 Dd~Ff)
  { id: 10, day: 2, letter: 'Dd', word: 'dog', icon: '🐶', sound: 'dog' },
  { id: 11, day: 2, letter: 'Dd', word: 'desk', icon: '🪑', sound: 'desk' },
  { id: 12, day: 2, letter: 'Dd', word: 'doll', icon: '🪆', sound: 'doll' },
  { id: 13, day: 2, letter: 'Ee', word: 'egg', icon: '🥚', sound: 'egg' },
  { id: 14, day: 2, letter: 'Ee', word: 'elbow', icon: '💪', sound: 'elbow' },
  { id: 15, day: 2, letter: 'Ee', word: 'elephant', icon: '🐘', sound: 'elephant' },
  { id: 16, day: 2, letter: 'Ff', word: 'fish', icon: '🐟', sound: 'fish' },
  { id: 17, day: 2, letter: 'Ff', word: 'fan', icon: '🎐', sound: 'fan' },
  { id: 18, day: 2, letter: 'Ff', word: 'fork', icon: '🍴', sound: 'fork' },

  // Day 3 (Lesson 04 Gg~Ii)
  { id: 19, day: 3, letter: 'Gg', word: 'girl', icon: '👧', sound: 'girl' },
  { id: 20, day: 3, letter: 'Gg', word: 'goat', icon: '🐐', sound: 'goat' },
  { id: 21, day: 3, letter: 'Gg', word: 'gorilla', icon: '🦍', sound: 'gorilla' },
  { id: 22, day: 3, letter: 'Hh', word: 'hat', icon: '👒', sound: 'hat' },
  { id: 23, day: 3, letter: 'Hh', word: 'house', icon: '🏠', sound: 'house' },
  { id: 24, day: 3, letter: 'Hh', word: 'horse', icon: '🐴', sound: 'horse' },
  { id: 25, day: 3, letter: 'Ii', word: 'ink', icon: '✒️', sound: 'ink' },
  { id: 26, day: 3, letter: 'Ii', word: 'igloo', icon: '🧊', sound: 'igloo' },
  { id: 27, day: 3, letter: 'Ii', word: 'iguana', icon: '🦎', sound: 'iguana' },

  // Day 4 (Lesson 05 Jj~Ll)
  { id: 28, day: 4, letter: 'Jj', word: 'jam', icon: '🍯', sound: 'jam' },
  { id: 29, day: 4, letter: 'Jj', word: 'jet', icon: '✈️', sound: 'jet' },
  { id: 30, day: 4, letter: 'Jj', word: 'jacket', icon: '🧥', sound: 'jacket' },
  { id: 31, day: 4, letter: 'Kk', word: 'key', icon: '🔑', sound: 'key' },
  { id: 32, day: 4, letter: 'Kk', word: 'kite', icon: '🪁', sound: 'kite' },
  { id: 33, day: 4, letter: 'Kk', word: 'kangaroo', icon: '🦘', sound: 'kangaroo' },
  { id: 34, day: 4, letter: 'Ll', word: 'lion', icon: '🦁', sound: 'lion' },
  { id: 35, day: 4, letter: 'Ll', word: 'lamp', icon: '🛋️', sound: 'lamp' },
  { id: 36, day: 4, letter: 'Ll', word: 'lemon', icon: '🍋', sound: 'lemon' },

  // Day 5 (Lesson 09 Mm~Oo)
  { id: 37, day: 5, letter: 'Mm', word: 'monkey', icon: '🐒', sound: 'monkey' },
  { id: 38, day: 5, letter: 'Mm', word: 'map', icon: '🗺️', sound: 'map' },
  { id: 39, day: 5, letter: 'Mm', word: 'melon', icon: '🍈', sound: 'melon' },
  { id: 40, day: 5, letter: 'Nn', word: 'net', icon: '🥅', sound: 'net' },
  { id: 41, day: 5, letter: 'Nn', word: 'nest', icon: '🪹', sound: 'nest' },
  { id: 42, day: 5, letter: 'Nn', word: 'nose', icon: '👃', sound: 'nose' },
  { id: 43, day: 5, letter: 'Oo', word: 'orange', icon: '🍊', sound: 'orange' },
  { id: 44, day: 5, letter: 'Oo', word: 'octopus', icon: '🐙', sound: 'octopus' },
  { id: 45, day: 5, letter: 'Oo', word: 'ostrich', icon: '🦅', sound: 'ostrich' },

  // Day 6 (Lesson 10 Pp~Rr)
  { id: 46, day: 6, letter: 'Pp', word: 'pig', icon: '🐷', sound: 'pig' },
  { id: 47, day: 6, letter: 'Pp', word: 'panda', icon: '🐼', sound: 'panda' },
  { id: 48, day: 6, letter: 'Pp', word: 'peach', icon: '🍑', sound: 'peach' },
  { id: 49, day: 6, letter: 'Qq', word: 'queen', icon: '👸', sound: 'queen' },
  { id: 50, day: 6, letter: 'Qq', word: 'quilt', icon: '🛏️', sound: 'quilt' },
  { id: 51, day: 6, letter: 'Qq', word: 'question', icon: '❓', sound: 'question' },
  { id: 52, day: 6, letter: 'Rr', word: 'robot', icon: '🤖', sound: 'robot' },
  { id: 53, day: 6, letter: 'Rr', word: 'rose', icon: '🌹', sound: 'rose' },
  { id: 54, day: 6, letter: 'Rr', word: 'rabbit', icon: '🐰', sound: 'rabbit' },

  // Day 7 (Lesson 12 Ss~Vv)
  { id: 55, day: 7, letter: 'Ss', word: 'snake', icon: '🐍', sound: 'snake' },
  { id: 56, day: 7, letter: 'Ss', word: 'sun', icon: '☀️', sound: 'sun' },
  { id: 57, day: 7, letter: 'Ss', word: 'soap', icon: '🧼', sound: 'soap' },
  { id: 58, day: 7, letter: 'Tt', word: 'tent', icon: '⛺', sound: 'tent' },
  { id: 59, day: 7, letter: 'Tt', word: 'tiger', icon: '🐯', sound: 'tiger' },
  { id: 60, day: 7, letter: 'Tt', word: 'train', icon: '🚂', sound: 'train' },
  { id: 61, day: 7, letter: 'Uu', word: 'umbrella', icon: '☂️', sound: 'umbrella' },
  { id: 62, day: 7, letter: 'Uu', word: 'up', icon: '⬆️', sound: 'up' },
  { id: 63, day: 7, letter: 'Uu', word: 'under', icon: '👇', sound: 'under' },
  { id: 64, day: 7, letter: 'Vv', word: 'violin', icon: '🎻', sound: 'violin' },
  { id: 65, day: 7, letter: 'Vv', word: 'vase', icon: '🏺', sound: 'vase' },
  { id: 66, day: 7, letter: 'Vv', word: 'vest', icon: '🦺', sound: 'vest' },

  // Day 8 (Lesson 13 Ww~Zz)
  { id: 67, day: 8, letter: 'Ww', word: 'wolf', icon: '🐺', sound: 'wolf' },
  { id: 68, day: 8, letter: 'Ww', word: 'watch', icon: '⌚', sound: 'watch' },
  { id: 69, day: 8, letter: 'Ww', word: 'window', icon: '🪟', sound: 'window' },
  { id: 70, day: 8, letter: 'Xx', word: 'fox', icon: '🦊', sound: 'fox' },
  { id: 71, day: 8, letter: 'Xx', word: 'box', icon: '📦', sound: 'box' },
  { id: 72, day: 8, letter: 'Xx', word: 'six', icon: '6️⃣', sound: 'six' },
  { id: 73, day: 8, letter: 'Yy', word: 'yo-yo', icon: '🪀', sound: 'yo-yo' },
  { id: 74, day: 8, letter: 'Yy', word: 'yellow', icon: '🟡', sound: 'yellow' }, // 💡 yarn에서 yellow로 완벽 적용
  { id: 75, day: 8, letter: 'Yy', word: 'yogurt', icon: '🍦', sound: 'yogurt' },
  { id: 76, day: 8, letter: 'Zz', word: 'zebra', icon: '🦓', sound: 'zebra' },
  { id: 77, day: 8, letter: 'Zz', word: 'zero', icon: '0️⃣', sound: 'zero' },
  { id: 78, day: 8, letter: 'Zz', word: 'zipper', icon: '🤐', sound: 'zipper' }
];
// 💡 [경고] 만약 supabase 파일의 위치가 다르면 경로('../lib/supabase')를 꼭 수정해주세요!
import { supabase } from '../lib/supabase';

export interface PhonicsWord {
  id: number; day: number; letter: string; word: string; icon: string; sound: string;
}

// 💡 1단계: 기존 이모지(icon)를 빼고 단어 데이터만 깔끔하게 남겨둡니다.
const RAW_PHONICS_DB = [
  // Day 1 (Lesson 01 Aa~Cc)
  { id: 1, day: 1, letter: 'Aa', word: 'ant', sound: 'ant' },
  { id: 2, day: 1, letter: 'Aa', word: 'apple', sound: 'apple' },
  { id: 3, day: 1, letter: 'Aa', word: 'alligator', sound: 'alligator' },
  { id: 4, day: 1, letter: 'Bb', word: 'ball', sound: 'ball' },
  { id: 5, day: 1, letter: 'Bb', word: 'backpack', sound: 'backpack' },
  { id: 6, day: 1, letter: 'Bb', word: 'banana', sound: 'banana' },
  { id: 7, day: 1, letter: 'Cc', word: 'cat', sound: 'cat' },
  { id: 8, day: 1, letter: 'Cc', word: 'cup', sound: 'cup' },
  { id: 9, day: 1, letter: 'Cc', word: 'car', sound: 'car' },

  // Day 2 (Lesson 02 Dd~Ff)
  { id: 10, day: 2, letter: 'Dd', word: 'dog', sound: 'dog' },
  { id: 11, day: 2, letter: 'Dd', word: 'desk', sound: 'desk' },
  { id: 12, day: 2, letter: 'Dd', word: 'doll', sound: 'doll' },
  { id: 13, day: 2, letter: 'Ee', word: 'egg', sound: 'egg' },
  { id: 14, day: 2, letter: 'Ee', word: 'elbow', sound: 'elbow' },
  { id: 15, day: 2, letter: 'Ee', word: 'elephant', sound: 'elephant' },
  { id: 16, day: 2, letter: 'Ff', word: 'fish', sound: 'fish' },
  { id: 17, day: 2, letter: 'Ff', word: 'fan', sound: 'fan' },
  { id: 18, day: 2, letter: 'Ff', word: 'fork', sound: 'fork' },

  // Day 3 (Lesson 04 Gg~Ii)
  { id: 19, day: 3, letter: 'Gg', word: 'girl', sound: 'girl' },
  { id: 20, day: 3, letter: 'Gg', word: 'goat', sound: 'goat' },
  { id: 21, day: 3, letter: 'Gg', word: 'gorilla', sound: 'gorilla' },
  { id: 22, day: 3, letter: 'Hh', word: 'hat', sound: 'hat' },
  { id: 23, day: 3, letter: 'Hh', word: 'house', sound: 'house' },
  { id: 24, day: 3, letter: 'Hh', word: 'horse', sound: 'horse' },
  { id: 25, day: 3, letter: 'Ii', word: 'ink', sound: 'ink' },
  { id: 26, day: 3, letter: 'Ii', word: 'igloo', sound: 'igloo' },
  { id: 27, day: 3, letter: 'Ii', word: 'iguana', sound: 'iguana' },

  // Day 4 (Lesson 05 Jj~Ll)
  { id: 28, day: 4, letter: 'Jj', word: 'jam', sound: 'jam' },
  { id: 29, day: 4, letter: 'Jj', word: 'jet', sound: 'jet' },
  { id: 30, day: 4, letter: 'Jj', word: 'jacket', sound: 'jacket' },
  { id: 31, day: 4, letter: 'Kk', word: 'key', sound: 'key' },
  { id: 32, day: 4, letter: 'Kk', word: 'kite', sound: 'kite' },
  { id: 33, day: 4, letter: 'Kk', word: 'kangaroo', sound: 'kangaroo' },
  { id: 34, day: 4, letter: 'Ll', word: 'lion', sound: 'lion' },
  { id: 35, day: 4, letter: 'Ll', word: 'lamp', sound: 'lamp' },
  { id: 36, day: 4, letter: 'Ll', word: 'lemon', sound: 'lemon' },

  // Day 5 (Lesson 09 Mm~Oo)
  { id: 37, day: 5, letter: 'Mm', word: 'monkey', sound: 'monkey' },
  { id: 38, day: 5, letter: 'Mm', word: 'map', sound: 'map' },
  { id: 39, day: 5, letter: 'Mm', word: 'melon', sound: 'melon' },
  { id: 40, day: 5, letter: 'Nn', word: 'net', sound: 'net' },
  { id: 41, day: 5, letter: 'Nn', word: 'nest', sound: 'nest' },
  { id: 42, day: 5, letter: 'Nn', word: 'nose', sound: 'nose' },
  { id: 43, day: 5, letter: 'Oo', word: 'orange', sound: 'orange' },
  { id: 44, day: 5, letter: 'Oo', word: 'octopus', sound: 'octopus' },
  { id: 45, day: 5, letter: 'Oo', word: 'ostrich', sound: 'ostrich' },

  // Day 6 (Lesson 10 Pp~Rr)
  { id: 46, day: 6, letter: 'Pp', word: 'pig', sound: 'pig' },
  { id: 47, day: 6, letter: 'Pp', word: 'panda', sound: 'panda' },
  { id: 48, day: 6, letter: 'Pp', word: 'peach', sound: 'peach' },
  { id: 49, day: 6, letter: 'Qq', word: 'queen', sound: 'queen' },
  { id: 50, day: 6, letter: 'Qq', word: 'quilt', sound: 'quilt' },
  { id: 51, day: 6, letter: 'Qq', word: 'question', sound: 'question' },
  { id: 52, day: 6, letter: 'Rr', word: 'robot', sound: 'robot' },
  { id: 53, day: 6, letter: 'Rr', word: 'rose', sound: 'rose' },
  { id: 54, day: 6, letter: 'Rr', word: 'rabbit', sound: 'rabbit' },

  // Day 7 (Lesson 12 Ss~Vv)
  { id: 55, day: 7, letter: 'Ss', word: 'snake', sound: 'snake' },
  { id: 56, day: 7, letter: 'Ss', word: 'sun', sound: 'sun' },
  { id: 57, day: 7, letter: 'Ss', word: 'soap', sound: 'soap' },
  { id: 58, day: 7, letter: 'Tt', word: 'tent', sound: 'tent' },
  { id: 59, day: 7, letter: 'Tt', word: 'tiger', sound: 'tiger' },
  { id: 60, day: 7, letter: 'Tt', word: 'train', sound: 'train' },
  { id: 61, day: 7, letter: 'Uu', word: 'umbrella', sound: 'umbrella' },
  { id: 62, day: 7, letter: 'Uu', word: 'up', sound: 'up' },
  { id: 63, day: 7, letter: 'Uu', word: 'under', sound: 'under' },
  { id: 64, day: 7, letter: 'Vv', word: 'violin', sound: 'violin' },
  { id: 65, day: 7, letter: 'Vv', word: 'vase', sound: 'vase' },
  { id: 66, day: 7, letter: 'Vv', word: 'vest', sound: 'vest' },

  // Day 8 (Lesson 13 Ww~Zz)
  { id: 67, day: 8, letter: 'Ww', word: 'wolf', sound: 'wolf' },
  { id: 68, day: 8, letter: 'Ww', word: 'watch', sound: 'watch' },
  { id: 69, day: 8, letter: 'Ww', word: 'window', sound: 'window' },
  { id: 70, day: 8, letter: 'Xx', word: 'fox', sound: 'fox' },
  { id: 71, day: 8, letter: 'Xx', word: 'box', sound: 'box' },
  { id: 72, day: 8, letter: 'Xx', word: 'six', sound: 'six' },
  { id: 73, day: 8, letter: 'Yy', word: 'yo-yo', sound: 'yo-yo' },
  { id: 74, day: 8, letter: 'Yy', word: 'yellow', sound: 'yellow' }, 
  { id: 75, day: 8, letter: 'Yy', word: 'yogurt', sound: 'yogurt' },
  { id: 76, day: 8, letter: 'Zz', word: 'zebra', sound: 'zebra' },
  { id: 77, day: 8, letter: 'Zz', word: 'zero', sound: 'zero' },
  { id: 78, day: 8, letter: 'Zz', word: 'zipper', sound: 'zipper' }
];

// 💡 2단계: 앱 전체에서 쓰일 PHONICS_DB를 만들 때, 컴퓨터가 수파베이스 주소를 자동으로 합성해서 'icon' 칸에 채워 넣습니다!
export const PHONICS_DB: PhonicsWord[] = RAW_PHONICS_DB.map(item => {
  // 예: ant -> ant-removebg-preview.png
  const fileName = `${item.word}-removebg-preview.png`;
  
  // 수파베이스 기능을 통해 해당 파일의 웹페이지 주소(URL)를 1초 만에 가져옵니다.
  const imageUrl = supabase.storage.from('phonics').getPublicUrl(fileName).data.publicUrl;
  
  return {
    ...item,
    icon: imageUrl // 이제 앱 어디서든 word.icon을 부르면 귀여운 이모지 대신 '수파베이스 그림 주소'가 나옵니다!
  };
});
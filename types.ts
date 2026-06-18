// 1. 학생 DB 규격 (구글 시트2 기반)
export interface Student {
    id: string;          // ID (아이디) - 예: uthinks001
    name: string;        // Name (이름) - 예: 김철수
    currentBook: string; // CurrentBook (현재 교재) - 예: 240_1
    progress: string;    // Progress (현재 진도) - 예: Unit1 Day1
    grade: string;       // Grade (학년) - 예: 초1
  }
  
  // 2. 고래교재 단어 DB 규격 (구글 시트1 기반)
  export interface WordData {
    book: string;        // Book (교재명) - 예: 240_1
    lesson: string;      // Lesson (단원) - 예: Unit1
    day: string;         // Day (일차) - 예: day1
    english: string;     // English (영어단어) - 예: backpack
    korean: string;      // Korean (한글뜻) - 예: 배낭, 책가방
  }
  
  // 3. 당일 테스트 결과 기록 규격 (향후 Chat.tsx 및 학부모 리포트 연동용)
  export interface DailyResult {
    studentId: string;
    passedWords: string[];    // 오늘 통과한 단어 리스트
    failedWords: string[];    // 오늘 틀린 오답 리스트
    sentenceScore: number;    // 문장 배열 점수
    aiChatSummary: string;    // AI 대화 한 줄 요약
    grammarPoint: number;     // 스피드 문법 획득 포인트
    date: string;             // 시험 본 날짜
  }
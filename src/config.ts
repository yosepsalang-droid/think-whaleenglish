// src/config.ts

export const CONFIG = {
    /**
     * 1. 구글 앱스 스크립트 웹앱 주소 (데이터 저장 및 수정용 - POST)
     * 학생들이 시험을 끝내고 점수를 저장하거나 원장님이 진도를 수정할 때 사용합니다.
     * 앱스 스크립트에서 '새 배포'를 할 때마다 바뀌는 /exec 주소를 여기에 덮어쓰시면 됩니다.
     */
    WEB_APP_URL: "https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec",
  
    /**
     * 2. 구글 시트 CSV 다운로드 주소 목록 (데이터 불러오기용 - GET)
     * 리액트 앱이 실행될 때 시트에서 실시간으로 명단이나 문제 리스트를 읽어오는 용도입니다.
     */
    SHEETS: {
      // [교재 및 문제 데이터]
      ELEM_WORD: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=0&single=true&output=csv",          // 시트1: 고래영어교재 단어 리스트
      ELEM_SENTENCE: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=752237439&single=true&output=csv",  // 시트3: 고래 교재 문장배열 리스트
      MID_WORD: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=8529494&single=true&output=csv",       // 시트4: 중등 단어 리스트
      MID_SENTENCE: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=2069604392&single=true&output=csv", // 시트6: 중등 문장배열 리스트
  
      // [학생 명단 및 관리/기록 데이터]
      STUDENT_LIST: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv", // 시트2: 학생 리스트
      GRAMMAR_LOG: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1601616668&single=true&output=csv",  // 시트5: 스피드문법 기록
      ELEM_MANAGE: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1281735273&single=true&output=csv",  // 초등부관리: 단어 스펠링 쓰기 기록 예정
      MID_MANAGE: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=36839762&single=true&output=csv",    // 중등부관리: 오늘 접속/학습 확인 예정
    },
  
    /**
     * 3. 제미나이 AI 설정 (추후 연동용)
     * 구글 AI 스튜디오에서 발급받으실 API 키를 아래 공란에 적어주시면 됩니다.
     */
    GEMINI: {
      API_KEY: "여기에_발급받으신_제미나이_키를_넣으세요", 
      MODEL: "gemini-1.5-flash",
    }
  };
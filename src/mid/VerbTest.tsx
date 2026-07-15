import React, { useState, useEffect, useMemo, useRef } from 'react';

// 💡 Day 1부터 Day 40까지 총 200개의 불규칙 동사 데이터가 완벽히 내장되어 있습니다.
const VERB_DATA = [
  { day: 1, kor: '시작하다', base: 'begin', past: 'began', pp: 'begun' },
  { day: 1, kor: '마시다', base: 'drink', past: 'drank', pp: 'drunk' },
  { day: 1, kor: '노래하다', base: 'sing', past: 'sang', pp: 'sung' },
  { day: 1, kor: '가라앉다', base: 'sink', past: 'sank', pp: 'sunk' },
  { day: 1, kor: '수영하다', base: 'swim', past: 'swam', pp: 'swum' },
  
  { day: 2, kor: '(종/전화가) 울리다', base: 'ring', past: 'rang', pp: 'rung' },
  { day: 2, kor: '깨다, 부수다', base: 'break', past: 'broke', pp: 'broken' },
  { day: 2, kor: '선택하다', base: 'choose', past: 'chose', pp: 'chosen' },
  { day: 2, kor: '말하다', base: 'speak', past: 'spoke', pp: 'spoken' },
  { day: 2, kor: '훔치다', base: 'steal', past: 'stole', pp: 'stolen' },
  
  { day: 3, kor: '깨다, 깨우다', base: 'wake', past: 'woke', pp: 'woken' },
  { day: 3, kor: '얼다, 얼리다', base: 'freeze', past: 'froze', pp: 'frozen' },
  { day: 3, kor: '운전하다', base: 'drive', past: 'drove', pp: 'driven' },
  { day: 3, kor: '(탈것을) 타다', base: 'ride', past: 'rode', pp: 'ridden' },
  { day: 3, kor: '쓰다', base: 'write', past: 'wrote', pp: 'written' },
  
  { day: 4, kor: '오르다, 일어나다', base: 'rise', past: 'rose', pp: 'risen' },
  { day: 4, kor: '(바람이) 불다', base: 'blow', past: 'blew', pp: 'blown' },
  { day: 4, kor: '날다', base: 'fly', past: 'flew', pp: 'flown' },
  { day: 4, kor: '자라다, 재배하다', base: 'grow', past: 'grew', pp: 'grown' },
  { day: 4, kor: '알다', base: 'know', past: 'knew', pp: 'known' },

  { day: 5, kor: '던지다', base: 'throw', past: 'threw', pp: 'thrown' },
  { day: 5, kor: '그리다, 끌다', base: 'draw', past: 'drew', pp: 'drawn' },
  { day: 5, kor: '물다', base: 'bite', past: 'bit', pp: 'bitten' },
  { day: 5, kor: '숨다, 숨기다', base: 'hide', past: 'hid', pp: 'hidden' },
  { day: 5, kor: '먹다', base: 'eat', past: 'ate', pp: 'eaten' },

  { day: 6, kor: '떨어지다', base: 'fall', past: 'fell', pp: 'fallen' },
  { day: 6, kor: '주다', base: 'give', past: 'gave', pp: 'given' },
  { day: 6, kor: '보다', base: 'see', past: 'saw', pp: 'seen' },
  { day: 6, kor: '잡다, 데려가다', base: 'take', past: 'took', pp: 'taken' },
  { day: 6, kor: '~이다, 있다', base: 'be', past: 'was', pp: 'been' },

  { day: 7, kor: '하다', base: 'do', past: 'did', pp: 'done' },
  { day: 7, kor: '가다', base: 'go', past: 'went', pp: 'gone' },
  { day: 7, kor: '보여주다', base: 'show', past: 'showed', pp: 'shown' },
  { day: 7, kor: '입다', base: 'wear', past: 'wore', pp: 'worn' },
  { day: 7, kor: '찢다', base: 'tear', past: 'tore', pp: 'torn' },

  { day: 8, kor: '잊다', base: 'forget', past: 'forgot', pp: 'forgotten' },
  { day: 8, kor: '흔들다', base: 'shake', past: 'shook', pp: 'shaken' },
  { day: 8, kor: '용서하다', base: 'forgive', past: 'forgave', pp: 'forgiven' },
  { day: 8, kor: '가져오다', base: 'bring', past: 'brought', pp: 'brought' },
  { day: 8, kor: '사다', base: 'buy', past: 'bought', pp: 'bought' },

  { day: 9, kor: '싸우다', base: 'fight', past: 'fought', pp: 'fought' },
  { day: 9, kor: '생각하다', base: 'think', past: 'thought', pp: 'thought' },
  { day: 9, kor: '찾다, 구하다', base: 'seek', past: 'sought', pp: 'sought' },
  { day: 9, kor: '잡다', base: 'catch', past: 'caught', pp: 'caught' },
  { day: 9, kor: '가르치다', base: 'teach', past: 'taught', pp: 'taught' },

  { day: 10, kor: '구부리다', base: 'bend', past: 'bent', pp: 'bent' },
  { day: 10, kor: '세우다, 짓다', base: 'build', past: 'built', pp: 'built' },
  { day: 10, kor: '빌려주다', base: 'lend', past: 'lent', pp: 'lent' },
  { day: 10, kor: '보내다', base: 'send', past: 'sent', pp: 'sent' },
  { day: 10, kor: '(시간/돈을) 쓰다', base: 'spend', past: 'spent', pp: 'spent' },

  { day: 11, kor: '잃다', base: 'lose', past: 'lost', pp: 'lost' },
  { day: 11, kor: '유지하다, 보관하다', base: 'keep', past: 'kept', pp: 'kept' },
  { day: 11, kor: '자다', base: 'sleep', past: 'slept', pp: 'slept' },
  { day: 11, kor: '쓸다, 청소하다', base: 'sweep', past: 'swept', pp: 'swept' },
  { day: 11, kor: '눈물을 흘리다, 울다', base: 'weep', past: 'wept', pp: 'wept' },

  { day: 12, kor: '떠나다, 남겨두다', base: 'leave', past: 'left', pp: 'left' },
  { day: 12, kor: '느끼다', base: 'feel', past: 'felt', pp: 'felt' },
  { day: 12, kor: '의미하다', base: 'mean', past: 'meant', pp: 'meant' },
  { day: 12, kor: '꿈꾸다', base: 'dream', past: 'dreamt', pp: 'dreamt' },
  { day: 12, kor: '타다, 태우다', base: 'burn', past: 'burnt', pp: 'burnt' },

  { day: 13, kor: '만나다', base: 'meet', past: 'met', pp: 'met' },
  { day: 13, kor: '이끌다', base: 'lead', past: 'led', pp: 'led' },
  { day: 13, kor: '먹이를 주다', base: 'feed', past: 'fed', pp: 'fed' },
  { day: 13, kor: '피를 흘리다', base: 'bleed', past: 'bled', pp: 'bled' },
  { day: 13, kor: '속도를 내다', base: 'speed', past: 'sped', pp: 'sped' },

  { day: 14, kor: '말하다', base: 'say', past: 'said', pp: 'said' },
  { day: 14, kor: '지불하다', base: 'pay', past: 'paid', pp: 'paid' },
  { day: 14, kor: '놓다, 알을 낳다', base: 'lay', past: 'laid', pp: 'laid' },
  { day: 14, kor: '파다', base: 'dig', past: 'dug', pp: 'dug' },
  { day: 14, kor: '걸다, 매달다', base: 'hang', past: 'hung', pp: 'hung' },

  { day: 15, kor: '붙이다, 찌르다', base: 'stick', past: 'stuck', pp: 'stuck' },
  { day: 15, kor: '치다, 때리다', base: 'strike', past: 'struck', pp: 'struck' },
  { day: 15, kor: '돌리다, 회전하다', base: 'spin', past: 'spun', pp: 'spun' },
  { day: 15, kor: '이기기, 얻다', base: 'win', past: 'won', pp: 'won' },
  { day: 15, kor: '빛나다', base: 'shine', past: 'shone', pp: 'shone' },

  { day: 16, kor: '쏘다', base: 'shoot', past: 'shot', pp: 'shot' },
  { day: 16, kor: '얻다, 되다', base: 'get', past: 'got', pp: 'got' },
  { day: 16, kor: '불을 켜다, 밝히다', base: 'light', past: 'lit', pp: 'lit' },
  { day: 16, kor: '앉다', base: 'sit', past: 'sat', pp: 'sat' },
  { day: 16, kor: '침을 뱉다', base: 'spit', past: 'spat', pp: 'spat' },

  { day: 17, kor: '찾다, 발견하다', base: 'find', past: 'found', pp: 'found' },
  { day: 17, kor: '묶다, 맹세하다', base: 'bind', past: 'bound', pp: 'bound' },
  { day: 17, kor: '감다, 돌리다', base: 'wind', past: 'wound', pp: 'wound' },
  { day: 17, kor: '팔다', base: 'sell', past: 'sold', pp: 'sold' },
  { day: 17, kor: '말하다, 이야기하다', base: 'tell', past: 'told', pp: 'told' },

  { day: 18, kor: '서다', base: 'stand', past: 'stood', pp: 'stood' },
  { day: 18, kor: '이해하다', base: 'understand', past: 'understood', pp: 'understood' },
  { day: 18, kor: '가지다, 먹다', base: 'have', past: 'had', pp: 'had' },
  { day: 18, kor: '만들다', base: 'make', past: 'made', pp: 'made' },
  { day: 18, kor: '자르다', base: 'cut', past: 'cut', pp: 'cut' },

  { day: 19, kor: '치다, 때리다', base: 'hit', past: 'hit', pp: 'hit' },
  { day: 19, kor: '다치게 하다', base: 'hurt', past: 'hurt', pp: 'hurt' },
  { day: 19, kor: '놓다, 두다', base: 'put', past: 'put', pp: 'put' },
  { day: 19, kor: '닫다', base: 'shut', past: 'shut', pp: 'shut' },
  { day: 19, kor: '(비용이) 들다', base: 'cost', past: 'cost', pp: 'cost' },

  { day: 20, kor: '시키다, 허락하다', base: 'let', past: 'let', pp: 'let' },
  { day: 20, kor: '퍼뜨리다, 퍼지다', base: 'spread', past: 'spread', pp: 'spread' },
  { day: 20, kor: '읽다', base: 'read', past: 'read', pp: 'read' },
  { day: 20, kor: '오다', base: 'come', past: 'came', pp: 'come' },
  { day: 20, kor: '~이 되다', base: 'become', past: 'became', pp: 'become' },

  { day: 21, kor: '달리다', base: 'run', past: 'ran', pp: 'run' },
  { day: 21, kor: '잡다, 유지하다', base: 'hold', past: 'held', pp: 'held' },
  { day: 21, kor: '듣다', base: 'hear', past: 'heard', pp: 'heard' },
  { day: 21, kor: '다루다, 거래하다', base: 'deal', past: 'dealt', pp: 'dealt' },
  { day: 21, kor: '흔들다', base: 'swing', past: 'swung', pp: 'swung' },

  { day: 22, kor: '미끄러지다', base: 'slide', past: 'slid', pp: 'slid' },
  { day: 22, kor: '찌르다, 쏘다', base: 'sting', past: 'stung', pp: 'stung' },
  { day: 22, kor: '기어가다', base: 'creep', past: 'crept', pp: 'crept' },
  { day: 22, kor: '달아나다, 도망치다', base: 'flee', past: 'fled', pp: 'fled' },
  { day: 22, kor: '갈다, 빻다', base: 'grind', past: 'ground', pp: 'ground' },

  { day: 23, kor: '참다, (아이를) 낳다', base: 'bear', past: 'bore', pp: 'borne' },
  { day: 23, kor: '치다, 이기다', base: 'beat', past: 'beat', pp: 'beaten' },
  { day: 23, kor: '금지하다', base: 'forbid', past: 'forbade', pp: 'forbidden' },
  { day: 23, kor: '맹세하다', base: 'swear', past: 'swore', pp: 'sworn' },
  { day: 23, kor: '깨우다, 깨다', base: 'awake', past: 'awoke', pp: 'awoken' },

  { day: 24, kor: '눕다', base: 'lie', past: 'lay', pp: 'lain' },
  { day: 24, kor: '(옷감을) 짜다, 엮다', base: 'weave', past: 'wove', pp: 'woven' },
  { day: 24, kor: '밟다, 걷다', base: 'tread', past: 'trod', pp: 'trodden' },
  { day: 24, kor: '줄어들다', base: 'shrink', past: 'shrank', pp: 'shunk' },
  { day: 24, kor: '튀어오르다', base: 'spring', past: 'sprang', pp: 'sprung' },

  { day: 25, kor: '놓다, 설정하다', base: 'set', past: 'set', pp: 'set' },
  { day: 25, kor: '(돈을) 걸다, 내기하다', base: 'bet', past: 'bet', pp: 'bet' },
  { day: 25, kor: '터지다', base: 'burst', past: 'burst', pp: 'burst' },
  { day: 25, kor: '던지다', base: 'cast', past: 'cast', pp: 'cast' },
  { day: 25, kor: '쪼개다, 나누다', base: 'split', past: 'split', pp: 'split' },

  { day: 26, kor: '속상하게 하다', base: 'upset', past: 'upset', pp: 'upset' },
  { day: 26, kor: '그만두다', base: 'quit', past: 'quit', pp: 'quit' },
  { day: 26, kor: '(크기가) 맞다', base: 'fit', past: 'fit', pp: 'fit' },
  { day: 26, kor: '밀치다, 찌르다', base: 'thrust', past: 'thrust', pp: 'thrust' },
  { day: 26, kor: '(눈물 등을) 흘리다, 벗다', base: 'shed', past: 'shed', pp: 'shed' },

  { day: 27, kor: '무릎을 꿇다', base: 'kneel', past: 'knelt', pp: 'knelt' },
  { day: 27, kor: '뛰다, 도약하다', base: 'leap', past: 'leapt', pp: 'leapt' },
  { day: 27, kor: '배우다', base: 'learn', past: 'learnt', pp: 'learnt' },
  { day: 27, kor: '냄새를 맡다', base: 'smell', past: 'smelt', pp: 'smelt' },
  { day: 27, kor: '철자를 대다', base: 'spell', past: 'spelt', pp: 'spelt' },

  { day: 28, kor: '망치다', base: 'spoil', past: 'spoilt', pp: 'spoilt' },
  { day: 28, kor: '쏟다, 흘리다', base: 'spill', past: 'spilt', pp: 'spilt' },
  { day: 28, kor: '번식하다, 기르다', base: 'breed', past: 'bred', pp: 'bred' },
  { day: 28, kor: '줄을 매다', base: 'string', past: 'strung', pp: 'strung' },
  { day: 28, kor: '악취가 나다', base: 'stink', past: 'stank', pp: 'stunk' },

  { day: 29, kor: '매달리다, 집착하다', base: 'cling', past: 'clung', pp: 'clung' },
  { day: 29, kor: '내던지다', base: 'fling', past: 'flung', pp: 'flung' },
  { day: 29, kor: '극복하다', base: 'overcome', past: 'overcame', pp: 'overcome' },
  { day: 29, kor: '오해하다', base: 'misunderstand', past: 'misunderstood', pp: 'misunderstood' },
  { day: 29, kor: '방송하다', base: 'broadcast', past: 'broadcast', pp: 'broadcast' },

  { day: 30, kor: '발생하다, 일어나다', base: 'arise', past: 'arose', pp: 'arisen' },
  { day: 30, kor: '저버리다, 버리다', base: 'forsake', past: 'forsook', pp: 'forsaken' },
  { day: 30, kor: '능가하다, ~보다 잘하다', base: 'outdo', past: 'outdid', pp: 'outdone' },
  { day: 30, kor: '겪다, 받다', base: 'undergo', past: 'underwent', pp: 'undergone' },
  { day: 30, kor: '철회하다, (돈을) 인출하다', base: 'withdraw', past: 'withdrew', pp: 'withdrawn' },

  { day: 31, kor: '구부리다', base: 'bend', past: 'bent', pp: 'bent' },
  { day: 31, kor: '빌려주다', base: 'lend', past: 'lent', pp: 'lent' },
  { day: 31, kor: '보내다', base: 'send', past: 'sent', pp: 'sent' },
  { day: 31, kor: '쓰다, 보내다', base: 'spend', past: 'spent', pp: 'spent' },
  { day: 31, kor: '짓다, 세우다', base: 'build', past: 'built', pp: 'built' },

  { day: 32, kor: '숨다, 숨기다', base: 'hide', past: 'hid', pp: 'hidden' },
  { day: 32, kor: '물다', base: 'bite', past: 'bit', pp: 'bitten' },
  { day: 32, kor: '얼다, 얼리다', base: 'freeze', past: 'froze', pp: 'frozen' },
  { day: 32, kor: '훔치다', base: 'steal', past: 'stole', pp: 'stolen' },
  { day: 32, kor: '선택하다', base: 'choose', past: 'chose', pp: 'chosen' },

  { day: 33, kor: '용서하다', base: 'forgive', past: 'forgave', pp: 'forgiven' },
  { day: 33, kor: '실수하다, 오해하다', base: 'mistake', past: 'mistook', pp: 'mistaken' },
  { day: 33, kor: '견뎌내다, 저항하다', base: 'withstand', past: 'withstood', pp: 'withstood' },
  { day: 33, kor: '보류하다, 주지 않다', base: 'withhold', past: 'withheld', pp: 'withheld' },
  { day: 33, kor: '원상태로 돌리다, 풀다', base: 'undo', past: 'undid', pp: 'undone' },

  { day: 34, kor: '찾다, 추구하다', base: 'seek', past: 'sought', pp: 'sought' },
  { day: 34, kor: '찢다', base: 'tear', past: 'tore', pp: 'torn' },
  { day: 34, kor: '입다, 쓰고 있다', base: 'wear', past: 'wore', pp: 'worn' },
  { day: 34, kor: '성큼성큼 걷다', base: 'stride', past: 'strode', pp: 'stridden' },
  { day: 34, kor: '노력하다, 애쓰다', base: 'strive', past: 'strove', pp: 'striven' },

  { day: 35, kor: '가라앉다', base: 'sink', past: 'sank', pp: 'sunk' },
  { day: 35, kor: '짜다, 비틀다', base: 'wring', past: 'wrung', pp: 'wrung' },
  { day: 35, kor: '베어가르다, 쪼개다', base: 'slit', past: 'slit', pp: 'slit' },
  { day: 35, kor: '땀을 흘리다', base: 'sweat', past: 'sweat', pp: 'sweat' },
  { day: 35, kor: '적시다', base: 'wet', past: 'wet', pp: 'wet' },

  { day: 36, kor: '잊다', base: 'forget', past: 'forgot', pp: 'forgotten' },
  { day: 36, kor: '흔들다', base: 'shake', past: 'shook', pp: 'shaken' },
  { day: 36, kor: '깨우다, 깨다', base: 'wake', past: 'woke', pp: 'woken' },
  { day: 36, kor: '오르다, 일어나다', base: 'rise', past: 'rose', pp: 'risen' },
  { day: 36, kor: '떨어지다, 넘어지다', base: 'fall', past: 'fell', pp: 'fallen' },

  { day: 37, kor: '맡다, 착수하다', base: 'undertake', past: 'undertook', pp: 'undertaken' },
  { day: 37, kor: '과식하다', base: 'overeat', past: 'overate', pp: 'overeaten' },
  { day: 37, kor: '엿듣다', base: 'overhear', past: 'overheard', pp: 'overheard' },
  { day: 37, kor: '따라잡다', base: 'overtake', past: 'overtook', pp: 'overtaken' },
  { day: 37, kor: '타도하다, 전복시키다', base: 'overthrow', past: 'overthrew', pp: 'overthrown' },

  { day: 38, kor: '둔 곳을 잊다', base: 'mislay', past: 'mislaid', pp: 'mislaid' },
  { day: 38, kor: '잘못 이끌다, 오도하다', base: 'mislead', past: 'misled', pp: 'misled' },
  { day: 38, kor: '철자를 틀리다', base: 'misspell', past: 'misspelt', pp: 'misspelt' },
  { day: 38, kor: '자라서 못 입게 되다', base: 'outgrow', past: 'outgrew', pp: 'outgrown' },
  { day: 38, kor: '다시 하다', base: 'redo', past: 'redid', pp: 'redone' },

  { day: 39, kor: '죽이다, 살해하다', base: 'slay', past: 'slew', pp: 'slain' },
  { day: 39, kor: '부풀다, 붓다', base: 'swell', past: 'swelled', pp: 'swollen' },
  { day: 39, kor: '증명하다', base: 'prove', past: 'proved', pp: 'proven' },
  { day: 39, kor: '바느질하다', base: 'sew', past: 'sewed', pp: 'sewn' },
  { day: 39, kor: '씨를 뿌리다', base: 'sow', past: 'sowed', pp: 'sown' },

  { day: 40, kor: '예언하다', base: 'foretell', past: 'foretold', pp: 'foretold' },
  { day: 40, kor: '부정하다, 반대하다', base: 'gainsay', past: 'gainsaid', pp: 'gainsaid' },
  { day: 40, kor: '기대다', base: 'lean', past: 'leant', pp: 'leant' },
  { day: 40, kor: '털을 깎다', base: 'shear', past: 'sheared', pp: 'shorn' },
  { day: 40, kor: '톱질하다', base: 'saw', past: 'sawed', pp: 'sawn' },
];

interface VerbProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

export default function VerbTest({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: VerbProps) {
  const [step, setStep] = useState<'SELECT' | 'PRACTICE' | 'TEST' | 'RESULT'>('SELECT');
  
  const [startDay, setStartDay] = useState<number | ''>('');
  const [endDay, setEndDay] = useState<number | ''>('');
  
  const [targetWords, setTargetWords] = useState<typeof VERB_DATA>([]);
  const [currentWordList, setCurrentWordList] = useState<typeof VERB_DATA>([]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const [inputs, setInputs] = useState({ base: '', past: '', pp: '' });
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);

  const baseRef = useRef<HTMLInputElement>(null);
  const pastRef = useRef<HTMLInputElement>(null);
  const ppRef = useRef<HTMLInputElement>(null);

  const currentWord = currentWordList[currentIndex];
  const days = useMemo(() => Array.from(new Set(VERB_DATA.map(v => v.day))).sort((a, b) => a - b), []);

  const shuffleArray = (array: typeof VERB_DATA) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleGoToPractice = () => {
    if (startDay === '' || endDay === '') return alert("시작 Day와 끝 Day를 모두 선택해주세요.");
    if (Number(startDay) > Number(endDay)) return alert("끝 Day가 시작 Day보다 커야 합니다.");
    
    const filtered = VERB_DATA.filter(v => v.day >= Number(startDay) && v.day <= Number(endDay));
    setTargetWords(filtered);
    setStep('PRACTICE');
  };

  const handleStartTest = () => {
    setCurrentWordList(shuffleArray(targetWords));
    setCurrentIndex(0);
    setScore(0);
    resetInputs();
    setStep('TEST');
  };

  const resetInputs = () => {
    setInputs({ base: '', past: '', pp: '' });
    setFeedback(null);
    setAttempts(0);
    setTimeout(() => {
      if (baseRef.current) baseRef.current.focus();
    }, 50);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakCurrentVerbs = () => {
    if (currentWord) speakText(`${currentWord.base}. ${currentWord.past}. ${currentWord.pp}.`);
  };

  useEffect(() => {
    if (step === 'TEST' && currentWord) speakCurrentVerbs();
  }, [currentIndex, currentWord, step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value.toLowerCase().replace(/[^a-z]/g, '') }));
  };

  // 💡 TS2345 에러 해결: nextRef의 타입을 HTMLInputElement | null 허용으로 유연하게 매칭
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null> | null) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) nextRef.current.focus();
      else handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord) return;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const isBaseCorrect = inputs.base === currentWord.base;
    const isPastCorrect = inputs.past === currentWord.past;
    const isPpCorrect = inputs.pp === currentWord.pp;

    if (isBaseCorrect && isPastCorrect && isPpCorrect) {
      setFeedback({ isCorrect: true, msg: "정답입니다! 👏" });
      setScore(prev => prev + 1);
      setTimeout(() => moveToNext(), 1500);
    } else {
      if (newAttempts >= 3) {
        setInputs({ base: currentWord.base, past: currentWord.past, pp: currentWord.pp });
        setFeedback({ isCorrect: false, msg: `3회 오답으로 정답을 확인합니다. 다음 문제로 넘어갑니다.` });
        setTimeout(() => moveToNext(), 2500);
      } else {
        let wrongParts = [];
        if (!isBaseCorrect) wrongParts.push("원형");
        if (!isPastCorrect) wrongParts.push("과거형");
        if (!isPpCorrect) wrongParts.push("과거분사");
        setFeedback({ isCorrect: false, msg: `${wrongParts.join(", ")} 스펠링이 틀렸어요. (${newAttempts}/3)` });
      }
    }
  };

  const moveToNext = () => {
    if (currentIndex + 1 < currentWordList.length) {
      setCurrentIndex(prev => prev + 1);
      resetInputs();
    } else {
      setStep('RESULT');
    }
  };

  return (
    <div translate="no" className="notranslate" style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 홈으로</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>동사 3단 변화 학습 ({studentName})</span>
      </div>

      {step === 'SELECT' && (
        <div style={{ padding: '30px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '24px' }}>학습할 범위를 선택하세요</h2>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
            {/* 💡 TS2345 에러 해결: e.target.value 문자열을 조건부 삼항 연산자와 Number()를 통해 number | "" 타입으로 매칭 */}
            <select value={startDay} onChange={(e) => setStartDay(e.target.value === '' ? '' : Number(e.target.value))} style={selectStyle}>
              <option value="">시작 Day</option>
              {days.map(d => <option key={`start-${d}`} value={d}>Day {d}</option>)}
            </select>
            <span style={{ fontWeight: 'bold' }}>~</span>
            <select value={endDay} onChange={(e) => setEndDay(e.target.value === '' ? '' : Number(e.target.value))} style={selectStyle}>
              <option value="">끝 Day</option>
              {days.map(d => <option key={`end-${d}`} value={d}>Day {d}</option>)}
            </select>
          </div>
          <button onClick={handleGoToPractice} style={primaryButtonStyle}>연습하기</button>
        </div>
      )}

      {step === 'PRACTICE' && (
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #eee' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>미리 읽어보기 연습</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>총 {targetWords.length}개의 동사가 선택되었습니다. 발음을 듣고 눈으로 익혀보세요!</p>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px', paddingRight: '10px' }}>
            {targetWords.map((word, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #eee' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>Day {word.day} - {word.kor}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{word.base} - {word.past} - {word.pp}</div>
                </div>
                <button 
                  onClick={() => speakText(`${word.base}. ${word.past}. ${word.pp}.`)}
                  style={{ padding: '8px 12px', backgroundColor: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  🔊 듣기
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleStartTest} style={primaryButtonStyle}>테스트 시작하기 (랜덤 출제)</button>
        </div>
      )}

      {step === 'TEST' && (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '10px' }}>
            <span>단어 {currentIndex + 1} / {currentWordList.length}</span>
            <span style={{ fontSize: '12px', backgroundColor: '#f1f3f5', padding: '4px 8px', borderRadius: '12px' }}>Day {startDay} ~ {endDay}</span>
          </div>
          
          <div style={{ textAlign: 'center', margin: '20px 0 30px 0' }}>
            <h2 onDragStart={(e) => e.preventDefault()} style={{ fontSize: '32px', color: '#111', fontWeight: '800', margin: '0 0 10px 0', userSelect: 'none' }}>
              {currentWord?.kor}
            </h2>
            <button type="button" onClick={speakCurrentVerbs} style={{ padding: '8px 16px', backgroundColor: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              🔊 발음 듣기
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input ref={baseRef} name="base" placeholder="원형" value={inputs.base} onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, pastRef)} autoComplete="off" spellCheck="false" style={inputStyle} />
              <input ref={pastRef} name="past" placeholder="과거형" value={inputs.past} onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, ppRef)} autoComplete="off" spellCheck="false" style={inputStyle} />
              <input ref={ppRef} name="pp" placeholder="과거분사" value={inputs.pp} onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, null)} autoComplete="off" spellCheck="false" style={inputStyle} />
            </div>
            
            <button type="submit" disabled={!inputs.base || !inputs.past || !inputs.pp} style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', color: 'white', backgroundColor: (!inputs.base || !inputs.past || !inputs.pp) ? '#ccc' : '#007aff', border: 'none', borderRadius: '12px', cursor: (!inputs.base || !inputs.past || !inputs.pp) ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
              정답 확인
            </button>
          </form>

          {feedback && (
            <div style={{ marginTop: '15px', padding: '15px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: feedback.isCorrect ? '#d4edda' : '#f8d7da', color: feedback.isCorrect ? '#155724' : '#721c24' }}>
              {feedback.msg}
            </div>
          )}
        </div>
      )}

      {step === 'RESULT' && (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px' }}>
          <h2>테스트 완료! 🎉</h2>
          <p>총 {currentWordList.length}개 동사 중 <strong>{score}</strong>개 정답</p>
          <button onClick={() => setStep('SELECT')} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none', marginTop: '20px' }}>다른 범위 학습하기</button>
        </div>
      )}
    </div>
  );
}

const selectStyle = { flex: 1, padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' };
const inputStyle = { flex: 1, minWidth: 0, padding: '12px 8px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', border: '2px solid #ccc', textAlign: 'center' as const, outline: 'none' };
const primaryButtonStyle = { width: '100%', padding: '16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' };
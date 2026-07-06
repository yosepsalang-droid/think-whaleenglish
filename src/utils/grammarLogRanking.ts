import { CONFIG } from '../config';

export interface RankEntry {
  studentName: string;
  score: number;
}

export interface IntegratedRankingResult {
  totalScore: number;
  myRank: number | null;
  thisMonth: RankEntry[];
  lastMonth: RankEntry[];
}

const INTEGRATED_TASK_TYPES = ['문법게임', '단어게임'];

function parseCsvRow(row: string): string[] {
  return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const normalized = value.replace(/\./g, '-').replace(/\s+/g, ' ').trim();
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function resolveColumnIndices(headerCells: string[]) {
  const lower = headerCells.map((h) => h.toLowerCase());

  const findIdx = (candidates: string[], fallback: number) => {
    const idx = lower.findIndex((h) => candidates.some((c) => h.includes(c)));
    return idx === -1 ? fallback : idx;
  };

  return {
    dateIdx: findIdx(['date', '날짜', 'time', '일시', 'timestamp'], 0),
    nameIdx: findIdx(['studentname', 'name', '이름', '학생'], 1),
    scoreIdx: findIdx(['score', '점수'], 3),
    taskTypeIdx: findIdx(['tasktype', 'task', '종류', '학습'], 5),
  };
}

function sumScoresByStudent(
  rows: { studentName: string; score: number; monthKey: string }[],
  monthKey: string
): RankEntry[] {
  const totals = new Map<string, number>();

  rows
    .filter((row) => row.monthKey === monthKey)
    .forEach((row) => {
      totals.set(row.studentName, (totals.get(row.studentName) || 0) + row.score);
    });

  return Array.from(totals.entries())
    .map(([studentName, score]) => ({ studentName, score }))
    .sort((a, b) => b.score - a.score);
}

function findRank(rankings: RankEntry[], studentName: string): number | null {
  const trimmed = studentName.trim();
  const index = rankings.findIndex((r) => r.studentName === trimmed);
  return index === -1 ? null : index + 1;
}

export async function fetchIntegratedRankings(studentName: string): Promise<IntegratedRankingResult> {
  const empty: IntegratedRankingResult = {
    totalScore: 0,
    myRank: null,
    thisMonth: [],
    lastMonth: [],
  };

  try {
    const response = await fetch(CONFIG.SHEETS.GRAMMAR_LOG);
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) return empty;

    const headerCells = parseCsvRow(lines[0]);
    const { dateIdx, nameIdx, scoreIdx, taskTypeIdx } = resolveColumnIndices(headerCells);

    const now = new Date();
    const thisMonthKey = getMonthKey(now);
    const lastMonthKey = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const parsedRows: { studentName: string; score: number; monthKey: string }[] = [];

    for (const line of lines.slice(1)) {
      const cells = parseCsvRow(line);
      const student = cells[nameIdx]?.trim();
      const taskType = cells[taskTypeIdx]?.trim();
      const score = Number(cells[scoreIdx]);
      const date = parseDate(cells[dateIdx] || '');

      if (!student || !date || Number.isNaN(score)) continue;
      if (!INTEGRATED_TASK_TYPES.includes(taskType)) continue;

      parsedRows.push({
        studentName: student,
        score,
        monthKey: getMonthKey(date),
      });
    }

    const thisMonth = sumScoresByStudent(parsedRows, thisMonthKey);
    const lastMonth = sumScoresByStudent(parsedRows, lastMonthKey);
    const myRank = findRank(thisMonth, studentName);
    const totalScore = thisMonth.find((r) => r.studentName === studentName.trim())?.score ?? 0;

    return { totalScore, myRank, thisMonth, lastMonth };
  } catch (error) {
    console.error('GRAMMAR_LOG 랭킹 로드 실패:', error);
    return empty;
  }
}

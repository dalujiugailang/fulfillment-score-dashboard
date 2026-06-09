export type ProviderName = '海鲸' | '清洋' | '小智';

export interface ProviderScoreRow {
  provider: string;
  actualProvider?: ProviderName;
  isAnonymous?: boolean;
  isCurrentProvider?: boolean;
  displayRank?: number;
  companyName: string;
  submittedOrders: number;
  closedOrders: number;
  dealRate: number;
  bargainOrderCount: number;
  bargainSubmittedAmount: number;
  bargainClosedAmount: number;
  bargainRate: number;
  complaintRate: number;
  flyOrderCount: number;
  onTimeVisitOrders: number;
  visitTotalOrders: number;
  onTimeVisitRate: number;
  onTimePayoutOrders: number;
  payoutTotalOrders: number;
  onTimePayoutRate: number;
  dealRateScore: number;
  onTimeVisitRateScore: number;
  onTimePayoutRateScore: number;
  bargainRateScore: number;
  complaintRateScore: number;
  flyOrderScore: number;
  totalScore: number;
  sourcePeriod: string;
  hasScoreSource: boolean;
  hasComplaintSource: boolean;
}

export interface AllocationSummary {
  provider: ProviderName;
  provinceCount: number;
  provinces: string[];
}

export interface UploadHistoryEntry {
  id: string;
  uploadedAt: string;
  sourceType: 'score' | 'complaint';
  period: string;
  fileName: string;
  rowCount: number;
  matchedProviders: ProviderName[];
  status: 'success' | 'failed';
  message: string;
}

export interface EvaluationPeriod {
  id: string;
  name: string;
  range: string;
  start: string;
  end: string;
}

export const EVALUATION_CYCLE = {
  id: '2026-cycle-1',
  name: '2026考核周期一',
  start: '2026-05-10',
  end: '2026-07-31',
  scoringEnd: '2026-07-30'
};

export const WEEKLY_PERIODS: EvaluationPeriod[] = [
  { id: 'P01', name: '第1期', range: '2026.05.10 - 2026.05.16', start: '2026-05-10', end: '2026-05-16' },
  { id: 'P02', name: '第2期', range: '2026.05.17 - 2026.05.23', start: '2026-05-17', end: '2026-05-23' },
  { id: 'P03', name: '第3期', range: '2026.05.24 - 2026.05.30', start: '2026-05-24', end: '2026-05-30' },
  { id: 'P04', name: '第4期', range: '2026.05.31 - 2026.06.06', start: '2026-05-31', end: '2026-06-06' },
  { id: 'P05', name: '第5期', range: '2026.06.07 - 2026.06.13', start: '2026-06-07', end: '2026-06-13' },
  { id: 'P06', name: '第6期', range: '2026.06.14 - 2026.06.20', start: '2026-06-14', end: '2026-06-20' },
  { id: 'P07', name: '第7期', range: '2026.06.21 - 2026.06.27', start: '2026-06-21', end: '2026-06-27' },
  { id: 'P08', name: '第8期', range: '2026.06.28 - 2026.07.04', start: '2026-06-28', end: '2026-07-04' },
  { id: 'P09', name: '第9期', range: '2026.07.05 - 2026.07.11', start: '2026-07-05', end: '2026-07-11' },
  { id: 'P10', name: '第10期', range: '2026.07.12 - 2026.07.18', start: '2026-07-12', end: '2026-07-18' },
  { id: 'P11', name: '第11期', range: '2026.07.19 - 2026.07.25', start: '2026-07-19', end: '2026-07-25' },
  { id: 'P12', name: '第12期', range: '2026.07.26 - 2026.07.30', start: '2026-07-26', end: '2026-07-30' }
];

export const OVERVIEW_PERIOD: EvaluationPeriod = {
  id: 'ALL',
  name: '总览周期',
  range: `${EVALUATION_CYCLE.start} - ${EVALUATION_CYCLE.scoringEnd}`,
  start: EVALUATION_CYCLE.start,
  end: EVALUATION_CYCLE.scoringEnd
};

export const PERIOD_OPTIONS: EvaluationPeriod[] = [OVERVIEW_PERIOD, ...WEEKLY_PERIODS];

export const REPORT_META = {
  title: '大家电服务商履约评分看板',
  reportLabel: EVALUATION_CYCLE.name,
  dateRange: `${EVALUATION_CYCLE.start} 至 ${EVALUATION_CYCLE.end}`,
  sourceFile: '3p大家电履约数据--2026.05.10-2026.05.16.xlsx',
  complaintSourceFile: '3p客诉数据--2026.05.10-2026.05.16.xlsx',
  generatedAt: '2026/05/24',
  maxScore: 100,
  createScopeRows: 1561,
  scoringRule: '成交率10分 + 催上门时效30分 + 催放款时效20分 + 议价额率20分 + 客诉率20分，飞单每单扣10分'
};

export const PROVIDER_COMPANIES: Record<ProviderName, string> = {
  '海鲸': '青岛鲸智再生环保科技有限公司',
  '清洋': '北京清洋绿色循环科技有限公司',
  '小智': '熊洞智家(北京)科技有限公司'
};

export type ProviderRawRow = Omit<ProviderScoreRow, 'dealRateScore' | 'onTimeVisitRateScore' | 'onTimePayoutRateScore' | 'bargainRateScore' | 'complaintRateScore' | 'flyOrderScore' | 'totalScore'>;

export const PROVIDER_COLORS: Record<ProviderName, string> = {
  '海鲸': '#FE6E00',
  '清洋': '#423D38',
  '小智': '#FFB74D'
};

export const providerColor = (provider: string, fallback = '#94A3B8') => PROVIDER_COLORS[provider as ProviderName] || fallback;

export const normalizeProvider = (value: unknown): ProviderName | null => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.includes('清洋')) return '清洋';
  if (text.includes('海鲸') || text.includes('鲸智')) return '海鲸';
  if (text.includes('小智') || text.includes('熊洞智家')) return '小智';
  return null;
};

const floorScore = (value: number, max: number) => Math.max(0, Math.min(max, value));

export const scoreDealRate = (rate: number) => floorScore(10 - Math.max(0, 0.5 - rate) * 100 * 3, 10);
export const scoreVisitRate = (rate: number) => floorScore(30 - Math.max(0, 0.8 - rate) * 100 * 3, 30);
export const scorePayoutRate = (rate: number) => floorScore(20 - Math.max(0, 0.8 - rate) * 100 * 3, 20);
export const scoreBargainRate = (rate: number) => floorScore(20 - Math.max(0, rate - 0.1) * 100, 20);
export const scoreComplaintRate = (rate: number) => floorScore(20 - Math.max(0, rate - 0.005) * 1000 * 2, 20);
export const scoreFlyOrder = (count: number) => -count * 10;

export const recalculateRow = (row: ProviderRawRow): ProviderScoreRow => {
  const dealRate = row.submittedOrders > 0 ? row.closedOrders / row.submittedOrders : row.dealRate;
  const bargainRate = row.bargainSubmittedAmount > 0 ? 1 - row.bargainClosedAmount / row.bargainSubmittedAmount : row.bargainRate;
  const onTimeVisitRate = row.visitTotalOrders > 0 ? row.onTimeVisitOrders / row.visitTotalOrders : row.onTimeVisitRate;
  const onTimePayoutRate = row.payoutTotalOrders > 0 ? row.onTimePayoutOrders / row.payoutTotalOrders : row.onTimePayoutRate;
  const dealRateScore = scoreDealRate(dealRate);
  const onTimeVisitRateScore = scoreVisitRate(onTimeVisitRate);
  const onTimePayoutRateScore = scorePayoutRate(onTimePayoutRate);
  const bargainRateScore = scoreBargainRate(bargainRate);
  const complaintRateScore = scoreComplaintRate(row.complaintRate);
  const flyOrderScore = scoreFlyOrder(row.flyOrderCount);

  return {
    ...row,
    dealRate,
    bargainRate,
    onTimeVisitRate,
    onTimePayoutRate,
    dealRateScore,
    onTimeVisitRateScore,
    onTimePayoutRateScore,
    bargainRateScore,
    complaintRateScore,
    flyOrderScore,
    totalScore: dealRateScore + onTimeVisitRateScore + onTimePayoutRateScore + bargainRateScore + complaintRateScore + flyOrderScore
  };
};

export const createEmptyRows = (periodRange: string): ProviderScoreRow[] => {
  return (Object.keys(PROVIDER_COMPANIES) as ProviderName[]).map(provider => recalculateRow({
    provider,
    companyName: PROVIDER_COMPANIES[provider],
    submittedOrders: 0,
    closedOrders: 0,
    dealRate: 0,
    bargainOrderCount: 0,
    bargainSubmittedAmount: 0,
    bargainClosedAmount: 0,
    bargainRate: 0,
    complaintRate: 0,
    flyOrderCount: 0,
    onTimeVisitOrders: 0,
    visitTotalOrders: 0,
    onTimeVisitRate: 0,
    onTimePayoutOrders: 0,
    payoutTotalOrders: 0,
    onTimePayoutRate: 0,
    sourcePeriod: periodRange,
    hasScoreSource: false,
    hasComplaintSource: false
  }));
};

export const aggregatePeriodRows = (periodRowsById: Record<string, ProviderScoreRow[]>): ProviderScoreRow[] => {
  return (Object.keys(PROVIDER_COMPANIES) as ProviderName[]).map(provider => {
    const uploadedRows = WEEKLY_PERIODS
      .flatMap(period => periodRowsById[period.id] || [])
      .filter(row => row.provider === provider && (row.hasScoreSource || row.hasComplaintSource));

    const seed = createEmptyRows(OVERVIEW_PERIOD.range).find(row => row.provider === provider)!;
    if (uploadedRows.length === 0) return seed;

    const submittedOrders = uploadedRows.reduce((sum, row) => sum + row.submittedOrders, 0);
    const complaintWeight = uploadedRows.reduce((sum, row) => sum + (row.submittedOrders > 0 ? row.submittedOrders : 0), 0);
    const complaintRate = complaintWeight > 0
      ? uploadedRows.reduce((sum, row) => sum + row.complaintRate * Math.max(0, row.submittedOrders), 0) / complaintWeight
      : uploadedRows.reduce((sum, row) => sum + row.complaintRate, 0) / uploadedRows.length;

    return recalculateRow({
      ...seed,
      submittedOrders,
      closedOrders: uploadedRows.reduce((sum, row) => sum + row.closedOrders, 0),
      bargainOrderCount: uploadedRows.reduce((sum, row) => sum + row.bargainOrderCount, 0),
      bargainSubmittedAmount: uploadedRows.reduce((sum, row) => sum + row.bargainSubmittedAmount, 0),
      bargainClosedAmount: uploadedRows.reduce((sum, row) => sum + row.bargainClosedAmount, 0),
      complaintRate,
      flyOrderCount: uploadedRows.reduce((sum, row) => sum + row.flyOrderCount, 0),
      onTimeVisitOrders: uploadedRows.reduce((sum, row) => sum + row.onTimeVisitOrders, 0),
      visitTotalOrders: uploadedRows.reduce((sum, row) => sum + row.visitTotalOrders, 0),
      onTimePayoutOrders: uploadedRows.reduce((sum, row) => sum + row.onTimePayoutOrders, 0),
      payoutTotalOrders: uploadedRows.reduce((sum, row) => sum + row.payoutTotalOrders, 0),
      sourcePeriod: OVERVIEW_PERIOD.range,
      hasScoreSource: uploadedRows.some(row => row.hasScoreSource),
      hasComplaintSource: uploadedRows.some(row => row.hasComplaintSource)
    });
  });
};

export const pct = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;
export const num = (value: number) => value.toLocaleString('zh-CN');
export const money = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
export const points = (value: number) => value.toFixed(2);

export const metricStatus = (metric: 'dealRate' | 'bargainRate' | 'complaintRate' | 'flyOrderCount' | 'onTimeVisitRate' | 'onTimePayoutRate', row: ProviderScoreRow) => {
  if (metric === 'dealRate') return row.hasScoreSource && row.dealRate >= 0.5 ? '达标' : '未达标';
  if (metric === 'bargainRate') return row.hasScoreSource && row.bargainRate < 0.1 ? '达标' : '未达标';
  if (metric === 'complaintRate') return row.complaintRate < 0.005 ? '达标' : '未达标';
  if (metric === 'onTimeVisitRate') return row.onTimeVisitRate >= 0.8 ? '达标' : '未达标';
  if (metric === 'onTimePayoutRate') return row.onTimePayoutRate >= 0.8 ? '达标' : '未达标';
  return row.flyOrderCount === 0 ? '达标' : '未达标';
};

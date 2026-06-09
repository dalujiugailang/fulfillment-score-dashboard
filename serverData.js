export const providers = ['海鲸', '清洋', '小智'];

export const PROVIDER_COMPANIES = {
  '海鲸': '青岛鲸智再生环保科技有限公司',
  '清洋': '北京清洋绿色循环科技有限公司',
  '小智': '熊洞智家(北京)科技有限公司'
};

export const WEEKLY_PERIODS = [
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

const OVERVIEW_PERIOD = {
  id: 'ALL',
  name: '总览周期',
  range: '2026-05-10 - 2026-07-30',
  start: '2026-05-10',
  end: '2026-07-30'
};

const BASE_ROWS = [
  {
    provider: '海鲸',
    companyName: PROVIDER_COMPANIES['海鲸'],
    submittedOrders: 864,
    closedOrders: 456,
    dealRate: 0.5277777777777778,
    bargainOrderCount: 350,
    bargainSubmittedAmount: 36745,
    bargainClosedAmount: 35441,
    bargainRate: 0.03548782147230911,
    complaintRate: 0.0035,
    flyOrderCount: 0,
    onTimeVisitOrders: 14,
    visitTotalOrders: 22,
    onTimeVisitRate: 0.6364,
    onTimePayoutOrders: 1,
    payoutTotalOrders: 5,
    onTimePayoutRate: 0.2,
    sourcePeriod: '2026.05.10 - 2026.05.16',
    hasScoreSource: true,
    hasComplaintSource: true
  },
  {
    provider: '清洋',
    companyName: PROVIDER_COMPANIES['清洋'],
    submittedOrders: 555,
    closedOrders: 244,
    dealRate: 0.43963963963963965,
    bargainOrderCount: 185,
    bargainSubmittedAmount: 18505,
    bargainClosedAmount: 17700,
    bargainRate: 0.04350175628208597,
    complaintRate: 0.0018,
    flyOrderCount: 0,
    onTimeVisitOrders: 20,
    visitTotalOrders: 36,
    onTimeVisitRate: 0.5556,
    onTimePayoutOrders: 2,
    payoutTotalOrders: 6,
    onTimePayoutRate: 0.3333,
    sourcePeriod: '2026.05.10 - 2026.05.16',
    hasScoreSource: true,
    hasComplaintSource: true
  },
  {
    provider: '小智',
    companyName: PROVIDER_COMPANIES['小智'],
    submittedOrders: 142,
    closedOrders: 71,
    dealRate: 0.5,
    bargainOrderCount: 48,
    bargainSubmittedAmount: 4580,
    bargainClosedAmount: 4280,
    bargainRate: 0.06550218340611358,
    complaintRate: 0.007,
    flyOrderCount: 0,
    onTimeVisitOrders: 4,
    visitTotalOrders: 4,
    onTimeVisitRate: 1,
    onTimePayoutOrders: 1,
    payoutTotalOrders: 3,
    onTimePayoutRate: 0.3333,
    sourcePeriod: '2026.05.10 - 2026.05.16',
    hasScoreSource: true,
    hasComplaintSource: true
  }
];

export const allocationDefaults = [
  {
    provider: '海鲸',
    provinceCount: 16,
    provinces: ['安徽省', '北京市', '福建省', '甘肃省', '贵州省', '海南省', '河北省', '湖北省', '江西省', '吉林省', '内蒙古自治区', '宁夏回族自治区', '上海市', '山东省', '四川省', '云南省']
  },
  {
    provider: '清洋',
    provinceCount: 5,
    provinces: ['广东省', '江苏省', '山西省', '陕西省', '浙江省']
  },
  {
    provider: '小智',
    provinceCount: 8,
    provinces: ['广西壮族自治区', '黑龙江省', '河南省', '湖南省', '辽宁省', '青海省', '天津市', '重庆市']
  }
];

const floorScore = (value, max) => Math.max(0, Math.min(max, value));
const scoreDealRate = rate => floorScore(10 - Math.max(0, 0.5 - rate) * 100 * 3, 10);
const scoreVisitRate = rate => floorScore(30 - Math.max(0, 0.8 - rate) * 100 * 3, 30);
const scorePayoutRate = rate => floorScore(20 - Math.max(0, 0.8 - rate) * 100 * 3, 20);
const scoreBargainRate = rate => floorScore(20 - Math.max(0, rate - 0.1) * 100, 20);
const scoreComplaintRate = rate => floorScore(20 - Math.max(0, rate - 0.005) * 1000 * 2, 20);
const scoreFlyOrder = count => -count * 10;

export const recalculateRow = row => {
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

export const createEmptyRows = periodRange => {
  return providers.map(provider => recalculateRow({
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

export const DEFAULT_SCORE_ROWS = BASE_ROWS.map(recalculateRow);

export const createInitialPeriodRows = () => ({
  [WEEKLY_PERIODS[0].id]: DEFAULT_SCORE_ROWS
});

export const aggregatePeriodRows = periodRowsById => {
  return providers.map(provider => {
    const uploadedRows = WEEKLY_PERIODS
      .flatMap(period => periodRowsById[period.id] || [])
      .filter(row => row.provider === provider && (row.hasScoreSource || row.hasComplaintSource));

    const seed = createEmptyRows(OVERVIEW_PERIOD.range).find(row => row.provider === provider);
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

export const allocationForProvider = provider => {
  if (!provider) return allocationDefaults;
  return allocationDefaults.filter(row => row.provider === provider);
};

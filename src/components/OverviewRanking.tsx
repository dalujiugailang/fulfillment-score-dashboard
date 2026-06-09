import { useEffect, useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { AllocationSummary, ProviderName, ProviderScoreRow, pct, points, providerColor } from '../dashboardData';
import { ProvinceAllocationMap } from './ProvinceAllocationMap';

interface OverviewRankingProps {
  rows: ProviderScoreRow[];
  allocationSummary: AllocationSummary[];
  visibleProvider: ProviderName | null;
  selectedProviderFilter?: ProviderName | null;
  viewMode?: string;
  onOpenDetails?: () => void;
}

type ScoreMetricKey =
  | 'dealRateScore'
  | 'onTimeVisitRateScore'
  | 'onTimePayoutRateScore'
  | 'bargainRateScore'
  | 'complaintRateScore'
  | 'flyOrderScore';

const scoreMetrics: {
  label: string;
  shortLabel: string;
  key: ScoreMetricKey;
  max: number;
  note: string;
  source: 'score' | 'complaint';
  target: string;
  value: (row: ProviderScoreRow) => string;
  issue: string;
  action: string;
}[] = [
  {
    label: '成交率得分',
    shortLabel: '成交率',
    key: 'dealRateScore',
    max: 10,
    note: '成交订单量 / 提交订单量，低于 50% 按规则扣分',
    source: 'score',
    target: '≥ 50%',
    value: row => pct(row.dealRate),
    issue: '提交到成交转化不足，需要按省份和业务类型拆解漏斗。',
    action: '优先查看提交量高但成交低的省份，复核服务响应、价格确认和订单关闭原因。'
  },
  {
    label: '催上门得分',
    shortLabel: '催上门',
    key: 'onTimeVisitRateScore',
    max: 30,
    note: '催上门时效内量级 / 总量级，低于 80% 按规则扣分',
    source: 'complaint',
    target: '≥ 80%',
    value: row => pct(row.onTimeVisitRate),
    issue: '上门履约链路存在时效风险，容易拉高客诉和复盘压力。',
    action: '下钻影响省份，核对预约、派单、上门节点，并把低时效区域加入行动队列。'
  },
  {
    label: '催放款得分',
    shortLabel: '催放款',
    key: 'onTimePayoutRateScore',
    max: 20,
    note: '催放款时效内量级 / 总量级，低于 80% 按规则扣分',
    source: 'complaint',
    target: '≥ 80%',
    value: row => pct(row.onTimePayoutRate),
    issue: '放款处理不稳定，会影响用户感知和服务商履约可信度。',
    action: '核对放款节点数据口径，定位超时批次，并要求服务商给出处理时限。'
  },
  {
    label: '议价额率得分',
    shortLabel: '议价额率',
    key: 'bargainRateScore',
    max: 20,
    note: '议价额率越低得分越高，高于 10% 按规则扣分',
    source: 'score',
    target: '< 10%',
    value: row => pct(row.bargainRate),
    issue: '议价偏高会削弱用户信任，也可能掩盖估价或验机链路问题。',
    action: '按品类和省份拆解议价来源，复核估价口径、验机差异和服务商执行一致性。'
  },
  {
    label: '客诉率得分',
    shortLabel: '客诉率',
    key: 'complaintRateScore',
    max: 20,
    note: '客诉率越低得分越高，高于 0.5% 按规则扣分',
    source: 'complaint',
    target: '< 0.5%',
    value: row => pct(row.complaintRate),
    issue: '客诉率异常通常意味着履约体验或售后处理存在系统性问题。',
    action: '汇总客诉类型和省份分布，优先处理重复客诉来源。'
  },
  {
    label: '飞单扣分',
    shortLabel: '飞单飞单',
    key: 'flyOrderScore',
    max: 10,
    note: '每条飞单扣 10 分，0 条为达标',
    source: 'score',
    target: '= 0 条',
    value: row => `${row.flyOrderCount} 条`,
    issue: '飞单属于红线问题，会直接破坏服务商评分和管理信任。',
    action: '核对飞单明细和证据链，确认是否申诉、整改或纳入专项处罚。'
  },
] as const;

const getMetricScore = (row: ProviderScoreRow | undefined, metric: typeof scoreMetrics[number]) => {
  if (!row) return null;
  if (metric.source === 'score' && !row.hasScoreSource) return null;
  if (metric.source === 'complaint' && !row.hasComplaintSource) return null;
  return Number(row[metric.key]);
};

const formatScore = (value: number | null) => value === null ? '-' : points(value);

const getLossBars = (row: ProviderScoreRow | undefined) => {
  if (!row) return [];
  return scoreMetrics
    .map(metric => {
      const value = getMetricScore(row, metric);
      const loss = metric.key === 'flyOrderScore' ? Math.abs(value || 0) : Math.max(0, metric.max - (value || 0));
      return {
        label: metric.label.replace('得分', '').replace('扣分', '飞单'),
        loss,
        max: metric.max
      };
    })
    .sort((a, b) => b.loss - a.loss);
};

const LossBars = ({ losses }: { losses: ReturnType<typeof getLossBars> }) => (
  <div className="space-y-3">
    {losses.slice(0, 6).map(item => {
      const width = Math.min(100, (item.loss / Math.max(item.max, 1)) * 100);
      return (
        <div key={item.label} className="grid grid-cols-[76px_1fr_54px] items-center gap-3 text-[11px]">
          <span className="font-bold text-[#6f665f]">{item.label}</span>
          <div className="h-2.5 rounded-full bg-[#e3e0dd] overflow-hidden">
            <div
              className={`h-full rounded-full ${item.loss > 0 ? 'bg-[#fe6e00]' : 'bg-emerald-500'}`}
              style={{ width: `${width}%` }}
            />
          </div>
          <span className={`tabular-nums text-right font-black ${item.loss > 0 ? 'text-[#fe6e00]' : 'text-emerald-600'}`}>
            -{points(item.loss)}
          </span>
        </div>
      );
    })}
  </div>
);

const RankingBars = ({ rows, anonymous = false }: { rows: ProviderScoreRow[]; anonymous?: boolean }) => {
  const rankedRows = [...rows].sort((a, b) => {
    if (a.hasScoreSource !== b.hasScoreSource) return a.hasScoreSource ? -1 : 1;
    return b.totalScore - a.totalScore;
  });
  const maxScore = Math.max(...rankedRows.map(row => Math.max(row.totalScore, 0)), 1);

  return (
    <div className="space-y-4">
      {rankedRows.map((row, index) => {
        const width = Math.max(6, Math.min(100, (Math.max(row.totalScore, 0) / maxScore) * 100));
        return (
          <div key={`${row.provider}-${index}`} className="grid grid-cols-[44px_128px_1fr_72px] items-center gap-3">
            <span className="text-lg font-black tabular-nums text-[#423d38]">#{index + 1}</span>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#423d38] truncate">
                {row.isCurrentProvider ? `${row.provider}（我）` : row.provider}
              </p>
              <p className="text-[11px] text-[#797067] truncate">
                {anonymous && !row.isCurrentProvider ? '匿名展示' : row.companyName}
              </p>
            </div>
            <div className="h-8 rounded-sm bg-[#e3e0dd] overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{ width: `${width}%`, backgroundColor: row.isCurrentProvider ? providerColor(row.provider) : anonymous ? '#b9b3ac' : providerColor(row.provider) }}
              />
            </div>
            <span className="text-right text-sm font-black tabular-nums text-[#fe6e00]">{points(row.totalScore)}</span>
          </div>
        );
      })}
    </div>
  );
};

const getProviderStrengths = (row: ProviderScoreRow) => {
  return scoreMetrics
    .map(metric => ({ label: metric.label.replace('得分', '').replace('扣分', '飞单'), value: getMetricScore(row, metric), max: metric.max }))
    .filter(item => item.value !== null && item.value >= item.max * 0.85)
    .map(item => item.label)
    .slice(0, 2);
};

const getProviderWeaknesses = (row: ProviderScoreRow) => {
  return getLossBars(row).filter(item => item.loss > 0).map(item => item.label).slice(0, 2);
};

type MatrixStatus = '达标' | '预警' | '未达标' | '无数据';

const matrixStatusStyle: Record<MatrixStatus, { color: string; bg: string; border: string; label: string }> = {
  '达标': { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: '达标' },
  '预警': { color: '#ca8a04', bg: '#fefce8', border: '#fde68a', label: '预警' },
  '未达标': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: '未达标' },
  '无数据': { color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', label: '无数据' },
};

const getMatrixStatus = (row: ProviderScoreRow, metric: typeof scoreMetrics[number], value: number | null): MatrixStatus => {
  if (value === null) return '无数据';
  if (metric.key === 'flyOrderScore') return row.flyOrderCount === 0 ? '达标' : '未达标';
  const ratio = value / metric.max;
  if (ratio >= 0.85) return '达标';
  if (ratio >= 0.5) return '预警';
  return '未达标';
};

const ProviderBattleCards = ({
  rows,
  selectedProvider,
  onSelectProvider,
  anonymous = false
}: {
  rows: ProviderScoreRow[];
  selectedProvider: string | null;
  onSelectProvider: (provider: string) => void;
  anonymous?: boolean;
}) => {
  const rankedRows = useMemo(() => [...rows].sort((a, b) => b.totalScore - a.totalScore), [rows]);
  const topScore = rankedRows[0]?.totalScore ?? 0;

  return (
    <div className="space-y-3">
      {rankedRows.map((row, index) => {
        const selected = selectedProvider === row.provider;
        const strengths = row.isAnonymous ? [] : getProviderStrengths(row);
        const weaknesses = row.isAnonymous ? [] : getProviderWeaknesses(row);
        const gap = Math.max(0, topScore - row.totalScore);

        return (
          <button
            key={`${row.provider}-${index}`}
            type="button"
            onClick={() => onSelectProvider(row.provider)}
            className={`w-full text-left bg-white border rounded-lg p-4 transition-all ${selected ? 'border-[#fe6e00] ring-2 ring-[#fe6e00]/15' : 'border-[#e5e7eb] hover:border-[#fe6e00]/50'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#fe6e00]">#{index + 1}</p>
                <p className="text-lg font-black text-[#111827] truncate">{row.isCurrentProvider ? `${row.provider}（我）` : row.provider}</p>
                <p className="text-[11px] text-[#6b7280] truncate">{anonymous && !row.isCurrentProvider ? '匿名服务商' : row.companyName}</p>
              </div>
              <p className="text-2xl font-black tabular-nums text-[#111827]">{points(row.totalScore)}</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(8, Math.min(100, row.totalScore))}%`, backgroundColor: row.isAnonymous ? '#d1d5db' : providerColor(row.provider) }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="font-bold text-[#6b7280]">优势</p>
                <p className="mt-1 text-[#111827] font-semibold truncate">{strengths.length ? strengths.join('、') : row.isAnonymous ? '匿名展示' : '待观察'}</p>
              </div>
              <div>
                <p className="font-bold text-[#6b7280]">短板</p>
                <p className="mt-1 text-[#ef4444] font-semibold truncate">{weaknesses.length ? weaknesses.join('、') : gap > 0 ? `差 ${points(gap)} 分` : '暂无明显短板'}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const MetricHeatmap = ({
  rows,
  selectedProvider,
  selectedMetricKey,
  onSelectMetric,
  allocationSummary,
  onOpenDetails
}: {
  rows: ProviderScoreRow[];
  selectedProvider: string | null;
  selectedMetricKey: ScoreMetricKey | null;
  onSelectMetric: (metric: ScoreMetricKey) => void;
  allocationSummary: AllocationSummary[];
  onOpenDetails?: () => void;
}) => {
  const [selectedCell, setSelectedCell] = useState<{ provider: string; metricKey: ScoreMetricKey } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [queued, setQueued] = useState(false);
  const rankedRows = [...rows].sort((a, b) => b.totalScore - a.totalScore);
  const fallbackProvider = selectedProvider && rankedRows.some(row => row.provider === selectedProvider)
    ? selectedProvider
    : rankedRows[0]?.provider || null;

  useEffect(() => {
    if (!fallbackProvider) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell(current => {
      const provider = selectedProvider && rankedRows.some(row => row.provider === selectedProvider)
        ? selectedProvider
        : current && rankedRows.some(row => row.provider === current.provider)
          ? current.provider
          : fallbackProvider;
      const metricKey = selectedMetricKey || current?.metricKey || scoreMetrics[0].key;
      if (current?.provider === provider && current.metricKey === metricKey) return current;
      return { provider, metricKey };
    });
  }, [fallbackProvider, rankedRows, selectedMetricKey, selectedProvider]);

  useEffect(() => {
    setActionNote('');
    setQueued(false);
  }, [selectedCell?.provider, selectedCell?.metricKey]);

  const selectedRow = rankedRows.find(row => row.provider === selectedCell?.provider) || rankedRows[0];
  const selectedMetric = scoreMetrics.find(metric => metric.key === selectedCell?.metricKey) || scoreMetrics[0];
  const selectedValue = selectedRow ? getMetricScore(selectedRow, selectedMetric) : null;
  const selectedStatus = selectedRow ? getMatrixStatus(selectedRow, selectedMetric, selectedValue) : '无数据';
  const selectedStyle = matrixStatusStyle[selectedStatus];
  const selectedProviderKey = selectedRow?.actualProvider || (selectedRow?.provider as ProviderName);
  const selectedAllocation = allocationSummary.find(item => item.provider === selectedProviderKey);
  const impactAreas = selectedAllocation
    ? `${selectedAllocation.provinces.slice(0, 5).join('、')}${selectedAllocation.provinces.length > 5 ? ` 等 ${selectedAllocation.provinceCount} 个省份` : ''}`
    : '暂无省份映射';

  const selectCell = (provider: string, metricKey: ScoreMetricKey) => {
    if (!provider) return;
    setSelectedCell({ provider, metricKey });
    onSelectMetric(metricKey);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="cc-kicker">QUALITY MATRIX</p>
          <h3 className="mt-1 text-lg font-black text-[#111827]">履约质量评分矩阵</h3>
          <p className="mt-1 text-xs font-semibold text-[#6b7280]">点击单元格查看服务商指标明细与行动建议</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#6b7280]">
          {(Object.keys(matrixStatusStyle) as MatrixStatus[]).map(status => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: matrixStatusStyle[status].color }} />
              {status}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <div className="min-w-0 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid gap-2" style={{ gridTemplateColumns: `132px repeat(${rankedRows.length}, minmax(138px, 1fr))` }}>
              <div />
              {rankedRows.map(row => (
                <div key={row.provider} className={`rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-center text-xs font-black ${selectedCell?.provider === row.provider ? 'text-[#fe6e00]' : 'text-[#374151]'}`}>
                  {row.provider}
                </div>
              ))}
              {scoreMetrics.map(metric => (
                <div key={metric.key} className="contents">
                  <button
                    type="button"
                    onClick={() => selectCell(selectedCell?.provider || fallbackProvider || rankedRows[0]?.provider || '', metric.key)}
                    className={`rounded-lg border px-3 py-3 text-left text-xs font-black transition-all hover:border-[#fe6e00] hover:text-[#fe6e00] ${selectedCell?.metricKey === metric.key ? 'border-[#fe6e00] bg-[#fff7ed] text-[#fe6e00]' : 'border-[#e5e7eb] bg-white text-[#374151]'}`}
                  >
                    {metric.shortLabel}
                  </button>
                  {rankedRows.map(row => {
                    const value = getMetricScore(row, metric);
                    const status = getMatrixStatus(row, metric, value);
                    const style = matrixStatusStyle[status];
                    const selected = selectedCell?.provider === row.provider && selectedCell.metricKey === metric.key;
                    const currentValue = value === null ? '-' : metric.value(row);
                    const tooltip = `${row.provider} - ${metric.shortLabel}\n当前值：${currentValue}\n得分规则：${metric.note}\n达标线：${metric.target}\n环比变化：暂无上期数据`;

                    return (
                      <button
                        key={`${metric.key}-${row.provider}`}
                        type="button"
                        title={tooltip}
                        onClick={() => selectCell(row.provider, metric.key)}
                        className={`relative min-h-[88px] overflow-hidden rounded-lg border bg-white px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#fe6e00] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#fe6e00]/20 ${selected ? 'border-[#fe6e00] ring-2 ring-[#fe6e00]/15' : 'border-[#e5e7eb]'}`}
                      >
                        <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: style.color }} />
                        <div className="flex items-start justify-between gap-2 pl-1">
                          <div>
                            <p className="text-xl font-black tabular-nums text-[#111827]">{formatScore(value)}</p>
                            <p className="mt-0.5 text-[10px] font-bold text-[#9ca3af]">/ {metric.max} 分</p>
                          </div>
                          <span
                            className="rounded-full border px-2 py-0.5 text-[10px] font-black"
                            style={{ borderColor: style.border, backgroundColor: style.bg, color: style.color }}
                          >
                            {style.label}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 pl-1 text-[11px] font-semibold text-[#6b7280]">
                          <span className="truncate">当前值 {currentValue}</span>
                          <span className="tabular-nums text-[#9ca3af]">环比 --</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
          {selectedRow ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black text-[#6b7280]">当前选中对象</p>
                    <h4 className="mt-1 text-xl font-black text-[#111827]">{selectedRow.provider} - {selectedMetric.shortLabel}</h4>
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[11px] font-black"
                    style={{ borderColor: selectedStyle.border, backgroundColor: selectedStyle.bg, color: selectedStyle.color }}
                  >
                    {selectedStatus}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                    <p className="text-[11px] font-bold text-[#6b7280]">当前得分 / 满分</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-[#111827]">{formatScore(selectedValue)} / {selectedMetric.max}</p>
                  </div>
                  <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                    <p className="text-[11px] font-bold text-[#6b7280]">当前值</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-[#111827]">{selectedValue === null ? '-' : selectedMetric.value(selectedRow)}</p>
                  </div>
                  <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                    <p className="text-[11px] font-bold text-[#6b7280]">达标线</p>
                    <p className="mt-1 text-sm font-black text-[#111827]">{selectedMetric.target}</p>
                  </div>
                  <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                    <p className="text-[11px] font-bold text-[#6b7280]">环比变化</p>
                    <p className="mt-1 text-sm font-black text-[#9ca3af]">暂无上期数据</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <p className="text-[11px] font-black text-[#6b7280]">影响区域</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#374151]">{impactAreas}</p>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <p className="text-[11px] font-black text-[#6b7280]">主要问题原因</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#374151]">
                  {selectedStatus === '达标' ? '当前指标已达到考核线，建议继续关注下期波动。' : selectedMetric.issue}
                </p>
              </div>

              <div className="rounded-lg border border-[#fed7aa] bg-white p-4">
                <p className="text-[11px] font-black text-[#9a3412]">推荐动作</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#374151]">
                  {selectedStatus === '达标' ? '保留当前履约节奏，后续通过趋势看是否稳定达标。' : selectedMetric.action}
                </p>
              </div>

              {actionNote && (
                <div className="rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-3 text-xs font-semibold leading-6 text-[#9a3412]">
                  {actionNote}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <button type="button" onClick={onOpenDetails} className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-black text-[#374151] transition-colors hover:border-[#fe6e00] hover:text-[#fe6e00]">
                  查看明细
                </button>
                <button
                  type="button"
                  onClick={() => setActionNote(`${selectedRow.provider} 本期 ${selectedMetric.shortLabel} 当前得分 ${formatScore(selectedValue)} / ${selectedMetric.max}，当前值 ${selectedValue === null ? '-' : selectedMetric.value(selectedRow)}。建议：${selectedStatus === '达标' ? '保持当前履约节奏，并持续关注下期波动。' : selectedMetric.action}`)}
                  className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-black text-[#374151] transition-colors hover:border-[#fe6e00] hover:text-[#fe6e00]"
                >
                  生成复盘
                </button>
                <button
                  type="button"
                  onClick={() => setQueued(true)}
                  className={`rounded-lg border px-3 py-2 text-xs font-black transition-colors ${queued ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-emerald-500 hover:text-emerald-600'}`}
                >
                  {queued ? '已加入行动队列' : '加入行动队列'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 text-sm font-semibold text-[#6b7280]">
              暂无可展示的服务商指标。
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const ProviderAnonymousOverview = ({
  rows,
  allocationSummary,
  visibleProvider,
  onOpenDetails
}: OverviewRankingProps & { visibleProvider: ProviderName }) => {
  const [selectedMetricKey, setSelectedMetricKey] = useState<ScoreMetricKey | null>(null);
  const rankedRows = [...rows].sort((a, b) => {
    if (a.hasScoreSource !== b.hasScoreSource) return a.hasScoreSource ? -1 : 1;
    return b.totalScore - a.totalScore;
  });
  const currentRow = rows.find(row => row.isCurrentProvider || row.actualProvider === visibleProvider || row.provider === visibleProvider);
  const leader = rankedRows[0];
  const gapToLeader = currentRow && leader ? Math.max(0, leader.totalScore - currentRow.totalScore) : 0;
  const currentLosses = getLossBars(currentRow);
  const currentWeakness = currentLosses[0];
  const visibleAllocationCount = allocationSummary.reduce((sum, row) => sum + row.provinceCount, 0);
  const currentRows = currentRow ? [currentRow] : [];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
        <p className="cc-kicker">我的本周期结论</p>
        <h3 className="mt-2 text-2xl font-black text-[#111827]">
          {currentRow?.provider || visibleProvider} 当前总分 {currentRow ? points(currentRow.totalScore) : '-'}，{leader?.isCurrentProvider ? '暂列第一。' : `距匿名第一名 ${points(gapToLeader)} 分。`}
        </h3>
        <p className="mt-2 text-sm font-semibold text-[#4b5563]">
          主要短板：{currentLosses.filter(item => item.loss > 0).slice(0, 3).map(item => item.label).join('、') || '暂无明显短板'}。
        </p>
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <div className="cc-panel p-5">
          <p className="cc-kicker">ANONYMOUS RANK</p>
          <h3 className="text-lg font-black text-[#111827] mt-1 mb-4">匿名战绩榜</h3>
          <ProviderBattleCards rows={rankedRows} selectedProvider={currentRow?.provider || null} onSelectProvider={() => undefined} anonymous />
        </div>

        <div className="cc-panel p-5 min-w-0">
          <MetricHeatmap
            rows={currentRows}
            selectedProvider={currentRow?.provider || null}
            selectedMetricKey={selectedMetricKey}
            onSelectMetric={setSelectedMetricKey}
            allocationSummary={allocationSummary}
            onOpenDetails={onOpenDetails}
          />
        </div>
      </section>

      <div className="cc-panel p-5 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
            <div>
              <p className="cc-kicker">REGIONAL VIEW</p>
              <h3 className="text-lg md:text-xl font-black text-[#111827] mt-1 flex items-center gap-2">
                <MapPinned className="w-5 h-5 text-[#fe6e00]" />
                我的省份划分
              </h3>
            </div>
            <div className="text-xs text-[#6b7280] bg-[#f6f7f9] border border-[#e5e7eb] rounded-lg px-3 py-2">
              我的分配 {visibleAllocationCount} 个省级区域
            </div>
          </div>

          <ProvinceAllocationMap allocationSummary={allocationSummary} visibleProvider={visibleProvider} />
      </div>
    </div>
  );
};

export const OverviewRanking = ({ rows, allocationSummary, visibleProvider, selectedProviderFilter, viewMode = '综合分', onOpenDetails }: OverviewRankingProps) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(selectedProviderFilter || null);
  const [selectedMetricKey, setSelectedMetricKey] = useState<ScoreMetricKey | null>(null);
  const rankedRows = [...rows].sort((a, b) => {
    if (a.hasScoreSource !== b.hasScoreSource) return a.hasScoreSource ? -1 : 1;
    return b.totalScore - a.totalScore;
  });

  useEffect(() => {
    setSelectedProvider(selectedProviderFilter || null);
  }, [selectedProviderFilter]);

  if (visibleProvider) {
    return <ProviderAnonymousOverview rows={rows} allocationSummary={allocationSummary} visibleProvider={visibleProvider} selectedProviderFilter={selectedProviderFilter} viewMode={viewMode} onOpenDetails={onOpenDetails} />;
  }

  const scoredRows = rankedRows.filter(row => row.hasScoreSource);
  const leader = scoredRows[0] || rankedRows[0];
  const second = scoredRows[1];
  const last = scoredRows[scoredRows.length - 1] || rankedRows[rankedRows.length - 1];
  const leaderGap = leader && second ? leader.totalScore - second.totalScore : 0;
  const scoreSpread = leader && last && leader.provider !== last.provider ? leader.totalScore - last.totalScore : 0;
  const missingScoreProviders = rows.filter(row => !row.hasScoreSource).map(row => row.provider);
  const missingComplaintProviders = rows.filter(row => !row.hasComplaintSource).map(row => row.provider);
  const missingSourceText = [
    missingScoreProviders.length ? `履约源：${missingScoreProviders.join('、')}` : '',
    missingComplaintProviders.length ? `客诉/时效源：${missingComplaintProviders.join('、')}` : ''
  ].filter(Boolean).join('；') || '所有服务商源数据齐备';
  const totalFlyOrders = rows.reduce((sum, row) => sum + row.flyOrderCount, 0);
  const maxFlyOrderRow = rows.reduce<ProviderScoreRow | null>(
    (current, row) => !current || row.flyOrderCount > current.flyOrderCount ? row : current,
    null
  );
  const hasMissingSources = missingScoreProviders.length > 0 || missingComplaintProviders.length > 0;
  const nextAction = hasMissingSources
    ? '先补齐缺失源数据，再判断排名差距。'
    : totalFlyOrders > 0
      ? `优先复核 ${maxFlyOrderRow?.provider} 飞单扣罚，避免分差被红线项继续拉大。`
      : second
        ? `跟进 ${second.provider} 与第一名的 ${points(leaderGap)} 分差，优先拆解可追分项。`
        : '待形成第二名后再判断追分动作。';
  const selectedRow = selectedProvider ? rows.find(row => row.provider === selectedProvider) : null;
  const focusRow = selectedRow || last || rankedRows[0];
  const focusLosses = getLossBars(focusRow);
  const focusWeakness = focusLosses[0];
  const focusAction = !focusRow
    ? '暂无可处理对象。'
    : !focusRow.hasScoreSource
      ? '先补齐履约源数据，确认提交量、成交量和议价口径。'
      : !focusRow.hasComplaintSource
        ? '先补齐客诉/时效源数据，确认催上门、催放款和客诉率。'
        : focusRow.flyOrderCount > 0
          ? '优先复核飞单扣罚，确认是否存在申诉或修正材料。'
          : focusWeakness && focusWeakness.loss > 0
            ? `优先拆解${focusWeakness.label}，这是当前最主要的失分项。`
            : '当前无明显短板，保持数据更新并关注下一期波动。';
  const visibleAllocationCount = allocationSummary.reduce((sum, row) => sum + row.provinceCount, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 items-center">
          <div>
            <p className="cc-kicker">本周期结论</p>
            <h3 className="mt-2 text-2xl font-black text-[#111827]">
              {leader?.provider || '-'} 当前领先，{last && leader ? `${last.provider} 落后 ${points(scoreSpread)} 分` : '暂无可比较服务商'}。
            </h3>
            <p className="mt-2 text-sm font-semibold text-[#4b5563] leading-7">
              主要短板集中在：{focusLosses.filter(item => item.loss > 0).slice(0, 3).map(item => item.label).join('、') || '暂无明显短板'}。
              {nextAction}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#fff7ed] border border-[#fed7aa] p-4">
              <p className="text-[11px] font-black text-[#9a3412]">综合第一</p>
              <p className="mt-2 text-xl font-black text-[#111827]">{leader?.provider || '-'}</p>
              <p className="text-xs font-bold text-[#6b7280]">{leader ? points(leader.totalScore) : '-'}</p>
            </div>
            <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-4">
              <p className="text-[11px] font-black text-[#991b1b]">最大风险</p>
              <p className="mt-2 text-xl font-black text-[#111827]">{focusWeakness?.label || '-'}</p>
              <p className="text-xs font-bold text-[#6b7280]">{focusWeakness ? `-${points(focusWeakness.loss)}` : '-'}</p>
            </div>
            <div className="rounded-lg bg-[#eff6ff] border border-[#bfdbfe] p-4">
              <p className="text-[11px] font-black text-[#1d4ed8]">区域覆盖</p>
              <p className="mt-2 text-xl font-black text-[#111827]">{visibleAllocationCount}</p>
              <p className="text-xs font-bold text-[#6b7280]">省级区域</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <div className="cc-panel p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="cc-kicker">SERVICE RANK</p>
              <h3 className="text-lg font-black text-[#111827] mt-1">服务商战绩榜</h3>
            </div>
            {selectedProvider && (
              <button type="button" onClick={() => setSelectedProvider(null)} className="text-[11px] font-bold text-[#fe6e00]">
                查看全部
              </button>
            )}
          </div>
          <ProviderBattleCards rows={rankedRows} selectedProvider={selectedProvider} onSelectProvider={setSelectedProvider} />
        </div>

        <div className="cc-panel p-5 min-w-0">
          <MetricHeatmap
            rows={selectedProvider ? rows.filter(row => row.provider === selectedProvider) : rankedRows}
            selectedProvider={selectedProvider}
            selectedMetricKey={selectedMetricKey}
            onSelectMetric={setSelectedMetricKey}
            allocationSummary={allocationSummary}
            onOpenDetails={onOpenDetails}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-5">
        <div className="cc-panel p-5 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
            <div>
              <p className="cc-kicker">REGIONAL VIEW</p>
              <h3 className="text-lg md:text-xl font-black text-[#111827] mt-1 flex items-center gap-2">
                <MapPinned className="w-5 h-5 text-[#fe6e00]" />
                省份服务商分区
              </h3>
              <p className="text-xs text-[#6b7280] mt-1">点击省份查看归属和后续可接入的区域指标。</p>
            </div>
            <div className="text-xs text-[#6b7280] bg-[#f6f7f9] border border-[#e5e7eb] rounded-lg px-3 py-2">
              已分配 {visibleAllocationCount} 个省级区域
            </div>
          </div>
          <ProvinceAllocationMap allocationSummary={allocationSummary} visibleProvider={visibleProvider} />
        </div>

        <div className="cc-panel p-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="cc-kicker">BIWEEKLY TREND</p>
              <h3 className="text-lg font-black text-[#111827] mt-1">双周趋势入口</h3>
            </div>
            <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-bold text-[#6b7280]">当前周期</span>
          </div>
          <div className="space-y-4">
            {rankedRows.map(row => (
              <div key={row.provider} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#374151]">{row.provider}</span>
                  <span className="tabular-nums text-[#fe6e00]">{points(row.totalScore)}</span>
                </div>
                <div className="grid grid-cols-6 gap-1 h-12 items-end">
                  {[0, 1, 2, 3, 4].map(index => (
                    <div key={index} className="rounded-t bg-[#e5e7eb]" style={{ height: `${18 + index * 4}%` }} />
                  ))}
                  <div className="rounded-t bg-[#fe6e00]" style={{ height: `${Math.max(12, Math.min(100, Math.max(0, row.totalScore)))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-[#6b7280]">
            当前接口暂未返回完整历史周期序列，先展示趋势入口和当前周期位置；后续接入多期数据后可切换综合分、成交率、时效内占比和环比箭头。
          </p>
        </div>
      </section>
    </div>
  );
};

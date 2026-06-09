import { ShieldCheck } from 'lucide-react';
import { EvaluationPeriod, ProviderName, ProviderScoreRow, UploadHistoryEntry, WEEKLY_PERIODS, points } from '../dashboardData';

interface PublicHeaderProps {
  rows: ProviderScoreRow[];
  activePeriod: EvaluationPeriod;
  uploadedPeriodCount: number;
  totalSubmittedOrders: number;
  activeSources: {
    score?: UploadHistoryEntry;
    complaint?: UploadHistoryEntry;
  };
  visibleProvider: ProviderName | null;
}

export const PublicHeader = ({ rows, activePeriod, uploadedPeriodCount, totalSubmittedOrders, activeSources, visibleProvider }: PublicHeaderProps) => {
  const rankedRows = [...rows].filter(row => row.hasScoreSource).sort((a, b) => b.totalScore - a.totalScore);
  const leader = rankedRows[0] || rows[0];
  const currentRow = visibleProvider
    ? rows.find(row => row.isCurrentProvider || row.actualProvider === visibleProvider || row.provider === visibleProvider)
    : null;
  const uploadedComplete = Boolean(activeSources.score && activeSources.complaint);
  const uploadStatus = uploadedPeriodCount >= WEEKLY_PERIODS.length ? '周期数据已齐' : '仍有周期待补';
  const currentRank = currentRow ? rankedRows.findIndex(row => row === currentRow) + 1 : 0;
  const statusText = visibleProvider && currentRow
    ? `我的排名第 ${currentRank}，当前总分 ${currentRow.hasScoreSource ? points(currentRow.totalScore) : '待履约源'}。`
    : leader
      ? `当前领先 ${leader.provider}，总分 ${points(leader.totalScore)}。`
      : '暂无可比较评分。';

  return (
    <div className="mb-6 space-y-4">
      <div className="cc-panel flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 text-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-[#c2410c] text-white mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="cc-kicker">OPERATION STATUS</p>
            <p className="font-black text-lg text-[#171412] mt-1">本期运营状态</p>
            <p className="text-xs text-slate-500 mt-1">
              当前查看 <strong>{activePeriod.name}（{activePeriod.range}）</strong>，{visibleProvider ? '服务商视角仅展示本方明细和匿名排名。' : '优先关注领先差距、飞单扣罚和源数据补齐进度。'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full border border-[#fdba74] bg-[#ffedd5] px-2.5 py-1 text-[#7c2d12]">{statusText}</span>
              <span className="rounded-full border border-[#e3e0dd] bg-[#edebe9] px-2.5 py-1 text-[#6f665f]">源数据 {uploadedPeriodCount} / {WEEKLY_PERIODS.length} 期</span>
            </div>
          </div>
        </div>
        <div className={`text-xs px-2.5 py-1 rounded-full border font-bold select-none ${
          uploadedComplete ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100'
        }`}>
          {uploadedComplete ? uploadStatus : '待补数据源'}
        </div>
      </div>

    </div>
  );
};

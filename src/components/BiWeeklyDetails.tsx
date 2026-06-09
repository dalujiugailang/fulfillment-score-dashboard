import { AlertTriangle, CheckCircle, Filter, Search } from 'lucide-react';
import { ProviderScoreRow, metricStatus, money, pct, points } from '../dashboardData';

interface BiWeeklyDetailsProps {
  rows: ProviderScoreRow[];
}

const statusBadge = (row: ProviderScoreRow) => {
  if (!row.hasScoreSource) {
    return { label: '待补履约源', className: 'bg-amber-50 text-amber-700 border-amber-100' };
  }
  if (!row.hasComplaintSource) {
    return { label: '待补客诉/时效', className: 'bg-amber-50 text-amber-700 border-amber-100' };
  }
  if (row.flyOrderCount > 0) {
    return { label: '红线扣罚', className: 'bg-red-50 text-red-700 border-red-100' };
  }
  if (
    metricStatus('dealRate', row) === '未达标'
    || metricStatus('onTimeVisitRate', row) === '未达标'
    || metricStatus('onTimePayoutRate', row) === '未达标'
    || metricStatus('bargainRate', row) === '未达标'
    || metricStatus('complaintRate', row) === '未达标'
  ) {
    return { label: '需跟进', className: 'bg-orange-50 text-orange-700 border-orange-100' };
  }
  return { label: '达标稳定', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
};

const worstWeakness = (row: ProviderScoreRow) => {
  if (!row.hasScoreSource) return '履约源缺失';
  if (!row.hasComplaintSource) return '客诉/时效源缺失';

  const losses = [
    { label: '成交率', loss: 10 - row.dealRateScore },
    { label: '催上门', loss: 30 - row.onTimeVisitRateScore },
    { label: '催放款', loss: 20 - row.onTimePayoutRateScore },
    { label: '议价额率', loss: 20 - row.bargainRateScore },
    { label: '客诉率', loss: 20 - row.complaintRateScore },
    { label: '飞单', loss: Math.abs(row.flyOrderScore) }
  ];
  const worst = losses.reduce((current, item) => item.loss > current.loss ? item : current, losses[0]);

  return worst.loss > 0 ? `${worst.label} -${points(worst.loss)}分` : '暂无明显短板';
};

export const BiWeeklyDetails = ({ rows }: BiWeeklyDetailsProps) => {
  const rankedRows = [...rows].sort((a, b) => b.totalScore - a.totalScore);
  const rankByProvider = new Map(rankedRows.map((row, index) => [row.provider, index + 1]));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-slate-800">评分明细</span>
          </div>
          <div className="text-[11px] text-slate-400">
            已对齐当前考核规则表的 100 分制评分字段。
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50/80 border border-slate-100 rounded-lg px-4 py-3">
            <p className="text-[11px] text-slate-400">服务商数量</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{rows.length}</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-100 rounded-lg px-4 py-3">
            <p className="text-[11px] text-slate-400">总提交订单量</p>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {rows.reduce((sum, row) => sum + row.submittedOrders, 0).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="bg-slate-50/80 border border-slate-100 rounded-lg px-4 py-3">
            <p className="text-[11px] text-slate-400">总成交订单量</p>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {rows.reduce((sum, row) => sum + row.closedOrders, 0).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">服务商汇总区</h3>
            <p className="text-xs text-slate-400 mt-1">默认按业务扫读口径展示核心指标和当前最大短板。</p>
          </div>
          <div className="text-[11px] text-slate-400">排名按当前总分降序计算</div>
        </div>
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Search className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-slate-500">暂无服务商汇总</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-500 font-semibold tabular-nums select-none">
                  <th className="py-4 px-5">服务商</th>
                  <th className="py-4 px-4 text-center">总分</th>
                  <th className="py-4 px-4 text-center">排名/状态</th>
                  <th className="py-4 px-4 text-center">成交率</th>
                  <th className="py-4 px-4 text-center">催上门</th>
                  <th className="py-4 px-4 text-center">催放款</th>
                  <th className="py-4 px-4 text-center">议价额率</th>
                  <th className="py-4 px-4 text-center">客诉率</th>
                  <th className="py-4 px-4 text-center text-red-600">飞单量</th>
                  <th className="py-4 px-5 text-center">最大短板</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rankedRows.map((row) => {
                  const status = statusBadge(row);

                  return (
                    <tr key={row.provider} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-bold text-slate-800 text-[13px]">{row.provider}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{row.companyName}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-extrabold tabular-nums text-blue-700">
                        {row.hasScoreSource ? points(row.totalScore) : '待履约源'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="tabular-nums font-bold text-slate-700">第 {rankByProvider.get(row.provider)} 名</span>
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium inline-block ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center tabular-nums">{row.hasScoreSource ? pct(row.dealRate) : '-'}</td>
                      <td className="py-4 px-4 text-center tabular-nums">
                        <span className={metricStatus('onTimeVisitRate', row) === '达标' ? 'text-slate-700' : 'text-red-500 font-semibold'}>
                          {row.hasComplaintSource ? pct(row.onTimeVisitRate) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center tabular-nums">
                        <span className={metricStatus('onTimePayoutRate', row) === '达标' ? 'text-slate-700' : 'text-red-500 font-semibold'}>
                          {row.hasComplaintSource ? pct(row.onTimePayoutRate) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center tabular-nums">{row.hasScoreSource ? pct(row.bargainRate) : '-'}</td>
                      <td className="py-4 px-4 text-center tabular-nums">{row.hasComplaintSource ? pct(row.complaintRate) : '-'}</td>
                      <td className="py-4 px-4 text-center tabular-nums font-semibold">
                        <span className={row.flyOrderCount > 0 ? 'text-red-600' : 'text-slate-500'}>
                          {row.hasScoreSource ? `${row.flyOrderCount} 条` : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-semibold text-slate-700">{worstWeakness(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <details className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden group">
        <summary className="px-5 py-4 border-b border-slate-100 cursor-pointer list-none flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">高级明细字段</h3>
            <p className="text-xs text-slate-400 mt-1">用于核对底层字段、分项得分和源数据口径，默认折叠。</p>
          </div>
          <span className="text-[11px] font-bold text-[#fe6e00] group-open:hidden">展开</span>
          <span className="text-[11px] font-bold text-[#fe6e00] hidden group-open:inline">收起</span>
        </summary>
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <Search className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-slate-500">暂无评分结果</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-400 font-semibold tabular-nums select-none">
                  <th className="py-4 px-4 sticky left-0 bg-slate-50 z-10 shadow-sm border-r border-slate-100">服务商</th>
                  <th className="py-4 px-3 text-center bg-blue-50/20 text-blue-700 font-bold" colSpan={4}>成交率</th>
                  <th className="py-4 px-3 text-center bg-purple-50/10 text-purple-700 font-bold" colSpan={4}>催上门时效内率</th>
                  <th className="py-4 px-3 text-center bg-indigo-50/10 text-indigo-700 font-bold" colSpan={4}>催放款时效内率</th>
                  <th className="py-4 px-3 text-center bg-amber-50/20 text-amber-700 font-bold" colSpan={5}>议价额率</th>
                  <th className="py-4 px-3 text-center bg-rose-50/10 text-rose-700 font-bold" colSpan={2}>客诉率</th>
                  <th className="py-4 px-3 text-center bg-red-50/10 text-red-700 font-bold" colSpan={2}>飞单</th>
                  <th className="py-4 px-4 text-center border-l border-slate-100 font-bold text-slate-700">总分</th>
                </tr>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] text-slate-500 font-medium tabular-nums tracking-normal">
                  <th className="py-3 px-4 sticky left-0 bg-slate-100/80 z-10 border-r border-slate-100">名称</th>
                  <th className="py-3 px-3 text-right">提交单</th>
                  <th className="py-3 px-3 text-right">成交单</th>
                  <th className="py-3 px-3 text-center">成交率</th>
                  <th className="py-3 px-3 text-center border-r border-slate-100">得分 / 10</th>
                  <th className="py-3 px-3 text-right">时效内</th>
                  <th className="py-3 px-3 text-right">总量</th>
                  <th className="py-3 px-3 text-center">催上门率</th>
                  <th className="py-3 px-3 text-center border-r border-slate-100">得分 / 30</th>
                  <th className="py-3 px-3 text-right">时效内</th>
                  <th className="py-3 px-3 text-right">总量</th>
                  <th className="py-3 px-3 text-center">催放款率</th>
                  <th className="py-3 px-3 text-center border-r border-slate-100">得分 / 20</th>
                  <th className="py-3 px-3 text-right">口径订单</th>
                  <th className="py-3 px-3 text-right">提交金额</th>
                  <th className="py-3 px-3 text-right">成交金额</th>
                  <th className="py-3 px-3 text-center">议价额率</th>
                  <th className="py-3 px-3 text-center border-r border-slate-100">得分 / 20</th>
                  <th className="py-3 px-3 text-center">客诉率</th>
                  <th className="py-3 px-3 text-center border-r border-slate-100">得分 / 20</th>
                  <th className="py-3 px-3 text-center">飞单量</th>
                  <th className="py-3 px-3 text-center border-r border-slate-100">扣分</th>
                  <th className="py-3 px-4 text-center">总分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
                {rows.map((row) => (
                  <tr key={row.provider} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 sticky left-0 bg-white z-10 shadow-sm border-r border-slate-100 font-medium">
                      <div>
                        <span className="font-bold text-slate-800 text-xs">{row.provider}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{row.companyName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasScoreSource ? row.submittedOrders.toLocaleString('zh-CN') : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasScoreSource ? row.closedOrders.toLocaleString('zh-CN') : '-'}</td>
                    <td className="py-3.5 px-3 text-center tabular-nums font-semibold">
                      <span className={metricStatus('dealRate', row) === '达标' ? 'text-emerald-600' : 'text-red-500'}>{row.hasScoreSource ? pct(row.dealRate) : '待上传'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums border-r border-slate-100">{row.hasScoreSource ? points(row.dealRateScore) : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasComplaintSource ? row.onTimeVisitOrders.toLocaleString('zh-CN') : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasComplaintSource ? row.visitTotalOrders.toLocaleString('zh-CN') : '-'}</td>
                    <td className="py-3.5 px-3 text-center tabular-nums">
                      <span className={metricStatus('onTimeVisitRate', row) === '达标' ? 'text-emerald-600' : 'text-red-500'}>{row.hasComplaintSource ? pct(row.onTimeVisitRate) : '待上传'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums border-r border-slate-100">{row.hasComplaintSource ? points(row.onTimeVisitRateScore) : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasComplaintSource ? row.onTimePayoutOrders.toLocaleString('zh-CN') : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasComplaintSource ? row.payoutTotalOrders.toLocaleString('zh-CN') : '-'}</td>
                    <td className="py-3.5 px-3 text-center tabular-nums">
                      <span className={metricStatus('onTimePayoutRate', row) === '达标' ? 'text-emerald-600' : 'text-red-500'}>{row.hasComplaintSource ? pct(row.onTimePayoutRate) : '待上传'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums border-r border-slate-100">{row.hasComplaintSource ? points(row.onTimePayoutRateScore) : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasScoreSource ? row.bargainOrderCount.toLocaleString('zh-CN') : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasScoreSource ? `¥${money(row.bargainSubmittedAmount)}` : '-'}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums text-slate-500">{row.hasScoreSource ? `¥${money(row.bargainClosedAmount)}` : '-'}</td>
                    <td className="py-3.5 px-3 text-center tabular-nums">
                      <span className={metricStatus('bargainRate', row) === '达标' ? 'text-emerald-600' : 'text-red-500'}>{row.hasScoreSource ? pct(row.bargainRate) : '待上传'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums border-r border-slate-100">{row.hasScoreSource ? points(row.bargainRateScore) : '-'}</td>
                    <td className="py-3.5 px-3 text-center tabular-nums">
                      <span className={metricStatus('complaintRate', row) === '达标' ? 'text-emerald-600' : 'text-red-500'}>{pct(row.complaintRate)}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums border-r border-slate-100">{points(row.complaintRateScore)}</td>
                    <td className="py-3.5 px-3 text-center tabular-nums font-bold">
                      <span className={row.flyOrderCount > 0 ? 'text-red-600' : 'text-slate-400'}>{row.flyOrderCount} 条</span>
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums border-r border-slate-100">{points(row.flyOrderScore)}</td>
                    <td className="py-3.5 px-4 tabular-nums text-center border-l border-slate-100 font-bold text-blue-700">{row.hasScoreSource ? points(row.totalScore) : '待履约源'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>

      <div className="bg-blue-50/30 border border-blue-100/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
            数据解读辅助线
          </p>
          <p className="text-slate-500">
            达标标准：成交率 ≥50%，催上门/催放款时效内率 ≥80%，议价额率 &lt;10%，客诉率 &lt;0.5%。飞单按单扣 10 分。
          </p>
        </div>
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          飞单数据上传后将按每单 10 分扣减
        </div>
      </div>
    </div>
  );
};

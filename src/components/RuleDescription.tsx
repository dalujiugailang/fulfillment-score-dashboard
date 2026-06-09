import { AlertOctagon, BarChart4, BookOpen, CheckSquare, Clock, Database, GitBranch, UploadCloud } from 'lucide-react';
import { EVALUATION_CYCLE, REPORT_META, WEEKLY_PERIODS } from '../dashboardData';

export const RuleDescription = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center py-4 space-y-2 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          大家电服务商履约评分口径说明
        </h2>
        <p className="text-xs text-slate-400">对齐考核规则表 | 数据版本：{REPORT_META.generatedAt}</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          模块一：统计范围
        </h3>
        <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed pl-6">
          <p>评分周期：<strong>{REPORT_META.dateRange}</strong>。</p>
          <p>周期名称：<strong>{EVALUATION_CYCLE.name}</strong>。评分按周切片统计，最后一期按 2026-07-26 至 2026-07-30 收口。</p>
          <p>服务商映射：青岛鲸智再生环保科技有限公司 = “海鲸”；北京清洋绿色循环科技有限公司 = “清洋”；熊洞智家(北京)科技有限公司 = “小智”。未命中映射的服务商不进入评分聚合。</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-blue-500" />
          数据发布链路
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {[
            ['上传选择', '选择履约源或客诉/时效源，并绑定目标周期。'],
            ['校验预览', '解析文件行数、匹配服务商、提示未识别行和覆盖字段。'],
            ['确认发布', '只有点击确认发布后，当前周期评分数据才会更新。'],
            ['版本历史', '保留文件名、上传时间、行数、匹配服务商和发布说明。']
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <p className="font-bold text-slate-800">{title}</p>
              <p className="text-slate-500 leading-relaxed mt-2">{desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
          <Database className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
          <p>系统当前通过 DuckDB 保存周期评分、上传历史和源文件解析行。运营侧应以页面展示的“当前履约源 / 当前客诉源”和上传历史为数据版本依据。</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          周期切片
        </h3>
        <div className="relative">
          <div className="hidden md:block absolute left-6 right-6 top-6 h-px bg-slate-200" />
          <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3 text-xs relative">
            {WEEKLY_PERIODS.map((period, index) => (
              <div key={period.id} className="relative rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border ${
                    index === WEEKLY_PERIODS.length - 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-600 border-blue-100'
                  }`}>
                    {index + 1}
                  </span>
                  <p className="font-bold text-slate-800">{period.name}</p>
                </div>
                <p className="text-slate-500 mt-2 tabular-nums leading-relaxed">{period.range}</p>
                {index === WEEKLY_PERIODS.length - 1 && (
                  <p className="mt-2 text-[11px] font-semibold text-blue-600">最后一期收口</p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            每 7 天为一期，共 12 期；最后一期为 2026-07-26 至 2026-07-30。
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <BarChart4 className="w-4 h-4 text-blue-500" />
          模块二：核心指标
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse text-xs">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[19%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[46%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-400 font-bold tabular-nums">
                <th className="py-3 px-4">指标名称</th>
                <th className="py-3 px-4">计算公式</th>
                <th className="py-3 px-3 text-center">达标线</th>
                <th className="py-3 px-3">日期口径</th>
                <th className="py-3 px-4">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600 leading-relaxed">
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">成交率</td>
                <td className="py-3.5 px-4 tabular-nums text-slate-500">成交订单量 / 提交订单量</td>
                <td className="py-3.5 px-3 text-center font-bold text-emerald-600">≥ 50%</td>
                <td className="py-3.5 px-3">订单创建日期</td>
                <td className="py-3.5 px-4 text-slate-500">达标得满分；低于达标线每 1 个百分点扣 3 分。</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">议价额率</td>
                <td className="py-3.5 px-4 tabular-nums text-slate-500">1 - 成交金额 / 提交金额</td>
                <td className="py-3.5 px-3 text-center font-bold text-emerald-600">&lt; 10%</td>
                <td className="py-3.5 px-3">订单成交日期</td>
                <td className="py-3.5 px-4 text-slate-500">达标得满分；高于达标线每 1 个百分点扣 1 分。</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">客诉率</td>
                <td className="py-3.5 px-4 tabular-nums text-slate-500">补充客诉率字段</td>
                <td className="py-3.5 px-3 text-center font-bold text-emerald-600">&lt; 0.5%</td>
                <td className="py-3.5 px-3">补充数据周期</td>
                <td className="py-3.5 px-4 text-slate-500">达标得满分；高于达标线每 0.1 个百分点扣 2 分。</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">催上门/催放款时效</td>
                <td className="py-3.5 px-4 tabular-nums text-slate-500">时效内量级 / 总量级</td>
                <td className="py-3.5 px-3 text-center font-bold text-emerald-600">≥ 80%</td>
                <td className="py-3.5 px-3">客诉与时效数据周期</td>
                <td className="py-3.5 px-4 text-slate-500">达标得满分；低于达标线每 1 个百分点扣 3 分。</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-rose-600 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                  飞单量
                </td>
                <td className="py-3.5 px-4 tabular-nums text-slate-500">核实违规飞单累计量</td>
                <td className="py-3.5 px-3 text-center font-bold text-red-600">0 条</td>
                <td className="py-3.5 px-3">补充口径</td>
                <td className="py-3.5 px-4 text-red-500 font-semibold">每 1 条扣 10 分，不设扣分下限。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-500" />
          模块三：评分规则
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {[
            ['成交率', '10 分'],
            ['催上门时效内率', '30 分'],
            ['催放款时效内率', '20 分'],
            ['议价额率', '20 分'],
            ['客诉率', '20 分'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-slate-500">{label}</p>
              <p className="text-lg font-black text-slate-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed pl-1">
          总分 100 分；飞单量为额外扣分项，每核实 1 条扣 10 分。
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-500" />
          模块四：季度流量切分规则
        </h3>
        <div className="space-y-5 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-900">排名决定基础流量比例</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[460px] text-center border-collapse">
                <thead>
                  <tr className="bg-blue-800 text-white text-xs font-bold">
                    <th className="py-3 px-4 border-r border-blue-900/40">排名</th>
                    <th className="py-3 px-4">三家服务商基础流量比例</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-900 bg-white">
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-200">第1名</td>
                    <td className="py-3 px-4 font-semibold">50%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-200">第2名</td>
                    <td className="py-3 px-4 font-semibold">30%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-200">第3名</td>
                    <td className="py-3 px-4 font-semibold">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="font-semibold text-slate-700">说明：</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>每季度末，计算各服务商本季度内各月得分的平均分，并按平均分从高到低排序。</li>
              <li>固定三家服务商参与切分，基础流量按排名对应比例分配。</li>
            </ul>
          </div>

          <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-900">高分激励：头部省份流量优先分配</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-3xl">
              <table className="w-full min-w-[520px] text-left border-collapse">
                <thead>
                  <tr className="bg-blue-800 text-white text-xs font-bold">
                    <th className="py-3 px-4 border-r border-blue-900/40 w-1/3 text-center">条件</th>
                    <th className="py-3 px-4 text-center">激励政策</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-900 bg-white">
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-200 text-center font-semibold">季度平均得分 ≥80分</td>
                    <td className="py-3 px-4">获得下季度优先分配头部省份流量的资格</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="font-semibold text-slate-700">头部省份定义：</p>
            <p className="border-l-4 border-slate-300 pl-4 text-slate-500">订单量大、客单价高、履约难度低的一二线省份。</p>
            <p className="font-semibold text-slate-700">分配方式：</p>
            <p className="border-l-4 border-slate-300 pl-4 text-slate-500">符合条件的服务商，可在基础流量中优先获得一定比例的头部省份订单。具体比例由甲方结合实际经营情况统筹确定。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

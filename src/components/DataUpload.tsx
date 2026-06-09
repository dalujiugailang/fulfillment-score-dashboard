import JSZip from 'jszip';
import { ChangeEvent, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, FileSpreadsheet, History, RotateCcw, Upload } from 'lucide-react';
import {
  EvaluationPeriod,
  PROVIDER_COMPANIES,
  ProviderName,
  ProviderRawRow,
  ProviderScoreRow,
  UploadHistoryEntry,
  normalizeProvider,
  recalculateRow
} from '../dashboardData';

interface DataUploadProps {
  rows: ProviderScoreRow[];
  onRowsChange: (rows: ProviderScoreRow[]) => Promise<void>;
  history: UploadHistoryEntry[];
  onHistoryChange: (history: Array<UploadHistoryEntry & { sourceRows?: Record<string, Cell>[] }>) => Promise<void>;
  onResetPeriod: () => Promise<void>;
  periods: EvaluationPeriod[];
  activePeriodId: string;
  onActivePeriodChange: (periodId: string) => void;
}

type SourceType = 'score' | 'complaint';
type Cell = string | number;
type FlyOrderInputs = Record<ProviderName, string>;

interface UploadPreview {
  fileName: string;
  sourceType: SourceType;
  period: string;
  rowCount: number;
  sourceRows: Record<string, Cell>[];
  rows: ProviderScoreRow[];
  matchedProviders: ProviderName[];
  fields: string[];
  warnings: string[];
}

const parseNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(String(value).replace(/,/g, '').replace(/%/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRate = (value: unknown) => {
  const number = parseNumber(value);
  return number > 1 ? number / 100 : number;
};

const normalizeDateText = (value: unknown) => String(value ?? '').slice(0, 10).replace(/\./g, '-');

const parsePeriodBounds = (period: string) => {
  const [start, end] = period.split(/\s+-\s+/).map(item => item.trim().replace(/\./g, '-'));
  return { start, end };
};

const inPeriod = (value: unknown, period: string) => {
  const date = normalizeDateText(value);
  const { start, end } = parsePeriodBounds(period);
  return Boolean(date && date !== '9999-12-31' && start && end && date >= start && date <= end);
};

const get = (row: Record<string, Cell>, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
};

const columnIndex = (ref: string) => {
  const letters = ref.replace(/[0-9]/g, '');
  return letters.split('').reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0) - 1;
};

const parseCsv = (text: string): Record<string, Cell>[] => {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(item => item.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(item => item.trim());
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
};

const parseXlsx = async (file: File): Promise<Record<string, Cell>[]> => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings: string[] = [];
  if (sharedXml) {
    const sharedDoc = new DOMParser().parseFromString(sharedXml, 'application/xml');
    sharedDoc.querySelectorAll('si').forEach(si => {
      sharedStrings.push(Array.from(si.querySelectorAll('t')).map(t => t.textContent || '').join(''));
    });
  }

  const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');
  if (!sheetXml) return [];
  const sheetDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');
  const matrix: Cell[][] = [];

  sheetDoc.querySelectorAll('row').forEach(rowNode => {
    const cells: Cell[] = [];
    rowNode.querySelectorAll('c').forEach(cellNode => {
      const ref = cellNode.getAttribute('r') || '';
      const index = columnIndex(ref);
      const type = cellNode.getAttribute('t');
      const raw = cellNode.querySelector('v')?.textContent || cellNode.querySelector('is t')?.textContent || '';
      let value: Cell = raw;
      if (type === 's') value = sharedStrings[Number(raw)] ?? '';
      else if (raw !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
      cells[index] = value;
    });
    matrix.push(cells);
  });

  const headers = (matrix[0] || []).map(item => String(item ?? '').trim());
  return matrix.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== '')).map(row => {
    return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
  });
};

const readRows = async (file: File) => {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCsv(await file.text());
  }
  return parseXlsx(file);
};

const createUploadId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const providerNames = Object.keys(PROVIDER_COMPANIES) as ProviderName[];

const createFlyOrderInputs = (rows: ProviderScoreRow[]): FlyOrderInputs => {
  return Object.fromEntries(providerNames.map(provider => {
    const row = rows.find(item => normalizeProvider(item.provider) === provider);
    return [provider, String(Math.max(0, row?.flyOrderCount ?? 0))];
  })) as FlyOrderInputs;
};

const parseFlyOrderCount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const countUnmatchedProviderRows = (sourceRows: Record<string, Cell>[], sourceType: SourceType) => {
  const providerKeys = sourceType === 'score'
    ? ['服务商企业名称', '服务商', '服务商名称']
    : ['服务商', '服务商名称'];
  return sourceRows.filter(source => !normalizeProvider(get(source, providerKeys))).length;
};

const mergeScoreRows = (currentRows: ProviderScoreRow[], sourceRows: Record<string, Cell>[], period: string) => {
  const isRawFulfillmentSource = sourceRows.some(source => source['服务商企业名称'] !== undefined && source['订单创建日期'] !== undefined);
  if (isRawFulfillmentSource) {
    const nextByProvider = new Map<ProviderName, ProviderRawRow>();
    currentRows.forEach(row => {
      const provider = normalizeProvider(row.provider);
      if (!provider) return;
      nextByProvider.set(provider, {
        ...row,
        provider,
        submittedOrders: 0,
        closedOrders: 0,
        dealRate: 0,
        bargainOrderCount: 0,
        bargainSubmittedAmount: 0,
        bargainClosedAmount: 0,
        bargainRate: 0,
        sourcePeriod: period,
        hasScoreSource: true
      });
    });

    sourceRows.forEach(source => {
      const provider = normalizeProvider(get(source, ['服务商企业名称', '服务商', '服务商名称']));
      if (!provider) return;
      const current = nextByProvider.get(provider);
      if (!current) return;
      const submittedOrders = parseNumber(get(source, ['提交订单量']));
      const submittedAmount = parseNumber(get(source, ['提交订单金额']));
      const closedOrders = parseNumber(get(source, ['成交订单量']));
      const closedAmount = parseNumber(get(source, ['成交订单金额']));

      if (inPeriod(get(source, ['订单创建日期']), period)) {
        current.submittedOrders += submittedOrders;
        current.closedOrders += closedOrders;
      }
      if (inPeriod(get(source, ['订单成交日期']), period) && Math.abs(closedOrders - 1) < 1e-9) {
        current.bargainOrderCount += 1;
        current.bargainSubmittedAmount += submittedAmount;
        current.bargainClosedAmount += closedAmount;
      }
    });

    const updated = currentRows.map(row => {
      const provider = normalizeProvider(row.provider);
      return recalculateRow(provider ? nextByProvider.get(provider) || { ...row, provider } : row);
    });
    const matchedProviders = updated
      .filter(row => row.hasScoreSource && row.submittedOrders > 0)
      .map(row => normalizeProvider(row.provider))
      .filter((provider): provider is ProviderName => Boolean(provider));
    return { rows: updated, matchedProviders };
  }

  const updated = [...currentRows];
  const matched = new Set<ProviderName>();

  sourceRows.forEach(source => {
    const provider = normalizeProvider(get(source, ['服务商', '服务商名称', '服务商企业名称']));
    if (!provider) return;
    const existing = updated.find(row => row.provider === provider);
    if (!existing) return;

    const submittedOrders = parseNumber(get(source, ['提交订单量', '提交单']));
    const closedOrders = parseNumber(get(source, ['成交订单量', '成交单']));
    const bargainSubmittedAmount = parseNumber(get(source, ['议价口径提交金额', '提交金额']));
    const bargainClosedAmount = parseNumber(get(source, ['议价口径成交金额', '成交金额']));

    const next = recalculateRow({
      ...existing,
      companyName: PROVIDER_COMPANIES[provider],
      submittedOrders,
      closedOrders,
      dealRate: normalizeRate(get(source, ['成交率'])),
      bargainOrderCount: parseNumber(get(source, ['议价口径订单量', '口径订单'])),
      bargainSubmittedAmount,
      bargainClosedAmount,
      bargainRate: normalizeRate(get(source, ['议价额率'])),
      complaintRate: normalizeRate(get(source, ['客诉率'])) || existing.complaintRate,
      flyOrderCount: parseNumber(get(source, ['飞单量'])),
      sourcePeriod: period,
      hasScoreSource: true
    });
    updated[updated.indexOf(existing)] = next;
    matched.add(provider);
  });

  return { rows: updated, matchedProviders: Array.from(matched) };
};

const mergeComplaintRows = (currentRows: ProviderScoreRow[], sourceRows: Record<string, Cell>[], fallbackPeriod: string) => {
  const updated = [...currentRows];
  const matched = new Set<ProviderName>();
  const grouped = new Map<ProviderName, {
    period: string;
    visitIn: number;
    visitOut: number;
    payoutIn: number;
    payoutOut: number;
    complaintRate?: number;
  }>();

  sourceRows.forEach(source => {
    const provider = normalizeProvider(get(source, ['服务商', '服务商名称']));
    if (!provider) return;
    const current = grouped.get(provider) || { period: String(get(source, ['周期起止日期']) || fallbackPeriod), visitIn: 0, visitOut: 0, payoutIn: 0, payoutOut: 0 };
    const category = String(get(source, ['业务大类']));
    const timing = String(get(source, ['时效类型']));
    const amount = parseNumber(get(source, ['量级']));
    const currentValue = normalizeRate(get(source, ['当期值']));

    if (category.includes('催上门')) {
      if (timing.includes('时效内')) current.visitIn += amount;
      if (timing.includes('时效外')) current.visitOut += amount;
    } else if (category.includes('催放款')) {
      if (timing.includes('时效内')) current.payoutIn += amount;
      if (timing.includes('时效外')) current.payoutOut += amount;
    } else if (category.includes('客诉率')) {
      current.complaintRate = currentValue;
    }
    grouped.set(provider, current);
  });

  grouped.forEach((source, provider) => {
    const existing = updated.find(row => row.provider === provider);
    if (!existing) return;
    const next = recalculateRow({
      ...existing,
      onTimeVisitOrders: source.visitIn,
      visitTotalOrders: source.visitIn + source.visitOut,
      onTimeVisitRate: source.visitIn + source.visitOut > 0 ? source.visitIn / (source.visitIn + source.visitOut) : existing.onTimeVisitRate,
      onTimePayoutOrders: source.payoutIn,
      payoutTotalOrders: source.payoutIn + source.payoutOut,
      onTimePayoutRate: source.payoutIn + source.payoutOut > 0 ? source.payoutIn / (source.payoutIn + source.payoutOut) : existing.onTimePayoutRate,
      complaintRate: source.complaintRate ?? existing.complaintRate,
      sourcePeriod: source.period,
      hasComplaintSource: true
    });
    updated[updated.indexOf(existing)] = next;
    matched.add(provider);
  });

  return { rows: updated, matchedProviders: Array.from(matched) };
};

export const DataUpload = ({ rows, onRowsChange, history, onHistoryChange, onResetPeriod, periods, activePeriodId, onActivePeriodChange }: DataUploadProps) => {
  const [sourceType, setSourceType] = useState<SourceType>('complaint');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingFlyOrders, setSavingFlyOrders] = useState(false);
  const [flyOrderInputs, setFlyOrderInputs] = useState<FlyOrderInputs>(() => createFlyOrderInputs(rows));
  const activePeriod = periods.find(period => period.id === activePeriodId) || periods[0];
  const period = activePeriod.range;
  const activePeriodHistory = history.filter(item => item.period === period);
  const activeScoreVersion = activePeriodHistory.find(item => item.sourceType === 'score' && item.status === 'success');
  const activeComplaintVersion = activePeriodHistory.find(item => item.sourceType === 'complaint' && item.status === 'success');

  useEffect(() => {
    setFlyOrderInputs(createFlyOrderInputs(rows));
  }, [rows, activePeriodId]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const sourceRows = await readRows(file);
      const result = sourceType === 'score'
        ? mergeScoreRows(rows, sourceRows, period)
        : mergeComplaintRows(rows, sourceRows, period);
      const unmatchedRowCount = countUnmatchedProviderRows(sourceRows, sourceType);
      const missingProviders = providerNames.filter(provider => !result.matchedProviders.includes(provider));

      const warnings = [
        ...(sourceRows.length === 0 ? ['文件没有解析到有效数据行。'] : []),
        ...(result.matchedProviders.length === 0 ? ['没有匹配到服务商，请检查服务商列是否包含清洋、海鲸、小智或对应企业名称。'] : []),
        ...(unmatchedRowCount > 0 ? [`有 ${unmatchedRowCount.toLocaleString('zh-CN')} 行无法识别服务商，发布后这些行不会写入评分。`] : []),
        ...(result.matchedProviders.length > 0 && missingProviders.length > 0 ? [`仅匹配到部分服务商，未匹配：${missingProviders.join('、')}。`] : [])
      ];

      setPreview({
        fileName: file.name,
        sourceType,
        period,
        rowCount: sourceRows.length,
        sourceRows,
        rows: result.rows,
        matchedProviders: result.matchedProviders,
        fields: sourceType === 'score'
          ? ['提交订单量', '成交订单量', '成交率', '议价口径订单量', '议价额率', '飞单量']
          : ['催上门时效内率', '催放款时效内率', '客诉率'],
        warnings
      });
      setMessage(warnings.length > 0 ? '文件已解析，请先处理预览中的风险提示。' : '文件已解析完成，确认无误后可发布到当前周期。');
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : '解析失败');
    } finally {
      event.target.value = '';
    }
  };

  const handlePublish = async () => {
    if (!preview || preview.matchedProviders.length === 0) return;
    setPublishing(true);
    try {
      await onRowsChange(preview.rows);
      const entry: UploadHistoryEntry = {
        id: createUploadId(),
        uploadedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        sourceType: preview.sourceType,
        period: preview.period,
        fileName: preview.fileName,
        rowCount: preview.rowCount,
        matchedProviders: preview.matchedProviders,
        status: 'success',
        message: `发布成功：匹配 ${preview.matchedProviders.join('、')}，已覆盖${preview.sourceType === 'score' ? '履约' : '客诉/时效'}字段。`
      };
      await onHistoryChange([{ ...entry, sourceRows: preview.sourceRows }]);
      setMessage(entry.message);
      setPreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发布失败，请稍后重试。');
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveFlyOrders = async () => {
    setSavingFlyOrders(true);
    try {
      const nextRows = rows.map(row => {
        const provider = normalizeProvider(row.provider);
        if (!provider) return row;
        return recalculateRow({
          ...row,
          flyOrderCount: parseFlyOrderCount(flyOrderInputs[provider])
        });
      });
      await onRowsChange(nextRows);
      const summary = providerNames
        .map(provider => `${provider}${parseFlyOrderCount(flyOrderInputs[provider])}单`)
        .join('、');
      setMessage(`飞单量保存成功：${activePeriod.name} ${summary}，已按每单扣10分重新计算。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '飞单量保存失败，请稍后重试。');
    } finally {
      setSavingFlyOrders(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(`确认恢复/清空${activePeriod.name}（${activePeriod.range}）的数据吗？该操作会影响当前周期评分结果。`);
    if (!confirmed) return;
    await onResetPeriod();
    setPreview(null);
    setMessage(activePeriod.id === 'P01' ? '已恢复第1期默认数据：2026.05.10-2026.05.16 履约源 + 客诉/时效源。' : `已清空${activePeriod.name}数据，等待重新上传。`);
  };

  const messageTone = message.includes('成功') ? 'success' : message.includes('已解析') ? 'info' : 'error';
  const versionCards: Array<{ label: string; entry?: UploadHistoryEntry; emptyText: string }> = [
    { label: '履约源', entry: activeScoreVersion, emptyText: '当前周期暂无已发布履约源' },
    { label: '客诉/时效源', entry: activeComplaintVersion, emptyText: '当前周期暂无已发布客诉/时效源' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {[
          ['1', '上传选择', '选择数据源、周期和文件'],
          ['2', '校验预览', '确认行数、服务商和覆盖字段'],
          ['3', '确认发布', '发布后才会写入评分数据'],
          ['4', '版本历史', '追溯文件、行数和发布结果']
        ].map(([step, title, desc]) => (
          <div key={step} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white inline-flex items-center justify-center text-xs font-black">{step}</span>
              <div>
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">当前周期版本状态</h3>
            <p className="text-xs text-slate-400 mt-1">{activePeriod.name}（{period}）当前已发布的数据源。</p>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold self-start ${
            activeScoreVersion && activeComplaintVersion ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'
          }`}>
            {activeScoreVersion && activeComplaintVersion ? '双源已发布' : '仍有数据源待补'}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {versionCards.map(card => (
            <div key={card.label} className={`rounded-lg border p-4 ${card.entry ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/60'}`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-xs font-bold ${card.entry ? 'text-emerald-700' : 'text-amber-700'}`}>{card.label}</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${card.entry ? 'border-emerald-100 bg-white text-emerald-700' : 'border-amber-100 bg-white text-amber-700'}`}>
                  {card.entry ? '已发布' : '待上传'}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800 truncate" title={card.entry?.fileName || card.emptyText}>
                {card.entry?.fileName || card.emptyText}
              </p>
              {card.entry && (
                <p className="mt-2 text-xs text-slate-500">
                  {card.entry.uploadedAt} · {card.entry.rowCount.toLocaleString('zh-CN')} 行 · 匹配 {card.entry.matchedProviders.join('、') || '-'}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              1. 上传选择
            </h3>
            <p className="text-xs text-slate-400 mt-1">选择数据源类型、目标周期和文件。选择文件后只进入校验预览，不会立即覆盖数据。</p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-700 font-bold self-start">
            CSV / XLSX
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 block">数据源类型</label>
            <select
              value={sourceType}
              onChange={(event) => {
                setSourceType(event.target.value as SourceType);
                setPreview(null);
                setMessage('');
              }}
              className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none bg-white text-slate-700 focus:border-blue-500"
            >
              <option value="complaint">客诉/时效数据源</option>
              <option value="score">履约数据源</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 block">目标周期</label>
            <select
              value={activePeriodId}
              onChange={(event) => {
                onActivePeriodChange(event.target.value);
                setPreview(null);
                setMessage('');
              }}
              className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none bg-white text-slate-700 focus:border-blue-500"
            >
              {periods.map(item => (
                <option key={item.id} value={item.id}>{item.name} · {item.range}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 block">上传文件</label>
            <label className="w-full text-xs px-3.5 py-2 border border-dashed border-blue-200 rounded-lg bg-blue-50/60 text-blue-700 font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-50">
              <FileSpreadsheet className="w-4 h-4" />
              选择 CSV / XLSX
              <input type="file" accept=".csv,.xlsx" onChange={handleFile} className="hidden" />
            </label>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">匹配规则</p>
          <p>履约数据源读取：服务商企业名称、订单创建日期、订单成交日期、提交/成交订单量、提交/成交订单金额。</p>
          <p>客诉/时效源读取：周期起止日期、业务大类、服务商、时效类型、量级、当期值。</p>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">飞单量录入</h3>
            <p className="text-xs text-slate-400 mt-1">录入 {activePeriod.name}（{period}）三家服务商的飞单量，保存后立即落库并重算扣分。</p>
          </div>
          <button
            type="button"
            disabled={savingFlyOrders}
            onClick={handleSaveFlyOrders}
            className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed self-start"
          >
            {savingFlyOrders ? '保存中...' : '保存飞单量'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providerNames.map(provider => {
            const count = parseFlyOrderCount(flyOrderInputs[provider]);
            return (
              <div key={provider} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{provider}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate" title={PROVIDER_COMPANIES[provider]}>
                    {PROVIDER_COMPANIES[provider]}
                  </p>
                </div>
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-400">本阶段飞单量</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={flyOrderInputs[provider]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFlyOrderInputs(current => ({ ...current, [provider]: value }));
                    }}
                    className="mt-1 w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg outline-none bg-white text-slate-800 focus:border-blue-500 tabular-nums"
                    placeholder="0"
                  />
                </label>
                <p className="text-xs text-slate-500">当前扣分：<span className="font-bold text-red-600">-{count * 10}分</span></p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">2. 校验预览</h3>
            <p className="text-xs text-slate-400 mt-1">发布前请核对解析行数、匹配服务商和将覆盖的字段。</p>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold self-start ${
            preview ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}>
            {preview ? '已生成预览' : '等待文件'}
          </span>
        </div>
        {preview && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-900">待发布文件</p>
                <p className="text-xs text-blue-700 mt-1">
                  已解析 {preview.rowCount.toLocaleString('zh-CN')} 行，确认发布后才会覆盖当前周期数据。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-white/80 bg-white p-3">
                <p className="text-slate-400 font-semibold">文件</p>
                <p className="text-slate-800 font-bold mt-1 truncate" title={preview.fileName}>{preview.fileName}</p>
              </div>
              <div className="rounded-lg border border-white/80 bg-white p-3">
                <p className="text-slate-400 font-semibold">数据源类型</p>
                <p className="text-slate-800 font-bold mt-1">{preview.sourceType === 'score' ? '履约数据源' : '客诉/时效数据源'}</p>
              </div>
              <div className="rounded-lg border border-white/80 bg-white p-3">
                <p className="text-slate-400 font-semibold">目标周期</p>
                <p className="text-slate-800 font-bold mt-1">{activePeriod.name} · {preview.period}</p>
              </div>
              <div className="rounded-lg border border-white/80 bg-white p-3">
                <p className="text-slate-400 font-semibold">匹配服务商</p>
                <p className="text-slate-800 font-bold mt-1">{preview.matchedProviders.join('、') || '未匹配'}</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/80 bg-white p-3 text-xs">
              <p className="font-bold text-slate-700">将覆盖字段</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.fields.map(field => (
                  <span key={field} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">{field}</span>
                ))}
              </div>
            </div>

            {preview.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  发布前请确认
                </p>
                {preview.warnings.map(warning => <p key={warning}>{warning}</p>)}
              </div>
            )}
          </div>
        )}
        {!preview && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-500 mt-3">还没有待校验文件</p>
            <p className="text-xs text-slate-400 mt-1">请先在“上传选择”中选择 CSV 或 XLSX 文件。</p>
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">3. 发布结果与风险操作</h3>
            <p className="text-xs text-slate-400 mt-1">确认发布后才会写入当前周期；恢复默认数据属于高风险操作。</p>
          </div>
          <button
            type="button"
            disabled={!preview || preview.matchedProviders.length === 0 || publishing}
            onClick={handlePublish}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed self-start"
          >
            {publishing ? '发布中...' : '确认发布'}
          </button>
        </div>
        {message && (
          <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
            messageTone === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : messageTone === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {messageTone === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span>{message}</span>
          </div>
        )}

        <div className="rounded-lg border border-red-100 bg-red-50/50 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-red-700">恢复默认数据</p>
            <p className="text-xs text-red-600/80 mt-1">会影响 {activePeriod.name}（{activePeriod.range}）当前评分结果，操作前会再次确认。</p>
          </div>
          <button
            onClick={handleReset}
            className="text-xs px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 inline-flex items-center gap-1.5 self-start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认数据
          </button>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">4. 版本历史</h4>
            <p className="text-xs text-slate-400 mt-1">最近 50 条上传记录，用于追溯文件、行数、匹配范围和发布说明。</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-400 font-semibold tabular-nums">
                <th className="py-3 px-4">上传时间</th>
                <th className="py-3 px-4">类型</th>
                <th className="py-3 px-4">周期</th>
                <th className="py-3 px-4">文件</th>
                <th className="py-3 px-4 text-right">行数</th>
                <th className="py-3 px-4">匹配服务商</th>
                <th className="py-3 px-4">说明</th>
                <th className="py-3 px-4">结果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {history.map(item => (
                <tr key={item.id}>
                  <td className="py-3 px-4 tabular-nums text-slate-500">{item.uploadedAt}</td>
                  <td className="py-3 px-4">{item.sourceType === 'score' ? '履约' : '客诉/时效'}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-500">{item.period}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-500">{item.fileName}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-500 text-right">{item.rowCount.toLocaleString('zh-CN')}</td>
                  <td className="py-3 px-4">{item.matchedProviders.join('、') || '-'}</td>
                  <td className="py-3 px-4 max-w-[280px] truncate text-slate-500" title={item.message}>{item.message}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      item.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {item.status === 'success' ? '成功' : '失败'}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td className="py-8 px-4 text-center text-slate-400" colSpan={8}>暂无上传记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

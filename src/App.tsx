import React, { useEffect, useState } from 'react';
import { BarChart3, Bell, BookOpen, ClipboardList, Database, LogOut, Menu, RefreshCw, Search, Shield, SlidersHorizontal, UserCheck, X, Zap } from 'lucide-react';
import { PublicHeader } from './components/PublicHeader';
import { OverviewRanking } from './components/OverviewRanking';
import { BiWeeklyDetails } from './components/BiWeeklyDetails';
import { RuleDescription } from './components/RuleDescription';
import { LoginScreen, UserSession } from './components/LoginScreen';
import { DataUpload } from './components/DataUpload';
import {
  AllocationSummary,
  EVALUATION_CYCLE,
  PERIOD_OPTIONS,
  ProviderName,
  ProviderScoreRow,
  REPORT_META,
  UploadHistoryEntry,
  WEEKLY_PERIODS
} from './dashboardData';
import { canViewUpload, getSessionProvider } from './auth';

type TabId = 'overview' | 'details' | 'upload' | 'rules';

interface DashboardPayload {
  overviewRows: ProviderScoreRow[];
  detailRows: ProviderScoreRow[];
  allocationSummary: AllocationSummary[];
  uploadHistory: UploadHistoryEntry[];
  uploadedPeriodCount: number;
  totalSubmittedOrders: number;
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      if (!localStorage.getItem('cp_auth_token')) return null;
      const saved = localStorage.getItem('cp_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePeriodId, setActivePeriodId] = useState(PERIOD_OPTIONS[0].id);
  const [providerFilter, setProviderFilter] = useState<'ALL' | ProviderName>('ALL');
  const [viewMode, setViewMode] = useState('综合分');
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [dashboardError, setDashboardError] = useState('');

  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('cp_user_session', JSON.stringify(userSession));
  };

  const handleLogout = () => {
    const token = localStorage.getItem('cp_auth_token');
    if (token) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }
    setSession(null);
    setDashboard(null);
    localStorage.removeItem('cp_auth_token');
    localStorage.removeItem('cp_user_session');
  };

  const activePeriod = PERIOD_OPTIONS.find(period => period.id === activePeriodId) || PERIOD_OPTIONS[0];
  const isOverviewPeriod = activePeriod.id === 'ALL';
  const rows = dashboard?.overviewRows || [];
  const detailRows = dashboard?.detailRows || [];
  const uploadHistory = dashboard?.uploadHistory || [];
  const uploadedPeriodCount = dashboard?.uploadedPeriodCount || 0;
  const totalSubmittedOrders = dashboard?.totalSubmittedOrders || 0;
  const activePeriodHistory = isOverviewPeriod
    ? uploadHistory
    : uploadHistory.filter(item => item.period === activePeriod.range);
  const defaultSource = (sourceType: 'score' | 'complaint', fileName: string): UploadHistoryEntry => ({
    id: `default-${sourceType}-${activePeriod.id}`,
    uploadedAt: REPORT_META.generatedAt,
    sourceType,
    period: activePeriod.range,
    fileName,
    rowCount: sourceType === 'score' ? REPORT_META.createScopeRows : 0,
    matchedProviders: ['海鲸', '清洋', '小智'],
    status: 'success',
    message: '系统默认初始化数据源'
  });
  const activeSources = {
    score: activePeriodHistory.find(item => item.sourceType === 'score' && item.status === 'success')
      || (!isOverviewPeriod && activePeriod.id === 'P01' && detailRows.some(row => row.hasScoreSource) ? defaultSource('score', REPORT_META.sourceFile) : undefined),
    complaint: activePeriodHistory.find(item => item.sourceType === 'complaint' && item.status === 'success')
      || (!isOverviewPeriod && activePeriod.id === 'P01' && detailRows.some(row => row.hasComplaintSource) ? defaultSource('complaint', REPORT_META.complaintSourceFile) : undefined)
  };

  useEffect(() => {
    if (session && !canViewUpload(session) && activeTab === 'upload') {
      setActiveTab('overview');
    }
  }, [activeTab, session]);

  const fetchDashboard = async (periodId = activePeriodId) => {
    const token = localStorage.getItem('cp_auth_token');
    if (!token) {
      handleLogout();
      return;
    }

    const response = await fetch(`/api/dashboard?periodId=${encodeURIComponent(periodId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      handleLogout();
      return;
    }

    setDashboard(await response.json());
    setDashboardError('');
  };

  useEffect(() => {
    if (!session) return;
    fetchDashboard().catch(() => setDashboardError('数据加载失败，请刷新页面后重试。'));
  }, [session, activePeriodId]);

  const authHeaders = () => {
    const token = localStorage.getItem('cp_auth_token') || '';
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const handleRowsChange = async (nextRows: ProviderScoreRow[]) => {
    if (isOverviewPeriod) return;
    const response = await fetch('/api/admin/period-rows', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ periodId: activePeriodId, rows: nextRows })
    });
    if (!response.ok) throw new Error('服务端保存评分数据失败');
    setDashboard(await response.json());
  };

  const handleHistoryChange = async (nextHistory: Array<UploadHistoryEntry & { sourceRows?: Record<string, unknown>[] }>) => {
    const [entry] = nextHistory;
    const response = await fetch('/api/admin/upload-history', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ entry, sourceRows: entry.sourceRows || [] })
    });
    if (!response.ok) throw new Error('服务端保存上传历史失败');
    const data = await response.json();
    setDashboard(current => current ? { ...current, uploadHistory: data.uploadHistory } : current);
  };

  const handleResetPeriod = async () => {
    if (isOverviewPeriod) return;
    const response = await fetch('/api/admin/reset-period', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ periodId: activePeriodId })
    });
    if (!response.ok) throw new Error('服务端重置周期数据失败');
    setDashboard(await response.json());
  };

  if (!session) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  const rawNavItems = [
    { id: 'overview', name: '履约作战台', icon: BarChart3, desc: '排名、短板与行动' },
    { id: 'details', name: '评分明细', icon: ClipboardList, desc: '分项指标与扣分拆解' },
    { id: 'upload', name: '数据上传', icon: Database, desc: '按周期上传履约与客诉源' },
    { id: 'rules', name: '口径说明', icon: BookOpen, desc: '成交、议价、客诉、飞单规则' },
  ] as const;
  const sessionProvider = getSessionProvider(session);
  const effectiveProviderFilter = sessionProvider || (providerFilter === 'ALL' ? null : providerFilter);
  const providerVisibleTabs: TabId[] = ['overview', 'details', 'rules'];
  const navItems = rawNavItems.filter(item => (
    canViewUpload(session)
      ? true
      : providerVisibleTabs.includes(item.id)
  ));
  const activeItem = navItems.find(item => item.id === activeTab) || navItems[0];

  return (
    <div className="command-center min-h-screen flex flex-col md:flex-row font-sans antialiased">
      <header className="md:hidden cc-shell border-b border-white/10 flex items-center justify-between px-4 h-16 sticky top-0 z-30 shadow-sm select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#c2410c] flex items-center justify-center text-white shadow-md shadow-black/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black text-white tracking-[0.14em]">GTM OPS</h1>
            <p className="text-[11px] text-white/60 font-medium">Fulfillment Command</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md border border-white/10 bg-white/10 text-white hover:bg-white/15"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <aside className={`
        cc-shell fixed inset-y-0 left-0 z-40 w-72 lg:w-80 border-r border-white/10 flex flex-col transition-transform duration-300 md:translate-x-0 md:static md:h-screen sticky md:top-0 shrink-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-20 border-b border-white/10 px-6 flex items-center gap-4 select-none shrink-0">
          <div className="w-10 h-10 rounded-md bg-[#c2410c] flex items-center justify-center text-white shadow-md shadow-black/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-[0.18em]">GTM OPS</h1>
            <p className="text-[11px] text-white/70 font-semibold tracking-[0.24em]">COMMAND CENTER</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col justify-between space-y-7">
          <div className="space-y-7">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-white/50 px-3 select-none tracking-[0.18em]">
                NAVIGATION
              </p>
              <nav className="space-y-1" role="tablist">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => {
                        if (item.id === 'upload' && activePeriodId === 'ALL') {
                          setActivePeriodId(WEEKLY_PERIODS[0].id);
                        }
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`cc-nav-item w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all cursor-pointer relative group ${
                        isSelected ? 'cc-nav-active font-bold' : ''
                      }`}
                    >
                      <div className="p-1.5 transition-colors text-white/55">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px]">{item.name}</p>
                        <p className={`text-[11px] font-normal truncate ${isSelected ? 'text-white/78' : 'text-white/58'}`}>
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="bg-white/8 border border-white/10 p-4 rounded-md space-y-3.5 shrink-0">
              <div className="flex items-center justify-between text-[11px] font-medium text-white/68">
                <span>当前评分口径</span>
                <span className="tabular-nums text-white font-bold">100分制</span>
              </div>
              <div className="text-[11px] text-white/62 leading-relaxed">
                {REPORT_META.scoringRule}
                <br />
                当前进度：{uploadedPeriodCount} / {WEEKLY_PERIODS.length} 期已上传。
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2 shrink-0">
            <p className="text-[11px] font-bold text-white/50 px-2 select-none tracking-[0.18em]">OPERATOR</p>
            <div className="bg-white/8 hover:bg-white/10 border border-white/10 rounded-md p-3 flex items-center justify-between gap-2.5 transition-all">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: session.avatarColor }}>
                  {session.userName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{session.userName}</p>
                  <p className="text-[11px] text-white/62 truncate">{session.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="退出并切换测试账号"
                className="p-1.5 rounded-md border border-white/10 hover:border-[#fe6e00]/60 hover:bg-[#fe6e00]/15 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-2 flex items-center gap-1.5 text-[11px] text-white/58 font-medium leading-normal">
              <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>数据来自履约源和客诉源，当前页面按考核表口径计算。</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/15 flex flex-col gap-1.5 select-none shrink-0 text-white/62">
          <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
            <span>数据版本</span>
            <span className="text-white/80">{EVALUATION_CYCLE.name}</span>
          </div>
          <div className="text-[11px] truncate" title={activeSources.score?.fileName || REPORT_META.sourceFile}>
            履约源：{activeSources.score?.fileName || REPORT_META.sourceFile}
          </div>
          <div className="text-[11px] truncate" title={activeSources.complaint?.fileName || REPORT_META.complaintSourceFile}>
            客诉源：{activeSources.complaint?.fileName || REPORT_META.complaintSourceFile}
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-xs md:hidden" />
      )}

      <div className="flex-1 min-w-0 flex flex-col h-screen md:overflow-y-auto">
        <header className="hidden md:flex bg-white h-16 border-b border-[#e5e7eb] items-center justify-between px-8 select-none shrink-0 sticky top-0 z-20 shadow-sm/5">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-80 h-9 rounded-md bg-[#f6f7f9] border border-[#e5e7eb] flex items-center gap-2 px-3 text-[#6b7280]">
              <Search className="w-4 h-4" />
              <span className="text-xs truncate">搜索服务商 / 指标 / 省份...</span>
            </div>
            <div className="h-7 w-px bg-[#e5e7eb]" />
            <div className="flex items-center gap-2 text-[#111827]">
              {React.createElement(activeItem.icon, { className: 'w-4 h-4 text-[#fe6e00]' })}
              <span className="text-sm font-black tracking-[0.08em]">服务商履约作战台</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] hover:text-[#111827] hover:bg-[#f6f7f9] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] hover:text-[#111827] hover:bg-[#f6f7f9] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <span className="text-[11px] px-3 py-2 rounded-md bg-[#f6f7f9] text-[#374151] tabular-nums font-bold">
              {activePeriod.name} · {activePeriod.range}
            </span>
            <button onClick={handleLogout} className="text-xs text-[#6b7280] hover:text-[#111827] font-bold cursor-pointer transition-colors px-3">
              切换用户
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-10 space-y-7">
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div>
              <p className="cc-kicker">{canViewUpload(session) ? 'ADMIN COMMAND' : 'PROVIDER ACCESS'}</p>
              <h2 className="cc-title text-3xl mt-2">服务商履约作战台</h2>
              <p className="text-sm text-[#6f665f] mt-1">
                {canViewUpload(session) ? '全量监控服务商履约、客诉、飞单与数据发布状态。' : '查看本方履约明细、匿名排名和考核口径。'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-[#6b7280] font-medium">服务商</span>
              <select
                value={sessionProvider || providerFilter}
                onChange={(event) => setProviderFilter(event.target.value as 'ALL' | ProviderName)}
                disabled={Boolean(sessionProvider)}
                className="text-xs px-3 h-10 border rounded-md outline-none focus:border-[#fe6e00] disabled:opacity-70"
              >
                {!sessionProvider && <option value="ALL">全部服务商</option>}
                {(['海鲸', '小智', '清洋'] as ProviderName[]).map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
              <span className="text-xs text-[#6b7280] font-medium">视角</span>
              <select
                value={viewMode}
                onChange={(event) => setViewMode(event.target.value)}
                className="text-xs px-3 h-10 border rounded-md outline-none focus:border-[#fe6e00]"
              >
                {['综合分', '履约能力', '履约质量', '业务类型'].map(mode => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fetchDashboard()}
                className="cc-secondary-button h-10 px-4 text-xs inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                刷新数据
              </button>
              <span className="text-xs text-[#797067] font-medium">当前周期</span>
              <select
                value={activePeriodId}
                onChange={(event) => setActivePeriodId(event.target.value)}
                className="text-xs px-3 h-10 border rounded-md outline-none focus:border-[#fe6e00]"
              >
                {PERIOD_OPTIONS.map(period => (
                  <option key={period.id} value={period.id}>{period.name} · {period.range}</option>
                ))}
              </select>
              {canViewUpload(session) && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePeriodId(isOverviewPeriod ? WEEKLY_PERIODS[0].id : activePeriodId);
                    setActiveTab('upload');
                  }}
                  className="cc-primary-button h-10 px-4 text-xs inline-flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  数据发布
                </button>
              )}
            </div>
          </section>
          {dashboardError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-lg p-3 text-xs font-semibold">
              {dashboardError}
            </div>
          )}
          {!dashboard && !dashboardError && (
            <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-sm text-slate-400">
              数据加载中...
            </div>
          )}
          {dashboard && (
            <PublicHeader
              rows={rows}
              activePeriod={activePeriod}
              uploadedPeriodCount={uploadedPeriodCount}
              totalSubmittedOrders={totalSubmittedOrders}
              activeSources={activeSources}
              visibleProvider={sessionProvider}
            />
          )}
          <div className="bg-transparent">
            {dashboard && activeTab === 'overview' && (
              <OverviewRanking
                rows={rows}
                allocationSummary={dashboard.allocationSummary}
                visibleProvider={sessionProvider}
                selectedProviderFilter={effectiveProviderFilter}
                viewMode={viewMode}
                onOpenDetails={() => setActiveTab('details')}
              />
            )}
            {dashboard && activeTab === 'details' && <BiWeeklyDetails rows={detailRows} />}
            {dashboard && activeTab === 'upload' && canViewUpload(session) && (
              <DataUpload
                rows={detailRows}
                onRowsChange={handleRowsChange}
                history={uploadHistory}
                onHistoryChange={handleHistoryChange}
                onResetPeriod={handleResetPeriod}
                periods={WEEKLY_PERIODS}
                activePeriodId={isOverviewPeriod ? WEEKLY_PERIODS[0].id : activePeriodId}
                onActivePeriodChange={setActivePeriodId}
              />
            )}
            {activeTab === 'rules' && <RuleDescription />}
          </div>
        </main>
      </div>
    </div>
  );
}

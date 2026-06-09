import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import chinaGeoJson from '@datapool/china.geojson';
import { AllocationSummary, PROVIDER_COLORS, ProviderName } from '../dashboardData';

const shortProvinceName = (name: string) => {
  return name
    .replace('维吾尔自治区', '')
    .replace('壮族自治区', '')
    .replace('回族自治区', '')
    .replace('自治区', '')
    .replace('特别行政区', '')
    .replace(/[省市]$/, '');
};

echarts.registerMap('china-provider-allocation', chinaGeoJson as unknown as Parameters<typeof echarts.registerMap>[1]);

interface ProvinceAllocationMapProps {
  allocationSummary: AllocationSummary[];
  visibleProvider: ProviderName | null;
}

export const ProvinceAllocationMap = ({ allocationSummary, visibleProvider }: ProvinceAllocationMapProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [selectedProvince, setSelectedProvince] = useState('');
  const providerByProvince = useMemo(() => {
    return allocationSummary.reduce<Record<string, ProviderName>>((acc, row) => {
      row.provinces.forEach(province => {
        acc[province] = row.provider;
      });
      return acc;
    }, {});
  }, [allocationSummary]);
  const assignedCount = useMemo(() => allocationSummary.reduce((sum, row) => sum + row.provinceCount, 0), [allocationSummary]);
  const mapData = useMemo(() => {
    return chinaGeoJson.features.map(feature => {
      const province = feature.properties.name;
      const provider = providerByProvince[province];
      const canShowProvider = Boolean(provider);
      const providerIndex = canShowProvider ? allocationSummary.findIndex(row => row.provider === provider) + 1 : 0;
      const providerLabel = canShowProvider ? provider : visibleProvider ? '其他服务商/未展示' : '暂未分配';

      return {
        name: province,
        value: providerIndex,
        provider: providerLabel,
        itemStyle: {
          areaColor: canShowProvider && provider ? PROVIDER_COLORS[provider] : '#E5E7EB',
          borderColor: '#FFFFFF',
          borderWidth: 1.2,
          shadowColor: canShowProvider ? 'rgba(15, 23, 42, 0.12)' : 'rgba(15, 23, 42, 0.04)',
          shadowBlur: canShowProvider ? 8 : 3
        },
        label: {
          color: canShowProvider ? '#FFFFFF' : '#64748B',
          fontWeight: canShowProvider ? 700 : 600
        }
      };
    });
  }, [allocationSummary, providerByProvince, visibleProvider]);
  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        borderWidth: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: { name: string; data?: { provider?: string } }) => {
          return `${params.name}<br/>服务商：${params.data?.provider ?? '暂未分配'}`;
        }
      },
      series: [
        {
          type: 'map',
          map: 'china-provider-allocation',
          data: mapData,
          roam: false,
          aspectScale: 0.85,
          zoom: 1.1,
          layoutCenter: ['50%', '52%'],
          layoutSize: '92%',
          selectedMode: false,
          label: {
            show: true,
            formatter: (params: { name: string }) => shortProvinceName(params.name),
            fontSize: 10,
            lineHeight: 12
          },
          itemStyle: {
            areaColor: '#E5E7EB',
            borderColor: '#FFFFFF',
            borderWidth: 1.2
          },
          emphasis: {
            label: {
              color: '#0F172A',
              fontWeight: 800
            },
            itemStyle: {
              areaColor: '#DBEAFE',
              borderColor: '#2563EB',
              borderWidth: 1.6
            }
          }
        }
      ]
    };
  }, [mapData]);

  useEffect(() => {
    if (!chartRef.current) return undefined;

    const chart = echarts.init(chartRef.current, null, { renderer: 'svg' });
    chartInstanceRef.current = chart;
    chart.setOption(option);
    chart.on('click', params => {
      if (typeof params.name === 'string') setSelectedProvince(params.name);
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.off('click');
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [option]);

  useEffect(() => {
    chartInstanceRef.current?.setOption(option, true);
  }, [option]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-stretch">
      <div className="relative min-w-0 h-[clamp(520px,48vw,760px)] min-h-[520px] bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border border-slate-100 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_42%,rgba(239,68,68,0.10),transparent_20%),radial-gradient(circle_at_84%_68%,rgba(37,99,235,0.08),transparent_22%)]" />
        <div className="relative h-full w-full max-w-[1040px] mx-auto">
          <div ref={chartRef} className="h-full w-full" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white/95 border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xl font-black text-slate-900">图例</p>
            <span className="text-xs tabular-nums text-slate-500">{assignedCount} 省级区域</span>
          </div>
          {selectedProvince && (
            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-[11px] font-black text-orange-700">当前选中省份</p>
              <p className="mt-1 text-lg font-black text-slate-900">{selectedProvince}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                归属服务商：{providerByProvince[selectedProvince] || (visibleProvider ? '其他服务商/未展示' : '暂未分配')}
              </p>
              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                后续可接入该省综合分、当期量级、主要问题和服务商调整建议。
              </p>
            </div>
          )}
          <div className="space-y-4">
            {allocationSummary.map(row => (
              <div key={row.provider} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-lg font-black" style={{ color: PROVIDER_COLORS[row.provider] }}>
                    <span className="w-9 h-5 rounded-sm shadow-sm" style={{ backgroundColor: PROVIDER_COLORS[row.provider] }} />
                    {row.provider}
                  </span>
                  <span className="text-xs tabular-nums text-slate-500">{row.provinceCount} 省</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-12">{row.provinces.join('、')}</p>
              </div>
            ))}
            {visibleProvider && (
              <div className="flex items-center gap-3 text-xs pt-3 border-t border-slate-100 font-semibold text-slate-500">
                <span className="w-9 h-5 rounded-sm bg-slate-200 border border-slate-300" />
                其他服务商/未展示
              </div>
            )}
            <div className="flex items-center gap-3 text-xs pt-3 border-t border-slate-100 font-semibold text-slate-500">
              <span className="w-9 h-5 rounded-sm bg-slate-200 border border-slate-300" />
              未分配/未纳入本次范围
            </div>
          </div>
        </div>

        <div className="bg-white/95 border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-black text-blue-800 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-700 text-white inline-flex items-center justify-center text-xs">i</span>
            说明
          </p>
          <p className="text-xs text-slate-600 leading-relaxed mt-3">
            本图基于中国省级 GeoJSON 边界绘制，按服务商归属着色；灰色区域为未分配或未纳入本次范围地区。
          </p>
        </div>
      </div>
    </div>
  );
};

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Package,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { statsService } from '@/lib/services/statsService';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import {
  PageLoading,
  CardSkeleton,
  TableSkeleton,
} from '@/components/ui/LoadingSpinner';
import DataTable from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { showError } from '@/components/ui/Toast';
import { formatRupiah } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import type { IncomeRecap, RecapPeriod, RecapBreakdownRow } from '@/types';

// ─── Local date helpers ───────────────────────────────────────────

const MONTHS_LONG_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "Today" sebagai local midnight (bukan UTC) supaya perbandingan akurat. */
function todayLocal(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Format Date → 'YYYY-MM-DD' memakai komponen local time. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Geser refDate sebanyak satu periode (direction +1 = next, -1 = prev). */
function shiftDate(period: RecapPeriod, date: Date, direction: 1 | -1): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === 'week') {
    d.setDate(d.getDate() + 7 * direction);
  } else if (period === 'year') {
    d.setFullYear(d.getFullYear() + direction);
  } else {
    d.setMonth(d.getMonth() + direction);
  }
  return d;
}

/** Hitung hari Senin dari minggu yang memuat `d`. */
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0=Minggu … 6=Sabtu
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  return x;
}

/** Apakah refDate berada di periode yang memuat hari ini? (next disabled) */
function isInCurrentPeriod(period: RecapPeriod, refDate: Date): boolean {
  const now = todayLocal();
  if (period === 'year') return refDate.getFullYear() === now.getFullYear();
  if (period === 'month') {
    return (
      refDate.getFullYear() === now.getFullYear() &&
      refDate.getMonth() === now.getMonth()
    );
  }
  return mondayOf(refDate).getTime() === mondayOf(now).getTime();
}

/** Label periode untuk navigator. */
function periodLabel(period: RecapPeriod, refDate: Date): string {
  if (period === 'year') return String(refDate.getFullYear());
  if (period === 'month') {
    return `${MONTHS_LONG_ID[refDate.getMonth()]} ${refDate.getFullYear()}`;
  }
  const start = mondayOf(refDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${toISODate(start).slice(8)} – ${toISODate(end).slice(8)} ${MONTHS_LONG_ID[start.getMonth()].slice(0, 3)} ${start.getFullYear()}`;
}

// ─── Inline components ────────────────────────────────────────────

function GrowthBadge({ growthPct }: { growthPct: number | null }) {
  if (growthPct === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        N/A
      </span>
    );
  }
  if (growthPct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
        <ArrowUp size={11} />
        {growthPct}%
      </span>
    );
  }
  if (growthPct < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
        <ArrowDown size={11} />
        {Math.abs(growthPct)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      <Minus size={11} />0%
    </span>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  growthPct: number | null;
  loading: boolean;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconBg,
  growthPct,
  loading,
}: SummaryCardProps) {
  if (loading) return <CardSkeleton />;
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>
        <GrowthBadge growthPct={growthPct} />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
    </div>
  );
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: RecapPeriod;
  onChange: (p: RecapPeriod) => void;
}) {
  const options: { value: RecapPeriod; label: string }[] = [
    { value: 'week', label: 'Mingguan' },
    { value: 'month', label: 'Bulanan' },
    { value: 'year', label: 'Tahunan' },
  ];
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            period === opt.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

type ChartMetric = 'revenue' | 'orderValue';

function IncomeBarChart({
  recap,
  metric,
  onMetricChange,
}: {
  recap: IncomeRecap;
  metric: ChartMetric;
  onMetricChange: (m: ChartMetric) => void;
}) {
  const data = recap.breakdown;
  const values = data.map((d) =>
    metric === 'revenue' ? d.revenue : d.orderValue,
  );
  const max = Math.max(...values, 1);
  const allZero = values.every((v) => v === 0);
  const step = data.length > 20 ? 3 : data.length > 10 ? 2 : 1;

  const tickLabel = (row: RecapBreakdownRow) =>
    recap.granularity === 'month' ? row.label : row.date.slice(8, 10);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-slate-800">
          Grafik{' '}
          {metric === 'revenue' ? 'Pendapatan Diterima' : 'Nilai Order'}
        </h2>
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          {(['revenue', 'orderValue'] as ChartMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                metric === m
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'revenue' ? 'Pendapatan' : 'Nilai Order'}
            </button>
          ))}
        </div>
      </div>

      {allZero ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          Tidak ada data pada periode ini.
        </div>
      ) : (
        <>
          {/* Bars */}
          <div className="flex items-end gap-0.5 h-44">
            {data.map((row, i) => {
              const val = metric === 'revenue' ? row.revenue : row.orderValue;
              const pct = (val / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 min-w-0 h-full flex flex-col justify-end group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {formatRupiah(val)}
                  </div>
                  <div
                    className="w-full bg-blue-500/80 rounded-t group-hover:bg-blue-600 transition-colors"
                    style={{
                      height: `${Math.max(pct, val > 0 ? 1.5 : 0)}%`,
                      minHeight: val > 0 ? '2px' : 0,
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* X-axis labels (sparse) */}
          <div className="flex gap-0.5 mt-2 border-t border-slate-100 pt-1.5">
            {data.map((row, i) => (
              <div
                key={i}
                className="flex-1 min-w-0 text-center text-[9px] text-slate-400"
              >
                {i % step === 0 ? tickLabel(row) : ''}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function IncomeRecapPage() {
  /** SCR-15: Admin-only — redirect pegawai ke dashboard */
  const { loading: authLoading, authorized } = useAdminGuard();

  const [recap, setRecap] = useState<IncomeRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<RecapPeriod>('month');
  const [refDate, setRefDate] = useState<Date>(() => todayLocal());
  const [chartMetric, setChartMetric] = useState<ChartMetric>('revenue');

  const fetchRecap = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statsService.getIncomeRecap({
        period,
        date: toISODate(refDate),
      });
      setRecap(data);
    } catch {
      showError('Gagal memuat rekap penghasilan');
    } finally {
      setLoading(false);
    }
  }, [period, refDate]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  // Admin guard — render nothing (redirect ditangani hook)
  if (authLoading) return <PageLoading />;
  if (!authorized) return null;

  const isLatest = isInCurrentPeriod(period, refDate);

  const handlePrev = () => setRefDate((d) => shiftDate(period, d, -1));
  const handleNext = () => {
    if (!isLatest) setRefDate((d) => shiftDate(period, d, 1));
  };

  const handlePeriodChange = (p: RecapPeriod) => {
    setPeriod(p);
    setRefDate(todayLocal());
  };

  const handleExport = () => {
    if (!recap) return;
    const rows = recap.breakdown.map((r) => ({
      Periode: r.label,
      Tanggal: r.date,
      Pendapatan: r.revenue,
      Transaksi: r.transactions,
      'Nilai Order': r.orderValue,
      Order: r.orders,
    }));
    downloadCSV(
      `rekap-penghasilan-${recap.period}-${recap.current.startDate}.csv`,
      rows,
    );
  };

  const columns: Column<RecapBreakdownRow>[] = [
    {
      key: 'label',
      header: 'Periode',
      render: (row) => (
        <span className="font-medium text-slate-700">{row.label}</span>
      ),
    },
    {
      key: 'revenue',
      header: 'Pendapatan',
      render: (row) => (
        <span className="font-medium text-slate-800">
          {formatRupiah(row.revenue)}
        </span>
      ),
    },
    {
      key: 'transactions',
      header: 'Transaksi',
      render: (row) => (
        <span className="text-slate-600">{row.transactions}</span>
      ),
    },
    {
      key: 'orderValue',
      header: 'Nilai Order',
      render: (row) => (
        <span className="font-medium text-slate-800">
          {formatRupiah(row.orderValue)}
        </span>
      ),
    },
    {
      key: 'orders',
      header: 'Order',
      render: (row) => <span className="text-slate-600">{row.orders}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rekap Penghasilan</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ringkasan pendapatan &amp; nilai order laundry per periode.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <PeriodToggle period={period} onChange={handlePeriodChange} />

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Periode sebelumnya"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
            {periodLabel(period, refDate)}
          </span>
          <button
            onClick={handleNext}
            disabled={isLatest}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Periode berikutnya"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={handleExport}
          disabled={!recap || loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Pendapatan Diterima"
          value={recap ? formatRupiah(recap.summary.revenue.current) : '-'}
          icon={TrendingUp}
          iconBg="bg-emerald-50 text-emerald-600"
          growthPct={recap?.summary.revenue.growthPct ?? null}
          loading={loading}
        />
        <SummaryCard
          label="Nilai Order"
          value={recap ? formatRupiah(recap.summary.orderValue.current) : '-'}
          icon={ShoppingBag}
          iconBg="bg-blue-50 text-blue-600"
          growthPct={recap?.summary.orderValue.growthPct ?? null}
          loading={loading}
        />
        <SummaryCard
          label="Jumlah Transaksi"
          value={recap ? String(recap.summary.transactions.current) : '-'}
          icon={CreditCard}
          iconBg="bg-purple-50 text-purple-600"
          growthPct={recap?.summary.transactions.growthPct ?? null}
          loading={loading}
        />
        <SummaryCard
          label="Jumlah Order"
          value={recap ? String(recap.summary.orders.current) : '-'}
          icon={Package}
          iconBg="bg-amber-50 text-amber-600"
          growthPct={recap?.summary.orders.growthPct ?? null}
          loading={loading}
        />
      </div>

      {/* Secondary stats: averages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Rata-rata per Transaksi
            </p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">
              {recap ? formatRupiah(recap.summary.avgPerTransaction) : '-'}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Rata-rata per Order
            </p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">
              {recap ? formatRupiah(recap.summary.avgPerOrder) : '-'}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      {recap && !loading ? (
        <IncomeBarChart
          recap={recap}
          metric={chartMetric}
          onMetricChange={setChartMetric}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-72 flex items-center justify-center">
          {loading ? (
            <div className="w-full">
              <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="flex items-end gap-1 h-44">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-slate-100 rounded-t animate-pulse"
                    style={{ height: `${30 + ((i * 13) % 60)}%` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Breakdown Table */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">
          Rincian per {recap?.granularity === 'month' ? 'Bulan' : 'Hari'}
        </h2>
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : (
          <DataTable
            columns={
              columns as unknown as Column<Record<string, unknown>>[]
            }
            data={
              (recap?.breakdown ?? []) as unknown as Record<string, unknown>[]
            }
            emptyMessage="Belum ada data pada periode ini"
          />
        )}
      </div>
    </div>
  );
}

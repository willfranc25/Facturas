import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoiceStore } from '../store/invoiceStore';
import { CategoryPieChart } from '../components/dashboard/CategoryPieChart';
import { MonthlyBarChart } from '../components/dashboard/MonthlyBarChart';
import { MetricCard } from '../components/dashboard/MetricCard';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate, getMonthName } from '../utils/formatters';
import type { Invoice, CategorySummary, MonthlySummary } from '../types/invoice';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInvoicesForMonth(invoices: Invoice[], year: number, month: number): Invoice[] {
  return invoices.filter((inv) => {
    const [y, m] = inv.date.split('-').map(Number);
    return y === year && m === month;
  });
}

function buildCategorySummary(invoices: Invoice[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const inv of invoices) {
    const e = map.get(inv.category);
    if (e) {
      e.count++;
      e.netAmount += inv.netAmount ?? 0;
      e.ivaAmount += inv.ivaAmount ?? 0;
      e.totalAmount += inv.totalAmount ?? 0;
    } else {
      map.set(inv.category, {
        category: inv.category,
        count: 1,
        netAmount: inv.netAmount ?? 0,
        ivaAmount: inv.ivaAmount ?? 0,
        totalAmount: inv.totalAmount ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

function buildLast12Months(invoices: Invoice[], refYear: number, refMonth: number): MonthlySummary[] {
  const months: MonthlySummary[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    let m = refMonth - offset;
    let y = refYear;
    while (m <= 0) { m += 12; y--; }
    const list = getInvoicesForMonth(invoices, y, m);
    months.push({
      year: y, month: m,
      count: list.length,
      netAmount:    list.reduce((s, i) => s + (i.netAmount    ?? 0), 0),
      ivaAmount:    list.reduce((s, i) => s + (i.ivaAmount    ?? 0), 0),
      exemptAmount: list.reduce((s, i) => s + (i.exemptAmount ?? 0), 0),
      otherTaxes:   list.reduce((s, i) => s + (i.otherTaxes   ?? 0), 0),
      totalAmount:  list.reduce((s, i) => s + (i.totalAmount  ?? 0), 0),
    });
  }
  return months;
}

function buildYearMonths(invoices: Invoice[], year: number): MonthlySummary[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const list = getInvoicesForMonth(invoices, year, m);
    return {
      year, month: m,
      count: list.length,
      netAmount:    list.reduce((s, i) => s + (i.netAmount    ?? 0), 0),
      ivaAmount:    list.reduce((s, i) => s + (i.ivaAmount    ?? 0), 0),
      exemptAmount: list.reduce((s, i) => s + (i.exemptAmount ?? 0), 0),
      otherTaxes:   list.reduce((s, i) => s + (i.otherTaxes   ?? 0), 0),
      totalAmount:  list.reduce((s, i) => s + (i.totalAmount  ?? 0), 0),
    };
  });
}

function getAvailableYears(invoices: Invoice[]): number[] {
  const years = new Set(invoices.map((inv) => Number(inv.date.split('-')[0])));
  const now = new Date().getFullYear();
  years.add(now);
  return Array.from(years).sort((a, b) => b - a);
}

// ── Month Picker ───────────────────────────────────────────────────────────────

interface MonthPickerProps {
  year: number;
  month: number;
  availableMonths: { year: number; month: number; count: number }[];
  onChange: (year: number, month: number) => void;
}

const MonthPicker: React.FC<MonthPickerProps> = ({ year, month, availableMonths, onChange }) => {
  const [open, setOpen] = useState(false);

  // Group by year
  const byYear = availableMonths.reduce((acc, m) => {
    if (!acc[m.year]) acc[m.year] = [];
    acc[m.year].push(m);
    return acc;
  }, {} as Record<number, typeof availableMonths>);

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <span>📅</span>
        <span>{getMonthName(month)} {year}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[280px] max-h-80 overflow-y-auto">
            {years.map((y) => (
              <div key={y}>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                  {y}
                </div>
                <div className="grid grid-cols-3 gap-1 p-2">
                  {byYear[y].map((m) => {
                    const isSelected = m.year === year && m.month === month;
                    const hasData = m.count > 0;
                    return (
                      <button
                        key={m.month}
                        onClick={() => { onChange(m.year, m.month); setOpen(false); }}
                        className={`px-2 py-1.5 rounded-lg text-sm transition-colors text-center
                          ${isSelected
                            ? 'bg-blue-600 text-white font-semibold'
                            : hasData
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                      >
                        {getMonthName(m.month).slice(0, 3)}
                        {hasData && !isSelected && (
                          <span className="block text-xs text-blue-500">{m.count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, loadInvoices, isLoading } = useInvoiceStore();

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // Find the most recent month that has data (default selection)
  const defaultMonth = useMemo(() => {
    if (invoices.length === 0) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    // Sort invoices by date desc, pick the most recent
    const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));
    const [y, m] = sorted[0].date.split('-').map(Number);
    return { year: y, month: m };
  }, [invoices]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  // Once we have invoices, set the default
  useEffect(() => {
    if (selectedYear === null && defaultMonth) {
      setSelectedYear(defaultMonth.year);
      setSelectedMonth(defaultMonth.month);
    }
  }, [defaultMonth, selectedYear]);

  const activeYear  = selectedYear  ?? defaultMonth.year;
  const activeMonth = selectedMonth ?? defaultMonth.month;

  // Build available months from all invoices (last 24 months + current)
  const availableMonths = useMemo(() => {
    const now = new Date();
    const months: { year: number; month: number; count: number }[] = [];
    for (let offset = 23; offset >= 0; offset--) {
      let m = now.getMonth() + 1 - offset;
      let y = now.getFullYear();
      while (m <= 0) { m += 12; y--; }
      const count = getInvoicesForMonth(invoices, y, m).length;
      months.push({ year: y, month: m, count });
    }
    return months;
  }, [invoices]);

  // Metrics for selected month
  const monthInvoices = useMemo(
    () => getInvoicesForMonth(invoices, activeYear, activeMonth),
    [invoices, activeYear, activeMonth]
  );

  const metrics = useMemo(() => ({
    total:  monthInvoices.reduce((s, i) => s + (i.totalAmount ?? 0), 0),
    neto:   monthInvoices.reduce((s, i) => s + (i.netAmount   ?? 0), 0),
    iva:    monthInvoices.reduce((s, i) => s + (i.ivaAmount   ?? 0), 0),
    count:  monthInvoices.length,
  }), [monthInvoices]);

  const categoryData = useMemo(() => buildCategorySummary(monthInvoices), [monthInvoices]);

  // Bar chart: 12 months centered on selected month
  const barData = useMemo(
    () => buildLast12Months(invoices, activeYear, activeMonth),
    [invoices, activeYear, activeMonth]
  );

  // Recent invoices (last 5 across all time)
  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [invoices]
  );

  // ── Year view data ──────────────────────────────────────────────────────────
  const availableYears = useMemo(() => getAvailableYears(invoices), [invoices]);

  const yearInvoices = useMemo(
    () => invoices.filter((inv) => Number(inv.date.split('-')[0]) === activeYear),
    [invoices, activeYear]
  );

  const yearMetrics = useMemo(() => ({
    total: yearInvoices.reduce((s, i) => s + (i.totalAmount ?? 0), 0),
    neto:  yearInvoices.reduce((s, i) => s + (i.netAmount   ?? 0), 0),
    iva:   yearInvoices.reduce((s, i) => s + (i.ivaAmount   ?? 0), 0),
    count: yearInvoices.length,
  }), [yearInvoices]);

  const yearBarData = useMemo(() => buildYearMonths(invoices, activeYear), [invoices, activeYear]);
  const yearCategoryData = useMemo(() => buildCategorySummary(yearInvoices), [yearInvoices]);

  const handleBarClick = (data: MonthlySummary) => {
    setSelectedYear(data.year);
    setSelectedMonth(data.month);
  };

  const handleMonthChange = (y: number, m: number) => {
    setSelectedYear(y);
    setSelectedMonth(m);
  };

  const goToPrevMonth = () => {
    const m = activeMonth === 1 ? 12 : activeMonth - 1;
    const y = activeMonth === 1 ? activeYear - 1 : activeYear;
    setSelectedYear(y); setSelectedMonth(m);
  };

  const goToNextMonth = () => {
    const now = new Date();
    const m = activeMonth === 12 ? 1 : activeMonth + 1;
    const y = activeMonth === 12 ? activeYear + 1 : activeYear;
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return;
    setSelectedYear(y); setSelectedMonth(m);
  };

  const isNextDisabled = useMemo(() => {
    const now = new Date();
    const nm = activeMonth === 12 ? 1 : activeMonth + 1;
    const ny = activeMonth === 12 ? activeYear + 1 : activeYear;
    return ny > now.getFullYear() || (ny === now.getFullYear() && nm > now.getMonth() + 1);
  }, [activeYear, activeMonth]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with view toggle + month/year selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumen de gastos y métricas</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 transition-colors ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 py-2 transition-colors ${viewMode === 'year' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Año
            </button>
          </div>

          {viewMode === 'month' ? (
            /* Month navigation */
            <div className="flex items-center gap-2">
              <button onClick={goToPrevMonth} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors" title="Mes anterior">◀</button>
              <MonthPicker year={activeYear} month={activeMonth} availableMonths={availableMonths} onChange={handleMonthChange} />
              <button onClick={goToNextMonth} disabled={isNextDisabled} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Mes siguiente">▶</button>
            </div>
          ) : (
            /* Year selector */
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear((y) => (y ?? activeYear) - 1)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >◀</button>
              <select
                value={activeYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => { const ny = (selectedYear ?? activeYear) + 1; if (ny <= new Date().getFullYear()) setSelectedYear(ny); }}
                disabled={(selectedYear ?? activeYear) >= new Date().getFullYear()}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >▶</button>
            </div>
          )}
        </div>
      </div>

      {invoices.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            📊 No hay comprobantes aún. Sube tu primera factura para ver tus datos.
          </p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Gastado"
          value={formatCurrency(viewMode === 'year' ? yearMetrics.total : metrics.total)}
          subtitle={viewMode === 'year' ? `Año ${activeYear}` : `${getMonthName(activeMonth)} ${activeYear}`}
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Total Neto"
          value={formatCurrency(viewMode === 'year' ? yearMetrics.neto : metrics.neto)}
          subtitle="Sin IVA"
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
        />
        <MetricCard
          title="Total IVA"
          value={formatCurrency(viewMode === 'year' ? yearMetrics.iva : metrics.iva)}
          subtitle="19%"
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>}
        />
        <MetricCard
          title="Comprobantes"
          value={viewMode === 'year' ? yearMetrics.count : metrics.count}
          subtitle={viewMode === 'year' ? `Año ${activeYear}` : `${getMonthName(activeMonth)} ${activeYear}`}
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPieChart
          data={viewMode === 'year' ? yearCategoryData : categoryData}
          title={viewMode === 'year' ? `Categorías — ${activeYear}` : `Categorías — ${getMonthName(activeMonth)} ${activeYear}`}
        />
        <div>
          <MonthlyBarChart
            data={viewMode === 'year' ? yearBarData : barData}
            selectedYear={viewMode === 'month' ? activeYear : undefined}
            selectedMonth={viewMode === 'month' ? activeMonth : undefined}
            onBarClick={viewMode === 'month' ? handleBarClick : (d) => { setViewMode('month'); setSelectedYear(d.year); setSelectedMonth(d.month); }}
          />
          <p className="text-xs text-gray-400 text-center mt-1">
            {viewMode === 'month'
              ? '💡 Haz clic en una barra para cambiar el mes'
              : '💡 Haz clic en una barra para ver el detalle del mes'}
          </p>
        </div>
      </div>

      {/* Month invoice list — only in month view */}
      {viewMode === 'month' && monthInvoices.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">
              Comprobantes de {getMonthName(activeMonth)} {activeYear}
              <span className="ml-2 text-sm font-normal text-gray-500">({monthInvoices.length})</span>
            </h3>
            <button onClick={() => navigate('/invoices')} className="text-sm text-blue-600 hover:text-blue-800">
              Ver todos →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {monthInvoices
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="px-5 py-3 text-gray-900">{formatDate(inv.date)}</td>
                      <td className="px-5 py-3 text-gray-900 max-w-[180px] truncate">{inv.providerName}</td>
                      <td className="px-5 py-3 text-gray-600">{inv.category}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(inv.totalAmount ?? 0)}</td>
                      <td className="px-5 py-3 text-center"><Badge status={inv.status} /></td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700">Total del mes</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(metrics.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Year summary table — only in year view */}
      {viewMode === 'year' && yearInvoices.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-800">
              Resumen mensual — {activeYear}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comprobantes</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {yearBarData.filter((m) => m.count > 0).map((m) => (
                  <tr
                    key={m.month}
                    className="hover:bg-blue-50 cursor-pointer"
                    onClick={() => { setViewMode('month'); setSelectedMonth(m.month); }}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{getMonthName(m.month)}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{m.count}</td>
                    <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(m.netAmount)}</td>
                    <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(m.ivaAmount)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(m.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td className="px-5 py-3 text-gray-700">Total {activeYear}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{yearMetrics.count}</td>
                  <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(yearMetrics.neto)}</td>
                  <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(yearMetrics.iva)}</td>
                  <td className="px-5 py-3 text-right text-blue-700 text-base">{formatCurrency(yearMetrics.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-400 text-center py-2">
            💡 Haz clic en un mes para ver su detalle
          </p>
        </div>
      )}

      {/* Recent invoices (all time) */}
      {recentInvoices.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Últimos comprobantes</h3>
            <button onClick={() => navigate('/invoices')} className="text-sm text-blue-600 hover:text-blue-800">
              Ver todos →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="px-5 py-3 text-gray-900">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3 text-gray-900 max-w-[180px] truncate">{inv.providerName}</td>
                    <td className="px-5 py-3 text-gray-600">{inv.category}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(inv.totalAmount ?? 0)}</td>
                    <td className="px-5 py-3 text-center"><Badge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

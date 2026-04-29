import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { MonthlySummary } from '../../types/invoice';
import { formatCurrency, getMonthName } from '../../utils/formatters';

export interface MonthlyBarChartProps {
  data: MonthlySummary[];
  onBarClick?: (data: MonthlySummary) => void;
  selectedYear?: number;
  selectedMonth?: number;
}

export const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ data, onBarClick, selectedYear, selectedMonth }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Gastos Mensuales (Últimos 12 Meses)
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No hay datos para mostrar
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: `${getMonthName(item.month).substring(0, 3)} ${String(item.year).slice(2)}`,
    total: item.totalAmount,
    neto: item.netAmount,
    iva: item.ivaAmount,
    month: item.month,
    year: item.year,
    count: item.count,
  }));

  const handleClick = (barData: any) => {
    if (onBarClick && barData?.activePayload?.[0]) {
      const d = barData.activePayload[0].payload;
      const original = data.find((m) => m.year === d.year && m.month === d.month);
      if (original) onBarClick(original);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Gastos Mensuales (Últimos 12 Meses)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          onClick={onBarClick ? handleClick : undefined}
          style={onBarClick ? { cursor: 'pointer' } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
            }}
          />
          <Legend />
          <Bar dataKey="total" name="Total" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => {
              const isSelected = entry.year === selectedYear && entry.month === selectedMonth;
              const hasData = entry.count > 0;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isSelected ? '#1d4ed8' : hasData ? '#3b82f6' : '#e5e7eb'}
                  stroke={isSelected ? '#1e40af' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

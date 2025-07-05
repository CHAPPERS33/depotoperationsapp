
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { DashboardMetric } from '../../types';

interface DashboardMetricCardProps {
  metric: DashboardMetric;
}

const LineSparkline: React.FC<{ trend: number[]; color: string; unit?: string }> = ({ trend, color }: { trend: number[]; color: string; unit?: string }) => {
  if (!trend || trend.length < 2) return <div className="h-10 text-center text-xs text-gray-400">Not enough data for trend.</div>;

  const width = 100;
  const height = 30;
  const padding = 2;

  const minVal = Math.min(...trend);
  const maxVal = Math.max(...trend);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal; // Avoid division by zero

  const points = trend.map((val, index) => {
    const x = (width / (trend.length - 1)) * index;
    const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'purple' ? '#8b5cf6' : color === 'orange' ? '#f97316' : color === 'teal' ? '#14b8a6' : color === 'slate' ? '#64748b' : color === 'sky' ? '#0ea5e9' : '#6b7280'}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
};

const Gauge: React.FC<{ value: number | string; target?: number; color: string; unit?: string }> = ({ value, target = 100, color, unit }) => {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace('%','')) : value;
  if (isNaN(numericValue)) return <div className="h-10 text-center text-xs text-gray-400">Invalid value for gauge.</div>;

  const safeTarget = target === 0 ? 100 : target; // Avoid division by zero if target is 0
  let progress = (numericValue / safeTarget);
  if (unit === '%' && safeTarget === 100) progress = numericValue / 100; // If value is already a percentage
  progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1

  const radius = 40;
  const strokeWidth = 8;
  const circumference = Math.PI * radius; // Half circumference for a semi-circle

  const strokeDashoffset = circumference * (1 - progress);
  
  const gaugeColor = color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'purple' ? '#8b5cf6' : color === 'orange' ? '#f97316' : color === 'red' ? '#ef4444' : color === 'teal' ? '#14b8a6' : color === 'slate' ? '#64748b' : color === 'sky' ? '#0ea5e9' : '#6b7280';


  return (
    <div className="w-full h-12 flex items-center justify-center relative">
      <svg width="100" height="55" viewBox="0 0 100 55" className="transform -rotate-180 scale-y-[-1]">
        {/* Background track */}
        <path
          d={`M ${50 - radius},50 A ${radius},${radius} 0 0 1 ${50 + radius},50`}
          fill="none"
          stroke="#e5e7eb" // gray-200
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M ${50 - radius},50 A ${radius},${radius} 0 0 1 ${50 + radius},50`}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-0 text-sm font-semibold text-gray-700">
         <span suppressHydrationWarning>{numericValue.toFixed(unit === '%' ? (numericValue < 1 ? 3 : 1) : 0)}{unit === '%' ? '%' : ''}</span>
       </div>
    </div>
  );
};


const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({ metric }) => {
  const { icon: Icon, title, value, change, color, trend, target, unit, visualType } = metric;

  const isChangeBeneficial =
    (metric.id === 'kpi_performance' || metric.id === 'missort_analysis' || metric.id === 'missing_parcels' || metric.id === 'overall_no_scans' || metric.id === 'overall_carry_forwards')
    ? (change !== undefined && change <= 0)
    : (change !== undefined && change >= 0);

  const changeDisplayColor = change === 0 || change === undefined ? 'text-gray-500' : (isChangeBeneficial ? 'text-green-600' : 'text-red-600');
  const ChangeIcon = change === 0 || change === undefined ? ArrowUp : (isChangeBeneficial ? ArrowUp : ArrowDown); // Default to up arrow if no change or change is undefined (though should not happen if change is undefined)

  return (
    <div className={`bg-white rounded-lg shadow p-5 border-l-4 border-${color}-500 flex flex-col justify-between min-h-[160px]`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-full bg-${color}-100`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
          {change !== undefined && (
            <div className={`flex items-center text-xs font-semibold ${changeDisplayColor}`}>
              <ChangeIcon size={14} className="mr-0.5" />
              <span suppressHydrationWarning>
                {Math.abs(change).toFixed(unit === '%' ? (metric.id === 'kpi_performance' || metric.id === 'missort_analysis' ? 2 : 0) : 0)}
                {unit === '%' ? (metric.id === 'kpi_performance' || metric.id === 'missort_analysis' ? '%' : 'pp') : (unit && unit !== 'parcels' ? ` ${unit}` : '')}
              </span>
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-0.5" suppressHydrationWarning>{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-gray-800" suppressHydrationWarning>{value}</span>
          {target !== undefined && visualType !== 'gauge' && ( // Don't show target here if it's a gauge, as gauge implies target
            <span className="text-xs text-gray-500" suppressHydrationWarning>
              / {target.toLocaleString()}{unit && unit !== 'parcels' ? unit : ''} target
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto pt-2">
        {visualType === 'line-sparkline' && trend && trend.length > 0 && (
          <LineSparkline trend={trend} color={color} unit={unit} />
        )}
        {visualType === 'gauge' && (
          <Gauge value={value} target={target} color={color} unit={unit} />
        )}
        {(!visualType || (visualType === 'line-sparkline' && (!trend || trend.length ===0))) && (
             <div className="h-10 text-center text-xs text-gray-400 flex items-center justify-center">No trend data available.</div>
        )}
      </div>
    </div>
  );
};

export default DashboardMetricCard;
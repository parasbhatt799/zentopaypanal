import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'indigo' | 'emerald' | 'purple' | 'amber' | 'rose' | 'sky' | 'teal' | 'blue' | 'orange' | 'pink';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp = true,
  color = 'indigo',
}) => {
  const colorMap = {
    indigo: {
      bg: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20',
      iconBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      glow: 'shadow-indigo-500/5',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      glow: 'shadow-emerald-500/5',
    },
    purple: {
      bg: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
      iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      glow: 'shadow-purple-500/5',
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      glow: 'shadow-amber-500/5',
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      glow: 'shadow-rose-500/5',
    },
    sky: {
      bg: 'from-sky-500/10 to-sky-600/5 border-sky-500/20',
      iconBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      glow: 'shadow-sky-500/5',
    },
    teal: {
      bg: 'from-teal-500/10 to-teal-600/5 border-teal-500/20',
      iconBg: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
      glow: 'shadow-teal-500/5',
    },
    blue: {
      bg: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
      iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      glow: 'shadow-blue-500/5',
    },
    orange: {
      bg: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
      iconBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      glow: 'shadow-orange-500/5',
    },
    pink: {
      bg: 'from-pink-500/10 to-pink-600/5 border-pink-500/20',
      iconBg: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
      glow: 'shadow-pink-500/5',
    },
  };

  const style = colorMap[color] || colorMap.indigo;

  // Map theme colors to specific color hex strings for backdrop glows and grids
  const glowColorMap = {
    indigo: 'rgba(99, 102, 241, 0.15)',
    emerald: 'rgba(16, 185, 129, 0.15)',
    purple: 'rgba(139, 92, 246, 0.15)',
    amber: 'rgba(245, 158, 11, 0.15)',
    rose: 'rgba(244, 63, 94, 0.15)',
    sky: 'rgba(56, 189, 248, 0.15)',
    teal: 'rgba(20, 184, 166, 0.15)',
    blue: 'rgba(59, 130, 246, 0.15)',
    orange: 'rgba(249, 115, 22, 0.15)',
    pink: 'rgba(236, 72, 153, 0.15)'
  };
  const activeGlow = glowColorMap[color] || glowColorMap.indigo;

  return (
    <div className={`group stat-card stat-card-${color} p-5 rounded-2xl bg-gradient-to-br ${style.bg} border backdrop-blur-md shadow-xl ${style.glow} transition-all duration-300 hover:translate-y-[-2px] relative overflow-hidden`}>
      {/* Decorative ambient color glow shape in corner */}
      <div 
        className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full pointer-events-none z-0 blur-2xl opacity-60 dark:opacity-100 transition-transform duration-500 group-hover:scale-125"
        style={{ 
          background: `radial-gradient(circle, ${activeGlow.replace('0.15', '0.45')} 0%, ${activeGlow.replace('0.15', '0')} 70%)` 
        }}
      />

      {/* Decorative high-tech grid overlay pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none z-0 transition-opacity duration-300 group-hover:opacity-[0.05] dark:group-hover:opacity-[0.09]"
        style={{ color: activeGlow.replace('0.15', '0.8') }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`grid-${color}-${title.replace(/\s+/g, '-')}`} width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M 14 0 L 0 0 0 14" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${color}-${title.replace(/\s+/g, '-')})`} />
        </svg>
      </div>

      {/* Card Content Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`stat-card-icon p-2.5 rounded-xl border ${style.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Card Content Value */}
      <div className="flex items-baseline justify-between relative z-10">
        <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{value}</h3>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trendUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {trend}
          </span>
        )}
      </div>

      {/* Card Content Subtitle */}
      {subtitle && <p className="text-xs text-slate-400 mt-1.5 relative z-10">{subtitle}</p>}
    </div>
  );
};

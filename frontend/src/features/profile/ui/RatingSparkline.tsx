import React, { useState } from 'react';
import type { RatingPoint } from '../api';

interface RatingSparklineProps {
  points?: RatingPoint[];
  color?: string;
  gradientId: string;
}

export const RatingSparkline: React.FC<RatingSparklineProps> = ({
  points,
  color = '#3b82f6',
  gradientId,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!points || points.length < 2) {
    return (
      <div className="h-14 flex items-center justify-center text-[10px] text-gray-500 font-mono italic bg-white/[0.02] rounded-lg border border-white/[0.05]">
        No contest rating graph data
      </div>
    );
  }

  const width = 280;
  const height = 70;
  const padX = 22;
  const padY = 18;

  const minRating = Math.min(...points.map((p) => p.rating));
  const maxRating = Math.max(...points.map((p) => p.rating));
  const range = maxRating - minRating || 1;

  // Calculate coordinates for each point
  const coords = points.map((p, idx) => {
    const x = padX + (idx / (points.length - 1)) * (width - 2 * padX);
    const normalizedY = (p.rating - minRating) / range;
    // Invert Y for SVG coordinates
    const y = height - padY - normalizedY * (height - 2 * padY);
    return { x, y, rating: p.rating, label: p.label };
  });

  // Generate smooth SVG curve path (cubic bezier)
  const pathD = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x},${pt.y}`;
  }, '');

  // Area path for gradient fill underneath
  const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  return (
    <div className="relative w-full my-2 bg-white/[0.02] rounded-xl p-2 border border-white/[0.06] overflow-visible">
      <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 mb-1 px-1">
        <span className="uppercase tracking-wider">Rating Progression</span>
        <span className="font-mono text-gray-300">
          Peak: <strong className="text-white">{maxRating}</strong>
        </span>
      </div>

      <div className="relative w-full h-[70px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />

          {/* Data Points & Sleek Rating Labels at Each Point */}
          {coords.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            // Alternate label positioning if adjacent points are close
            const labelY = pt.y - 8 < 12 ? pt.y + 14 : pt.y - 8;

            return (
              <g
                key={idx}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Outer Glow Halo on Hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={7}
                    fill={color}
                    opacity={0.3}
                  />
                )}

                {/* Point Circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 4.5 : 3}
                  fill="#0b0d14"
                  stroke={color}
                  strokeWidth={isHovered ? 2.5 : 1.8}
                />

                {/* Numeric Rating Text displayed AT EACH POINT */}
                <text
                  x={pt.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                  fontFamily="monospace"
                  fill={isHovered ? '#ffffff' : 'rgba(240, 240, 245, 0.85)'}
                  style={{
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pt.rating}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Float for Contest Name */}
        {hoveredIdx !== null && coords[hoveredIdx] && (
          <div
            className="pointer-events-none absolute z-20 px-2 py-1 rounded-lg text-[9px] font-bold text-white bg-[#0b0d14]/95 border border-white/20 shadow-xl backdrop-blur-md whitespace-nowrap transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(coords[hoveredIdx].x / width) * 100}%`,
              top: `${Math.max(0, coords[hoveredIdx].y - 18)}px`,
            }}
          >
            <div className="font-mono text-amber-400 font-extrabold">Rating: {coords[hoveredIdx].rating}</div>
            {coords[hoveredIdx].label && (
              <div className="text-[8px] text-gray-300 font-normal max-w-[140px] truncate">
                {coords[hoveredIdx].label}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

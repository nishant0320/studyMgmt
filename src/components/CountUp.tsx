type CountUpProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  format?: 'number' | 'time' | 'compact';
};

/** Stable inline values keep metrics readable and avoid announcing animation frames. */
export function CountUp({ value, prefix = "", suffix = "", format = 'number' }: CountUpProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  let display = String(safeValue);
  if (format === 'time') display = `${Math.floor(safeValue / 60)}:${String(safeValue % 60).padStart(2, '0')}`;
  if (format === 'compact' && Math.abs(safeValue) >= 1000) display = `${(safeValue / 1000).toFixed(1)}k`;
  return <>{prefix}{display}{suffix}</>;
}

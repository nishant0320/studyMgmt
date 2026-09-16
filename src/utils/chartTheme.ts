export const chartGridStroke = "var(--chart-grid)";

export const chartAxisTick = {
  fill: "var(--text-muted)",
  fontSize: 11,
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

export const chartAxisTickSmall = {
  ...chartAxisTick,
  fontSize: 10,
};

export const chartTooltipStyle = {
  background: "var(--sf-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  color: "var(--text)",
  boxShadow: "var(--sh-lg)",
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  backdropFilter: "blur(12px)",
};

export const chartTooltipItemStyle = {
  color: "var(--text)",
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

export const chartTooltipLabelStyle = {
  color: "var(--text-muted)",
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

export const chartCursor = {
  stroke: "var(--line)",
  strokeWidth: 2,
};

export const chartBarRadius: [number, number, number, number] = [4, 4, 0, 0];

export const chartLine = {
  strokeWidth: 3,
  dot: { r: 4, fill: "var(--sf-2)" },
  activeDot: { r: 5 },
};

const chartNameMap: Record<string, string> = {
  actual: "Actual",
  expected: "Expected",
  minutes: "Minutes",
  studied: "Studied",
  thisWeek: "This week",
  lastWeek: "Last week",
  mood: "Mood",
  focus: "Focus",
};

export function chartName(name: string | number) {
  const key = String(name);
  return chartNameMap[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

export function minuteTooltipFormatter(value: string | number | Array<string | number>, name: string | number) {
  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
  const label = Number.isFinite(numeric) ? `${numeric}m` : String(value);
  return [label, chartName(name)];
}

export function numberTooltipFormatter(value: string | number | Array<string | number>, name: string | number) {
  return [String(value), chartName(name)];
}

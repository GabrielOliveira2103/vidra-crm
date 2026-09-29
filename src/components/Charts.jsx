import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Empty } from "./ui/Common";
import { money, percent } from "../utils/format";

// Recharts recebe cores como atributos SVG, onde var(--token) não é confiável.
// Estes valores espelham os tokens de src/styles/tokens.css.
const COLOR = {
  primary: "#1a7a5a",
  grid: "#e2e8e3",
  track: "#e7ede9",
  text: "#4f6055",
  ink: "#14231c",
};
const AXIS_TICK = { fontSize: 12, fill: COLOR.text };
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#fff",
    border: `1px solid ${COLOR.grid}`,
    borderRadius: 8,
    boxShadow: "0 8px 20px rgba(17, 44, 33, 0.12)",
    fontSize: 13,
    color: COLOR.ink,
  },
  labelStyle: { fontWeight: 600, marginBottom: 4 },
  cursor: { fill: "rgba(26, 122, 90, 0.06)" },
};
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact" });

export function TrendChart({ data, revenue = false }) {
  const key = revenue ? "faturamento" : "leads";
  const label = revenue ? "Faturamento" : "Leads";
  if (!data.some((d) => d[key]))
    return (
      <Empty
        title="Sem movimento neste período"
        text="Os registros do banco aparecerão aqui."
      />
    );
  const total = data.reduce((sum, d) => sum + (d[key] || 0), 0);
  return (
    <div
      className="chart"
      role="img"
      aria-label={`${label} por período: total de ${revenue ? money(total) : total} em ${data.length} intervalos.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke={COLOR.grid}
          />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            minTickGap={26}
          />
          <YAxis
            width={revenue ? 56 : 32}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tickFormatter={revenue ? (v) => compact.format(v) : undefined}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [revenue ? money(v) : v, label]}
          />
          <Bar
            isAnimationActive={false}
            dataKey={key}
            name={label}
            fill={COLOR.primary}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankingChart({ data }) {
  if (!data.length) return <Empty />;
  const top = data.slice(0, 6);
  return (
    <div
      className="chart ranking-chart"
      role="img"
      aria-label={`Ranking: ${top.map((d) => `${d.name} (${d.value})`).join(", ")}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ left: 0, right: 34 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ ...AXIS_TICK, fill: COLOR.ink }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar
            isAnimationActive={false}
            dataKey="value"
            name="Quantidade"
            fill={COLOR.primary}
            radius={[0, 5, 5, 0]}
            barSize={18}
          >
            <LabelList
              dataKey="value"
              position="right"
              style={{ fontSize: 12, fontWeight: 600, fill: COLOR.ink }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConversionChart({ value, total }) {
  return (
    <div className="conversion-chart">
      <div
        role="img"
        aria-label={`Taxa de conversão de ${percent(value)} sobre ${total} leads.`}
      >
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={[{ value }, { value: 100 - value }]}
              dataKey="value"
              innerRadius={58}
              outerRadius={73}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Cell fill={COLOR.primary} />
              <Cell fill={COLOR.track} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="conversion-value" aria-hidden="true">
        <strong>{percent(value)}</strong>
        <span>de conversão</span>
      </div>
      <p>{total} leads na base selecionada</p>
    </div>
  );
}

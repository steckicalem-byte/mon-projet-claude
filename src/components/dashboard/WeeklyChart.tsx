import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface WeeklyPoint {
  day: string;
  devoirs: number;
  sessions: number;
}

export default function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Graphique : devoirs et sessions terminés par jour cette semaine">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barGap={4}>
          <defs>
            <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: 'rgb(var(--elevated))' }}
            contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, color: 'rgb(var(--fg))', fontSize: 13 }}
            labelStyle={{ color: 'rgb(var(--fg))', fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--muted))' }} iconType="circle" iconSize={8} />
          <Bar dataKey="devoirs" name="Devoirs terminés" fill="url(#gViolet)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="sessions" name="Sessions terminées" fill="url(#gBlue)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

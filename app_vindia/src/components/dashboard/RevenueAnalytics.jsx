import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 4200000 },
  { month: "Feb", revenue: 3800000 },
  { month: "Mar", revenue: 4500000 },
  { month: "Apr", revenue: 5200000 },
  { month: "May", revenue: 6100000 },
  { month: "Jun", revenue: 5800000 }
];

function RevenueAnalytics() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={revenueData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />

        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563eb"
          strokeWidth={3}
          name="Revenue"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default RevenueAnalytics;
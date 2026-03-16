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

import "../../styles/Dashboard.css";

/* MONTHLY DATA */
const financeData = [
  { month: "Jan", income: 4000000, expense: 3000000 },
  { month: "Feb", income: 5000000, expense: 3500000 },
  { month: "Mar", income: 4500000, expense: 4200000 }, // approaching loss
  { month: "Apr", income: 6000000, expense: 4000000 },
  { month: "May", income: 5500000, expense: 4200000 }
];

function FinanceChart() {

  /* TOTAL CALCULATIONS */

  const totalIncome = financeData.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = financeData.reduce((sum, m) => sum + m.expense, 0);

  const difference = totalIncome - totalExpense;

  /* LOSS MONITOR */

  const ratio = totalExpense / totalIncome;

  const approachingLoss = ratio >= 0.8 && ratio < 1;

  const loss = ratio >= 1;

  return (

    <div>

      {/* ALERTS */}

      {approachingLoss && (
        <div className="finance-alert-warning">
          ⚠ Warning: Expenses are close to income
        </div>
      )}

      {loss && (
        <div className="finance-alert-danger">
          🔴 Alert: Expenses exceeded income
        </div>
      )}

      <div className="finance-container">

        {/* GRAPH */}

        <div className="finance-graph">

          <h3>Monthly Income vs Expense</h3>

          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={financeData}
              margin={{ top: 10, right: 30, left: 50, bottom: 10 }}
            >

              <CartesianGrid strokeDasharray="3 3"/>

              <XAxis dataKey="month"/>

              <YAxis width={80}/>

              <Tooltip/>

              <Legend/>

              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={3}
                name="Income"
              />

              <Line
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={3}
                name="Expense"
              />

            </LineChart>
          </ResponsiveContainer>

        </div>


        {/* SUMMARY CARDS */}

        <div className="finance-summary">

          <div className="summary-card income">
            <h4>Total Income</h4>
            <p>₹{totalIncome}</p>
          </div>

          <div className="summary-card expense">
            <h4>Total Expense</h4>
            <p>₹{totalExpense}</p>
          </div>

          <div className={`summary-card ${difference < 0 ? "loss" : "profit"}`}>
            <h4>Net Result</h4>

            <p style={{ color: difference < 0 ? "#ef4444" : "#10b981" }}>
              ₹{difference}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default FinanceChart;
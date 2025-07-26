import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { Expense } from "@/services/api";

interface ExpenseChartProps {
  expenses: Expense[];
}

const ExpenseChart = ({ expenses }: ExpenseChartProps) => {
  // Prepare data for category chart
  const categoryData = expenses.reduce((acc, expense) => {
    const existing = acc.find(item => item.category === expense.category);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      acc.push({
        category: expense.category,
        amount: expense.amount
      });
    }
    return acc;
  }, [] as { category: string; amount: number }[]);

  // Prepare data for daily spending chart
  const dailyData = expenses.reduce((acc, expense) => {
    const date = expense.date; // Date is already in YYYY-MM-DD from Flask
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      acc.push({
        date,
        amount: expense.amount
      });
    }
    return acc;
  }, [] as { date: string; amount: number }[])
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(-7); // Last 7 days

  // Colors for pie chart
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--info))',
    'hsl(var(--destructive))',
    'hsl(var(--muted-foreground))',
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {/* Category Spending Pie Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Distribution of your expenses across categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground">No category data to display.</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Spending Bar Chart (Last 7 Days) */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Daily Spending (Last 7 Days)</CardTitle>
          <CardDescription>Your spending over the past week.</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value: number) => `$${value}`} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground">No daily spending data for the last 7 days.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseChart;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Calendar, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Expense } from "@/services/api";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

const ExpenseList = ({ expenses, onEdit, onDelete }: ExpenseListProps) => {
  const { toast } = useToast();

  const handleDelete = (expense: Expense) => {
    // Show a confirmation toast before deleting
    toast({
      title: "Confirm Deletion",
      description: `Are you sure you want to delete "${expense.expensename}"? This action cannot be undone.`,
      action: (
        <Button
          variant="destructive"
          onClick={() => {
            onDelete(expense.id); // Call the actual delete handler in Dashboard.tsx
            toast({
              title: "Expense deleted",
              description: `${expense.expensename} has been removed from your records`,
            });
          }}
        >
          Delete Permanently
        </Button>
      ),
      duration: 5000, // Give user time to react
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      food: "bg-orange-100 text-orange-800",
      entertainment: "bg-purple-100 text-purple-800",
      business: "bg-blue-100 text-blue-800",
      rent: "bg-green-100 text-green-800",
      EMI: "bg-red-100 text-red-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
        <CardDescription>A list of your latest transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-center text-muted-foreground">No expenses recorded yet. Add your first expense!</p>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex-1">
                  <div className="font-semibold text-foreground">
                    {expense.expensename}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {expense.date}
                    <CreditCard className="h-3 w-3 ml-2" />
                    {expense.paymode}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getCategoryColor(expense.category)}>
                    {expense.category}
                  </Badge>
                  <div className="font-semibold text-lg text-expense">
                    {formatAmount(expense.amount)}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(expense)}>
                    <Edit className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(expense)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseList;
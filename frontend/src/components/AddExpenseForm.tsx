import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService, Expense } from "@/services/api"; // Ensure apiService and Expense are imported

interface AddExpenseFormProps {
  expense?: Expense | null;
  onSubmit: (expense: Omit<Expense, 'id' | 'userid'>) => void;
  onCancel: () => void;
  userid: number; // Add userid prop
}

const AddExpenseForm = ({ expense, onSubmit, onCancel, userid }: AddExpenseFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [expensename, setExpensename] = useState(expense?.expensename || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [paymode, setPaymode] = useState(expense?.paymode || 'cash');
  const [category, setCategory] = useState(expense?.category || 'food');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const expenseData: Omit<Expense, 'id' | 'userid'> = {
      date: date,
      expensename: expensename,
      amount: parseFloat(amount),
      paymode: paymode,
      category: category,
    };

    setIsLoading(true);
    try {
      // Remove direct API call here, just call onSubmit
      onSubmit(expenseData); // Dashboard will handle API call with userid
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['food', 'entertainment', 'business', 'rent', 'EMI', 'other'];
  const paymodes = ['cash', 'card', 'online'];

  return (
    <Card className="max-w-md mx-auto my-8 shadow-lg">
      <CardHeader>
        <CardTitle>{expense ? "Edit Expense" : "Add New Expense"}</CardTitle>
        <CardDescription>
          {expense ? `Update details for ${expense.expensename}` : "Fill in the details to add a new expense."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="expensename">Expense Name</Label>
            <Input
              id="expensename"
              name="expensename"
              type="text"
              placeholder="e.g., Groceries, Dinner"
              value={expensename}
              onChange={(e) => setExpensename(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              placeholder="e.g., 25.50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="paymode">Payment Mode</Label>
            <Select name="paymode" value={paymode} onValueChange={setPaymode}>
              <SelectTrigger id="paymode">
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                {paymodes.map(mode => (
                  <SelectItem key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select name="category" value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" /> {isLoading ? (expense ? "Updating..." : "Adding...") : (expense ? "Update Expense" : "Add Expense")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddExpenseForm;
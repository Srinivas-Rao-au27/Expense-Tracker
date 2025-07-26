// src/components/Dashboard.tsx
import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, DollarSign, TrendingUp, Calendar, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddExpenseForm from "./AddExpenseForm";
import ExpenseList from "./ExpenseList";
import ExpenseChart from "./ExpenseChart";
import { apiService, Expense } from "@/services/api"; // Ensure apiService and Expense are correctly imported

interface User {
  username: string;
  id: number;
  email?: string; // email is optional as per your User interface in api.ts
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]); // Initialize as empty array
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Added loading state for expenses fetch

  const { toast } = useToast();

  // Memoized function to fetch expenses to avoid unnecessary re-renders in useEffect
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true); // Start loading
    try {
      const response = await apiService.getExpenses(user.id); // Pass user.id
      if (response.status === 'success' && response.data) {
        setExpenses(response.data);
        toast({
          title: "Expenses Loaded",
          description: "Your latest expenses have been fetched.",
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load expenses.",
          variant: "destructive",
        });
        setExpenses([]); // Ensure state is cleared on error
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server to fetch expenses.",
        variant: "destructive",
      });
      setExpenses([]); // Ensure state is cleared on network error
    } finally {
      setIsLoading(false); // End loading
    }
  }, [toast, user.id]); // Add user.id to dependencies

  // Load expenses from API on component mount
  useEffect(() => {
    fetchExpenses(); // Call the memoized fetch function
  }, [fetchExpenses]); // Dependency array includes fetchExpenses

  // Calculate totals - these will now correctly use the fetched `expenses` state
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  const todayExpenses = expenses
    .filter(exp => exp.date === today)
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Category totals
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'userid'>) => {
    try {
      const result = await apiService.addExpense(user.id, expenseData); // Pass user.id
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: result.message || "Expense added successfully!",
        });
        setShowAddForm(false);
        fetchExpenses();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add expense",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred while adding expense",
        variant: "destructive",
      });
    }
  };

  const handleUpdateExpense = async (id: number, expenseData: Omit<Expense, 'id' | 'userid'>) => {
    try {
      const result = await apiService.updateExpense(id, user.id, expenseData); // Pass user.id
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: result.message || "Expense updated successfully!",
        });
        setEditingExpense(null);
        fetchExpenses();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update expense",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred while updating expense",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      const result = await apiService.deleteExpense(id, user.id); // Pass user.id
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: result.message || "Expense deleted successfully!",
        });
        fetchExpenses();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete expense",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred while deleting expense",
        variant: "destructive",
      });
    }
  };

  if (showAddForm || editingExpense) {
    return (
      <AddExpenseForm
        expense={editingExpense}
        onSubmit={editingExpense
          ? (data) => handleUpdateExpense(editingExpense.id, data)
          : handleAddExpense
        }
        onCancel={() => {
          setShowAddForm(false);
          setEditingExpense(null);
        }}
        userid={user.id}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Expense Tracker
            </h1>
            <p className="text-muted-foreground">Welcome back, {user.username}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
            <Button variant="outline" onClick={onLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        {isLoading ? (
          <p className="text-center">Loading dashboard data...</p>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Expenses
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-expense">
                    ${totalExpenses.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All time spending
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today's Expenses
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    ${todayExpenses.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Spent today
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Categories
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(categoryTotals).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active categories
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card className="mb-8 shadow-card">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Your spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(categoryTotals).map(([category, amount]) => (
                    <Badge key={category} variant="secondary" className="text-sm">
                      {category}: ${amount.toFixed(2)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chart */}
            <ExpenseChart expenses={expenses} />

            {/* Expense List */}
            <ExpenseList
              expenses={expenses}
              onEdit={(expense) => setEditingExpense(expense)}
              onDelete={handleDeleteExpense}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
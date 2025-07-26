import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Dashboard from "@/components/Dashboard";
import { apiService, User } from "@/services/api"; // Import User interface

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check database connection on load
    const checkConnection = async () => {
      const result = await apiService.checkDatabase();
      if (result.status === 'error') {
        toast({
          title: "Connection Error",
          description: result.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Database Connection",
          description: result.message,
        });
      }
    };
    checkConnection();
  }, [toast]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    setIsLoading(true);
    try {
      // apiService.login returns ApiResponse<User>
      const result = await apiService.login(username, password);
      if (result.status === 'success' && result.user) { // Check status and if user data is present
        setCurrentUser(result.user);
        setIsLoggedIn(true);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user.username}!`,
        });
      } else {
        toast({
          title: "Login Failed",
          description: result.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Network error occurred: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    setIsLoading(true);
    try {
      const result = await apiService.register(username, email, password);
      if (result.status === 'success') { // Check status
        toast({
          title: "Registration Successful",
          description: result.message,
        });
        // Optionally switch to login tab or auto-login here
      } else {
        toast({
          title: "Registration Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Network error occurred: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const result = await apiService.logout();
      if (result.status === 'success') {
        setIsLoggedIn(false);
        setCurrentUser(null);
        toast({
          title: "Logged Out",
          description: result.message,
        });
      } else {
        toast({
          title: "Logout Failed",
          description: result.message || "Could not log out",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Network error occurred: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoggedIn && currentUser) {
    return <Dashboard user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            <DollarSign className="inline-block h-8 w-8 mr-2" /> Expense Tracker
          </CardTitle>
          <CardDescription>
            Track your spending with ease.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                <Shield className="h-4 w-4 mr-2" /> Login
              </TabsTrigger>
              <TabsTrigger value="signup">
                <TrendingUp className="h-4 w-4 mr-2" /> Sign Up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-username">Username</Label>
                  <Input id="login-username" name="username" type="text" placeholder="Your username" required />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" placeholder="Your password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="signup-username">Username</Label>
                  <Input id="signup-username" name="username" type="text" placeholder="Choose a username" required />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="Your email" required />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" name="password" type="password" placeholder="Create a password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing up...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
// api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'; // Use environment variable with fallback

export interface User {
    id: number;
    username: string;
    email?: string; // Made optional as sometimes it might not be returned, or could be null
}

export interface Expense {
    id: number;
    userid: number;
    date: string; // YYYY-MM-DD format
    expensename: string;
    amount: number;
    paymode: string;
    category: string;
}

// Updated ApiResponse interface to reflect Flask's JSON responses
export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    message?: string;
    data?: T; // Generic type for data returned by success responses
    user?: User; // Specific for login success, if user data is directly under 'user' key
}

// Interface for aggregated report data
export interface ReportData {
    time_series_data?: Array<{ time: string; amount: number; date_only: string }>; // For today's report
    daily_totals?: Array<{ day: string; total_amount: number }>; // For monthly report
    monthly_totals?: Array<{ month_num: number; month_name: string; total_amount: number }>; // For yearly report
    raw_expenses: Expense[];
    total_expenses: number;
    category_totals: Record<string, number>; // Use Record for dynamic category keys
}


class ApiService {
    private async makeRequest(url: string, options: RequestInit = {}): Promise<ApiResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                credentials: 'include', // Include cookies for session management
                headers: {
                    // Content-Type is set only if body is present and it's NOT FormData
                    // FormData automatically sets 'multipart/form-data' header.
                    // For x-www-form-urlencoded, we set it manually.
                    ...(options.body instanceof FormData
                        ? {} // Let browser set Content-Type for FormData
                        : { 'Content-Type': 'application/x-www-form-urlencoded' }),
                    ...options.headers,
                },
                ...options,
            });

            const data: ApiResponse = await response.json();
            // Flask API now returns JSON for errors too, no need to throw on !response.ok here
            // The caller will check response.json() and the 'status' field
            return data;

        } catch (error) {
            console.error(`API request to ${url} failed:`, error);
            // Return a consistent error ApiResponse object
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                return { status: 'error', message: 'Network error: Could not connect to the server.' };
            }
            return { status: 'error', message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    // Helper to convert plain object to URL-encoded string for Flask's request.form
    private objectToUrlEncoded(data: Record<string, any>): string {
        return Object.keys(data)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
            .join('&');
    }

    async checkDatabase(): Promise<ApiResponse> {
        return this.makeRequest('/db_check');
    }

    async register(username: string, email: string, password: string): Promise<ApiResponse> {
        const formData = this.objectToUrlEncoded({ username, email, password });
        return this.makeRequest('/register', {
            method: 'POST',
            body: formData,
        });
    }

    async login(username: string, password: string): Promise<ApiResponse<User>> {
        const formData = this.objectToUrlEncoded({ username, password });
        return this.makeRequest('/login', {
            method: 'POST',
            body: formData,
        });
    }

    async logout(): Promise<ApiResponse> {
        return this.makeRequest('/logout', { method: 'GET' });
    }

    async getExpenses(userid: number): Promise<ApiResponse<Expense[]>> {
        return this.makeRequest(`/expenses?userid=${userid}`, { method: 'GET' });
    }

    async addExpense(userid: number, expenseData: Omit<Expense, 'id' | 'userid'>): Promise<ApiResponse> {
        const formData = this.objectToUrlEncoded({ ...expenseData, userid });
        return this.makeRequest('/addexpense', {
            method: 'POST',
            body: formData,
        });
    }

    async updateExpense(id: number, userid: number, expenseData: Omit<Expense, 'id' | 'userid'>): Promise<ApiResponse> {
        const formData = this.objectToUrlEncoded({ ...expenseData, userid });
        return this.makeRequest(`/update_expense/${id}`, {
            method: 'PUT',
            body: formData,
        });
    }

    async deleteExpense(id: number, userid: number): Promise<ApiResponse> {
        // Send userid as query param for DELETE
        return this.makeRequest(`/delete_expense/${id}?userid=${userid}`, {
            method: 'DELETE',
        });
    }

    async getLimit(): Promise<ApiResponse<{ limit: number }>> {
        return this.makeRequest('/limit', { method: 'GET' });
    }

    async setLimit(limit: number): Promise<ApiResponse> {
        const formData = this.objectToUrlEncoded({ number: limit.toString() }); // Ensure 'number' key matches Flask
        return this.makeRequest('/limit', {
            method: 'POST',
            body: formData,
        });
    }

    // Report API calls
    async getTodayReport(): Promise<ApiResponse<ReportData>> {
        return this.makeRequest('/report/today', { method: 'GET' });
    }

    async getMonthReport(): Promise<ApiResponse<ReportData>> {
        return this.makeRequest('/report/month', { method: 'GET' });
    }

    async getYearReport(): Promise<ApiResponse<ReportData>> {
        return this.makeRequest('/report/year', { method: 'GET' });
    }
}

export const apiService = new ApiService();
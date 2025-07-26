const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 5000;
const REACT_APP_ORIGIN = process.env.REACT_APP_ORIGIN || "http://localhost:8080";

// --- Middleware ---
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded (like Flask's request.form)
app.use(cors({
    origin: REACT_APP_ORIGIN,
    credentials: true,
}));

// --- Database Configuration ---
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'flaskuser',
    password: process.env.MYSQL_PASSWORD || 'khlaif2002',
    database: process.env.MYSQL_DB || 'expense_tracker_db',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
};

// Create a connection pool (better for performance in production)
const pool = mysql.createPool(dbConfig);

// --- Routes ---

app.get("/", (req, res) => {
    res.send('Hello from Node.js Express API!');
});

// --- DATABASE CONNECTION CHECK ---
app.get("/db_check", async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query("SELECT 1");
        res.json({ status: "success", message: "Successfully connected to the local database." });
    } catch (e) {
        console.error("Database connection error:", e);
        res.status(500).json({ status: "error", message: `Failed to connect to the local database: ${e.message}` });
    } finally {
        if (connection) connection.release(); // Release the connection back to the pool
    }
});

// --- USER REGISTRATION ---
app.post('/register', async (req, res) => {
    // Flask used request.form, Express uses req.body for form-urlencoded or JSON
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ status: "error", message: "Please fill out all fields!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // Check if account exists
        const [rows] = await connection.execute('SELECT * FROM register WHERE username = ? OR email = ?', [username, email]);
        if (rows.length > 0) {
            return res.status(409).json({ status: "error", message: "Account already exists with that username or email!" });
        }

        // Validate email and username using JS regex
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ status: "error", message: "Invalid email address!" });
        }
        if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
            return res.status(400).json({ status: "error", message: "Username can only contain letters, numbers, underscores, dots, and hyphens!" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

        // Insert new user
        await connection.execute('INSERT INTO register (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

        res.status(201).json({ status: "success", message: "You have successfully registered!" });

    } catch (e) {
        console.error("Registration error:", e);
        res.status(500).json({ status: "error", message: `Registration failed: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- USER LOGIN ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: "error", message: "Please enter username and password!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const [rows] = await connection.execute('SELECT id, username, email, password FROM register WHERE username = ?', [username]);
        const account = rows[0];

        if (account && await bcrypt.compare(password, account.password)) {
            // Note: No session management here, similar to your Flask example
            res.json({
                status: "success",
                message: "Login successful!",
                user: {
                    id: account.id,
                    username: account.username,
                    email: account.email
                }
            });
        } else {
            res.status(401).json({ status: "error", message: "Incorrect username / password!" });
        }
    } catch (e) {
        console.error("Login error:", e);
        res.status(500).json({ status: "error", message: `Login failed: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- USER LOGOUT ---
app.get('/logout', (req, res) => {
    // In a stateless API (like this one, without server-side sessions), logout is often a client-side action
    // of simply clearing the user's token/session info from local storage.
    res.json({ status: "success", message: "Logged out successfully! (No server-side session used)" });
});

// --- ADD EXPENSE ---
app.post('/addexpense', async (req, res) => {
    const { userid, date, expensename, amount, paymode, category } = req.body;

    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    if (!date || !expensename || !amount || !paymode || !category) {
        return res.status(400).json({ status: "error", message: "Please fill out all fields for expense!" });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
        return res.status(400).json({ status: "error", message: "Invalid amount format! Amount must be a number." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.execute(
            'INSERT INTO expenses (userid, date, expensename, amount, paymode, category) VALUES (?, ?, ?, ?, ?, ?)',
            [userIdNum, date, expensename, amountNum, paymode, category]
        );
        res.status(201).json({ status: "success", message: "Expense added successfully!" });
    } catch (e) {
        console.error("Add expense error:", e);
        res.status(500).json({ status: "error", message: `Failed to add expense: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- GET EXPENSES (DISPLAY) ---
app.get("/expenses", async (req, res) => {
    const { userid } = req.query; // For GET requests, query parameters are in req.query

    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [expenses] = await connection.execute(
            'SELECT id, userid, date, expensename, amount, paymode, category FROM expenses WHERE userid = ? ORDER BY date DESC, id DESC',
            [userIdNum]
        );

        // Format date and amount if necessary (mysql2 returns Date objects for dates, BigInt for DECIMAL)
        const formattedExpenses = expenses.map(expense => ({
            ...expense,
            date: moment(expense.date).format('YYYY-MM-DD'), // Or expense.date.toISOString().split('T')[0]
            amount: parseFloat(expense.amount), // Ensure amount is float
        }));

        res.json({ status: "success", data: formattedExpenses });
    } catch (e) {
        console.error("Get expenses error:", e);
        res.status(500).json({ status: "error", message: `Failed to retrieve expenses: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- DELETE EXPENSE ---
app.delete('/delete_expense/:expense_id', async (req, res) => {
    const { expense_id } = req.params; // Route parameters
    const { userid } = req.query; // User ID from query param (or body if preferred)

    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.execute('DELETE FROM expenses WHERE id = ? AND userid = ?', [expense_id, userIdNum]);

        if (result.affectedRows > 0) {
            res.json({ status: "success", message: "Expense deleted successfully!" });
        } else {
            res.status(404).json({ status: "error", message: "Expense not found or not authorized to delete." });
        }
    } catch (e) {
        console.error("Delete expense error:", e);
        res.status(500).json({ status: "error", message: `Failed to delete expense: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- GET SINGLE EXPENSE FOR UPDATE ---
app.get('/expense/:expense_id', async (req, res) => {
    const { expense_id } = req.params;
    const { userid } = req.query;

    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT id, userid, date, expensename, amount, paymode, category FROM expenses WHERE id = ? AND userid = ?',
            [expense_id, userIdNum]
        );
        const expense = rows[0];

        if (expense) {
            expense.date = moment(expense.date).format('YYYY-MM-DD');
            expense.amount = parseFloat(expense.amount);
            res.json({ status: "success", data: expense });
        } else {
            res.status(404).json({ status: "error", message: "Expense not found or not authorized." });
        }
    } catch (e) {
        console.error("Get single expense error:", e);
        res.status(500).json({ status: "error", message: `Failed to retrieve single expense: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- UPDATE EXPENSE ---
app.put('/update_expense/:expense_id', async (req, res) => {
    const { expense_id } = req.params;
    const { userid, date, expensename, amount, paymode, category } = req.body; // Assuming PUT uses JSON body

    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    if (!date || !expensename || !amount || !paymode || !category) {
        return res.status(400).json({ status: "error", message: "Please fill out all fields for expense update!" });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
        return res.status(400).json({ status: "error", message: "Invalid amount format! Amount must be a number." });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // Check if expense exists and belongs to user
        const [checkRows] = await connection.execute("SELECT id FROM expenses WHERE id = ? AND userid = ?", [expense_id, userIdNum]);
        if (checkRows.length === 0) {
            return res.status(404).json({ status: "error", message: "Expense not found or not authorized to update." });
        }

        const [result] = await connection.execute(
            "UPDATE expenses SET date = ?, expensename = ?, amount = ?, paymode = ?, category = ? WHERE id = ? AND userid = ?",
            [date, expensename, amountNum, paymode, category, expense_id, userIdNum]
        );

        if (result.affectedRows > 0) {
            res.json({ status: "success", message: "Expense updated successfully!" });
        } else {
            res.json({ status: "success", message: "No changes detected for expense." });
        }
    } catch (e) {
        console.error("Update expense error:", e);
        res.status(500).json({ status: "error", message: `Failed to update expense: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- LIMITS ---

app.get("/limit", async (req, res) => {
    const { userid } = req.query;
    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT spending_limit FROM register WHERE id = ?', [userIdNum]);
        const result = rows[0];

        const limit = result && result.spending_limit !== null ? parseFloat(result.spending_limit) : 0.0;
        res.json({ status: "success", data: { limit } });
    } catch (e) {
        console.error("Get limit error:", e);
        res.status(500).json({ status: "error", message: `Failed to retrieve limit: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

app.post("/limit", async (req, res) => {
    const { userid, number: number_str } = req.body; // Destructure 'number' and rename it

    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    if (!number_str) {
        return res.status(400).json({ status: "error", message: "Limit value is required!" });
    }
    const limit_value = parseFloat(number_str);
    if (isNaN(limit_value)) {
        return res.status(400).json({ status: "error", message: "Invalid limit format! Limit must be a number." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.execute('UPDATE register SET spending_limit = ? WHERE id = ?', [limit_value, userIdNum]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: "User not found or limit not updated." });
        }
        res.status(201).json({ status: "success", message: "Spending limit set successfully!" });
    } catch (e) {
        console.error("Set limit error:", e);
        res.status(500).json({ status: "error", message: `Failed to set limit: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// --- REPORTING ENDPOINTS (today, month, year) ---

app.get("/report/today", async (req, res) => {
    const { userid } = req.query;
    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const todayDate = moment().format('YYYY-MM-DD'); // Current date in YYYY-MM-DD format

        const [timeSeriesData] = await connection.execute(
            'SELECT DATE_FORMAT(date, "%Y-%m-%d") as date_only, TIME_FORMAT(date, "%H:%i") as time_of_day, amount FROM expenses WHERE userid = ? AND DATE(date) = ? ORDER BY date',
            [userIdNum, todayDate]
        );
        timeSeriesData.forEach(item => item.amount = parseFloat(item.amount));

        const [rawExpenses] = await connection.execute(
            'SELECT id, userid, date, expensename, amount, paymode, category FROM expenses WHERE userid = ? AND DATE(date) = ? ORDER BY date DESC, id DESC',
            [userIdNum, todayDate]
        );
        rawExpenses.forEach(expense => {
            expense.date = moment(expense.date).format('YYYY-MM-DD');
            expense.amount = parseFloat(expense.amount);
        });

        const total = rawExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const categoryTotals = {};
        rawExpenses.forEach(exp => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });

        res.json({
            status: "success",
            data: {
                time_series_data: timeSeriesData,
                raw_expenses: rawExpenses,
                total_expenses: total,
                category_totals: categoryTotals
            }
        });
    } catch (e) {
        console.error("Get today's report error:", e);
        res.status(500).json({ status: "error", message: `Failed to get today's report: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

app.get("/report/month", async (req, res) => {
    const { userid } = req.query;
    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const [dailyTotals] = await connection.execute(
            'SELECT DATE_FORMAT(date, "%Y-%m-%d") as day, SUM(amount) as total_amount FROM expenses WHERE userid= ? AND MONTH(date)= MONTH(CURDATE()) AND YEAR(date)=YEAR(CURDATE()) GROUP BY DATE(date) ORDER BY DATE(date)',
            [userIdNum]
        );
        dailyTotals.forEach(item => item.total_amount = parseFloat(item.total_amount));

        const [rawExpenses] = await connection.execute(
            'SELECT id, userid, date, expensename, amount, paymode, category FROM expenses WHERE userid = ? AND MONTH(date)= MONTH(CURDATE()) AND YEAR(date)=YEAR(CURDATE()) ORDER BY date DESC, id DESC',
            [userIdNum]
        );
        rawExpenses.forEach(expense => {
            expense.date = moment(expense.date).format('YYYY-MM-DD');
            expense.amount = parseFloat(expense.amount);
        });

        const total = rawExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const categoryTotals = {};
        rawExpenses.forEach(exp => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });

        res.json({
            status: "success",
            data: {
                daily_totals: dailyTotals,
                raw_expenses: rawExpenses,
                total_expenses: total,
                category_totals: categoryTotals
            }
        });
    } catch (e) {
        console.error("Get month report error:", e);
        res.status(500).json({ status: "error", message: `Failed to get month report: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});

app.get("/report/year", async (req, res) => {
    const { userid } = req.query;
    if (!userid) {
        return res.status(400).json({ status: "error", message: "User ID is required!" });
    }
    const userIdNum = parseInt(userid);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ status: "error", message: "Invalid User ID format!" });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const [monthlyTotals] = await connection.execute(
            'SELECT MONTH(date) as month_num, MONTHNAME(date) as month_name, SUM(amount) as total_amount FROM expenses WHERE userid= ? AND YEAR(date)= YEAR(CURDATE()) GROUP BY MONTH(date), MONTHNAME(date) ORDER BY MONTH(date)',
            [userIdNum]
        );
        monthlyTotals.forEach(item => item.total_amount = parseFloat(item.total_amount));

        const [rawExpenses] = await connection.execute(
            'SELECT id, userid, date, expensename, amount, paymode, category FROM expenses WHERE userid = ? AND YEAR(date)= YEAR(CURDATE()) ORDER BY date DESC, id DESC',
            [userIdNum]
        );
        rawExpenses.forEach(expense => {
            expense.date = moment(expense.date).format('YYYY-MM-DD');
            expense.amount = parseFloat(expense.amount);
        });

        const total = rawExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const categoryTotals = {};
        rawExpenses.forEach(exp => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });

        res.json({
            status: "success",
            data: {
                monthly_totals: monthlyTotals,
                raw_expenses: rawExpenses,
                total_expenses: total,
                category_totals: categoryTotals
            }
        });
    } catch (e) {
        console.error("Get year report error:", e);
        res.status(500).json({ status: "error", message: `Failed to get year report: ${e.message}` });
    } finally {
        if (connection) connection.release();
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS allowed for origin: ${REACT_APP_ORIGIN}`);
});
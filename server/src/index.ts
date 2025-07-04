import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRouter } from './routes/auth.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import customersRouter from './routes/customers.routes';
import accountsRouter from './routes/accounts.routes';
import accountAuthorizationRouter from './routes/accountAuthorization.routes';
import transactionsRouter from './routes/transactions.routes';
import withdrawalAuthorizationRouter from './routes/withdrawalAuthorization.routes';
import loansRouter from './routes/loans.routes';
import uploadRouter from './routes/upload.routes';
import bankIncomeRouter from './routes/bankIncome.routes';
import { reportsRouter } from './routes/reports.routes';
import expensesRouter from './routes/expenses.routes';
import usersRouter from './routes/users.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Increase URL-encoded payload limit

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/customers', customersRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/account-authorizations', accountAuthorizationRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/withdrawal-authorizations', withdrawalAuthorizationRouter);
app.use('/api/loans', loansRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/bank-income', bankIncomeRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/users', usersRouter);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

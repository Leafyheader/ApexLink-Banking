"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = require("./routes/auth.routes");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const customers_routes_1 = __importDefault(require("./routes/customers.routes"));
const accounts_routes_1 = __importDefault(require("./routes/accounts.routes"));
const accountAuthorization_routes_1 = __importDefault(require("./routes/accountAuthorization.routes"));
const transactions_routes_1 = __importDefault(require("./routes/transactions.routes"));
const withdrawalAuthorization_routes_1 = __importDefault(require("./routes/withdrawalAuthorization.routes"));
const loans_routes_1 = __importDefault(require("./routes/loans.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const bankIncome_routes_1 = __importDefault(require("./routes/bankIncome.routes"));
const reports_routes_1 = require("./routes/reports.routes");
const expenses_routes_1 = __importDefault(require("./routes/expenses.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' })); // Increase JSON payload limit
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' })); // Increase URL-encoded payload limit
// Serve static files from uploads directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Routes
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/dashboard', dashboard_routes_1.dashboardRouter);
app.use('/api/customers', customers_routes_1.default);
app.use('/api/accounts', accounts_routes_1.default);
app.use('/api/account-authorizations', accountAuthorization_routes_1.default);
app.use('/api/transactions', transactions_routes_1.default);
app.use('/api/withdrawal-authorizations', withdrawalAuthorization_routes_1.default);
app.use('/api/loans', loans_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/bank-income', bankIncome_routes_1.default);
app.use('/api/reports', reports_routes_1.reportsRouter);
app.use('/api/expenses', expenses_routes_1.default);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

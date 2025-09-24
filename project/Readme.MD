# ApexLink Banking System

A comprehensive banking management system built with React, Node.js, and MySQL. This system provides complete banking operations including customer management, account management, transaction processing, loan management, and administrative controls.

## 🚀 Features

### Customer Management
- **Customer Registration**: Complete customer onboarding with KYC verification
- **Customer Profiles**: Detailed customer information with photo and signature upload
- **Beneficiary Management**: Support for up to 3 beneficiaries with relationship tracking
- **CSV Import/Export**: Bulk customer import with comprehensive validation
- **Search & Filtering**: Advanced customer search and filtering capabilities

### Account Management
- **Multiple Account Types**: Savings, Current, Fixed Deposit, and Loan accounts
- **Account Status Control**: Active, Dormant, Closed, and Frozen status management
- **Share Balance Tracking**: Dedicated share balance management
- **Account Authorization**: Approval workflow for new accounts

### Transaction Processing
- **Transaction Types**: Deposits, Withdrawals, Transfers, and Loan Repayments
- **Withdrawal Authorization**: Multi-level approval system for withdrawals
- **Transaction History**: Complete audit trail with status tracking
- **Reference Numbers**: Unique transaction reference generation

### Loan Management
- **Loan Applications**: Complete loan application processing
- **Multiple Guarantors**: Support for up to 3 guarantors per loan
- **Flexible Repayment**: Monthly, Quarterly, and Annual repayment options
- **Interest Calculation**: Automated interest and payment calculations
- **Loan Status Tracking**: Active, Paid, Defaulted, and Closed status management

### Financial Management
- **Bank Income Tracking**: Automated income generation from fees and charges
- **Expense Management**: Complete expense tracking with approval workflow
- **Balance Management**: Real-time balance updates and validation

### Administrative Features
- **Role-Based Access**: Admin, Manager, and Teller roles with different permissions
- **User Management**: Complete user account management
- **Audit Trail**: Comprehensive logging of all system activities
- **Report Generation**: Various financial and operational reports

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **Axios** for API communication

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Prisma ORM** for database operations
- **JWT** for authentication
- **bcryptjs** for password hashing

### Database
- **MySQL** for production
- **SQLite** support for development/single-machine deployments

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MySQL Server (v8.0 or higher)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/apexlink-banking.git
cd apexlink-banking
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
DATABASE_URL="mysql://username:password@localhost:3306/apexlink_banking"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### 4. Frontend Setup
```bash
cd ../project
npm install
```

Create a `.env` file in the project directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Start the Application
```bash
# Start backend (in backend directory)
npm run dev

# Start frontend (in project directory)
npm start
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Database Configuration
For SQLite (single-machine deployment):
```env
DATABASE_URL="file:./dev.db"
```

For MySQL (production):
```env
DATABASE_URL="mysql://username:password@localhost:3306/database_name"
```

### SQLite Optimization (for single-machine deployments)
The system includes SQLite optimizations for better performance:
- WAL mode for better concurrency
- Proper indexing for transaction tables
- Regular maintenance routines

## 👥 User Roles

### Admin
- Full system access
- User management
- System configuration
- All financial operations

### Manager
- Customer and account management
- Loan approvals
- Transaction oversight
- Report generation

### Teller
- Customer registration
- Account operations
- Transaction processing
- Basic reporting

## 📊 Database Schema

### Key Models
- **User**: System users with role-based permissions
- **Customer**: Customer information and KYC data
- **Account**: Bank accounts with multiple types and statuses
- **Transaction**: All financial transactions
- **Loan**: Loan management with guarantors
- **WithdrawalAuthorization**: Withdrawal approval workflow
- **BankIncome**: Income tracking from various sources
- **Expense**: Expense management with approvals

## 🚀 Deployment

### Production Deployment
1. Build the frontend:
```bash
cd project
npm run build
```

2. Configure production database
3. Set environment variables
4. Deploy using your preferred method (Docker, PM2, etc.)

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- SQL injection prevention with Prisma
- XSS protection

## 📈 Performance Considerations

### For High Transaction Volumes
- Indexed database tables for optimal query performance
- Connection pooling for database efficiency
- Pagination for large data sets
- Optimized queries with proper relationships

### SQLite Optimization
- WAL mode enabled
- Regular VACUUM operations
- Proper indexing strategy
- Transaction batching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 API Documentation

### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
```

### Customer Management
```bash
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id
```

### Account Management
```bash
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/:id
PUT    /api/accounts/:id
PUT    /api/accounts/:id/status
```

### Transaction Management
```bash
GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
```

## 🐛 Known Issues

- Large CSV imports may take time for processing
- Phone number validation accepts multiple formats
- Date handling supports multiple international formats

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Built with React and Node.js
- UI components inspired by modern banking interfaces
- Database design following banking industry best practices

---

**Note**: This is a banking management system intended for educational and small-scale banking operations. For production use in regulated environments, additional compliance and security measures may be required.
# Database Management Scripts

This directory contains scripts for managing the ApexLink Banking database during development and testing.

## Available Scripts

### 1. Database Statistics (`db-stats.js`)
Shows current database statistics and recent activity.

```bash
# Show current database state
node db-stats.js
```

**Output:**
- Count of all tables (users, customers, accounts, transactions, etc.)
- Recent transactions and loans
- Total record count

### 2. Clear All Data (`clear-all-data.js`)
Completely clears all data from the database while preserving the admin user.

```bash
# Safe mode - requires confirmation
node clear-all-data.js --confirm

# Force mode using environment variable
FORCE_CLEAR=true node clear-all-data.js
```

**Features:**
- Clears data in proper dependency order
- Preserves admin user
- Requires explicit confirmation for safety
- Transaction-based (all-or-nothing)

### 3. Quick Clear (`quick-clear.js`)
Fast database reset without confirmation prompts.

```bash
# Quick reset - no confirmation needed
node quick-clear.js
```

**Use case:** Development iterations where you need frequent resets.

### 4. Selective Clear (`selective-clear.js`)
Clear specific types of data only.

```bash
# Clear specific data types
node selective-clear.js --transactions --confirm
node selective-clear.js --loans --confirm
node selective-clear.js --customers --accounts --confirm

# Clear everything
node selective-clear.js --all --confirm
```

**Options:**
- `--transactions` - Clear all transactions
- `--loans` - Clear all loan-related data
- `--accounts` - Clear all accounts
- `--customers` - Clear all customers
- `--users` - Clear non-admin users
- `--expenses` - Clear expense records
- `--bank-income` - Clear bank income records
- `--all` - Clear everything (except admin)

### 5. Complete Database Reset (`reset-database.js`)
Full database reset with options to recreate admin user and sample data.

```bash
# Basic reset
node reset-database.js --force

# Reset with sample data
node reset-database.js --force --sample-data

# Reset without statistics
node reset-database.js --force --skip-stats

# Reset without recreating admin
node reset-database.js --force --no-admin
```

**Features:**
- Shows before/after statistics
- Recreates admin user (username: `admin`, password: `admin123`)
- Optionally creates sample customers and accounts
- Comprehensive reset process

## Safety Features

All scripts include safety measures:
- **Confirmation requirements** (except quick-clear)
- **Transaction-based operations** (atomic success/failure)
- **Admin user preservation**
- **Detailed logging and error handling**
- **Clear usage instructions**

## Common Use Cases

### Development Reset
```bash
# Quick development reset
node quick-clear.js

# Or with fresh sample data
node reset-database.js --force --sample-data
```

### Testing Preparation
```bash
# Clear only test-related data
node selective-clear.js --transactions --loans --confirm

# Full clean slate for testing
node clear-all-data.js --confirm
```

### Production Maintenance
```bash
# Check database state first
node db-stats.js

# Selective cleanup if needed
node selective-clear.js --transactions --confirm
```

## Script Dependencies

All scripts require:
- `@prisma/client` - Database access
- `bcryptjs` - Password hashing (for admin user creation)
- Proper database connection in `.env`

## Error Handling

Scripts will:
- Show detailed error messages
- Suggest troubleshooting steps
- Exit cleanly on failure
- Disconnect from database properly

## Example Workflows

### Fresh Development Setup
```bash
# 1. Check current state
node db-stats.js

# 2. Complete reset with sample data
node reset-database.js --force --sample-data

# 3. Verify new state
node db-stats.js
```

### Clean Slate for Testing
```bash
# 1. Quick clear all data
node quick-clear.js

# 2. Create fresh admin user
node reset-database.js --force --no-admin
```

### Selective Cleanup
```bash
# 1. Clear only financial data
node selective-clear.js --transactions --expenses --bank-income --confirm

# 2. Keep customers and accounts intact
node db-stats.js
```
@echo off
echo Testing Loan Creation with Guarantor Deductions...

rem Login and get token
curl -X POST http://localhost:5000/api/auth/login ^
     -H "Content-Type: application/json" ^
     -d "{\"username\":\"admin\",\"password\":\"admin123\"}" ^
     -o login_response.json

rem Extract token (you'll need to manually check the file for the token)
echo Login response saved to login_response.json
echo Please check the token and use it in the next request

pause

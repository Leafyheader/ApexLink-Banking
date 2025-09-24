// Test with the smallest possible payment to trigger our logic
const API_BASE = 'http://localhost:5000/api';

async function testMinimalPayment() {
    try {
        console.log('🔍 MINIMAL PAYMENT TEST\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Make a tiny payment of ₵1 that should definitely be allowed
        console.log('💸 Making minimal payment of ₵1...\n');
        
        const testLoanId = 'a17c7d27-a9d2-4557-a029-918cdc4894b4';
        const loansResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loansResponse.json();
        const testLoan = loansData.loans?.find(loan => loan.id === testLoanId);
        
        if (!testLoan) {
            console.log('❌ Test loan not found');
            return;
        }

        const paymentResponse = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                accountId: testLoan.accountId,
                type: 'LOAN_REPAYMENT',
                amount: 1,
                description: 'Minimal test payment'
            })
        });

        if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            console.log('✅ MINIMAL PAYMENT PROCESSED!');
            console.log('📊 Results:');
            console.log(`   Interest Portion: ₵${Number(paymentResult.repaymentDetails?.interestPortion || 0).toFixed(2)}`);
            console.log(`   Principal Portion: ₵${Number(paymentResult.repaymentDetails?.principalPortion || 0).toFixed(2)}`);
            
            // Expected: ₵1 × 9.09% = ₵0.09 interest, ₵0.91 principal
            const expectedInterest = 1 * (100 / 1100);
            console.log(`   Expected Interest: ₵${expectedInterest.toFixed(4)}`);
            
            if (Number(paymentResult.repaymentDetails?.interestPortion || 0) > 0) {
                console.log('   ✅ Interest was charged correctly!');
            } else {
                console.log('   ❌ No interest was charged');
            }
        } else {
            const error = await paymentResponse.json();
            console.log('❌ Payment failed:', error.error);
        }

        console.log('\n🎯 TEST COMPLETE!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testMinimalPayment();

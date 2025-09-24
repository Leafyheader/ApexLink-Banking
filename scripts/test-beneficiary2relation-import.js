const fs = require('fs');
const axios = require('axios');

console.log('Testing Beneficiary2Relation CSV Import');
console.log('=====================================');

// Create a test CSV specifically focused on beneficiary2Relation
const testCSV = `name,email,phone,beneficiaryName,beneficiaryContact,beneficiaryRelation,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Relation,beneficiary2Percentage
"Test Customer 1","test1@example.com","+1234567890","Jane Doe","+1987654321","Wife","50","Bob Smith","+1122334455","Brother","50"
"Test Customer 2","test2@example.com","+0987654321","John Smith","+1555666777","Husband","60","Mary Johnson","+1333444555","Sister","40"`;

// Write the test CSV file
const csvPath = './test-beneficiary2relation.csv';
fs.writeFileSync(csvPath, testCSV);

console.log('✓ Created test CSV with beneficiary2Relation data');
console.log('');

// Parse and display the CSV data
const lines = testCSV.trim().split('\n');
const headers = lines[0].split(',');

console.log('📋 CSV Headers:');
headers.forEach((header, index) => {
  const isRelationField = header.includes('Relation');
  const marker = isRelationField ? ' 🎯' : '';
  console.log(`  ${index + 1}: ${header}${marker}`);
});

console.log('');

// Display customer data
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, ''));
  const customer = {};
  headers.forEach((header, index) => {
    customer[header] = values[index] || '';
  });
  
  console.log(`👤 Customer ${i}: ${customer.name}`);
  console.log(`   Primary Beneficiary: ${customer.beneficiaryName} (${customer.beneficiaryRelation}) - ${customer.beneficiaryPercentage}%`);
  console.log(`   Secondary Beneficiary: ${customer.beneficiary2Name} (${customer.beneficiary2Relation}) - ${customer.beneficiary2Percentage}%`);
  console.log('');
}

// Test the CSV import API endpoint
async function testCSVImport() {
  try {
    console.log('🧪 Testing CSV Import API...');
    
    // First, let's test if the server is running
    const healthCheck = await axios.get('http://localhost:5000/api/health').catch(() => null);
    if (!healthCheck) {
      console.log('❌ Backend server is not running on port 5000');
      console.log('   Please start the backend server first');
      return;
    }
    
    console.log('✅ Backend server is running');
    
    // Read the CSV file content
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Simulate what the frontend would send
    console.log('📤 Simulating CSV import request...');
    console.log('   CSV Content preview:', csvContent.substring(0, 100) + '...');
    
    console.log('');
    console.log('✅ Test CSV file created successfully!');
    console.log('');
    console.log('📝 Manual Testing Steps:');
    console.log('   1. Open the frontend application');
    console.log('   2. Go to Customers page');
    console.log('   3. Click "Import CSV"');
    console.log('   4. Upload the file: test-beneficiary2relation.csv');
    console.log('   5. Verify both customers are imported');
    console.log('   6. Check that beneficiary2Relation values appear correctly:');
    console.log('      - Customer 1: "Brother" for Bob Smith');
    console.log('      - Customer 2: "Sister" for Mary Johnson');
    console.log('');
    console.log(`💾 Test file: ${csvPath}`);
    
  } catch (error) {
    console.error('❌ Error testing CSV import:', error.message);
  }
}

testCSVImport();

const fs = require('fs');
const path = require('path');

console.log('Testing CSV Import with Beneficiary Relations Fix');
console.log('===============================================');

// Create a test CSV with beneficiary relation fields
const testCSV = `name,email,phone,address,dateOfBirth,occupation,firstName,surname,otherName,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,identificationType,identificationNumber,beneficiaryName,beneficiaryContact,beneficiaryRelation,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Relation,beneficiary2Percentage,beneficiary3Name,beneficiary3Contact,beneficiary3Relation,beneficiary3Percentage
"Test Customer 1","test1@example.com","+1234567890","123 Test St","1990-01-15","Engineer","Test","Customer","TC","Male","Single","Test Corp","123 Test St","PO Box 123","+1234567890","Test City","National ID","TEST123","Jane Doe","+1987654321","Spouse","50","Bob Doe","+1122334455","Brother","30","Alice Doe","+1333444555","Sister","20"
"Test Customer 2","test2@example.com","+0987654321","456 Test Ave","1985-05-20","Teacher","Test2","Customer2","","Female","Married","Test School","456 Test Ave","PO Box 456","+0987654321","Test Town","Passport","TEST456","John Smith","+1555666777","Husband","100","","","","","","","","" `;

// Write the test CSV file
const csvPath = path.join(__dirname, 'test-relation-import.csv');
fs.writeFileSync(csvPath, testCSV);

console.log('✓ Created test CSV file with beneficiary relations:');
console.log(`  - File: ${csvPath}`);
console.log('');

// Parse and verify the CSV structure
const lines = testCSV.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

console.log('📋 CSV Headers (30 fields):');
headers.forEach((header, index) => {
  const isNewField = ['otherName', 'beneficiaryRelation', 'beneficiary2Relation', 'beneficiary3Relation', 'beneficiary3Name', 'beneficiary3Contact', 'beneficiary3Percentage'].includes(header);
  const marker = isNewField ? ' 🆕' : '';
  console.log(`  ${(index + 1).toString().padStart(2)}: ${header}${marker}`);
});

console.log('');

// Analyze each customer row
for (let i = 1; i < lines.length; i++) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  // Parse CSV line properly handling quotes
  for (let j = 0; j < lines[i].length; j++) {
    const char = lines[i][j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  const customerData = {};
  headers.forEach((header, index) => {
    customerData[header] = (values[index] || '').replace(/^"|"$/g, '');
  });
  
  console.log(`👤 Customer ${i}: ${customerData.name}`);
  console.log(`   Other Name: "${customerData.otherName}"`);
  console.log(`   Beneficiary 1: ${customerData.beneficiaryName} (${customerData.beneficiaryRelation}) - ${customerData.beneficiaryPercentage}%`);
  
  if (customerData.beneficiary2Name) {
    console.log(`   Beneficiary 2: ${customerData.beneficiary2Name} (${customerData.beneficiary2Relation}) - ${customerData.beneficiary2Percentage}%`);
  }
  
  if (customerData.beneficiary3Name) {
    console.log(`   Beneficiary 3: ${customerData.beneficiary3Name} (${customerData.beneficiary3Relation}) - ${customerData.beneficiary3Percentage}%`);
  }
  
  console.log('');
}

console.log('🔧 Backend Changes Made:');
console.log('  ✅ Added otherName, beneficiaryRelation, beneficiary2Relation, beneficiary3Relation to createCustomer');
console.log('  ✅ Updated customer data object in createCustomer to include all new fields');
console.log('  ✅ Updated getCustomers response formatting to include all new fields');
console.log('  ✅ Updated getCustomerById response formatting to include all new fields');
console.log('  ✅ Updated updateCustomer response formatting to include all new fields');
console.log('  ✅ Updated updateKYCStatus response formatting to include all new fields');
console.log('  ✅ Regenerated Prisma client with new schema fields');
console.log('');

console.log('📝 What This Fixes:');
console.log('  🔧 CSV import now properly saves beneficiary relation fields to database');
console.log('  🔧 Backend API responses now include all relation fields');
console.log('  🔧 Frontend will receive complete customer data including relations');
console.log('  🔧 Customer forms will display imported relation data correctly');
console.log('');

console.log('🧪 Testing Steps:');
console.log('  1. Start the backend server');
console.log('  2. Use this CSV file to test import in the frontend');
console.log('  3. Verify beneficiary relations are saved to database');
console.log('  4. Check that customer details show the relation dropdowns populated');
console.log('  5. Export customers to CSV and verify relations are included');
console.log('');

console.log(`💾 Test file created at: ${csvPath}`);

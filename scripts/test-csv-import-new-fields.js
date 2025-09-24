const fs = require('fs');
const path = require('path');

console.log('Testing CSV Import with New Fields');
console.log('==================================');

// Create a test CSV with the new fields
const testCSV = `name,email,phone,address,dateOfBirth,occupation,firstName,surname,otherName,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,identificationType,identificationNumber,beneficiaryName,beneficiaryContact,beneficiaryRelation,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Relation,beneficiary2Percentage,beneficiary3Name,beneficiary3Contact,beneficiary3Relation,beneficiary3Percentage
John Doe,john.doe@example.com,+1234567890,"123 Main St, City, State",1990-01-15,Software Engineer,John,Doe,Johnny,Male,Single,"Tech Corp Inc","123 Main St, City, State","PO Box 123, City, State",+1234567890,"New York","National ID",ID123456789,"Jane Doe",+1987654321,Spouse,50,"Bob Doe",+1122334455,Brother,30,"Alice Doe",+1333444555,Sister,20
Jane Smith,jane.smith@example.com,+0987654321,"456 Oak Ave, City, State",1985-05-20,Teacher,Jane,Smith,,Female,Married,"Springfield Elementary","456 Oak Ave, City, State","PO Box 456, City, State",+0987654321,"Springfield","Passport",PS987654321,"John Smith",+1555666777,Spouse,100,,,,,,,
Mike Johnson,mike.johnson@example.com,+1111222333,"789 Pine Rd, City, State",1992-03-10,Engineer,Mike,Johnson,MJ,Male,Single,"Engineering Corp","789 Pine Rd, City, State","PO Box 789, City, State",+1111222333,"Boston","Driver License",DL444555666,"Sarah Johnson",+1777888999,Sister,60,"Tom Johnson",+1444555666,Brother,40,,,,`;

// Write the test CSV file
const csvPath = path.join(__dirname, 'test-customer-import.csv');
fs.writeFileSync(csvPath, testCSV);

console.log('✓ Created test CSV file with new fields:');
console.log(`  - File: ${csvPath}`);
console.log('  - Includes: otherName, beneficiaryRelation fields for all beneficiaries');
console.log('  - Includes: beneficiary3Name, beneficiary3Contact, beneficiary3Relation, beneficiary3Percentage');
console.log('');

// Simulate parsing the CSV (similar to frontend logic)
const lines = testCSV.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

console.log('📋 CSV Headers found:');
headers.forEach((header, index) => {
  console.log(`  ${index + 1}. ${header}`);
});

console.log('');

// Check for the specific fields we added
const newFields = [
  'otherName',
  'beneficiaryRelation', 
  'beneficiary2Relation',
  'beneficiary3Name',
  'beneficiary3Contact', 
  'beneficiary3Relation',
  'beneficiary3Percentage'
];

console.log('🔍 Checking for new fields in CSV:');
newFields.forEach(field => {
  const found = headers.includes(field);
  console.log(`  ${found ? '✓' : '✗'} ${field}: ${found ? 'Found' : 'Missing'}`);
});

console.log('');

// Parse first customer record to show the data
const firstCustomerData = lines[1].split(',').map(value => value.trim().replace(/^"|"$/g, ''));
const customerObject = {};
headers.forEach((header, index) => {
  customerObject[header] = firstCustomerData[index] || '';
});

console.log('👤 Sample customer data:');
console.log(`  Name: ${customerObject.name}`);
console.log(`  Other Name: ${customerObject.otherName}`);
console.log(`  Beneficiary 1: ${customerObject.beneficiaryName} (${customerObject.beneficiaryRelation}) - ${customerObject.beneficiaryPercentage}%`);
console.log(`  Beneficiary 2: ${customerObject.beneficiary2Name} (${customerObject.beneficiary2Relation}) - ${customerObject.beneficiary2Percentage}%`);
console.log(`  Beneficiary 3: ${customerObject.beneficiary3Name} (${customerObject.beneficiary3Relation}) - ${customerObject.beneficiary3Percentage}%`);

console.log('');
console.log('✅ CSV Import Test Complete!');
console.log('');
console.log('📝 Next Steps:');
console.log('  1. Use this CSV file to test the import in the frontend');
console.log('  2. Verify all new fields are properly imported');
console.log('  3. Check that beneficiary relation dropdowns work correctly');
console.log('');
console.log(`💾 Test file created at: ${csvPath}`);

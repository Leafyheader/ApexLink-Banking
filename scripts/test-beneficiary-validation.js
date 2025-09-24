const fs = require('fs');
const path = require('path');

console.log('Testing CSV Import with Beneficiary Name Validation');
console.log('=================================================');

// Create a test CSV with some empty beneficiary names
const testCSV = `name,email,phone,address,dateOfBirth,occupation,firstName,surname,otherName,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,identificationType,identificationNumber,beneficiaryName,beneficiaryContact,beneficiaryRelation,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Relation,beneficiary2Percentage,beneficiary3Name,beneficiary3Contact,beneficiary3Relation,beneficiary3Percentage
"John Doe","john.doe@example.com","+1234567890","123 Main St, City, State","1990-01-15","Software Engineer","John","Doe","Johnny","Male","Single","Tech Corp Inc","123 Main St, City, State","PO Box 123, City, State","+1234567890","New York","National ID","ID123456789","Jane Doe","+1987654321","Spouse","50","Bob Doe","+1122334455","Brother","30","Alice Doe","+1333444555","Sister","20"
"Jane Smith","jane.smith@example.com","+0987654321","456 Oak Ave, City, State","1985-05-20","Teacher","Jane","Smith","","Female","Married","Springfield Elementary","456 Oak Ave, City, State","PO Box 456, City, State","+0987654321","Springfield","Passport","PS987654321","","","","","","","","","","","",""
"Mike Johnson","mike.johnson@example.com","+1111222333","789 Pine Rd, City, State","1992-03-10","Engineer","Mike","Johnson","MJ","Male","Single","Engineering Corp","789 Pine Rd, City, State","PO Box 789, City, State","+1111222333","Boston","Driver License","DL444555666","Sarah Johnson","+1777888999","Sister","60","Tom Johnson","+1444555666","Brother","40","","","",""
"Empty Beneficiary","empty@example.com","+2222333444","999 Empty St","1988-07-22","Manager","Empty","Beneficiary","","Male","Single","Empty Corp","999 Empty St","PO Box 999","+2222333444","Empty City","ID","EMPTY123","","","","","","","","","","","",""
"Null Ben Name","null@example.com","+3333444555","888 Null Ave","1995-12-01","Developer","Null","Name","","Female","Single","Null Corp","888 Null Ave","PO Box 888","+3333444555","Null City","Passport","NULL456",null,"","","","","","","","","","","" `;

// Write the test CSV file
const csvPath = path.join(__dirname, 'test-beneficiary-validation.csv');
fs.writeFileSync(csvPath, testCSV);

console.log('✓ Created test CSV file with mixed beneficiary data:');
console.log(`  - File: ${csvPath}`);
console.log('');

// Parse and analyze the CSV
const lines = testCSV.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
const beneficiaryNameIndex = headers.indexOf('beneficiaryName');

console.log('📋 Customer Analysis:');
console.log('');

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
  
  const customerName = values[0]?.replace(/^"|"$/g, '') || '';
  const beneficiaryName = values[beneficiaryNameIndex]?.replace(/^"|"$/g, '') || '';
  
  const isEmpty = !beneficiaryName || beneficiaryName.trim() === '' || beneficiaryName.toLowerCase() === 'null';
  const status = isEmpty ? '❌ SKIP' : '✅ IMPORT';
  
  console.log(`  Row ${i + 1}: ${customerName}`);
  console.log(`    Beneficiary Name: "${beneficiaryName}"`);
  console.log(`    Status: ${status}`);
  console.log('');
}

console.log('📊 Expected Import Results:');
console.log('  ✅ John Doe - Has beneficiary "Jane Doe"');
console.log('  ❌ Jane Smith - Empty beneficiary name');
console.log('  ✅ Mike Johnson - Has beneficiary "Sarah Johnson"');
console.log('  ❌ Empty Beneficiary - Empty beneficiary name');
console.log('  ❌ Null Ben Name - Null beneficiary name');
console.log('');
console.log('📈 Summary:');
console.log('  - Total rows: 5');
console.log('  - Expected imports: 2');
console.log('  - Expected skips: 3');
console.log('');
console.log(`💾 Test file created at: ${csvPath}`);

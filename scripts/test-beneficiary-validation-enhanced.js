const fs = require('fs');
const path = require('path');

console.log('Testing Enhanced Beneficiary Name Validation');
console.log('===========================================');

// Create a test CSV with various beneficiary name scenarios
const testCSV = `name,email,phone,beneficiaryName,beneficiaryContact,beneficiaryRelation,beneficiaryPercentage
"Valid Customer 1","valid1@example.com","+1234567890","John Doe","+1987654321","Spouse","100"
"Invalid Customer 1","invalid1@example.com","+0987654321","","","","100"
"Invalid Customer 2","invalid2@example.com","+1111222333",null,"","","100"
"Invalid Customer 3","invalid3@example.com","+2222333444","NULL","+1333444555","Brother","100"
"Invalid Customer 4","invalid4@example.com","+3333444555","null","+1444555666","Sister","100"
"Invalid Customer 5","invalid5@example.com","+4444555666","   ","+1555666777","Mother","100"
"Valid Customer 2","valid2@example.com","+5555666777","Jane Smith","+1666777888","Wife","100"
"Invalid Customer 6","invalid6@example.com","+6666777888","Null","+1777888999","Father","100"`;

// Write the test CSV file
const csvPath = path.join(__dirname, 'test-beneficiary-validation-enhanced.csv');
fs.writeFileSync(csvPath, testCSV);

console.log('✓ Created test CSV with various beneficiary name scenarios');
console.log('');

// Parse and analyze the CSV
const lines = testCSV.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
const beneficiaryNameIndex = headers.indexOf('beneficiaryName');

console.log('📋 Test Scenarios:');
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
  
  // Apply the same validation logic as the frontend
  const isEmpty = !beneficiaryName || !beneficiaryName.trim();
  const isNull = beneficiaryName.trim().toLowerCase() === 'null';
  const isWhitespace = beneficiaryName.trim() === '';
  
  const shouldSkip = isEmpty || isNull;
  const status = shouldSkip ? '❌ SKIP' : '✅ IMPORT';
  
  console.log(`  Row ${i + 1}: ${customerName}`);
  console.log(`    Beneficiary Name: "${beneficiaryName}"`);
  
  if (isEmpty && beneficiaryName === '') {
    console.log(`    Reason: Empty string`);
  } else if (isEmpty && !beneficiaryName) {
    console.log(`    Reason: Null/undefined`);
  } else if (isWhitespace) {
    console.log(`    Reason: Whitespace only`);
  } else if (isNull) {
    console.log(`    Reason: String "null" (case-insensitive)`);
  } else {
    console.log(`    Reason: Valid beneficiary name`);
  }
  
  console.log(`    Status: ${status}`);
  console.log('');
}

console.log('🧪 Expected Import Results:');
console.log('  ✅ Valid Customer 1 - Has beneficiary "John Doe"');
console.log('  ❌ Invalid Customer 1 - Empty string beneficiary');
console.log('  ❌ Invalid Customer 2 - Null beneficiary');
console.log('  ❌ Invalid Customer 3 - "NULL" string beneficiary');
console.log('  ❌ Invalid Customer 4 - "null" string beneficiary');
console.log('  ❌ Invalid Customer 5 - Whitespace only beneficiary');
console.log('  ✅ Valid Customer 2 - Has beneficiary "Jane Smith"');
console.log('  ❌ Invalid Customer 6 - "Null" string beneficiary (case-insensitive)');
console.log('');

console.log('📊 Summary:');
console.log('  - Total rows: 8');
console.log('  - Expected imports: 2 (Valid Customer 1 & 2)');
console.log('  - Expected skips: 6 (all invalid scenarios)');
console.log('');

console.log('🔧 Enhanced Validation Logic:');
console.log('  - Rejects empty strings: ""');
console.log('  - Rejects null/undefined values');
console.log('  - Rejects whitespace-only strings: "   "');
console.log('  - Rejects string "NULL" (case-insensitive): "null", "NULL", "Null"');
console.log('');

console.log('💾 Test file created at:');
console.log(`  ${csvPath}`);
console.log('');

console.log('📝 Manual Testing Steps:');
console.log('  1. Open the frontend application');
console.log('  2. Go to Customers page');
console.log('  3. Click "Import CSV"');
console.log('  4. Upload this test file');
console.log('  5. Verify only 2 customers are imported');
console.log('  6. Check that 6 customers are skipped with clear error messages');

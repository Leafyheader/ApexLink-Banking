const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging CSV Import - Beneficiary2Relation Issue');
console.log('==================================================');

// Create a simple test CSV with clear beneficiary2Relation values
const testCSV = `name,email,phone,address,dateOfBirth,occupation,firstName,surname,otherName,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,identificationType,identificationNumber,beneficiaryName,beneficiaryContact,beneficiaryRelation,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Relation,beneficiary2Percentage,beneficiary3Name,beneficiary3Contact,beneficiary3Relation,beneficiary3Percentage
"Debug Customer","debug@test.com","+1234567890","123 Debug St","1990-01-15","Tester","Debug","Customer","DC","Male","Single","Debug Corp","123 Debug St","PO Box 123","+1234567890","Debug City","ID","DEBUG123","Primary Ben","+1111111111","Spouse","60","Secondary Ben","+2222222222","Brother","40","","","",""`;

// Write the test CSV file
const csvPath = path.join(__dirname, 'debug-beneficiary2relation.csv');
fs.writeFileSync(csvPath, testCSV);

console.log('✓ Created debug CSV file:');
console.log(`  File: ${csvPath}`);
console.log('');

// Parse the CSV to simulate frontend parsing
const lines = testCSV.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

console.log('📋 CSV Headers:');
headers.forEach((header, index) => {
  if (header.includes('beneficiary')) {
    console.log(`  ${index}: ${header} ${header === 'beneficiary2Relation' ? '👈 TARGET FIELD' : ''}`);
  }
});

console.log('');

// Parse the data row
const dataLine = lines[1];
const values = [];
let current = '';
let inQuotes = false;

for (let i = 0; i < dataLine.length; i++) {
  const char = dataLine[i];
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

// Create customer object
const customer = {};
headers.forEach((header, index) => {
  customer[header] = (values[index] || '').replace(/^"|"$/g, '');
});

console.log('👤 Parsed Customer Data:');
console.log(`  Name: ${customer.name}`);
console.log(`  Beneficiary 1: ${customer.beneficiaryName} (${customer.beneficiaryRelation}) - ${customer.beneficiaryPercentage}%`);
console.log(`  Beneficiary 2: ${customer.beneficiary2Name} (${customer.beneficiary2Relation}) - ${customer.beneficiary2Percentage}%`);
console.log('');

console.log('🔍 Field Validation:');
console.log(`  beneficiary2Name: "${customer.beneficiary2Name}" (Length: ${customer.beneficiary2Name?.length || 0})`);
console.log(`  beneficiary2Contact: "${customer.beneficiary2Contact}" (Length: ${customer.beneficiary2Contact?.length || 0})`);
console.log(`  beneficiary2Relation: "${customer.beneficiary2Relation}" (Length: ${customer.beneficiary2Relation?.length || 0})`);
console.log(`  beneficiary2Percentage: "${customer.beneficiary2Percentage}" (Length: ${customer.beneficiary2Percentage?.length || 0})`);
console.log('');

// Simulate the parseStringField function
const parseStringField = (value) => {
  if (!value || !value.trim()) return undefined;
  return value.trim();
};

console.log('🛠️  After parseStringField Processing:');
console.log(`  beneficiary2Name: ${parseStringField(customer.beneficiary2Name)}`);
console.log(`  beneficiary2Contact: ${parseStringField(customer.beneficiary2Contact)}`);
console.log(`  beneficiary2Relation: ${parseStringField(customer.beneficiary2Relation)}`);
console.log(`  beneficiary2Percentage: ${customer.beneficiary2Percentage}`);
console.log('');

// Simulate the customer data object that would be sent to backend
const customerData = {
  name: customer.name || '',
  email: customer.email && customer.email.trim() ? customer.email.trim() : undefined,
  beneficiaryName: parseStringField(customer.beneficiaryName),
  beneficiaryContact: parseStringField(customer.beneficiaryContact),
  beneficiaryRelation: parseStringField(customer.beneficiaryRelation),
  beneficiaryPercentage: parseInt(customer.beneficiaryPercentage) || undefined,
  beneficiary2Name: parseStringField(customer.beneficiary2Name),
  beneficiary2Contact: parseStringField(customer.beneficiary2Contact),
  beneficiary2Relation: parseStringField(customer.beneficiary2Relation),
  beneficiary2Percentage: parseInt(customer.beneficiary2Percentage) || undefined,
};

console.log('📤 Customer Data Object (sent to backend):');
Object.entries(customerData).forEach(([key, value]) => {
  if (key.includes('beneficiary')) {
    console.log(`  ${key}: ${JSON.stringify(value)} ${key === 'beneficiary2Relation' ? '👈 CHECK THIS' : ''}`);
  }
});

console.log('');
console.log('🎯 Debug Steps:');
console.log('  1. Import this CSV file in the frontend');
console.log('  2. Check browser network tab for the POST request to /customers');
console.log('  3. Verify beneficiary2Relation is in the request payload');
console.log('  4. Check backend logs for the received data');
console.log('  5. Query the database directly to see if beneficiary2Relation was saved');
console.log('');
console.log(`💾 Debug file: ${csvPath}`);

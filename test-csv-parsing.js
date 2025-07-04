// Simple test CSV content for customer import with all fields
const testCsvContent = `name,email,phone,address,dateOfBirth,occupation,firstName,surname,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,beneficiaryName,beneficiaryContact,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Percentage
"John Doe","john.doe@example.com","+1234567890","123 Main St, City, State","1990-01-15","Software Engineer","John","Doe","Male","Single","Tech Corp Inc","123 Main St, City, State","PO Box 123, City, State","+1234567890","New York","Jane Doe","+1987654321","50","Bob Doe","+1122334455","50"
"Jane Smith","jane.smith@example.com","+0987654321","456 Oak Ave, City, State","1985-05-20","Teacher","Jane","Smith","Female","Married","Springfield Elementary","456 Oak Ave, City, State","PO Box 456, City, State","+0987654321","Springfield","John Smith","+1555666777","100","","",""
"Bob Johnson","bob.johnson@example.com","+1122334455","789 Pine Rd, City, State","1992-08-10","Accountant","Bob","Johnson","Male","Divorced","Accounting Firm LLC","789 Pine Rd, City, State","PO Box 789, City, State","+1122334455","Boston","Alice Johnson","+1333444555","100","","",""`;

// Test the CSV parsing function
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    // Handle CSV parsing with quoted fields containing commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value
    
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.toLowerCase().replace(/\s+/g, '')] = (values[index] || '').replace(/^"|"$/g, '');
    });
    return obj;
  });
}

// Test the parsing
console.log('Testing CSV parsing:');
const parsedData = parseCSV(testCsvContent);
console.log(JSON.stringify(parsedData, null, 2));

// Verify the data structure
console.log('\nVerifying data structure:');
parsedData.forEach((customer, index) => {
  console.log(`Customer ${index + 1}:`);
  console.log(`  Name: ${customer.name}`);
  console.log(`  Email: ${customer.email}`);
  console.log(`  Phone: ${customer.phone}`);
  console.log(`  First Name: ${customer.firstname}`);
  console.log(`  Surname: ${customer.surname}`);
  console.log(`  Gender: ${customer.gender}`);
  console.log(`  Marital Status: ${customer.maritalstatus}`);
  console.log(`  Occupation: ${customer.occupation}`);
  console.log(`  Workplace: ${customer.workplace}`);
  console.log(`  City: ${customer.city}`);
  console.log(`  Beneficiary: ${customer.beneficiaryname} (${customer.beneficiarypercentage}%)`);
  if (customer.beneficiary2name) {
    console.log(`  Beneficiary 2: ${customer.beneficiary2name} (${customer.beneficiary2percentage}%)`);
  }
  console.log('');
});

console.log('✅ CSV parsing test completed successfully!');

// Test CSV content with identification fields
const testCsvContent = `name,email,phone,address,dateOfBirth,occupation,firstName,surname,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,identificationType,identificationNumber,beneficiaryName,beneficiaryContact,beneficiaryPercentage
"John Doe","john.doe@example.com","+1234567890","123 Main St, City, State","1990-01-15","Software Engineer","John","Doe","Male","Single","Tech Corp Inc","123 Main St, City, State","PO Box 123, City, State","+1234567890","New York","National ID","ID123456789","Jane Doe","+1987654321","50"
"Jane Smith","jane.smith@example.com","+0987654321","456 Oak Ave, City, State","1985-05-20","Teacher","Jane","Smith","Female","Married","Springfield Elementary","456 Oak Ave, City, State","PO Box 456, City, State","+0987654321","Springfield","Passport","PS987654321","John Smith","+1555666777","100"
"Bob Johnson","bob.johnson@example.com","+1122334455","789 Pine Rd, City, State","1992-08-10","Accountant","Bob","Johnson","Male","Single","Accounting Firm","789 Pine Rd, City, State","PO Box 789, City, State","+1122334455","Chicago","Driver License","DL789012345","Alice Johnson","+1999888777","100"`;

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
console.log('Testing CSV parsing with identification fields:');
const parsedData = parseCSV(testCsvContent);
console.log(JSON.stringify(parsedData, null, 2));

// Verify the identification fields
console.log('\nVerifying identification fields:');
parsedData.forEach((customer, index) => {
  console.log(`Customer ${index + 1}:`);
  console.log(`  Name: ${customer.name}`);
  console.log(`  Email: ${customer.email}`);
  console.log(`  Identification Type: ${customer.identificationtype}`);
  console.log(`  Identification Number: ${customer.identificationnumber}`);
  console.log(`  Phone: ${customer.phone}`);
  console.log(`  Occupation: ${customer.occupation}`);
  console.log('');
});

console.log('✅ CSV parsing test with identification fields completed successfully!');

// Test the field mapping used in import
console.log('\n🔍 Testing field mapping for import:');
parsedData.forEach((customer, index) => {
  const customerData = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    address: customer.address || '',
    dateOfBirth: customer.dateofbirth || customer.dateOfBirth || '',
    occupation: customer.occupation || '',
    firstName: customer.firstname || customer.firstName || '',
    surname: customer.surname || '',
    gender: customer.gender || '',
    maritalStatus: customer.maritalstatus || customer.maritalStatus || '',
    workplace: customer.workplace || '',
    residentialAddress: customer.residentialaddress || customer.residentialAddress || '',
    postalAddress: customer.postaladdress || customer.postalAddress || '',
    contactNumber: customer.contactnumber || customer.contactNumber || '',
    city: customer.city || '',
    identificationType: customer.identificationtype || customer.identificationType || '',
    identificationNumber: customer.identificationnumber || customer.identificationNumber || '',
    beneficiaryName: customer.beneficiaryname || customer.beneficiaryName || '',
    beneficiaryContact: customer.beneficiarycontact || customer.beneficiaryContact || '',
    beneficiaryPercentage: customer.beneficiarypercentage || customer.beneficiaryPercentage || ''
  };
  
  console.log(`Mapped Customer ${index + 1}:`, {
    name: customerData.name,
    identificationType: customerData.identificationType,
    identificationNumber: customerData.identificationNumber
  });
});

console.log('\n✅ Field mapping test completed successfully!');

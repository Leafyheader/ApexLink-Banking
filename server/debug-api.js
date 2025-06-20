/**
 * Debug API response structure
 */

async function debugAPI() {
  console.log('🔍 Debugging API response structure...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/loans');
    const data = await response.json();
    
    console.log('📋 API RESPONSE STRUCTURE:');
    console.log('Status:', response.status);
    console.log('Data keys:', Object.keys(data));
    
    if (data.loans) {
      console.log(`Found ${data.loans.length} loans`);
      console.log('First loan structure:', JSON.stringify(data.loans[0], null, 2));
    } else {
      console.log('No loans array found');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAPI();

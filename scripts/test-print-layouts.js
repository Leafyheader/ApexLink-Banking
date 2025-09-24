// Test script to verify print layouts functionality
// This script can be run in the browser console to test print layout visibility

function testPrintLayouts() {
  console.log('Testing Print Layouts...');
  
  // Find all print layouts
  const printLayouts = document.querySelectorAll('.print-layout');
  console.log(`Found ${printLayouts.length} print layouts`);
  
  printLayouts.forEach((layout, index) => {
    const id = layout.id;
    console.log(`Layout ${index + 1}: ID = ${id}`);
    
    // Test visibility toggle
    layout.style.display = 'block';
    console.log(`${id} - Shown`);
    
    setTimeout(() => {
      layout.style.display = 'none';
      console.log(`${id} - Hidden`);
    }, 1000 * (index + 1));
  });
}

function testSpecificReport(reportType) {
  console.log(`Testing print layout for: ${reportType}`);
  
  const printLayoutId = `${reportType}-print`;
  const layout = document.getElementById(printLayoutId);
  
  if (layout) {
    console.log(`✓ Found print layout: ${printLayoutId}`);
    
    // Test showing the layout
    layout.style.display = 'block';
    console.log(`✓ Layout displayed`);
    
    // Check content
    const content = layout.textContent;
    console.log(`✓ Layout has content: ${content.length} characters`);
    
    // Hide after 2 seconds
    setTimeout(() => {
      layout.style.display = 'none';
      console.log(`✓ Layout hidden`);
    }, 2000);
    
    return true;
  } else {
    console.log(`✗ Print layout not found: ${printLayoutId}`);
    return false;
  }
}

// Test all report types
function testAllReportLayouts() {
  const reportTypes = [
    'financial-summary',
    'account-analytics', 
    'loan-portfolio',
    'transaction-summary',
    'customer-metrics'
  ];
  
  console.log('Testing all report print layouts...');
  
  reportTypes.forEach((reportType, index) => {
    setTimeout(() => {
      testSpecificReport(reportType);
    }, 3000 * index);
  });
}

// Export functions for manual testing
window.testPrintLayouts = testPrintLayouts;
window.testSpecificReport = testSpecificReport;
window.testAllReportLayouts = testAllReportLayouts;

console.log('Print layout test functions loaded. Use:');
console.log('- testPrintLayouts() - Test all layouts');
console.log('- testSpecificReport("report-type") - Test specific report');
console.log('- testAllReportLayouts() - Test all reports sequentially');

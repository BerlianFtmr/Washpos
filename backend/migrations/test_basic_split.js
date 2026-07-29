// Debug SQL splitting issue
const fs = require('fs');

try {
  const sql = fs.readFileSync('./001_init.sql', 'utf8');

  console.log('1. File read successfully');
  console.log('2. Total length:', sql.length);
  console.log('3. Line count:', sql.split('\n').length);

  // Find all DROP statements
  const dropMatches = sql.match(/DROP TABLE IF EXISTS [^;]+/g);
  console.log('4. DROP statements found:', dropMatches ? dropMatches.length : 0);

  // Find all CREATE statements
  const createMatches = sql.match(/CREATE TABLE [^;]+/g);
  console.log('5. CREATE statements found:', createMatches ? createMatches.length : 0);

  // Test basic split
  const basicSplit = sql.split(';');
  console.log('6. Basic semicolon split:', basicSplit.length);

  // Filter empty and comments
  const filtered = basicSplit
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  console.log('7. After filtering:', filtered.length);

  console.log('\n8. First 10 filtered statements:');
  filtered.forEach((s, i) => {
    if (i < 10) {
      const firstWord = s.substring(0, s.indexOf(' '));
      console.log(`   ${i+1}. ${firstWord} (${s.length} chars)`);
    }
  });

} catch (error) {
  console.error('Error:', error.message);
}

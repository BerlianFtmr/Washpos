const sql = require('fs').readFileSync('./001_init.sql', 'utf8');

console.log('SQL length:', sql.length);
console.log('First 200 chars:', sql.substring(0, 200));

// New improved splitting logic
const statements = [];
let currentStatement = '';
let inQuotes = false;
let inParentheses = false;
let quoteChar = '';
let parenDepth = 0;

for (let i = 0; i < sql.length; i++) {
  const char = sql[i];
  const prevChar = i > 0 ? sql[i - 1] : '';

  // Track quotes
  if ((char === '\'' || char === '"' || char === '`') && prevChar !== '\\') {
    if (!inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
    }
  }

  // Track parentheses depth (when not in quotes)
  if (!inQuotes) {
    if (char === '(') {
      parenDepth++;
      inParentheses = parenDepth > 0;
    } else if (char === ')') {
      parenDepth--;
      inParentheses = parenDepth > 0;
    }
  }

  // Split by semicolon only when not in quotes and not in parentheses
  if (char === ';' && !inQuotes && parenDepth === 0) {
    const statement = currentStatement.trim();
    if (statement.length > 0 && !statement.startsWith('--')) {
      statements.push(statement);
    }
    currentStatement = '';
  } else {
    currentStatement += char;
  }
}

// Add the last statement
const lastStatement = currentStatement.trim();
if (lastStatement.length > 0 && !lastStatement.startsWith('--')) {
  statements.push(lastStatement);
}

console.log('\nTotal statements:', statements.length);
console.log('\nFirst 20 statements:');
statements.forEach((s, i) => {
  if (i < 20) {
    const firstWord = s.split(/\s+/)[0];
    console.log(`${i+1}. ${firstWord} ${s.length > 50 ? '...' : ''} (${s.length} chars)`);
  }
});
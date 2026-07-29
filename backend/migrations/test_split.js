const sql = require('fs').readFileSync('./001_init.sql', 'utf8');

// New improved splitting logic
const statements = [];
let currentStatement = '';
let inQuotes = false;
let inParentheses = false;
let quoteChar = '';

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

  // Track parentheses (when not in quotes)
  if (!inQuotes) {
    if (char === '(') {
      inParentheses = true;
    } else if (char === ')') {
      inParentheses = false;
    }
  }

  // Split by semicolon only when not in quotes or deep parentheses
  if (char === ';' && !inQuotes && !inParentheses) {
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

console.log('Total statements:', statements.length);
console.log('\nFirst 15 statements:');
statements.forEach((s, i) => {
  if (i < 15) {
    console.log(`\nStatement ${i+1}:`);
    console.log(s.substring(0, 120) + (s.length > 120 ? '...' : ''));
  }
});
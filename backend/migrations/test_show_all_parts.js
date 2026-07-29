// Show all 17 split parts
const fs = require('fs');

const sql = fs.readFileSync('./001_init.sql', 'utf8');
const parts = sql.split(';');

console.log('All 17 parts from semicolon split:\n');
parts.forEach((part, i) => {
  const trimmed = part.trim();
  const isEmpty = trimmed.length === 0;
  const isComment = trimmed.startsWith('--');
  const preview = trimmed.substring(0, 60);

  console.log(`${i+1}. ${isEmpty ? '[EMPTY]' : isComment ? '[COMMENT]' : '[STATEMENT]'} ${preview.length > 0 ? preview + '...' : ''}`);
});

// Temporary test to see what tokens are produced
import { processCalcMark } from './src/lib/server/calcmark.js';

const input = 'monthly_salary = $5000 + 100%';
const result = await processCalcMark(input);

console.log('Tokens for line 1:');
const tokens = result.tokensByLine[1] || [];
tokens.forEach((token) => {
	console.log(`  ${token.type}: "${token.value}" (${token.start}-${token.end})`);
});

console.log('\nAll unique token types:');
const uniqueTypes = [...new Set(tokens.map((t) => t.type))];
uniqueTypes.forEach((type) => {
	console.log(`  ${type} -> .token-${type.toLowerCase()}`);
});

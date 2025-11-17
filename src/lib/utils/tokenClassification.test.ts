import { describe, it, expect } from 'vitest';
import { getTokenCategory, getTokenClassName, getCategoryClassName } from './tokenClassification';

describe('tokenClassification', () => {
	describe('getTokenCategory', () => {
		it('should classify literals correctly', () => {
			expect(getTokenCategory('NUMBER')).toBe('literal');
			expect(getTokenCategory('CURRENCY')).toBe('literal');
			expect(getTokenCategory('QUANTITY')).toBe('literal');
			expect(getTokenCategory('BOOLEAN')).toBe('literal');
		});

		it('should classify assignment operator', () => {
			expect(getTokenCategory('ASSIGN')).toBe('assign');
		});

		it('should classify arithmetic operators', () => {
			expect(getTokenCategory('PLUS')).toBe('operator');
			expect(getTokenCategory('MINUS')).toBe('operator');
			expect(getTokenCategory('MULTIPLY')).toBe('operator');
			expect(getTokenCategory('DIVIDE')).toBe('operator');
			expect(getTokenCategory('MODULUS')).toBe('operator');
			expect(getTokenCategory('EXPONENT')).toBe('operator');
		});

		it('should classify comparison operators', () => {
			expect(getTokenCategory('GREATER_THAN')).toBe('operator');
			expect(getTokenCategory('LESS_THAN')).toBe('operator');
			expect(getTokenCategory('GREATER_EQUAL')).toBe('operator');
			expect(getTokenCategory('LESS_EQUAL')).toBe('operator');
			expect(getTokenCategory('EQUAL')).toBe('operator');
			expect(getTokenCategory('NOT_EQUAL')).toBe('operator');
		});

		it('should classify logical operators', () => {
			expect(getTokenCategory('AND')).toBe('operator');
			expect(getTokenCategory('OR')).toBe('operator');
			expect(getTokenCategory('NOT')).toBe('operator');
		});

		it('should classify keywords', () => {
			expect(getTokenCategory('IF')).toBe('keyword');
			expect(getTokenCategory('THEN')).toBe('keyword');
			expect(getTokenCategory('ELSE')).toBe('keyword');
			expect(getTokenCategory('ELIF')).toBe('keyword');
			expect(getTokenCategory('END')).toBe('keyword');
			expect(getTokenCategory('FOR')).toBe('keyword');
			expect(getTokenCategory('IN')).toBe('keyword');
			expect(getTokenCategory('WHILE')).toBe('keyword');
			expect(getTokenCategory('RETURN')).toBe('keyword');
			expect(getTokenCategory('BREAK')).toBe('keyword');
			expect(getTokenCategory('CONTINUE')).toBe('keyword');
			expect(getTokenCategory('LET')).toBe('keyword');
			expect(getTokenCategory('CONST')).toBe('keyword');
		});

		it('should classify functions', () => {
			expect(getTokenCategory('FUNC_AVG')).toBe('function');
			expect(getTokenCategory('FUNC_SQRT')).toBe('function');
			expect(getTokenCategory('FUNC_AVERAGE_OF')).toBe('function');
			expect(getTokenCategory('FUNC_SQUARE_ROOT_OF')).toBe('function');
			// Future-proof: any token starting with FUNC_
			expect(getTokenCategory('FUNC_MAX')).toBe('function');
			expect(getTokenCategory('FUNC_MIN')).toBe('function');
		});

		it('should classify punctuation', () => {
			expect(getTokenCategory('LPAREN')).toBe('punctuation');
			expect(getTokenCategory('RPAREN')).toBe('punctuation');
			expect(getTokenCategory('COMMA')).toBe('punctuation');
		});

		it('should classify identifiers', () => {
			expect(getTokenCategory('IDENTIFIER')).toBe('identifier');
		});

		it('should handle case-insensitive input', () => {
			expect(getTokenCategory('number')).toBe('literal');
			expect(getTokenCategory('Number')).toBe('literal');
			expect(getTokenCategory('plus')).toBe('operator');
			expect(getTokenCategory('Plus')).toBe('operator');
		});

		it('should return unknown for unrecognized tokens', () => {
			expect(getTokenCategory('SOME_NEW_TOKEN')).toBe('unknown');
			expect(getTokenCategory('FOOBAR')).toBe('unknown');
			expect(getTokenCategory('')).toBe('unknown');
		});

		/**
		 * INTEGRATION TEST: Verify all known CalcMark tokens are classified
		 *
		 * This test documents all token types from the CalcMark spec:
		 * https://github.com/CalcMark/go-calcmark/blob/main/spec/lexer/token.go
		 *
		 * If this test fails, it means:
		 * 1. CalcMark added a new token type, OR
		 * 2. A token is misspelled in the classification logic
		 *
		 * Action: Update getTokenCategory() to handle the new token type
		 */
		it('should classify all known CalcMark token types (integration check)', () => {
			// All tokens from CalcMark spec - if any return 'unknown', this test will fail
			const allKnownTokens = [
				// Literals
				'NUMBER',
				'CURRENCY',
				'QUANTITY',
				'BOOLEAN',
				'IDENTIFIER',
				// Operators - Arithmetic
				'PLUS',
				'MINUS',
				'MULTIPLY',
				'DIVIDE',
				'MODULUS',
				'EXPONENT',
				'ASSIGN',
				// Operators - Comparison
				'GREATER_THAN',
				'LESS_THAN',
				'GREATER_EQUAL',
				'LESS_EQUAL',
				'EQUAL',
				'NOT_EQUAL',
				// Operators - Logical
				'AND',
				'OR',
				'NOT',
				// Grouping
				'LPAREN',
				'RPAREN',
				// Punctuation
				'COMMA',
				// Keywords
				'IF',
				'THEN',
				'ELSE',
				'ELIF',
				'END',
				'FOR',
				'IN',
				'WHILE',
				'RETURN',
				'BREAK',
				'CONTINUE',
				'LET',
				'CONST',
				// Functions
				'FUNC_AVG',
				'FUNC_SQRT',
				'FUNC_AVERAGE_OF',
				'FUNC_SQUARE_ROOT_OF'
			];

			const unknownTokens: string[] = [];

			for (const token of allKnownTokens) {
				const category = getTokenCategory(token);
				if (category === 'unknown') {
					unknownTokens.push(token);
				}
			}

			// If this fails, check which tokens are unknown and add them to getTokenCategory()
			if (unknownTokens.length > 0) {
				throw new Error(
					`Found ${unknownTokens.length} unclassified CalcMark tokens: ${unknownTokens.join(', ')}\n` +
						'This likely means CalcMark added new token types.\n' +
						'Action: Update src/lib/utils/tokenClassification.ts to classify these tokens.'
				);
			}

			expect(unknownTokens).toEqual([]);
		});
	});

	describe('getCategoryClassName', () => {
		it('should convert categories to CSS class names', () => {
			expect(getCategoryClassName('literal')).toBe('cm-literal');
			expect(getCategoryClassName('operator')).toBe('cm-operator');
			expect(getCategoryClassName('assign')).toBe('cm-assign');
			expect(getCategoryClassName('keyword')).toBe('cm-keyword');
			expect(getCategoryClassName('function')).toBe('cm-function');
			expect(getCategoryClassName('punctuation')).toBe('cm-punctuation');
			expect(getCategoryClassName('identifier')).toBe('cm-identifier');
			expect(getCategoryClassName('unknown')).toBe('cm-unknown');
		});
	});

	describe('getTokenClassName', () => {
		it('should map token types directly to CSS class names', () => {
			expect(getTokenClassName('NUMBER')).toBe('cm-literal');
			expect(getTokenClassName('PLUS')).toBe('cm-operator');
			expect(getTokenClassName('ASSIGN')).toBe('cm-assign');
			expect(getTokenClassName('IF')).toBe('cm-keyword');
			expect(getTokenClassName('FUNC_AVG')).toBe('cm-function');
			expect(getTokenClassName('LPAREN')).toBe('cm-punctuation');
			expect(getTokenClassName('IDENTIFIER')).toBe('cm-identifier');
			expect(getTokenClassName('UNKNOWN_TOKEN')).toBe('cm-unknown');
		});
	});
});

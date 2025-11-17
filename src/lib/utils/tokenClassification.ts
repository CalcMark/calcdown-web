/**
 * CalcMark Token Classification
 * Maps specific CalcMark token types to semantic CSS classes
 *
 * This centralizes token categorization logic - when CalcMark adds new tokens,
 * update this file to ensure they get proper syntax highlighting.
 *
 * IMPORTANT: If you add support for a new token type, also update the integration
 * test in tokenClassification.test.ts to include it in the `allKnownTokens` list.
 * This ensures the test suite documents all CalcMark tokens.
 *
 * CalcMark Token Reference:
 * https://github.com/CalcMark/go-calcmark/blob/main/spec/lexer/token.go
 */

export type TokenCategory =
	| 'literal'
	| 'operator'
	| 'assign'
	| 'keyword'
	| 'function'
	| 'punctuation'
	| 'identifier'
	| 'unknown';

/**
 * Map a CalcMark token type to its semantic category
 * @param tokenType - The token type from CalcMark WASM (e.g., "NUMBER", "PLUS", "IDENTIFIER")
 * @returns The semantic category for styling
 */
export function getTokenCategory(tokenType: string): TokenCategory {
	const type = tokenType.toUpperCase();

	// Literals - values
	if (type === 'NUMBER' || type === 'CURRENCY' || type === 'QUANTITY' || type === 'BOOLEAN') {
		return 'literal';
	}

	// Assignment - special operator
	if (type === 'ASSIGN') {
		return 'assign';
	}

	// Operators - arithmetic, comparison, logical
	if (
		type === 'PLUS' ||
		type === 'MINUS' ||
		type === 'MULTIPLY' ||
		type === 'DIVIDE' ||
		type === 'MODULUS' ||
		type === 'EXPONENT' ||
		type.includes('_THAN') || // GREATER_THAN, LESS_THAN
		type.includes('_EQUAL') || // GREATER_EQUAL, LESS_EQUAL, NOT_EQUAL
		type === 'EQUAL' ||
		type === 'AND' ||
		type === 'OR' ||
		type === 'NOT'
	) {
		return 'operator';
	}

	// Keywords - control flow and declarations
	if (
		type === 'IF' ||
		type === 'THEN' ||
		type === 'ELSE' ||
		type === 'ELIF' ||
		type === 'END' ||
		type === 'FOR' ||
		type === 'IN' ||
		type === 'WHILE' ||
		type === 'RETURN' ||
		type === 'BREAK' ||
		type === 'CONTINUE' ||
		type === 'LET' ||
		type === 'CONST'
	) {
		return 'keyword';
	}

	// Functions - any token starting with FUNC_
	if (type.startsWith('FUNC_')) {
		return 'function';
	}

	// Punctuation - grouping and separators
	if (type === 'LPAREN' || type === 'RPAREN' || type === 'COMMA') {
		return 'punctuation';
	}

	// Identifiers - variable names
	if (type === 'IDENTIFIER') {
		return 'identifier';
	}

	// Unknown token type - should be logged for investigation
	return 'unknown';
}

/**
 * Convert token category to CSS class name
 * @param category - The semantic token category
 * @returns CSS class name (e.g., "cm-literal", "cm-operator")
 */
export function getCategoryClassName(category: TokenCategory): string {
	return `cm-${category}`;
}

/**
 * Get CSS class name for a CalcMark token type
 * Convenience function combining getTokenCategory and getCategoryClassName
 * @param tokenType - The token type from CalcMark WASM
 * @returns CSS class name (e.g., "cm-literal", "cm-operator")
 */
export function getTokenClassName(tokenType: string): string {
	const category = getTokenCategory(tokenType);
	return getCategoryClassName(category);
}

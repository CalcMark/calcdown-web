import { describe, it, expect } from 'vitest';
import { processCalcMark } from '$lib/server/calcmark';

describe('CalcMark Processing - Error Diagnostics', () => {
	it('should return diagnostics for undefined variable', async () => {
		const input = 'a = b + 2';

		const result = await processCalcMark(input);

		// Should have diagnostics object
		expect(result.diagnostics).toBeDefined();
		expect(typeof result.diagnostics).toBe('object');

		// Should have diagnostics for line 1
		expect(result.diagnostics[1]).toBeDefined();
		expect(Array.isArray(result.diagnostics[1])).toBe(true);

		// Should have at least one diagnostic for the undefined variable 'b'
		const lineDiagnostics = result.diagnostics[1];
		expect(lineDiagnostics.length).toBeGreaterThan(0);

		// Find the diagnostic for undefined variable
		const undefinedVarDiagnostic = lineDiagnostics.find(
			(d: { message: string }) =>
				d.message.toLowerCase().includes('undefined') ||
				d.message.toLowerCase().includes('not defined')
		);

		expect(undefinedVarDiagnostic).toBeDefined();
		expect(undefinedVarDiagnostic.severity).toBe('error');

		// Should have range information pointing to the 'b' token
		expect(undefinedVarDiagnostic.range).toBeDefined();
		expect(undefinedVarDiagnostic.range.start).toBeDefined();
		expect(undefinedVarDiagnostic.range.end).toBeDefined();
	});

	it('should return tokens for the expression with error', async () => {
		const input = 'a = b + 2';

		const result = await processCalcMark(input);

		// Should have tokens
		expect(result.tokensByLine).toBeDefined();
		expect(result.tokensByLine[1]).toBeDefined();
		expect(Array.isArray(result.tokensByLine[1])).toBe(true);

		const tokens = result.tokensByLine[1];

		// Should have tokens: a, =, b, +, 2
		expect(tokens.length).toBeGreaterThanOrEqual(5);

		// Find the 'b' token (the undefined variable)
		const bToken = tokens.find(
			(t: { value: string; type: string }) => t.value === 'b' && t.type === 'IDENTIFIER'
		);
		expect(bToken).toBeDefined();
	});
});

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

describe('CalcMark Processing - Stateless Evaluation', () => {
	it('should NOT persist variable context between evaluations (stateless)', async () => {
		// First evaluation: define monthly_salary and calculate total_income
		const input1 = 'monthly_salary = $5000\nbonus = $500\ntotal_income = monthly_salary + bonus';
		const result1 = await processCalcMark(input1);

		// Verify first evaluation is correct
		expect(result1.evaluationResults).toHaveLength(3);
		expect(result1.variableContext.monthly_salary).toBeDefined();
		expect(result1.variableContext.total_income).toBeDefined();
		expect(result1.variableContext.total_income.Value.Value).toBe('5500'); // WASM returns strings

		// Second evaluation: rename monthly_salary to mony_salary (typo)
		// This should NOT have access to the old monthly_salary variable
		const input2 = 'mony_salary = $5000\nbonus = $500\ntotal_income = monthly_salary + bonus';
		const result2 = await processCalcMark(input2);

		// CRITICAL: total_income should NOT evaluate successfully
		// because monthly_salary is no longer defined
		// The evaluation should either:
		// 1. Not return a result for total_income, OR
		// 2. Return an error/diagnostic for undefined variable

		// Check that we don't have 3 successful evaluations
		// We should only have 2 (mony_salary and bonus), NOT total_income
		expect(result2.evaluationResults.length).toBeLessThan(3);

		// OR check that total_income is not in the results
		const totalIncomeResult = result2.evaluationResults.find(
			(r: { OriginalLine: number }) => r.OriginalLine === 3
		);
		expect(totalIncomeResult).toBeUndefined();

		// The variableContext should NOT have monthly_salary
		expect(result2.variableContext.monthly_salary).toBeUndefined();
		// It should have mony_salary instead
		expect(result2.variableContext.mony_salary).toBeDefined();
	});

	it('should NOT persist context when variable is deleted', async () => {
		// First evaluation: define x and y
		const input1 = 'x = 100\ny = x + 50';
		const result1 = await processCalcMark(input1);

		expect(result1.evaluationResults).toHaveLength(2);
		expect(result1.variableContext.x).toBeDefined();
		expect(result1.variableContext.y.Value.Value).toBe('150'); // WASM returns strings

		// Second evaluation: delete x, keep only y
		const input2 = 'y = x + 50';
		const result2 = await processCalcMark(input2);

		// y should NOT evaluate because x is no longer defined
		expect(result2.evaluationResults).toHaveLength(0);
		expect(result2.variableContext.x).toBeUndefined();
		expect(result2.variableContext.y).toBeUndefined();
	});

	it('should handle variable value changes correctly', async () => {
		// First evaluation
		const input1 = 'a = 10\nb = a * 2';
		const result1 = await processCalcMark(input1);

		expect(result1.variableContext.a.Value.Value).toBe('10'); // WASM returns strings
		expect(result1.variableContext.b.Value.Value).toBe('20'); // WASM returns strings

		// Second evaluation: change 'a' value
		const input2 = 'a = 20\nb = a * 2';
		const result2 = await processCalcMark(input2);

		// Should have NEW values, not old ones
		expect(result2.variableContext.a.Value.Value).toBe('20'); // WASM returns strings
		expect(result2.variableContext.b.Value.Value).toBe('40'); // WASM returns strings
	});
});

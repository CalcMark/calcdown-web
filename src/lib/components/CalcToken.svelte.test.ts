import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CalcToken from './CalcToken.svelte';

describe('CalcToken - Error Styling', () => {
	it('should apply has-error class when diagnostics contain an error', () => {
		const token = {
			type: 'IDENTIFIER',
			value: 'missing_var',
			start: 4,
			end: 15,
			originalText: 'missing_var'
		};

		const diagnostics = [
			{
				severity: 'error',
				message: 'undefined variable: missing_var',
				range: {
					start: { line: 1, column: 5 },
					end: { line: 1, column: 16 }
				}
			}
		];

		const { container } = render(CalcToken, {
			token,
			diagnostics,
			variableContext: {}
		});

		// The CalcToken is wrapped in a Tooltip, so we need the inner span
		const tokenSpan = container.querySelector('.token-identifier');
		expect(tokenSpan).toBeTruthy();

		// Should have has-error class
		expect(tokenSpan?.classList.contains('has-error')).toBe(true);

		// Should NOT have has-warning class
		expect(tokenSpan?.classList.contains('has-warning')).toBe(false);
	});

	it('should apply has-warning class when diagnostics contain only warnings', () => {
		const token = {
			type: 'IDENTIFIER',
			value: 'test_var',
			start: 0,
			end: 8,
			originalText: 'test_var'
		};

		const diagnostics = [
			{
				severity: 'warning',
				message: 'variable may be undefined',
				range: {
					start: { line: 1, column: 1 },
					end: { line: 1, column: 9 }
				}
			}
		];

		const { container } = render(CalcToken, {
			token,
			diagnostics,
			variableContext: {}
		});

		// The CalcToken is wrapped in a Tooltip, so we need the inner span
		const tokenSpan = container.querySelector('.token-identifier');
		expect(tokenSpan).toBeTruthy();

		// Should have has-warning class
		expect(tokenSpan?.classList.contains('has-warning')).toBe(true);

		// Should NOT have has-error class (errors take precedence over warnings)
		expect(tokenSpan?.classList.contains('has-error')).toBe(false);
	});

	it('should NOT apply error/warning classes when diagnostics array is empty', () => {
		const token = {
			type: 'IDENTIFIER',
			value: 'valid_var',
			start: 0,
			end: 9,
			originalText: 'valid_var'
		};

		const { container } = render(CalcToken, {
			token,
			diagnostics: [],
			variableContext: {}
		});

		// The CalcToken is wrapped in a Tooltip, so we need the inner span
		const tokenSpan = container.querySelector('.token-identifier');
		expect(tokenSpan).toBeTruthy();

		// Should NOT have error or warning classes
		expect(tokenSpan?.classList.contains('has-error')).toBe(false);
		expect(tokenSpan?.classList.contains('has-warning')).toBe(false);
	});

	it('should prioritize error over warning when both are present', () => {
		const token = {
			type: 'IDENTIFIER',
			value: 'problem_var',
			start: 0,
			end: 11,
			originalText: 'problem_var'
		};

		const diagnostics = [
			{
				severity: 'warning',
				message: 'variable may be shadowed',
				range: {
					start: { line: 1, column: 1 },
					end: { line: 1, column: 12 }
				}
			},
			{
				severity: 'error',
				message: 'undefined variable',
				range: {
					start: { line: 1, column: 1 },
					end: { line: 1, column: 12 }
				}
			}
		];

		const { container } = render(CalcToken, {
			token,
			diagnostics,
			variableContext: {}
		});

		// The CalcToken is wrapped in a Tooltip, so we need the inner span
		const tokenSpan = container.querySelector('.token-identifier');
		expect(tokenSpan).toBeTruthy();

		// Should have has-error class (errors take precedence)
		expect(tokenSpan?.classList.contains('has-error')).toBe(true);

		// Should NOT have has-warning class when error is present
		expect(tokenSpan?.classList.contains('has-warning')).toBe(false);
	});

	it('should display correct base token class along with error class', () => {
		const token = {
			type: 'IDENTIFIER',
			value: 'bad_var',
			start: 0,
			end: 7,
			originalText: 'bad_var'
		};

		const diagnostics = [
			{
				severity: 'error',
				message: 'undefined variable',
				range: {
					start: { line: 1, column: 1 },
					end: { line: 1, column: 8 }
				}
			}
		];

		const { container } = render(CalcToken, {
			token,
			diagnostics,
			variableContext: {}
		});

		// The CalcToken is wrapped in a Tooltip, so we need the inner span
		const tokenSpan = container.querySelector('.token-identifier');
		expect(tokenSpan).toBeTruthy();

		// Should have both the base token class and the error class
		expect(tokenSpan?.classList.contains('token-identifier')).toBe(true);
		expect(tokenSpan?.classList.contains('has-error')).toBe(true);
	});
});

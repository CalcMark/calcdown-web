/**
 * Shared constants for the CalcDown editor
 */

/**
 * Debounce delay for user input before triggering server evaluation (in milliseconds)
 *
 * Tests should wait at least `USER_INPUT_DEBOUNCE_MS + 10` after user input
 * to ensure evaluation has completed.
 */
export const USER_INPUT_DEBOUNCE_MS = 150;

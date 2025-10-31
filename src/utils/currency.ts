/**
 * Currency utility functions for handling cents-based amounts
 */

// Convert cents to dollars for display
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

// Parse user input (string) to cents (integer)
export function parseCurrencyInput(input: string): number {
  // Remove currency symbols and commas
  const cleaned = input.replace(/[$,]/g, '');
  const dollars = parseFloat(cleaned);

  if (isNaN(dollars)) {
    return 0;
  }

  return Math.round(dollars * 100);
}

// Format cents as a number string for input fields (e.g., "125.47")
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

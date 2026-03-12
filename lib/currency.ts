/**
 * @module currency
 * Canonical currency formatting. Reads the configured currency symbol from
 * instance settings (async) or accepts it directly (sync variant).
 */

import { getInstanceSettings } from "@/lib/instance-settings"

/**
 * Formats an amount with the configured currency symbol (async).
 * e.g. "Rs. 12,000" or "SAR 12,000"
 */
export async function formatCurrency(amount: number): Promise<string> {
  const { currencySymbol } = await getInstanceSettings()
  return formatCurrencyWith(amount, currencySymbol)
}

/**
 * Formats an amount with a given currency symbol (sync).
 * Use when you've already resolved settings once (e.g. in a loop).
 */
export function formatCurrencyWith(amount: number, currencySymbol: string): string {
  return `${currencySymbol} ${new Intl.NumberFormat("en").format(amount)}`
}

/** Round button increments to the precision expressed by the step. */
export function stepValue(value: number, step: number, direction: 1 | -1): number {
  const [coefficient, exponent = "0"] = String(step).split("e");
  const decimals = Math.max(0, (coefficient.split(".")[1]?.length ?? 0) - Number(exponent));
  return Number((value + direction * step).toFixed(decimals));
}

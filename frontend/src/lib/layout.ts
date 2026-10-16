// The right-hand address columns can extend below the centre of the envelope.
export function verticalAddressArea(heightMm: number) {
  const topMm = 8;
  return { topMm, heightMm: heightMm * 0.68 - topMm };
}

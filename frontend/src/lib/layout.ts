// The right-hand address columns can extend below the centre of the envelope.
export function verticalAddressArea(heightMm: number, taiwanese = false) {
  if (taiwanese) return { topMm: heightMm * 0.2, heightMm: heightMm * 0.5 };
  const topMm = 8;
  return { topMm, heightMm: heightMm * 0.68 - topMm };
}

export function verticalSenderArea(widthMm: number, heightMm: number) {
  const leftMm = Math.max(5, widthMm * 0.05);
  return {
    leftMm,
    topMm: heightMm * 0.40,
    widthMm: widthMm * 0.29 - leftMm,
    heightMm: heightMm * 0.47,
    gapMm: 0,
    lineHeight: 1.3,
  };
}

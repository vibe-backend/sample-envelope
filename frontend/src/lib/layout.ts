// The right-hand address columns can extend below the centre of the envelope.
export function verticalAddressArea(heightMm: number, taiwanese = false) {
  if (taiwanese) return { topMm: heightMm * 0.13, heightMm: heightMm * 0.79 };
  const topMm = 8;
  return { topMm, heightMm: heightMm * 0.68 - topMm };
}

export function verticalSenderArea(widthMm: number, heightMm: number) {
  const leftMm = widthMm * 0.04;
  return {
    leftMm,
    topMm: heightMm * 0.40,
    widthMm: widthMm * 0.29 - leftMm,
    heightMm: Math.min(heightMm * 0.47, heightMm - 23.5 - heightMm * 0.40),
    gapMm: 0,
    lineHeight: 1.3,
  };
}

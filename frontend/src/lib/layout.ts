/** Taiwanese recipient red frame — address columns share this top edge. */
export const recipientFrameMm = { topMm: 38, heightMm: 159, widthMm: 33 };

// The right-hand address columns can extend below the centre of the envelope.
export function verticalAddressArea(heightMm: number, taiwanese = false) {
  if (taiwanese) return { topMm: recipientFrameMm.topMm, heightMm: recipientFrameMm.heightMm };
  const topMm = 8;
  return { topMm, heightMm: heightMm * 0.68 - topMm };
}

/** Right edge of the sender block (= column start in vertical-rl). Just left of the 33mm centred frame. */
export const senderAreaStartXMm = 42;

export function verticalSenderArea(widthMm: number, heightMm: number) {
  // Match sender postcode left inset; block runs left → start X (clears the red frame).
  const leftMm = 6;
  // Taller / tighter leading so a typical address stays one column — a second
  // wrap column was leaving a blank gap before the phone.
  const topMm = heightMm * 0.36;
  return {
    leftMm,
    topMm,
    widthMm: Math.max(0, senderAreaStartXMm - leftMm),
    heightMm: Math.min(heightMm * 0.52, heightMm - 20 - topMm),
    // Tight gutter; company name adds its own extra margin before address.
    gapMm: 1,
    lineHeight: 1.05,
  };
}

/** Empty band at the top of the taller envelope; all front marks sit below this. */
export const topPadMm = 22;

/** Taiwanese recipient red frame — address columns share this top edge. */
export const recipientFrameMm = { topMm: 38 + topPadMm, heightMm: 159, widthMm: 33 };

// The right-hand address columns can extend below the centre of the envelope.
export function verticalAddressArea(heightMm: number, taiwanese = false) {
  // Address + phone: 0.5 cm below the frame’s top edge.
  if (taiwanese) return { topMm: recipientFrameMm.topMm + 5, heightMm: recipientFrameMm.heightMm };
  const topMm = 8 + topPadMm;
  return { topMm, heightMm: heightMm * 0.68 - topMm };
}

/** Right edge of the sender block (= column start in vertical-rl). Just left of the 33mm centred frame. */
export const senderAreaStartXMm = 42;

export function verticalSenderArea(widthMm: number, heightMm: number) {
  // Match sender postcode left inset; block fills left corridor up to start X.
  const leftMm = 6;
  // Layout ratios are for the content area below the top pad; nudge down a little.
  const contentH = Math.max(0, heightMm - topPadMm);
  const topMm = topPadMm + contentH * 0.40;
  return {
    leftMm,
    topMm,
    widthMm: Math.max(0, senderAreaStartXMm - leftMm),
    heightMm: Math.min(contentH * 0.52, heightMm - 20 - topMm),
    // Tight gutter; company name adds its own extra margin before address.
    gapMm: 1,
    lineHeight: 1.05,
  };
}

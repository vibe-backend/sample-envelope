export interface Measurement { scrollWidth: number; scrollHeight: number; clientWidth: number; clientHeight: number }
export function isOverflowing(m: Measurement) {
  return m.scrollHeight > m.clientHeight + 1 || m.scrollWidth > m.clientWidth + 1;
}
export function fitFontSize(current: number, min: number, measureFn: (size: number) => Measurement) {
  let size = current;
  while (size > min && isOverflowing(measureFn(size))) size = Math.max(min, size - 0.5);
  return size;
}

// Compare rendered bounds so drag offsets and preview scaling are included.
export function isOutsideInset(content: Pick<DOMRect, "left" | "top" | "right" | "bottom">, frame: Pick<DOMRect, "left" | "top" | "right" | "bottom">, padding: number) {
  const tolerance = 0.5;
  return content.left < frame.left + padding - tolerance ||
    content.top < frame.top + padding - tolerance ||
    content.right > frame.right - padding + tolerance ||
    content.bottom > frame.bottom - padding + tolerance;
}

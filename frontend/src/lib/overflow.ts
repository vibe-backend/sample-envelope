export interface Measurement { scrollWidth: number; scrollHeight: number; clientWidth: number; clientHeight: number }
export function isOverflowing(m: Measurement) {
  return m.scrollHeight > m.clientHeight + 1 || m.scrollWidth > m.clientWidth + 1;
}
export function fitFontSize(current: number, min: number, measureFn: (size: number) => Measurement) {
  let size = current;
  while (size > min && isOverflowing(measureFn(size))) size = Math.max(min, size - 0.5);
  return size;
}

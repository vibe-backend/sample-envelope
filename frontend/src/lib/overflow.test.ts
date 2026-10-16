import {expect, test} from "vitest";
import {fitFontSize, isOverflowing} from "./overflow";
const measure = {scrollWidth:100, scrollHeight:100, clientWidth:100, clientHeight:100};
test("one pixel tolerance on both axes", () => {
  expect(isOverflowing({...measure, scrollWidth:101, scrollHeight:101})).toBe(false);
  expect(isOverflowing({...measure, scrollWidth:102})).toBe(true);
  expect(isOverflowing({...measure, scrollHeight:102})).toBe(true);
});
test("fit steps half a point, stops at first fit or minimum", () => {
  const seen: number[] = [];
  expect(fitFontSize(12,6,size => {seen.push(size); return {...measure, scrollWidth:size > 10.5 ? 102 : 100};})).toBe(10.5);
  expect(seen).toEqual([12,11.5,11,10.5]);
  expect(fitFontSize(7,6,() => ({...measure,scrollHeight:200}))).toBe(6);
  expect(fitFontSize(12,6,() => measure)).toBe(12);
});

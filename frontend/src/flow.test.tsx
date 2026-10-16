import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App";
import { t } from "./i18n/zh-Hant";
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = "/";
});
test("sample to gallery to editor and physical print size", async () => {
  window.location.hash = "/";
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: t.sample }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(t.next) }));
  const card = await screen.findByRole("button", { name: /中式直式/ });
  expect(screen.getAllByRole("button").length).toBe(8);
  fireEvent.click(card);
  const button = await screen.findByRole("button", { name: /列印/ });
  await waitFor(() =>
    expect(document.getElementById("page-size")?.textContent).toContain(
      "110mm 220mm",
    ),
  );
  fireEvent.click(button);
  expect(print).toHaveBeenCalledOnce();
  print.mockRestore();
});

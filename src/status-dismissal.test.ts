import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatusDismissal } from "./status-dismissal";

describe("StatusDismissal", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hides 1.2 seconds after interaction without extending the delay", () => {
    const hide = vi.fn();
    const status = new StatusDismissal(hide);
    status.onNewMessage(false);
    vi.advanceTimersByTime(2000);
    expect(hide).not.toHaveBeenCalled();

    status.onInteraction();
    vi.advanceTimersByTime(1000);
    status.onInteraction();
    expect(hide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(hide).toHaveBeenCalledOnce();
  });

  it("dismisses later non-error messages after interaction", () => {
    const hide = vi.fn();
    const status = new StatusDismissal(hide);
    status.onInteraction();
    vi.advanceTimersByTime(1200);
    status.onNewMessage(false);
    vi.advanceTimersByTime(1199);
    expect(hide).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1);
    expect(hide).toHaveBeenCalledTimes(2);
  });

  it("keeps new errors visible until the next interaction", () => {
    const hide = vi.fn();
    const status = new StatusDismissal(hide);
    status.onInteraction();
    status.onNewMessage(true);
    vi.advanceTimersByTime(5000);
    expect(hide).not.toHaveBeenCalled();
    status.onInteraction();
    vi.advanceTimersByTime(1200);
    expect(hide).toHaveBeenCalledOnce();
  });
});

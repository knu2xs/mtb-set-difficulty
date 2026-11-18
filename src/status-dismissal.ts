const DISMISS_DELAY_MS = 1200;

export class StatusDismissal {
  private interacted = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly hide: () => void) {}

  onInteraction(): void {
    this.interacted = true;
    this.schedule();
  }

  onNewMessage(isError: boolean): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.interacted && !isError) {
      this.schedule();
    }
  }

  private schedule(): void {
    if (this.timer !== undefined) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.hide();
    }, DISMISS_DELAY_MS);
  }
}

export type TutorialStep =
  | "move"
  | "collect"
  | "summon"
  | "complete"
  | "dismissed";

type TutorialListener = (step: TutorialStep) => void;

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  "move",
  "collect",
  "summon",
  "complete",
  "dismissed",
];

export class TutorialGuide {
  private step: TutorialStep = "move";
  private readonly listeners = new Set<TutorialListener>();

  getStep(): TutorialStep {
    return this.step;
  }

  subscribe(listener: TutorialListener): () => void {
    this.listeners.add(listener);
    listener(this.step);
    return () => this.listeners.delete(listener);
  }

  onMoveCommand(): void {
    this.advance("move", "collect");
  }

  onResourceCollected(): void {
    this.advance("collect", "summon");
  }

  onCompanionSummoned(): void {
    this.advance("summon", "complete");
  }

  restore(step: unknown): void {
    const restored = TUTORIAL_STEPS.find((candidate) => candidate === step);
    if (!restored || restored === this.step) {
      return;
    }
    this.step = restored;
    this.notify();
  }

  dismiss(): void {
    if (this.step === "complete" || this.step === "dismissed") {
      return;
    }
    this.step = "dismissed";
    this.notify();
  }

  private advance(current: TutorialStep, next: TutorialStep): void {
    if (this.step !== current) {
      return;
    }
    this.step = next;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.step));
  }
}

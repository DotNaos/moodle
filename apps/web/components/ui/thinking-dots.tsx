import { cn } from "@/lib/utils";

// A subtle three-dot "typing" indicator used for the assistant's thinking /
// working state, in place of a spinning loader.
function ThinkingDots({ className }: { className?: string }) {
  return (
    <span aria-label="Loading" className={cn("inline-flex items-center gap-1", className)} role="status">
      <span className="thinking-dot size-1.5 rounded-full bg-current" />
      <span className="thinking-dot size-1.5 rounded-full bg-current [animation-delay:0.15s]" />
      <span className="thinking-dot size-1.5 rounded-full bg-current [animation-delay:0.3s]" />
    </span>
  );
}

export { ThinkingDots };

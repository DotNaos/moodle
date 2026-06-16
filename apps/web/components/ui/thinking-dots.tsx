import { cn } from "@/lib/utils";

// Kept as `ThinkingDots` for compatibility with existing imports, but the
// visual treatment is now the Codex-style visor text animation.
function ThinkingDots({ className, label = "Thinking" }: { className?: string; label?: string }) {
  return (
    <span aria-label={label} className={cn("thinking-visor inline-block text-sm font-medium", className)} role="status">
      {label}
    </span>
  );
}

export { ThinkingDots };

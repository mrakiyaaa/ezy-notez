interface AuraIndicatorProps {
  hex: string;
  className?: string;
}

/**
 * Small visual dot that represents a workspace's aura color.
 * Uses the raw hex value for color only — no theme propagation.
 */
export default function AuraIndicator({ hex, className = "" }: AuraIndicatorProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${className}`}
      style={{ backgroundColor: hex }}
      aria-hidden="true"
    />
  );
}

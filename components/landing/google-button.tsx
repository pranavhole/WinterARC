import { signInWithGoogle } from "@/lib/auth-actions";
import { buttonClass } from "@/components/ui/button";
import { GoogleSubmit } from "@/components/landing/google-submit";
import { cn } from "@/lib/utils";

export function GoogleButton({
  variant = "primary",
  size = "md",
  label = "Continue with Google",
  className,
}: {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  return (
    <form action={signInWithGoogle} className={className}>
      <GoogleSubmit
        label={label}
        size={size}
        className={cn(
          buttonClass(variant),
          size === "sm" && "min-h-9 px-3 text-xs",
          variant === "primary" && "[&_svg]:rounded-full [&_svg]:bg-surface [&_svg]:p-0.5",
        )}
      />
    </form>
  );
}

import { signInWithGoogle } from "@/lib/auth-actions";
import { buttonClass } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/icons";
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
      <button
        type="submit"
        className={cn(
          buttonClass(variant),
          size === "sm" && "min-h-9 px-3 text-xs",
          variant === "primary" && "[&_svg]:rounded-full [&_svg]:bg-surface [&_svg]:p-0.5",
        )}
      >
        <GoogleIcon size={size === "sm" ? 14 : 18} />
        {label}
      </button>
    </form>
  );
}

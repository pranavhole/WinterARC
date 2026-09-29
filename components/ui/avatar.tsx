import Image from "next/image";
import { UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function Avatar({ src, name, size = 28, className }: { src: string | null; name: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <Image
        src={src}
        alt={name ? `${name}'s profile photo` : "Profile photo"}
        width={size}
        height={size}
        className={cn("rounded-full bg-subtle object-cover grayscale", className)}
        style={style}
      />
    );
  }
  return (
    <span
      className={cn("flex items-center justify-center rounded-full bg-subtle text-muted", className)}
      style={style}
    >
      <UserIcon size={Math.round(size * 0.55)} />
    </span>
  );
}

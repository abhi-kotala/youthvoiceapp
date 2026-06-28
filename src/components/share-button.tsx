import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function ShareButton({
  title,
  text,
  url,
  variant = "default",
  className = "",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const baseClasses =
    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer";

  const variantClasses = {
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90",
    outline:
      "border border-border bg-background hover:bg-secondary",
    ghost: "hover:bg-accent",
  };

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // If clipboard fails, do nothing silently
    }
  }

  return (
    <button
      onClick={handleShare}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {copied ? (
        <>
          <Check className="size-4" />
          Copied
        </>
      ) : (
        <>
          <Share2 className="size-4" />
          Share
        </>
      )}
    </button>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="size-4" />
          Copied
        </>
      ) : (
        <>
          <Link2 className="size-4" />
          Copy link
        </>
      )}
    </button>
  );
}

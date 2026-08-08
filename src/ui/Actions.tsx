'use client';

/**
 * Result actions — copy, download, share, reset.
 *
 * These four buttons appear under the output of every tool on the site
 * (Part 5.4, section 4 of the page anatomy), so they are worth getting
 * exactly right once.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from './primitives';
import { toast } from './Feedback';
import { CheckIcon, CopyIcon, DownloadIcon, ResetIcon, ShareIcon } from './Icons';

/** Clipboard with a fallback for insecure origins and older Safari. */
async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

export function CopyButton({
  value,
  label = 'Copy',
  size = 'sm',
  disabled,
}: {
  value: string;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = async () => {
    try {
      await writeClipboard(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Your browser blocked clipboard access. Select the text and press Ctrl+C.', 'error');
    }
  };

  return (
    <Button size={size} onClick={onClick} disabled={disabled || !value}>
      {copied ? <CheckIcon size={15} className="text-brand" /> : <CopyIcon size={15} />}
      {/* aria-live so the confirmation is announced, not just shown. */}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  );
}

export function DownloadButton({
  value,
  filename,
  mime = 'text/plain;charset=utf-8',
  label = 'Download',
  size = 'sm',
  disabled,
}: {
  value: string | Blob;
  filename: string;
  mime?: string;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const onClick = () => {
    const blob = typeof value === 'string' ? new Blob([value], { type: mime }) : value;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    // Revoking immediately can cancel the download in Firefox.
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <Button size={size} onClick={onClick} disabled={disabled}>
      <DownloadIcon size={15} />
      {label}
    </Button>
  );
}

/**
 * Share. Uses the Web Share sheet on mobile where it exists, and falls
 * back to copying the URL everywhere else.
 */
export function ShareButton({
  title,
  text,
  size = 'sm',
}: {
  title: string;
  text?: string;
  size?: 'sm' | 'md';
}) {
  const onClick = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // The user dismissed the sheet — not an error, and not worth a toast.
        return;
      }
    }
    try {
      await writeClipboard(url);
      toast('Link copied to clipboard');
    } catch {
      toast('Could not copy the link.', 'error');
    }
  };

  return (
    <Button size={size} onClick={onClick}>
      <ShareIcon size={15} />
      Share
    </Button>
  );
}

export function ResetButton({ onClick, size = 'sm' }: { onClick: () => void; size?: 'sm' | 'md' }) {
  return (
    <Button size={size} variant="ghost" onClick={onClick}>
      <ResetIcon size={15} />
      Reset
    </Button>
  );
}

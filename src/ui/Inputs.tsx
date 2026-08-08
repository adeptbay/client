'use client';

/**
 * Input surfaces — MonospaceTextArea, FileDropzone, MultiFileList.
 *
 * Section 3 of the tool page anatomy: the tool itself, above the fold,
 * usable immediately. No intro paragraph stands between a visitor and
 * the box they came here to type in.
 */

import { useCallback, useId, useRef, useState } from 'react';
import { Button, cx, IconButton } from './primitives';
import { CloseIcon, FileIcon, UploadIcon } from './Icons';
import { formatBytes } from '@engines/bytes';

export function MonospaceTextArea({
  value,
  onChange,
  placeholder,
  label,
  rows = 10,
  sample,
  mono = true,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label: string;
  rows?: number;
  sample?: string;
  mono?: boolean;
}) {
  const id = useId();
  const chars = value.length;
  const lines = value === '' ? 0 : value.split('\n').length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel focus-within:border-brand">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken px-3 py-2">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        <span className="font-mono text-[11px] text-fg-subtle">
          {chars.toLocaleString()} chars · {lines.toLocaleString()} lines
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {sample && (
            <Button size="sm" variant="ghost" onClick={() => onChange(sample)}>
              Load sample
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onChange('')} disabled={!value}>
            Clear
          </Button>
        </div>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        // A tool that mangles pasted code with autocorrect is unusable,
        // so every text input on this platform opts out explicitly.
        className={cx(
          'scroll-slim block w-full resize-y bg-transparent px-4 py-3.5 text-[13px] leading-relaxed',
          'text-fg outline-none placeholder:text-fg-subtle',
          mono ? 'font-mono' : 'font-sans',
        )}
      />
    </div>
  );
}

export interface DroppedFile {
  file: File;
  id: string;
}

export function FileDropzone({
  accept,
  multiple = false,
  maxSizeMB,
  maxFiles,
  onFiles,
  hint,
}: {
  accept: string[];
  multiple?: boolean;
  maxSizeMB: number;
  maxFiles: number;
  onFiles: (files: File[]) => void;
  hint?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const take = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const incoming = Array.from(list).slice(0, maxFiles);

      const tooBig = incoming.filter((f) => f.size > maxSizeMB * 1024 * 1024);
      if (tooBig.length > 0) {
        setRejected(
          `${tooBig[0]!.name} is ${formatBytes(tooBig[0]!.size)}. The limit for this tool is ${maxSizeMB} MB.`,
        );
        return;
      }

      // Extension check only — a real magic-byte check happens inside the
      // engine, because an extension is a claim, not evidence.
      const wrongType = incoming.filter(
        (f) => !accept.some((ext) => f.name.toLowerCase().endsWith(ext.toLowerCase())),
      );
      if (wrongType.length > 0) {
        setRejected(`${wrongType[0]!.name} is not one of ${accept.join(', ')}.`);
        return;
      }

      setRejected(null);
      onFiles(incoming);
    },
    [accept, maxFiles, maxSizeMB, onFiles],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        }}
        onPaste={(e) => take(e.clipboardData.files)}
        className={cx(
          'rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-brand bg-brand-soft' : 'border-line bg-panel hover:border-line-strong',
        )}
      >
        <UploadIcon size={26} className="mx-auto text-fg-subtle" />
        <p className="mt-3 text-sm font-medium text-fg">
          Drop {multiple ? 'files' : 'a file'} here, paste, or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-brand-text underline underline-offset-2"
          >
            browse
          </button>
        </p>
        <p className="mt-1.5 text-xs text-fg-subtle">
          {accept.join(', ')} · up to {maxSizeMB} MB{multiple ? ` · ${maxFiles} files max` : ''}
        </p>
        {hint && <p className="mt-2 text-xs text-fg-subtle">{hint}</p>}

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={(e) => {
            take(e.target.files);
            // Reset so choosing the same file twice still fires onChange.
            e.target.value = '';
          }}
          className="sr-only"
        />
      </div>

      {rejected && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {rejected}
        </p>
      )}
    </div>
  );
}

export function MultiFileList({
  files,
  onRemove,
  onReorder,
}: {
  files: DroppedFile[];
  onRemove: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
}) {
  if (files.length === 0) return null;

  const total = files.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-3 py-2">
        <span className="text-[13px] font-medium text-fg">
          {files.length} file{files.length === 1 ? '' : 's'}
        </span>
        <span className="font-mono text-[11px] text-fg-subtle">{formatBytes(total)}</span>
      </div>
      <ul>
        {files.map((f, i) => (
          <li key={f.id} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-0">
            <FileIcon size={16} className="shrink-0 text-fg-subtle" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-fg">{f.file.name}</span>
              <span className="block font-mono text-[11px] text-fg-subtle">{formatBytes(f.file.size)}</span>
            </span>
            {onReorder && (
              <span className="flex shrink-0 gap-0.5">
                <IconButton
                  label={`Move ${f.file.name} up`}
                  disabled={i === 0}
                  onClick={() => onReorder(i, i - 1)}
                  className="h-7 w-7"
                >
                  <span aria-hidden="true">↑</span>
                </IconButton>
                <IconButton
                  label={`Move ${f.file.name} down`}
                  disabled={i === files.length - 1}
                  onClick={() => onReorder(i, i + 1)}
                  className="h-7 w-7"
                >
                  <span aria-hidden="true">↓</span>
                </IconButton>
              </span>
            )}
            <IconButton
              label={`Remove ${f.file.name}`}
              onClick={() => onRemove(f.id)}
              className="h-7 w-7 shrink-0"
            >
              <CloseIcon size={14} />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

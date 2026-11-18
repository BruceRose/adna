"use client";

import { useEffect, useState } from "react";

export function CopyLinkButton({ path, label = "Copy client link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="primary small"
      onClick={async () => {
        const url = window.location.origin + path;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          window.prompt("Copy this link:", url);
        }
      }}
    >
      {copied ? "Link copied!" : label}
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="small" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}

/** Header checkbox that ticks every response checkbox in a form. */
export function SelectAll({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all on this page"
      onChange={(e) => {
        const form = document.getElementById(formId);
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((cb) => {
          cb.checked = e.target.checked;
        });
        form?.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    />
  );
}

/**
 * Sticky bar for building an audience report from the responses list.
 * Lives inside the form so its fields submit with the ticked ids.
 */
export function SelectionBar({ formId, matching, suggestedName }: { formId: string; matching: number; suggestedName: string }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const update = () => setSelected(form.querySelectorAll('input[name="ids"]:checked').length);
    form.addEventListener("change", update);
    update();
    return () => form.removeEventListener("change", update);
  }, [formId]);

  return (
    <div className="selection-bar">
      <div className="selection-info">
        <strong>Build an audience report</strong>
        <span className="muted small">
          {selected > 0
            ? `${selected} ${selected === 1 ? "person" : "people"} selected`
            : "Tick people below, or use everyone matching your filters"}
        </span>
      </div>
      <input name="name" defaultValue={suggestedName} aria-label="Report name" placeholder="Report name" maxLength={120} />
      <button className="primary small" name="scope" value="selected" disabled={selected === 0}>
        Report on {selected || ""} selected
      </button>
      <button className="small" name="scope" value="all" disabled={matching === 0}>
        Use all {matching} matching
      </button>
    </div>
  );
}

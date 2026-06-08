"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SlideOver({
  trigger,
  title,
  description,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-40 bg-[rgba(18,26,22,0.5)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "animate-panel-in fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-5 border-l border-border bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] focus:outline-none",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-serif text-lg font-semibold text-foreground">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Fermer"
              className="rounded-full p-1.5 text-muted transition hover:bg-[var(--surface-soft)] hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

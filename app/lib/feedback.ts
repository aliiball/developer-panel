import { toast } from "sonner";

/* ── toastUndo ──────────────────────────────────────────────────────
 * Optimistic bir değişiklikten sonra "Geri al" eylemli toast. Akışın
 * geri-alınabilir hissetmesi için tüm yıkıcı/optimistic aksiyonlarda
 * tutarlı geri bildirim sağlar.
 */
export function toastUndo(
  message: string,
  opts: {
    description?: string;
    onUndo?: () => void;
    duration?: number;
    /** geri-al için etiket */
    undoLabel?: string;
  } = {},
) {
  const { description, onUndo, duration = 5000, undoLabel = "Geri al" } = opts;
  toast.success(message, {
    description,
    duration,
    action: onUndo ? { label: undoLabel, onClick: onUndo } : undefined,
  });
}

/* Async bir aksiyonu yükleniyor→başarı/hata toast'larıyla sarmalar. */
export function toastPromise<T>(
  promise: Promise<T>,
  msgs: { loading: string; success: string; error: string },
) {
  return toast.promise(promise, msgs);
}

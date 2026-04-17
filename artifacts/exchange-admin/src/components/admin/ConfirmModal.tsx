import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  confirmText?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({ title, description, confirmText = "Confirm", open, onClose, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90">{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}

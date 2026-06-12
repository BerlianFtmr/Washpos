'use client';

import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  variant?: 'danger' | 'normal';
  confirmLabel?: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  open,
  onClose,
  onConfirm,
  variant = 'normal',
  confirmLabel = 'Konfirmasi',
  loading = false,
}: ConfirmDialogProps) {
  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <Modal title={title} open={open} onClose={onClose} size="sm">
      <p className="text-slate-600">{message}</p>
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${confirmBtnClass}`}
        >
          {loading ? 'Memproses...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

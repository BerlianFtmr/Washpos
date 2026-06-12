'use client';

import type { OrderStatus, PaymentStatus, PaymentMethod, UserRole } from '@/types';

type BadgeVariant = 'order' | 'payment' | 'paymentMethod' | 'role';

interface StatusBadgeProps {
  variant: BadgeVariant;
  value: string;
  className?: string;
}

const orderStyles: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  dicuci: 'bg-blue-100 text-blue-800 border-blue-200',
  disetrika: 'bg-purple-100 text-purple-800 border-purple-200',
  siap: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  diambil: 'bg-slate-100 text-slate-800 border-slate-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const orderLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  dicuci: 'Dicuci',
  disetrika: 'Disetrika',
  siap: 'Siap Diambil',
  diambil: 'Diambil',
  cancelled: 'Dibatalkan',
};

const paymentStyles: Record<PaymentStatus, string> = {
  unpaid: 'bg-red-100 text-red-800 border-red-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
};

const methodStyles: Record<PaymentMethod, string> = {
  cash: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  transfer: 'bg-blue-100 text-blue-800 border-blue-200',
  ewallet: 'bg-purple-100 text-purple-800 border-purple-200',
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  ewallet: 'E-Wallet',
};

const roleStyles: Record<UserRole, string> = {
  admin: 'bg-orange-100 text-orange-800 border-orange-200',
  pegawai: 'bg-blue-100 text-blue-800 border-blue-200',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  pegawai: 'Pegawai',
};

export default function StatusBadge({ variant, value, className = '' }: StatusBadgeProps) {
  let style = '';
  let label = value;

  switch (variant) {
    case 'order':
      style = orderStyles[value as OrderStatus] ?? '';
      label = orderLabels[value as OrderStatus] ?? value;
      break;
    case 'payment':
      style = paymentStyles[value as PaymentStatus] ?? '';
      label = paymentLabels[value as PaymentStatus] ?? value;
      break;
    case 'paymentMethod':
      style = methodStyles[value as PaymentMethod] ?? '';
      label = methodLabels[value as PaymentMethod] ?? value;
      break;
    case 'role':
      style = roleStyles[value as UserRole] ?? '';
      label = roleLabels[value as UserRole] ?? value;
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium border rounded-full ${style} ${className}`}
    >
      {label}
    </span>
  );
}

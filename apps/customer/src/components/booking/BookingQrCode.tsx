interface Props {
  /** Real booking id/code to encode — this is what the shop scans or types in to check the guest in. */
  value: string;
  size?: number;
  className?: string;
}

/** Renders a real, scannable QR code for a booking check-in code (same qrserver pattern used for voucher QRs). */
export default function BookingQrCode({ value, size = 160, className }: Props) {
  const px = size * 2; // request 2x pixel density for a crisp scan
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&margin=8&data=${encodeURIComponent(`MOBLER-BOOKING:${value}`)}`;
  return (
    <img
      src={src}
      alt={`QR check-in ${value}`}
      width={size}
      height={size}
      className={className}
    />
  );
}

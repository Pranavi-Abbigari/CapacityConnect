import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 140,
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to render QR');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (error) {
    return <div className="text-xs text-rose-400">QR code error</div>;
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-800 rounded-xl animate-pulse ${className}`}
      >
        <span className="text-xs text-slate-500">Generating...</span>
      </div>
    );
  }

  return (
    <div className={`p-2 bg-white rounded-xl shadow-md inline-block ${className}`}>
      <img
        src={dataUrl}
        alt="Certificate Verification QR Code"
        width={size}
        height={size}
        className="rounded-lg"
      />
    </div>
  );
};

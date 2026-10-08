import React, { useState } from 'react';

interface AvatarImageProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const initials = (name || 'PE')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg',
  }[size];

  if (!src || hasError) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-pink-50 border border-pink-200 text-pink-700 font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${sizeClasses} rounded-full object-cover border border-slate-200 shrink-0 ${className}`}
    />
  );
};

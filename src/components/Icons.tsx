import React from 'react';

interface IconProps {
  className?: string;
}

export const PrinterIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
  >
    <path d="M7 8V3h10v5" />
    <rect x="4" y="8" width="16" height="9" rx="1" />
    <path d="M7 14h10v7l-2-1.5L13 21l-2-1.5L9 21l-2-1.5z" />
    <line x1="16" y1="11" x2="17" y2="11" />
  </svg>
);

export const BluetoothIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
  >
    <path d="M6.5 6.5l11 11L12 22V2l5.5 4.5-11 11" />
  </svg>
);

export const TextBlockIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M4 6h16" />
    <path d="M12 6v13" />
    <path d="M9 19h6" />
  </svg>
);

export const ChecklistIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="6" height="6" />
    <path d="M4.5 7l1.2 1.2L8 5.8" />
    <line x1="12" y1="7" x2="21" y2="7" />
    <rect x="3" y="14" width="6" height="6" />
    <line x1="12" y1="17" x2="21" y2="17" />
  </svg>
);

export const ImageBlockIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5-6 6-3-3-4 4" />
  </svg>
);

export const DividerIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="3" y1="12" x2="7" y2="12" />
    <line x1="10" y1="12" x2="14" y2="12" />
    <line x1="17" y1="12" x2="21" y2="12" />
  </svg>
);

export const BoldIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
    <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
  </svg>
);

export const ItalicIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

export const AlignLeftIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="18" y2="18" />
  </svg>
);

export const AlignCenterIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

export const AlignRightIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <line x1="6" y1="18" x2="21" y2="18" />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const QueueIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="16" height="4" />
    <rect x="4" y="10" width="16" height="4" />
    <rect x="4" y="16" width="10" height="4" />
    <path d="M18 16v4m-2-2h4" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M4 16v4h16v-4" />
    <path d="M12 4v11" />
    <path d="M8 8l4-4 4 4" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M4 16v4h16v-4" />
    <path d="M12 4v11" />
    <path d="M8 11l4 4 4-4" />
  </svg>
);

export const LinkIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M10 13a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
    <path d="M14 11a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
  </svg>
);

export const ArrowUpIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </svg>
);

export const ArrowDownIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M4 6h16" />
    <path d="M9 6V4h6v2" />
    <path d="M6 6l1 14h10l1-14" />
    <line x1="10" y1="10" x2="10" y2="16" />
    <line x1="14" y1="10" x2="14" y2="16" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <polyline points="4 12 9 17 20 6" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const SyncIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M20 11a8 8 0 0 0-14.5-4.5" />
    <polyline points="5 3 5 7 9 7" />
    <path d="M4 13a8 8 0 0 0 14.5 4.5" />
    <polyline points="19 21 19 17 15 17" />
  </svg>
);

export const OfflineIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="3" y1="3" x2="21" y2="21" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0" />
    <path d="M5 13a10 10 0 0 1 3.7-2.4" />
    <path d="M19 13a10 10 0 0 0-3-2" />
    <circle cx="12" cy="19.5" r="0.8" fill="currentColor" />
  </svg>
);

export const TemplateIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <rect x="4" y="3" width="16" height="18" />
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="10" y1="9" x2="10" y2="21" />
  </svg>
);

export const HistoryIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 3 3 8 8 8" />
    <polyline points="12 7 12 12 15.5 14" />
  </svg>
);

export const SlidersIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <rect x="8" y="4.5" width="4" height="5" fill="#090B0D" />
    <rect x="13" y="14.5" width="4" height="5" fill="#090B0D" />
  </svg>
);

export const BookmarkIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M6 3h12v18l-6-4-6 4z" />
  </svg>
);


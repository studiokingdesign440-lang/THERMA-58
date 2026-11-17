import React, {useRef, useState} from 'react';
import type {
  ChecklistBlock,
  DividerBlock,
  DividerStyle,
  FontFamilyId,
  ImageBlock,
  PrintBlock,
  ReceiptDocument,
  TextAlign,
  TextBlock,
  TextFormatting,
} from '../types/printer';
import {FONT_FAMILY_MAP} from '../utils/documentRenderer';
import {cacheRemoteImageDataUrl, getCachedRemoteImageDataUrl} from '../utils/storage';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BoldIcon,
  BookmarkIcon,
  ChecklistIcon,
  DividerIcon,
  ImageBlockIcon,
  ItalicIcon,
  LinkIcon,
  PlusIcon,
  TextBlockIcon,
  TrashIcon,
  UploadIcon,
} from './Icons';
import {ImageEffectsPanel} from './ImageEffectsPanel';

interface BlockEditorProps {
  document: ReceiptDocument;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onChangeDocument: (next: ReceiptDocument) => void;
  onResetSample: () => void;
  onOpenTemplates: () => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Generates an offline high-contrast geometric sample image for 58mm thermal testing.
 */
function createOfflineSampleImageDataUrl(): string {
  const canvas = window.document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 360, 180);

  // Clean geometric thermal test badge + gradient bar for dithering showcase
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 344, 164);

  // Halftone grayscale ramp to showcase Floyd-Steinberg / Atkinson dithering
  const grad = ctx.createLinearGradient(24, 0, 336, 0);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(0.5, '#777777');
  grad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.fillRect(24, 24, 312, 48);

  // Geometric crisp lines & label
  ctx.fillStyle = '#000000';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('58MM RASTER TEST', 180, 108);

  ctx.font = '400 13px "JetBrains Mono", monospace';
  ctx.fillText('203 DPI · 384 DOT WIDTH', 180, 134);

  // Barcode-like calibration bars
  for (let x = 24; x < 336; x += 12) {
    const w = ((x / 12) % 3) + 2;
    ctx.fillRect(x, 148, w, 12);
  }

  return canvas.toDataURL('image/png');
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  document: doc,
  selectedBlockId,
  onSelectBlock,
  onChangeDocument,
  onResetSample,
  onOpenTemplates,
}) => {
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [urlLoading, setUrlLoading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateBlocks = (updater: (blocks: PrintBlock[]) => PrintBlock[]) => {
    onChangeDocument({
      ...doc,
      updatedAt: Date.now(),
      blocks: updater(doc.blocks),
    });
  };

  const updateBlock = (id: string, patch: Partial<PrintBlock>) => {
    updateBlocks((blocks) =>
      blocks.map((b) => (b.id === id ? ({...b, ...patch} as PrintBlock) : b)),
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= doc.blocks.length) return;
    updateBlocks((blocks) => {
      const next = [...blocks];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const deleteBlock = (id: string) => {
    updateBlocks((blocks) => blocks.filter((b) => b.id !== id));
  };

  const addTextBlock = () => {
    const block: TextBlock = {
      id: makeId('txt'),
      type: 'text',
      content: 'New formatted text block',
      fontFamily: 'jetbrains',
      fontSize: 16,
      lineHeight: 1.4,
      bold: false,
      italic: false,
      align: 'left',
    };
    updateBlocks((blocks) => [...blocks, block]);
    onSelectBlock(block.id);
  };

  const addChecklistBlock = () => {
    const block: ChecklistBlock = {
      id: makeId('chk'),
      type: 'checklist',
      title: 'Checklist',
      fontFamily: 'jetbrains',
      fontSize: 16,
      lineHeight: 1.45,
      bold: false,
      italic: false,
      align: 'left',
      items: [
        {id: makeId('item'), text: 'First task', checked: false},
        {id: makeId('item'), text: 'Second task', checked: false},
      ],
    };
    updateBlocks((blocks) => [...blocks, block]);
    onSelectBlock(block.id);
  };

  const addImageBlock = () => {
    const block: ImageBlock = {
      id: makeId('img'),
      type: 'image',
      sourceType: 'upload',
      sourceUrl: '',
      dataUrl: '',
      fileName: '',
      align: 'center',
      widthPercent: 100,
      ditherMode: 'atkinson',
      effectPreset: 'atkinson-detail',
      threshold: 132,
      brightness: 6,
      contrast: 22,
      sharpen: 45,
      gamma: 1.25,
      sketchEdge: false,
      invert: false,
      caption: '',
    };
    updateBlocks((blocks) => [...blocks, block]);
    onSelectBlock(block.id);
  };

  const addDividerBlock = () => {
    const block: DividerBlock = {
      id: makeId('div'),
      type: 'divider',
      style: 'dashed',
      spacingY: 6,
    };
    updateBlocks((blocks) => [...blocks, block]);
    onSelectBlock(block.id);
  };

  const handleFileUpload = (blockId: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        setUrlErrors((prev) => ({...prev, [blockId]: ''}));
        updateBlock(blockId, {
          sourceType: 'upload',
          dataUrl,
          fileName: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadImageUrl = async (blockId: string, rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) {
      setUrlErrors((prev) => ({...prev, [blockId]: 'Enter an image URL first.'}));
      return;
    }

    setUrlLoading((prev) => ({...prev, [blockId]: true}));
    setUrlErrors((prev) => ({...prev, [blockId]: ''}));

    try {
      // Check offline cache first
      const cached = await getCachedRemoteImageDataUrl(url);
      if (cached && !navigator.onLine) {
        updateBlock(blockId, {
          sourceType: 'url',
          sourceUrl: url,
          dataUrl: cached,
          fileName: url.split('/').pop() || 'cached-image',
        });
        setUrlLoading((prev) => ({...prev, [blockId]: false}));
        return;
      }

      const response = await fetch(url, {mode: 'cors'});
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image blob.'));
        reader.readAsDataURL(blob);
      });

      await cacheRemoteImageDataUrl(url, dataUrl);
      updateBlock(blockId, {
        sourceType: 'url',
        sourceUrl: url,
        dataUrl,
        fileName: url.split('/').pop() || 'remote-image',
      });
    } catch {
      const cached = await getCachedRemoteImageDataUrl(url);
      if (cached) {
        updateBlock(blockId, {
          sourceType: 'url',
          sourceUrl: url,
          dataUrl: cached,
          fileName: url.split('/').pop() || 'cached-image',
        });
      } else {
        setUrlErrors((prev) => ({
          ...prev,
          [blockId]:
            'Could not fetch image directly (CORS or offline). Try uploading the image file instead.',
        }));
      }
    } finally {
      setUrlLoading((prev) => ({...prev, [blockId]: false}));
    }
  };

  const renderFormattingToolbar = (block: TextBlock | ChecklistBlock) => {
    const updateFmt = (patch: Partial<TextFormatting>) => updateBlock(block.id, patch);

    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-[#232930] bg-[#0D1014] px-3 py-2">
        {/* Font Family */}
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Font family</span>
          <select
            aria-label={`Font family for block ${block.id}`}
            value={block.fontFamily}
            onChange={(e) => updateFmt({fontFamily: e.target.value as FontFamilyId})}
            className="min-h-[36px] rounded-[4px] border border-[#30363D] bg-[#161B22] px-2 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
          >
            {Object.entries(FONT_FAMILY_MAP).map(([id, info]) => (
              <option key={id} value={id}>
                {info.label}
              </option>
            ))}
          </select>
        </label>

        {/* Bold / Italic */}
        <div className="flex items-center rounded-[4px] border border-[#30363D] bg-[#161B22] p-0.5">
          <button
            type="button"
            aria-label="Toggle bold"
            aria-pressed={block.bold}
            onClick={() => updateFmt({bold: !block.bold})}
            className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[3px] transition-colors ${
              block.bold
                ? 'bg-[#22C55E] text-[#090B0D]'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <BoldIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Toggle italic"
            aria-pressed={block.italic}
            onClick={() => updateFmt({italic: !block.italic})}
            className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[3px] transition-colors ${
              block.italic
                ? 'bg-[#22C55E] text-[#090B0D]'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <ItalicIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment */}
        <div
          role="group"
          aria-label="Text alignment"
          className="flex items-center rounded-[4px] border border-[#30363D] bg-[#161B22] p-0.5"
        >
          {(
            [
              ['left', AlignLeftIcon, 'Align left'],
              ['center', AlignCenterIcon, 'Align center'],
              ['right', AlignRightIcon, 'Align right'],
            ] as const
          ).map(([alignKey, Icon, label]) => (
            <button
              key={alignKey}
              type="button"
              aria-label={label}
              aria-pressed={block.align === alignKey}
              onClick={() => updateFmt({align: alignKey as TextAlign})}
              className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[3px] transition-colors ${
                block.align === alignKey
                  ? 'bg-[#E6EDF3] text-[#090B0D]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 rounded-[4px] border border-[#30363D] bg-[#161B22] px-2 py-1">
          <span className="text-[11px] text-[#8B949E]">Size</span>
          <button
            type="button"
            aria-label="Decrease font size"
            onClick={() => updateFmt({fontSize: Math.max(12, block.fontSize - 2)})}
            className="min-h-[26px] min-w-[26px] text-xs text-[#E6EDF3] hover:bg-[#232930] rounded-[2px]"
          >
            -
          </button>
          <span className="w-9 text-center text-xs text-[#E6EDF3] tabular-nums">
            {block.fontSize}px
          </span>
          <button
            type="button"
            aria-label="Increase font size"
            onClick={() => updateFmt({fontSize: Math.min(48, block.fontSize + 2)})}
            className="min-h-[26px] min-w-[26px] text-xs text-[#E6EDF3] hover:bg-[#232930] rounded-[2px]"
          >
            +
          </button>
        </div>

        {/* Line Spacing */}
        <div className="flex items-center gap-1 rounded-[4px] border border-[#30363D] bg-[#161B22] px-2 py-1">
          <span className="text-[11px] text-[#8B949E]">Line</span>
          <button
            type="button"
            aria-label="Decrease line spacing"
            onClick={() =>
              updateFmt({
                lineHeight: Math.max(1.0, Math.round((block.lineHeight - 0.1) * 10) / 10),
              })
            }
            className="min-h-[26px] min-w-[26px] text-xs text-[#E6EDF3] hover:bg-[#232930] rounded-[2px]"
          >
            -
          </button>
          <span className="w-8 text-center text-xs text-[#E6EDF3] tabular-nums">
            {block.lineHeight.toFixed(1)}
          </span>
          <button
            type="button"
            aria-label="Increase line spacing"
            onClick={() =>
              updateFmt({
                lineHeight: Math.min(2.4, Math.round((block.lineHeight + 0.1) * 10) / 10),
              })
            }
            className="min-h-[26px] min-w-[26px] text-xs text-[#E6EDF3] hover:bg-[#232930] rounded-[2px]"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Receipt Document Editor" className="space-y-4">
      {/* Document Title & Quick Block Add Bar */}
      <div className="rounded-[4px] border border-[#232930] bg-[#111418] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex-1 min-w-[200px]">
            <span className="sr-only">Document title</span>
            <input
              type="text"
              value={doc.title}
              onChange={(e) =>
                onChangeDocument({...doc, updatedAt: Date.now(), title: e.target.value})
              }
              placeholder="Document title..."
              className="w-full min-h-[40px] rounded-[4px] border border-[#232930] bg-[#090B0D] px-3 text-sm font-semibold text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenTemplates}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] whitespace-nowrap"
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
              Templates
            </button>
            <button
              type="button"
              onClick={onResetSample}
              className="min-h-[40px] px-3 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#8B949E] whitespace-nowrap"
            >
              Reset Sample
            </button>
          </div>
        </div>

        {/* Add Block Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={addTextBlock}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] whitespace-nowrap"
          >
            <TextBlockIcon className="w-3.5 h-3.5" />
            Add Text
          </button>
          <button
            type="button"
            onClick={addChecklistBlock}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] whitespace-nowrap"
          >
            <ChecklistIcon className="w-3.5 h-3.5" />
            Add Checklist
          </button>
          <button
            type="button"
            onClick={addImageBlock}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] whitespace-nowrap"
          >
            <ImageBlockIcon className="w-3.5 h-3.5" />
            Add Image
          </button>
          <button
            type="button"
            onClick={addDividerBlock}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] whitespace-nowrap"
          >
            <DividerIcon className="w-3.5 h-3.5" />
            Add Divider
          </button>
        </div>
      </div>

      {/* Block List */}
      {doc.blocks.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#30363D] bg-[#111418] p-8 text-center space-y-3">
          <p className="text-sm text-[#8B949E]">
            Receipt canvas is empty. Add a text block, checklist, or image to start composing.
          </p>
          <button
            type="button"
            onClick={addTextBlock}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] bg-[#22C55E] text-[#090B0D] hover:bg-[#16A34A]"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Create First Block
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {doc.blocks.map((block, index) => {
            const isSelected = selectedBlockId === block.id;
            const blockLabel =
              block.type === 'text'
                ? 'Text Block'
                : block.type === 'checklist'
                  ? 'Checklist'
                  : block.type === 'image'
                    ? 'Image Block'
                    : 'Divider';

            return (
              <div
                key={block.id}
                onClick={() => onSelectBlock(block.id)}
                onFocus={() => onSelectBlock(block.id)}
                className={`rounded-[4px] border bg-[#111418] transition-colors ${
                  isSelected ? 'border-[#22C55E]' : 'border-[#232930] hover:border-[#363F4A]'
                }`}
              >
                {/* Block Header */}
                <div className="flex items-center justify-between gap-2 border-b border-[#232930] px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-[#8B949E] tabular-nums min-w-0 truncate">
                    <span className="font-semibold text-[#E6EDF3] shrink-0">
                      {String(index + 1).padStart(2, '0')}. {blockLabel}
                    </span>
                    {(block.type === 'text' || block.type === 'checklist') && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">
                          {FONT_FAMILY_MAP[block.fontFamily]?.label} · {block.fontSize}px ·{' '}
                          {block.align}
                          {block.bold ? ' · Bold' : ''}
                          {block.italic ? ' · Italic' : ''}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(block.type === 'text' || block.type === 'checklist') && !isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBlock(block.id);
                        }}
                        className="min-h-[30px] px-2 text-[11px] font-medium rounded-[3px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] mr-1"
                      >
                        Format
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(index, -1);
                      }}
                      disabled={index === 0}
                      aria-label={`Move ${blockLabel} ${index + 1} up`}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-[3px] text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] disabled:opacity-30"
                    >
                      <ArrowUpIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(index, 1);
                      }}
                      disabled={index === doc.blocks.length - 1}
                      aria-label={`Move ${blockLabel} ${index + 1} down`}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-[3px] text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] disabled:opacity-30"
                    >
                      <ArrowDownIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlock(block.id);
                      }}
                      aria-label={`Delete ${blockLabel} ${index + 1}`}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-[3px] text-[#8B949E] hover:bg-[#DC2626]/15 hover:text-[#F87171]"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Formatting Bar for active Text / Checklist block */}
                {(block.type === 'text' || block.type === 'checklist') &&
                  isSelected &&
                  renderFormattingToolbar(block)}

                {/* Block Body */}
                <div className="p-3">
                  {block.type === 'text' && (
                    <textarea
                      aria-label={`Text content for block ${index + 1}`}
                      rows={Math.max(2, Math.min(8, block.content.split('\n').length))}
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, {content: e.target.value})}
                      style={{
                        fontFamily: FONT_FAMILY_MAP[block.fontFamily]?.css,
                        fontWeight: block.bold ? 700 : 400,
                        fontStyle: block.italic ? 'italic' : 'normal',
                        textAlign: block.align,
                        lineHeight: block.lineHeight,
                      }}
                      className="w-full rounded-[4px] border border-[#232930] bg-[#090B0D] p-3 text-sm text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none resize-y"
                      placeholder="Type receipt text..."
                    />
                  )}

                  {block.type === 'checklist' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        aria-label={`Checklist title ${index + 1}`}
                        value={block.title}
                        onChange={(e) => updateBlock(block.id, {title: e.target.value})}
                        placeholder="Checklist heading (optional)..."
                        className="w-full min-h-[38px] rounded-[4px] border border-[#232930] bg-[#090B0D] px-3 text-xs font-semibold text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none"
                      />

                      <div className="space-y-2">
                        {block.items.map((item, itemIdx) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={item.checked}
                              aria-label={`Toggle item "${item.text || `Item ${itemIdx + 1}`}"`}
                              onClick={() => {
                                const nextItems = block.items.map((it) =>
                                  it.id === item.id ? {...it, checked: !it.checked} : it,
                                );
                                updateBlock(block.id, {items: nextItems});
                              }}
                              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[4px] border text-xs font-bold transition-colors ${
                                item.checked
                                  ? 'border-[#22C55E] bg-[#22C55E]/15 text-[#22C55E]'
                                  : 'border-[#30363D] bg-[#090B0D] text-[#8B949E] hover:border-[#E6EDF3]'
                              }`}
                            >
                              {item.checked ? '[x]' : '[ ]'}
                            </button>

                            <input
                              type="text"
                              aria-label={`Checklist item ${itemIdx + 1} text`}
                              value={item.text}
                              onChange={(e) => {
                                const nextItems = block.items.map((it) =>
                                  it.id === item.id ? {...it, text: e.target.value} : it,
                                );
                                updateBlock(block.id, {items: nextItems});
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const newItem = {
                                    id: makeId('item'),
                                    text: '',
                                    checked: false,
                                  };
                                  const nextItems = [...block.items];
                                  nextItems.splice(itemIdx + 1, 0, newItem);
                                  updateBlock(block.id, {items: nextItems});
                                }
                              }}
                              placeholder="Checklist item..."
                              className={`flex-1 min-h-[40px] rounded-[4px] border border-[#232930] bg-[#090B0D] px-3 text-xs focus:border-[#22C55E] focus:outline-none ${
                                item.checked
                                  ? 'line-through text-[#8B949E]'
                                  : 'text-[#E6EDF3]'
                              }`}
                            />

                            <button
                              type="button"
                              aria-label={`Remove checklist item "${item.text || itemIdx + 1}"`}
                              onClick={() => {
                                const nextItems = block.items.filter((it) => it.id !== item.id);
                                updateBlock(block.id, {items: nextItems});
                              }}
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[4px] text-[#8B949E] hover:bg-[#DC2626]/15 hover:text-[#F87171]"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const nextItems = [
                              ...block.items,
                              {id: makeId('item'), text: '', checked: false},
                            ];
                            updateBlock(block.id, {items: nextItems});
                          }}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E]"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          Add Item
                        </button>
                        {block.items.some((i) => i.checked) && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextItems = block.items.filter((i) => !i.checked);
                              updateBlock(block.id, {items: nextItems});
                            }}
                            className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#090B0D] text-[#8B949E] hover:text-[#E6EDF3]"
                          >
                            Clear Checked
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {block.type === 'divider' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-[#8B949E]">
                        <span>Rule Style</span>
                        <select
                          value={block.style}
                          onChange={(e) =>
                            updateBlock(block.id, {style: e.target.value as DividerStyle})
                          }
                          className="min-h-[36px] rounded-[4px] border border-[#30363D] bg-[#090B0D] px-2.5 text-xs text-[#E6EDF3]"
                        >
                          <option value="dashed">Dashed (- - - -)</option>
                          <option value="solid">Solid (_______)</option>
                          <option value="double">Double (=======)</option>
                          <option value="dotted">Dotted (. . . .)</option>
                        </select>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[#8B949E]">
                        <span>Padding</span>
                        <input
                          type="number"
                          min={2}
                          max={32}
                          value={block.spacingY}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              spacingY: Math.max(2, Math.min(32, Number(e.target.value) || 6)),
                            })
                          }
                          className="w-16 min-h-[36px] rounded-[4px] border border-[#30363D] bg-[#090B0D] px-2 text-xs text-[#E6EDF3] tabular-nums"
                        />
                      </label>
                    </div>
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-3">
                      {/* Source Input: Upload File or URL */}
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={(el) => {
                            fileInputRefs.current[block.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          aria-label={`Upload image file for block ${index + 1}`}
                          className="hidden"
                          onChange={(e) => handleFileUpload(block.id, e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[block.id]?.click()}
                          className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] whitespace-nowrap"
                        >
                          <UploadIcon className="w-3.5 h-3.5" />
                          Upload File
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const sample = createOfflineSampleImageDataUrl();
                            if (sample) {
                              setUrlErrors((prev) => ({...prev, [block.id]: ''}));
                              updateBlock(block.id, {
                                sourceType: 'upload',
                                dataUrl: sample,
                                fileName: '58mm-raster-test.png',
                              });
                            }
                          }}
                          className="min-h-[40px] px-3 py-2 text-xs font-medium rounded-[4px] border border-[#30363D] bg-[#090B0D] text-[#8B949E] hover:text-[#E6EDF3] whitespace-nowrap"
                        >
                          Sample Graphic
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                          <LinkIcon className="w-3.5 h-3.5 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            aria-label={`Image URL for block ${index + 1}`}
                            value={block.sourceUrl}
                            onChange={(e) =>
                              updateBlock(block.id, {sourceUrl: e.target.value})
                            }
                            placeholder="https://example.com/logo.png"
                            className="w-full min-h-[40px] rounded-[4px] border border-[#232930] bg-[#090B0D] pl-8 pr-3 text-xs text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={urlLoading[block.id]}
                          onClick={() => handleLoadImageUrl(block.id, block.sourceUrl)}
                          className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-[4px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E] disabled:opacity-50 whitespace-nowrap"
                        >
                          {urlLoading[block.id] ? 'Loading...' : 'Load URL'}
                        </button>
                      </div>

                      {urlErrors[block.id] && (
                        <p role="alert" className="text-xs text-[#F87171]">
                          {urlErrors[block.id]}
                        </p>
                      )}

                      {block.fileName && (
                        <p className="text-[11px] text-[#8B949E]">
                          Loaded asset: <span className="text-[#E6EDF3]">{block.fileName}</span>
                        </p>
                      )}

                      {/* Thermal Print Effects (shown automatically after an image is loaded) */}
                      <ImageEffectsPanel
                        block={block}
                        onUpdate={(patch) => updateBlock(block.id, patch)}
                      />

                      <input
                        type="text"
                        aria-label={`Image caption for block ${index + 1}`}
                        value={block.caption}
                        onChange={(e) => updateBlock(block.id, {caption: e.target.value})}
                        placeholder="Optional image caption..."
                        className="w-full min-h-[38px] rounded-[4px] border border-[#232930] bg-[#090B0D] px-3 text-xs text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

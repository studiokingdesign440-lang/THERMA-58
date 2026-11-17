import React, {useEffect, useRef, useState} from 'react';
import type {DitherMode, ImageBlock, TextAlign} from '../types/printer';
import {renderImageBlockEffectPreview} from '../utils/documentRenderer';
import {IMAGE_EFFECT_PRESETS, type ImageEffectPresetConfig} from '../utils/escpos';
import {SlidersIcon} from './Icons';

interface ImageEffectsPanelProps {
  block: ImageBlock;
  onUpdate: (patch: Partial<ImageBlock>) => void;
}

export const ImageEffectsPanel: React.FC<ImageEffectsPanelProps> = ({block, onUpdate}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showFineControls, setShowFineControls] = useState(false);

  // Live mini 1-bit preview whenever image or effects change
  useEffect(() => {
    if (!block.dataUrl) return;
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active || !previewCanvasRef.current) return;
      renderImageBlockEffectPreview(img, previewCanvasRef.current, block);
    };
    img.src = block.dataUrl;
    return () => {
      active = false;
    };
  }, [
    block.dataUrl,
    block.ditherMode,
    block.threshold,
    block.brightness,
    block.contrast,
    block.sharpen,
    block.gamma,
    block.sketchEdge,
    block.invert,
    block.widthPercent,
  ]);

  if (!block.dataUrl) {
    return null;
  }

  const applyPreset = (preset: ImageEffectPresetConfig) => {
    onUpdate({
      effectPreset: preset.id,
      ditherMode: preset.ditherMode,
      threshold: preset.threshold,
      brightness: preset.brightness,
      contrast: preset.contrast,
      sharpen: preset.sharpen,
      gamma: preset.gamma,
      sketchEdge: preset.sketchEdge,
      invert: preset.invert,
    });
  };

  const activePresetId = block.effectPreset ?? 'custom';

  return (
    <div
      data-testid="image-effects-panel"
      className="rounded-[4px] border border-[#232930] bg-[#090B0D] p-3 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232930] pb-2.5">
        <div className="flex items-center gap-2">
          <SlidersIcon className="w-3.5 h-3.5 text-[#22C55E]" />
          <span className="text-xs font-semibold text-[#E6EDF3]">
            Thermal Print Effects
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowFineControls((v) => !v)}
          className="min-h-[30px] px-2.5 text-[11px] font-medium rounded-[3px] border border-[#30363D] bg-[#161B22] text-[#E6EDF3] hover:border-[#22C55E]"
        >
          {showFineControls ? 'Hide Fine Tuning' : 'Fine Tune'}
        </button>
      </div>

      {/* Live 1-bit Thermal Effect Thumbnail + Preset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
        <div className="rounded-[3px] border border-[#30363D] bg-[#F6F6F2] p-1.5 flex items-center justify-center">
          <canvas
            ref={previewCanvasRef}
            data-testid="image-effect-mini-preview"
            className="max-w-full max-h-32 h-auto block"
            style={{imageRendering: 'pixelated'}}
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-[#8B949E]">
            One-click presets tuned for 58mm thermal heads (dot-gain & edge compensation):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {IMAGE_EFFECT_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.hint}
                  aria-pressed={active}
                  onClick={() => applyPreset(preset)}
                  className={`min-h-[36px] px-2.5 py-1.5 text-left rounded-[3px] border text-[11px] font-medium transition-colors truncate ${
                    active
                      ? 'border-[#22C55E] bg-[#22C55E]/15 text-[#E6EDF3]'
                      : 'border-[#232930] bg-[#111418] text-[#8B949E] hover:border-[#8B949E] hover:text-[#E6EDF3]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Size & Alignment Row (Always accessible) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#232930]">
        <label className="block space-y-1">
          <span className="flex justify-between text-[11px] text-[#8B949E] tabular-nums">
            <span>Print Width</span>
            <span>{block.widthPercent}%</span>
          </span>
          <input
            type="range"
            min={25}
            max={100}
            step={5}
            value={block.widthPercent}
            onChange={(e) => onUpdate({widthPercent: Number(e.target.value)})}
            className="w-full accent-[#22C55E]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-[#8B949E]">Alignment</span>
          <select
            value={block.align}
            onChange={(e) => onUpdate({align: e.target.value as TextAlign})}
            className="w-full min-h-[34px] rounded-[4px] border border-[#30363D] bg-[#111418] px-2.5 text-xs text-[#E6EDF3]"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-[#8B949E]">Dither Engine</span>
          <select
            value={block.ditherMode}
            onChange={(e) =>
              onUpdate({ditherMode: e.target.value as DitherMode, effectPreset: 'custom'})
            }
            className="w-full min-h-[34px] rounded-[4px] border border-[#30363D] bg-[#111418] px-2.5 text-xs text-[#E6EDF3]"
          >
            <option value="atkinson">Atkinson (Sharp)</option>
            <option value="floyd-steinberg">Floyd-Steinberg</option>
            <option value="bayer">Bayer 4x4 Matrix</option>
            <option value="threshold">Threshold (1-bit)</option>
          </select>
        </label>
      </div>

      {/* Fine-Tuning Sliders */}
      {showFineControls && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-[#232930]">
          <label className="block space-y-1">
            <span className="flex justify-between text-[11px] text-[#8B949E] tabular-nums">
              <span>Edge Sharpen</span>
              <span>{block.sharpen ?? 0}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={block.sharpen ?? 0}
              onChange={(e) =>
                onUpdate({sharpen: Number(e.target.value), effectPreset: 'custom'})
              }
              className="w-full accent-[#22C55E]"
            />
          </label>

          <label className="block space-y-1">
            <span className="flex justify-between text-[11px] text-[#8B949E] tabular-nums">
              <span>Midtone Gamma</span>
              <span>{(block.gamma ?? 1.0).toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0.6}
              max={1.8}
              step={0.05}
              value={block.gamma ?? 1.0}
              onChange={(e) =>
                onUpdate({gamma: Number(e.target.value), effectPreset: 'custom'})
              }
              className="w-full accent-[#22C55E]"
            />
          </label>

          <label className="block space-y-1">
            <span className="flex justify-between text-[11px] text-[#8B949E] tabular-nums">
              <span>Threshold</span>
              <span>{block.threshold}</span>
            </span>
            <input
              type="range"
              min={40}
              max={220}
              value={block.threshold}
              onChange={(e) =>
                onUpdate({threshold: Number(e.target.value), effectPreset: 'custom'})
              }
              className="w-full accent-[#22C55E]"
            />
          </label>

          <label className="block space-y-1">
            <span className="flex justify-between text-[11px] text-[#8B949E] tabular-nums">
              <span>Brightness</span>
              <span>{block.brightness}</span>
            </span>
            <input
              type="range"
              min={-50}
              max={50}
              value={block.brightness}
              onChange={(e) =>
                onUpdate({brightness: Number(e.target.value), effectPreset: 'custom'})
              }
              className="w-full accent-[#22C55E]"
            />
          </label>

          <label className="block space-y-1">
            <span className="flex justify-between text-[11px] text-[#8B949E] tabular-nums">
              <span>Contrast</span>
              <span>{block.contrast}</span>
            </span>
            <input
              type="range"
              min={-60}
              max={80}
              value={block.contrast}
              onChange={(e) =>
                onUpdate({contrast: Number(e.target.value), effectPreset: 'custom'})
              }
              className="w-full accent-[#22C55E]"
            />
          </label>

          <div className="flex flex-col justify-center gap-1.5">
            <label className="flex items-center gap-2 text-xs text-[#E6EDF3] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(block.sketchEdge)}
                onChange={(e) =>
                  onUpdate({sketchEdge: e.target.checked, effectPreset: 'custom'})
                }
                className="h-4 w-4 accent-[#22C55E]"
              />
              <span>Sketch Edge Outline</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#E6EDF3] cursor-pointer">
              <input
                type="checkbox"
                checked={block.invert}
                onChange={(e) =>
                  onUpdate({invert: e.target.checked, effectPreset: 'custom'})
                }
                className="h-4 w-4 accent-[#22C55E]"
              />
              <span>Invert Black/White</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

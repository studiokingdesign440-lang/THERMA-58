import React, {useState} from 'react';
import type {PrintTemplate, ReceiptDocument, TemplateCategory} from '../types/printer';
import {BookmarkIcon, PlusIcon, TemplateIcon, TrashIcon} from './Icons';

interface TemplatesViewProps {
  currentDoc: ReceiptDocument;
  builtInTemplates: PrintTemplate[];
  customTemplates: PrintTemplate[];
  onLoadTemplate: (template: PrintTemplate) => void;
  onSaveAsTemplate: (name: string, category: TemplateCategory, description: string) => void;
  onDeleteTemplate: (id: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  currentDoc,
  builtInTemplates,
  customTemplates,
  onLoadTemplate,
  onSaveAsTemplate,
  onDeleteTemplate,
}) => {
  const [filter, setFilter] = useState<'all' | TemplateCategory>('all');
  const [name, setName] = useState(currentDoc.title ? `${currentDoc.title} Template` : '');
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const allTemplates = [...customTemplates, ...builtInTemplates];
  const filtered =
    filter === 'all' ? allTemplates : allTemplates.filter((t) => t.category === filter);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a template name before saving.');
      return;
    }
    if (currentDoc.blocks.length === 0) {
      setError('Current document has no blocks to save as a template.');
      return;
    }
    setError('');
    onSaveAsTemplate(
      trimmed,
      category,
      description.trim() || `${currentDoc.blocks.length} formatted blocks`,
    );
    setName('');
    setDescription('');
  };

  return (
    <section aria-label="Receipt and Report Templates" className="space-y-5">
      {/* Create Custom Template from Current Document */}
      <form
        onSubmit={handleSave}
        className="rounded-[4px] border border-[#232930] bg-[#111418] p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="w-4 h-4 text-[#22C55E]" />
            <h1 className="text-sm font-semibold text-[#E6EDF3]">
              Save Current Receipt as Reusable Template
            </h1>
          </div>
          <span className="text-xs text-[#8B949E] tabular-nums">
            {currentDoc.blocks.length} blocks in active draft
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_auto] gap-2.5 items-start">
          <div>
            <label htmlFor="tpl-name" className="sr-only">
              Template name
            </label>
            <input
              id="tpl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name (e.g. Store Receipt)"
              className="w-full min-h-[40px] rounded-[4px] border border-[#232930] bg-[#090B0D] px-3 text-xs text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="tpl-cat" className="sr-only">
              Template category
            </label>
            <select
              id="tpl-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              className="w-full min-h-[40px] rounded-[4px] border border-[#30363D] bg-[#090B0D] px-2.5 text-xs text-[#E6EDF3]"
            >
              <option value="receipt">Receipt</option>
              <option value="report">Report</option>
              <option value="checklist">Checklist</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label htmlFor="tpl-desc" className="sr-only">
              Template description
            </label>
            <input
              id="tpl-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note (optional)..."
              className="w-full min-h-[40px] rounded-[4px] border border-[#232930] bg-[#090B0D] px-3 text-xs text-[#E6EDF3] placeholder:text-[#6E7681] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[4px] bg-[#22C55E] text-[#090B0D] hover:bg-[#16A34A] whitespace-nowrap"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Save Template
          </button>
        </div>

        {error && (
          <p role="alert" className="text-xs text-[#F87171]">
            {error}
          </p>
        )}
      </form>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter templates by category"
          className="flex flex-wrap items-center gap-1 rounded-[4px] border border-[#232930] bg-[#111418] p-1"
        >
          {(
            [
              ['all', 'All'],
              ['receipt', 'Receipts'],
              ['report', 'Reports'],
              ['checklist', 'Checklists'],
              ['custom', 'My Templates'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-[34px] px-3 text-xs font-medium rounded-[3px] transition-colors ${
                filter === key
                  ? 'bg-[#E6EDF3] text-[#090B0D]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#8B949E] tabular-nums">
          {filtered.length} templates · Saved locally in IndexedDB
        </p>
      </div>

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#30363D] bg-[#111418] p-8 text-center space-y-2">
          <p className="text-sm font-medium text-[#E6EDF3]">No templates in this category</p>
          <p className="text-xs text-[#8B949E]">
            Use the form above to save your active receipt or report layout as a template.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tpl) => (
            <article
              key={tpl.id}
              data-testid="template-card"
              className="rounded-[4px] border border-[#232930] bg-[#111418] p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[#E6EDF3] truncate">{tpl.name}</h2>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8B949E] tabular-nums">
                      <span className="capitalize">{tpl.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tpl.builtIn ? 'Built-in' : 'Custom'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tpl.blocks.length} blocks</span>
                    </div>
                  </div>
                  <TemplateIcon className="w-4 h-4 text-[#8B949E] shrink-0" />
                </div>

                <p className="text-xs text-[#8B949E] leading-relaxed">{tpl.description}</p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#232930] pt-3">
                <button
                  type="button"
                  onClick={() => onLoadTemplate(tpl)}
                  className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-[4px] border border-[#22C55E] bg-[#22C55E]/15 text-[#E6EDF3] hover:bg-[#22C55E]/25"
                >
                  Use Template
                </button>

                {!tpl.builtIn && (
                  <button
                    type="button"
                    aria-label={`Delete custom template ${tpl.name}`}
                    onClick={() => onDeleteTemplate(tpl.id)}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-[4px] border border-[#30363D] bg-[#090B0D] text-[#8B949E] hover:border-[#F87171] hover:text-[#F87171]"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

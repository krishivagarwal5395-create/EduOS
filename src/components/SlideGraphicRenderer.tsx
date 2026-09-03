import React, { useState } from "react";
import { 
  Workflow, RefreshCw, Grid3X3, Clock, BarChart3, Layers, 
  ArrowRight, CheckCircle2, Sparkles, Zap, Target, Lightbulb, Compass, Shield,
  Image as ImageIcon, Eye, Maximize2, RefreshCcw, Sparkle
} from "lucide-react";
import { Slide, SlideGraphicElement } from "../types";

interface SlideGraphicRendererProps {
  slide: Slide;
  themeStyle?: 'indigo' | 'emerald' | 'amber' | 'dark' | 'white' | string;
  onRegenerateImage?: (customPrompt?: string) => void;
  onOpenSearchGoogleImages?: () => void;
  isRegeneratingImage?: boolean;
  defaultView?: 'image' | 'diagram' | 'dual';
}

export default function SlideGraphicRenderer({ 
  slide, 
  themeStyle = 'indigo',
  onRegenerateImage,
  onOpenSearchGoogleImages,
  isRegeneratingImage = false,
  defaultView = 'image'
}: SlideGraphicRendererProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'diagram'>(slide.imageUrl ? defaultView === 'diagram' ? 'diagram' : 'image' : 'diagram');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Determine graphic type
  let type = (slide.graphicType || '').toLowerCase();
  
  // Fallback heuristic if graphicType was not explicitly set
  if (!type) {
    const text = `${slide.title} ${slide.visualDescription || ''} ${slide.bulletPoints.join(' ')}`.toLowerCase();
    if (text.includes('step') || text.includes('process') || text.includes('flow') || text.includes('how')) {
      type = 'flowchart';
    } else if (text.includes('cycle') || text.includes('loop') || text.includes('circulation') || text.includes('recurring')) {
      type = 'cycle';
    } else if (text.includes('compare') || text.includes('versus') || text.includes('vs') || text.includes('difference')) {
      type = 'comparison';
    } else if (text.includes('timeline') || text.includes('history') || text.includes('period') || text.includes('era')) {
      type = 'timeline';
    } else if (text.includes('metric') || text.includes('stat') || text.includes('number') || text.includes('percent') || text.includes('growth')) {
      type = 'metrics';
    } else if (text.includes('hierarchy') || text.includes('level') || text.includes('tier') || text.includes('pyramid')) {
      type = 'hierarchy';
    } else {
      type = 'cards';
    }
  }

  // Derive graphic elements if not present or empty
  const elements: SlideGraphicElement[] = slide.graphicElements && slide.graphicElements.length > 0
    ? slide.graphicElements
    : slide.bulletPoints.slice(0, 4).map((b, i) => {
        const parts = b.split(/[:\-–]/);
        return {
          label: parts[0]?.trim() || `Concept ${i + 1}`,
          description: parts[1]?.trim() || b,
          value: `#${i + 1}`,
          icon: ['Sparkles', 'Target', 'Zap', 'Lightbulb'][i % 4]
        };
      });

  const getElementIcon = (iconName?: string, index: number = 0) => {
    const icons = [
      <Sparkles key="1" className="w-4 h-4 text-indigo-400" />,
      <Target key="2" className="w-4 h-4 text-emerald-400" />,
      <Zap key="3" className="w-4 h-4 text-amber-400" />,
      <Lightbulb key="4" className="w-4 h-4 text-cyan-400" />,
      <Compass key="5" className="w-4 h-4 text-purple-400" />,
      <Shield key="6" className="w-4 h-4 text-rose-400" />
    ];
    return icons[index % icons.length];
  };

  const graphicTitle = slide.graphicTitle || (
    type === 'flowchart' ? 'Process Workflow Dynamics' :
    type === 'cycle' ? 'Cyclical System Stages' :
    type === 'comparison' ? 'Comparative Matrix' :
    type === 'timeline' ? 'Evolution Timeline' :
    type === 'metrics' ? 'Key Metric Dimensions' :
    type === 'hierarchy' ? 'Structured Hierarchy' : 'Visual Concept Breakdown'
  );

  // Fallback high-res image if none on slide
  const displayImageUrl = slide.imageUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent((slide.imagePrompt || slide.title || "Education") + ", 4k, crisp, educational photography, high quality")}?width=1024&height=640&nologo=true&seed=${slide.slideNumber * 777}`;

  return (
    <div className="w-full h-full flex flex-col justify-between bg-slate-900/80 backdrop-blur-md rounded-2xl border border-indigo-500/30 p-4 shadow-xl relative overflow-hidden" id={`slide_graphic_${slide.slideNumber}`}>
      
      {/* Subtle Background Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Media Header & Mode Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3 relative z-10">
        
        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'image' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Slide Photo / Visual</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('diagram')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'diagram' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Infographic Diagram</span>
          </button>
        </div>

        {/* Quick Action / Tag */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'image' && onOpenSearchGoogleImages && (
            <button
              type="button"
              onClick={onOpenSearchGoogleImages}
              title="Search Google / Web for real educational images"
              className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Google Images</span>
            </button>
          )}

          {activeTab === 'image' && onRegenerateImage && (
            <button
              type="button"
              onClick={() => onRegenerateImage()}
              disabled={isRegeneratingImage}
              title="Regenerate this slide's visual with a fresh seed"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
            {activeTab === 'image' ? 'Real Photo' : type}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center relative z-10 py-1 min-h-[220px]">
        
        {/* ================= TAB 1: REALISTIC VISUAL IMAGE ================= */}
        {activeTab === 'image' && (
          <div className="relative w-full h-full flex flex-col justify-center items-center group">
            <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80 rounded-xl overflow-hidden border border-white/15 bg-slate-950/80 shadow-lg">
              
              {/* Image element */}
              <img
                src={displayImageUrl}
                alt={slide.title}
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-60 blur-xs'
                }`}
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              {/* Expand / Lightbox Button */}
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Expand Fullscreen Image"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Bottom Caption */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white">
                <span className="font-semibold truncate max-w-[80%] drop-shadow-md">
                  {slide.title}
                </span>
                <span className="text-[10px] bg-indigo-500/80 backdrop-blur-md px-2 py-0.5 rounded-md font-mono font-bold">
                  Realistic Visual
                </span>
              </div>
            </div>

            {/* Visual concept prompt description badge */}
            {slide.visualDescription && (
              <p className="text-[11px] text-slate-300 mt-2 italic line-clamp-2 px-1 text-center">
                "{slide.visualDescription}"
              </p>
            )}
          </div>
        )}

        {/* ================= TAB 2: INFOGRAPHIC DIAGRAM ================= */}
        {activeTab === 'diagram' && (
          <div className="w-full flex-1 flex flex-col justify-center">
            
            {/* 1. FLOWCHART / PROCESS STEPS */}
            {type === 'flowchart' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                {elements.slice(0, 3).map((el, i) => (
                  <React.Fragment key={i}>
                    <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col justify-between h-full transition-all group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-400/50 text-indigo-200 text-[10px] font-mono font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        {getElementIcon(el.icon, i)}
                      </div>
                      <div className="font-bold text-xs text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                        {el.label}
                      </div>
                      {el.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                          {el.description}
                        </p>
                      )}
                    </div>
                    {i < Math.min(elements.length, 3) - 1 && (
                      <div className="hidden sm:flex justify-center -mx-2">
                        <ArrowRight className="w-4 h-4 text-indigo-400/70" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* 2. CYCLE DIAGRAM */}
            {type === 'cycle' && (
              <div className="grid grid-cols-2 gap-2.5">
                {elements.slice(0, 4).map((el, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {['A', 'B', 'C', 'D'][i] || i + 1}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs text-white truncate">{el.label}</div>
                      {el.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{el.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. COMPARISON MATRIX / GRID */}
            {type === 'comparison' && (
              <div className="grid grid-cols-2 gap-2">
                {elements.slice(0, 4).map((el, i) => (
                  <div key={i} className={`p-2.5 rounded-xl border flex flex-col justify-between ${i % 2 === 0 ? 'bg-indigo-950/30 border-indigo-500/30' : 'bg-emerald-950/30 border-emerald-500/30'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                        {i % 2 === 0 ? 'Core Factor' : 'Impact Vector'}
                      </span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${i % 2 === 0 ? 'text-indigo-400' : 'text-emerald-400'}`} />
                    </div>
                    <h5 className="font-bold text-xs text-white">{el.label}</h5>
                    {el.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{el.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 4. TIMELINE MILESTONES */}
            {type === 'timeline' && (
              <div className="space-y-2">
                {elements.slice(0, 3).map((el, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/20 font-bold">
                        {el.value || `Phase ${i + 1}`}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-bold text-xs text-white truncate">{el.label}</div>
                      {el.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{el.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. METRICS & STATS */}
            {type === 'metrics' && (
              <div className="grid grid-cols-2 gap-2.5">
                {elements.slice(0, 4).map((el, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-white/10 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                      <span>DIMENSION #{i + 1}</span>
                      {getElementIcon(el.icon, i)}
                    </div>
                    <div className="text-lg font-extrabold text-white my-0.5 tracking-tight text-indigo-200">
                      {el.value || (i === 0 ? "95%" : i === 1 ? "4.8★" : i === 2 ? "10x" : "100%")}
                    </div>
                    <div className="text-xs font-bold text-white truncate">{el.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. HIERARCHY / PYRAMID */}
            {type === 'hierarchy' && (
              <div className="space-y-1.5 flex flex-col items-center">
                {elements.slice(0, 3).map((el, i) => {
                  const widths = ['w-2/3', 'w-4/5', 'w-full'];
                  return (
                    <div key={i} className={`${widths[i] || 'w-full'} p-2 rounded-xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 text-center`}>
                      <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase block">Tier {i + 1}</span>
                      <span className="font-bold text-xs text-white truncate block">{el.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 7. CARDS / BENTO GRID (DEFAULT) */}
            {type !== 'flowchart' && type !== 'cycle' && type !== 'comparison' && type !== 'timeline' && type !== 'metrics' && type !== 'hierarchy' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {elements.slice(0, 4).map((el, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {getElementIcon(el.icon, i)}
                    </div>
                    <div className="overflow-hidden">
                      <h5 className="font-bold text-xs text-white truncate">{el.label}</h5>
                      {el.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{el.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Footer Visual Concept Caption */}
      {slide.visualDescription && (
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 italic">
          <div className="flex items-center gap-1.5 truncate max-w-[80%]">
            <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">{slide.visualDescription}</span>
          </div>
          <span className="font-mono text-indigo-300 not-italic shrink-0">Slide {slide.slideNumber}</span>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowImageModal(false)}>
          <div className="max-w-4xl max-h-[90vh] bg-slate-950 p-4 rounded-2xl border border-white/20 flex flex-col space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center text-white pb-2 border-b border-white/10">
              <h3 className="font-bold text-sm text-indigo-300">{slide.title}</h3>
              <button onClick={() => setShowImageModal(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-white/10 rounded-lg">Close (Esc)</button>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl">
              <img
                src={displayImageUrl}
                alt={slide.title}
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
              />
            </div>
            {slide.imagePrompt && (
              <p className="text-xs text-slate-300 bg-white/5 p-2 rounded-lg font-mono">
                <strong>Prompt:</strong> {slide.imagePrompt}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}


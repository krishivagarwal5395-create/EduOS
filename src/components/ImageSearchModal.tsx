import React, { useState, useEffect } from "react";
import { 
  Search, ExternalLink, Image as ImageIcon, Sparkles, 
  Check, X, RefreshCw, Globe, Link2, AlertCircle 
} from "lucide-react";

interface ImageResult {
  url: string;
  thumbUrl: string;
  title: string;
  source: string;
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  slideTitle?: string;
  presentationTopic?: string;
  initialQuery?: string;
  slideNumber?: number;
  currentImageUrl?: string;
  onSelectImage: (imageUrl: string, imageSource?: string) => void;
}

export default function ImageSearchModal({
  isOpen,
  onClose,
  slideTitle = "",
  presentationTopic = "",
  initialQuery,
  slideNumber,
  currentImageUrl,
  onSelectImage
}: ImageSearchModalProps) {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleSearchUrl, setGoogleSearchUrl] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImageUrl || "");

  // Initialize query based on slide
  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || `${slideTitle} ${presentationTopic}`.trim();
      setQuery(q);
      setSelectedUrl(currentImageUrl || "");
      if (q) {
        handleSearch(q);
      }
    }
  }, [isOpen, initialQuery, slideTitle, presentationTopic, currentImageUrl]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/edu/search-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), limit: 12 })
      });

      if (!res.ok) {
        throw new Error("Failed to fetch educational images.");
      }

      const data = await res.json();
      setImages(data.images || []);
      setGoogleSearchUrl(data.googleSearchUrl || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`);
    } catch (err: any) {
      setError(err.message || "Failed to search images.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    onSelectImage(customUrlInput.trim(), "Web / Google Image URL");
    onClose();
  };

  const handleApplySelection = (imgUrl: string, source: string) => {
    onSelectImage(imgUrl, source);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in" onClick={onClose}>
      <div 
        className="max-w-4xl w-full max-h-[90vh] bg-slate-950 rounded-2xl border border-indigo-500/40 p-6 flex flex-col shadow-2xl space-y-4 overflow-hidden text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Google & Web Image Finder</span>
                <span className="text-[10px] uppercase font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Real Educational Photos
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Slide: <span className="text-indigo-300 font-semibold">{slideTitle}</span>
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Direct Google Images Link */}
        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Google / Wikimedia educational images (e.g. Human Heart Diagram, French Revolution Map, Plant Mitosis)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>

            {googleSearchUrl && (
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shrink-0"
                title="Browse Google Images in a new tab"
              >
                <span>Google Images</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}
          </div>
        </form>

        {/* Custom URL Paste Bar */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 shrink-0">
            <Link2 className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">Paste Direct Image URL:</span>
          </div>
          <input
            type="url"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="https://images.google.com/... or any .jpg/.png web link"
            className="flex-1 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
          />
          <button
            type="button"
            onClick={handleApplyCustomUrl}
            disabled={!customUrlInput.trim()}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-lg transition shrink-0 flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply URL</span>
          </button>
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[300px] max-h-[460px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-56 space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Searching real educational images & diagrams...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 space-y-2 text-center text-slate-400">
              <ImageIcon className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No images found for "{query}"</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Try searching with broader educational keywords, or open Google Images directly to copy any image link.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => {
                const isCurrent = selectedUrl === img.url;
                return (
                  <div
                    key={idx}
                    onClick={() => handleApplySelection(img.url, img.source)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col justify-between bg-slate-900 ${
                      isCurrent 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                        : 'border-white/10 hover:border-indigo-400 hover:scale-[1.02]'
                    }`}
                  >
                    <div className="relative w-full h-32 bg-slate-950 overflow-hidden">
                      <img
                        src={img.thumbUrl || img.url}
                        alt={img.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1 bg-indigo-600 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Select
                        </span>
                      </div>
                      {isCurrent && (
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-semibold text-white truncate" title={img.title}>
                        {img.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate flex items-center justify-between">
                        <span>{img.source}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
          <span>Click any image to immediately update the current slide.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

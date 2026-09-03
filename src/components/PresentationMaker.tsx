import React, { useState, useEffect, useRef } from "react";
import { 
  Presentation as PresentationIcon, Sparkles, ChevronLeft, ChevronRight, 
  Maximize2, Minimize2, Copy, Check, FileText, Download, Bookmark, 
  Layers, Eye, RefreshCw, Palette, FileCode, ExternalLink, X,
  PenTool, MousePointer, Play, Pause, Grid, RotateCcw, Image as ImageIcon,
  Eraser, Clock, Sparkle, RefreshCcw, Globe, Edit3, Layout,
  ZoomIn, ZoomOut, MonitorPlay, Tv, HelpCircle, Keyboard, Laptop,
  Columns, PanelsLeftBottom, MoveHorizontal
} from "lucide-react";
import { Presentation, Slide, SavedItem, CustomInstructions } from "../types";
import { compileClipboardText, handleExportToWord, handleExportToPDF, handleExportToPPTX } from "../utils/exportUtils";
import { createGoogleSlideDeck } from "../utils/googleSlidesService";
import SlideGraphicRenderer from "./SlideGraphicRenderer";
import ImageSearchModal from "./ImageSearchModal";

interface PresentationMakerProps {
  savedMaterials: SavedItem[];
  customInstructions: CustomInstructions;
  onSaveItem: (type: 'presentation', title: string, data: Presentation) => void;
  prefillMaterialIds?: string[];
  prefillTopic?: string;
  prefillGrade?: string;
  prefillSlideCount?: number;
}

interface DrawStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export default function PresentationMaker({
  savedMaterials,
  customInstructions,
  onSaveItem,
  prefillMaterialIds = [],
  prefillTopic,
  prefillGrade,
  prefillSlideCount
}: PresentationMakerProps) {
  const [topic, setTopic] = useState(prefillTopic || "");
  const [grade, setGrade] = useState(prefillGrade || "Grade 8");
  const [slideCount, setSlideCount] = useState(prefillSlideCount || 7);
  const [theme, setTheme] = useState("Modern Indigo");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(prefillMaterialIds);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('all');
  const [inlineInstructions, setInlineInstructions] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  
  // Interactive Presenter & Slideshow State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [presenterLayout, setPresenterLayout] = useState<'split' | 'visual-large' | 'text-focus'>('split');
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [activeThemeClass, setActiveThemeClass] = useState("indigo");
  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Laptop-Optimized Layout & Gestures State
  const [filmstripLayout, setFilmstripLayout] = useState<'bottom' | 'side'>('bottom');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [trackpadFeedback, setTrackpadFeedback] = useState<string | null>(null);
  const lastWheelTimeRef = useRef<number>(0);

  // Advanced Slideshow Features State
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 });
  const [isPenActive, setIsPenActive] = useState(false);
  const [penColor, setPenColor] = useState("#ef4444"); // default red
  const [penWidth, setPenWidth] = useState(3);
  const [strokesBySlide, setStrokesBySlide] = useState<{ [slideIdx: number]: DrawStroke[] }>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSlideGrid, setShowSlideGrid] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState(5); // seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [regeneratingSlideIdx, setRegeneratingSlideIdx] = useState<number | null>(null);

  // Google & Web Image Search Modal State
  const [searchImageSlideIdx, setSearchImageSlideIdx] = useState<number | null>(null);
  const [isEditingInline, setIsEditingInline] = useState(false);

  // Custom Image Prompt Modal State
  const [editingImageSlideIdx, setEditingImageSlideIdx] = useState<number | null>(null);
  const [customImagePrompt, setCustomImagePrompt] = useState("");

  // Google Slides Export State
  const [googleSlidesLoading, setGoogleSlidesLoading] = useState(false);
  const [googleSlidesUrl, setGoogleSlidesUrl] = useState<string | null>(null);
  const [googleSlidesError, setGoogleSlidesError] = useState<string | null>(null);

  // Canva Connect OAuth State
  const [canvaConnected, setCanvaConnected] = useState(false);
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [canvaModalOpen, setCanvaModalOpen] = useState(false);
  const [canvaStatusInfo, setCanvaStatusInfo] = useState<{ isConfigured?: boolean; isConnected?: boolean; redirectUri?: string } | null>(null);
  const [canvaFeedback, setCanvaFeedback] = useState<string | null>(null);

  // Canva AI Engine State
  const [useCanvaAi, setUseCanvaAi] = useState(true);
  const [canvaArchetype, setCanvaArchetype] = useState("Canva AI Modern Gradient Pitch");
  const [canvaExportLoading, setCanvaExportLoading] = useState(false);
  const [canvaRemixModalOpen, setCanvaRemixModalOpen] = useState(false);
  const [canvaRemixLoading, setCanvaRemixLoading] = useState(false);
  const [selectedRemixArchetype, setSelectedRemixArchetype] = useState("Canva AI Vibrant Creative Agency");
  const [canvaMagicPromptModalOpen, setCanvaMagicPromptModalOpen] = useState(false);
  const [compiledCanvaMagicPrompt, setCompiledCanvaMagicPrompt] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slideFrameRef = useRef<HTMLDivElement | null>(null);

  // Check Canva connection status and listen for OAuth callback postMessage events
  useEffect(() => {
    fetch("/api/canva/status")
      .then(res => res.json())
      .then(data => {
        setCanvaConnected(Boolean(data.isConnected));
        setCanvaStatusInfo(data);
      })
      .catch(err => console.warn("Failed to query Canva OAuth status:", err));

    const handleOAuthMessage = (event: MessageEvent) => {
      // Validate origin if available
      if (event.data?.type === "CANVA_OAUTH_SUCCESS") {
        setCanvaConnected(true);
        setCanvaLoading(false);
        setCanvaFeedback("Canva account connected successfully! 🎨");
        setTimeout(() => setCanvaFeedback(null), 4000);
      } else if (event.data?.type === "CANVA_OAUTH_ERROR") {
        setCanvaLoading(false);
        setCanvaFeedback(`Canva authentication error: ${event.data.error || "Failed"}`);
        setTimeout(() => setCanvaFeedback(null), 5000);
      } else if (event.data?.type === "CANVA_OAUTH_CODE_RECEIVED") {
        setCanvaLoading(false);
        setCanvaFeedback("Canva code received! Set CANVA_CLIENT_ID & CANVA_CLIENT_SECRET in Secrets.");
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  // Sync native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    }
  };

  const handleEnterFullscreen = async () => {
    setIsFullscreen(true);
    await toggleNativeFullscreen();
  };

  const handleExitFullscreen = async () => {
    setIsFullscreen(false);
    setIsCinemaMode(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.warn("Exit fullscreen error:", err);
      }
    }
  };

  // Lecture Elapsed Timer
  useEffect(() => {
    let timer: any = null;
    if (isFullscreen && isTimerRunning) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isFullscreen, isTimerRunning]);

  // Reset timer on entering fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setIsTimerRunning(true);
    } else {
      setIsAutoPlaying(false);
    }
  }, [isFullscreen]);

  // Auto-play interval
  useEffect(() => {
    let interval: any = null;
    if (isAutoPlaying && presentation && presentation.slides.length > 0) {
      interval = setInterval(() => {
        setCurrentSlideIndex(prev => {
          if (prev >= presentation.slides.length - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, autoPlayInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, autoPlayInterval, presentation]);

  // 🖱️ Laptop Trackpad Gestures (2-Finger Horizontal Swipe & Pinch Zoom)
  useEffect(() => {
    const handleTrackpadGestures = (e: WheelEvent) => {
      if (!presentation || presentation.slides.length === 0) return;

      // Pinch to Zoom (Trackpad ctrlKey gesture standard)
      if (e.ctrlKey) {
        e.preventDefault();
        setZoomScale(prev => {
          const delta = e.deltaY < 0 ? 0.05 : -0.05;
          return Math.min(1.5, Math.max(0.7, Number((prev + delta).toFixed(2))));
        });
        return;
      }

      // Horizontal 2-Finger Swipe (deltaX)
      if (Math.abs(e.deltaX) > 35 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const now = Date.now();
        if (now - lastWheelTimeRef.current > 380) {
          lastWheelTimeRef.current = now;
          if (e.deltaX > 0) {
            // Swipe Left -> Next Slide
            setCurrentSlideIndex(prev => {
              const next = Math.min(presentation.slides.length - 1, prev + 1);
              if (next !== prev) {
                setTrackpadFeedback(`Slide ${next + 1} ➔`);
                setTimeout(() => setTrackpadFeedback(null), 900);
              }
              return next;
            });
          } else {
            // Swipe Right -> Previous Slide
            setCurrentSlideIndex(prev => {
              const next = Math.max(0, prev - 1);
              if (next !== prev) {
                setTrackpadFeedback(`⬅ Slide ${next + 1}`);
                setTimeout(() => setTrackpadFeedback(null), 900);
              }
              return next;
            });
          }
        }
      }
    };

    window.addEventListener('wheel', handleTrackpadGestures, { passive: false });
    return () => window.removeEventListener('wheel', handleTrackpadGestures);
  }, [presentation]);

  // ⌨️ Comprehensive Laptop & Slideshow Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!presentation) return;

      // When typing in an input, don't hijack keys
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.min(presentation.slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(presentation.slides.length - 1);
      } else if (e.key.toLowerCase() === 'f') {
        if (!isFullscreen) {
          handleEnterFullscreen();
        } else {
          handleExitFullscreen();
        }
      } else if (e.key.toLowerCase() === 'c') {
        setIsCinemaMode(prev => !prev);
      } else if (e.key.toLowerCase() === 'l') {
        setIsLaserActive(prev => !prev);
        setIsPenActive(false);
      } else if (e.key.toLowerCase() === 'p') {
        setIsPenActive(prev => !prev);
        setIsLaserActive(false);
      } else if (e.key.toLowerCase() === 'g') {
        setShowSlideGrid(prev => !prev);
      } else if (e.key.toLowerCase() === 'e') {
        setIsEditingInline(prev => !prev);
      } else if (e.key.toLowerCase() === 'i') {
        setSearchImageSlideIdx(currentSlideIndex);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale(prev => Math.min(1.4, prev + 0.1));
      } else if (e.key === '-' || e.key === '_') {
        setZoomScale(prev => Math.max(0.7, prev - 0.1));
      } else if (e.key === '0') {
        setZoomScale(1.0);
      } else if (e.key === 'Escape') {
        if (showShortcutsModal) setShowShortcutsModal(false);
        else if (showSlideGrid) setShowSlideGrid(false);
        else if (editingImageSlideIdx !== null) setEditingImageSlideIdx(null);
        else if (searchImageSlideIdx !== null) setSearchImageSlideIdx(null);
        else if (isFullscreen) handleExitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentation, showSlideGrid, isFullscreen, editingImageSlideIdx, searchImageSlideIdx, showShortcutsModal, currentSlideIndex]);

  // Synchronize dynamic canvas dimensions with slide stage
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const frame = slideFrameRef.current;
      if (!canvas || !frame) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [isFullscreen, currentSlideIndex, zoomScale, presenterLayout]);

  // Redraw Canvas Annotations when slide index or strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const strokes = strokesBySlide[currentSlideIndex] || [];

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [currentSlideIndex, strokesBySlide, isFullscreen, zoomScale]);

  // Pen Drawing Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPenActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    const newStroke: DrawStroke = {
      points: [{ x, y }],
      color: penColor,
      width: penWidth
    };

    setStrokesBySlide(prev => ({
      ...prev,
      [currentSlideIndex]: [...(prev[currentSlideIndex] || []), newStroke]
    }));
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isLaserActive) {
      setLaserPos({ x, y });
    }

    if (!isDrawing || !isPenActive) return;

    setStrokesBySlide(prev => {
      const currentStrokes = [...(prev[currentSlideIndex] || [])];
      if (currentStrokes.length === 0) return prev;
      const lastStroke = { ...currentStrokes[currentStrokes.length - 1] };
      lastStroke.points = [...lastStroke.points, { x, y }];
      currentStrokes[currentStrokes.length - 1] = lastStroke;
      return { ...prev, [currentSlideIndex]: currentStrokes };
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearSlideDrawings = () => {
    setStrokesBySlide(prev => ({
      ...prev,
      [currentSlideIndex]: []
    }));
  };

  const handleUndoDrawing = () => {
    setStrokesBySlide(prev => {
      const currentStrokes = [...(prev[currentSlideIndex] || [])];
      if (currentStrokes.length === 0) return prev;
      currentStrokes.pop();
      return { ...prev, [currentSlideIndex]: currentStrokes };
    });
  };

  // Regenerate an individual slide's AI image
  const handleRegenerateSlideImage = async (slideIdx: number, customPrompt?: string) => {
    if (!presentation || !presentation.slides[slideIdx]) return;
    setRegeneratingSlideIdx(slideIdx);
    try {
      const targetSlide = presentation.slides[slideIdx];
      const res = await fetch("/api/edu/regenerate-slide-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideTitle: targetSlide.title,
          presentationTopic: presentation.title,
          customPrompt: customPrompt || targetSlide.imagePrompt,
          style: "clean photorealistic educational textbook photography, 4k"
        })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setPresentation(prev => {
          if (!prev) return null;
          const updatedSlides = [...prev.slides];
          updatedSlides[slideIdx] = {
            ...updatedSlides[slideIdx],
            imageUrl: data.imageUrl,
            imagePrompt: customPrompt || updatedSlides[slideIdx].imagePrompt
          };
          return { ...prev, slides: updatedSlides };
        });
      }
    } catch (err) {
      console.error("Failed to regenerate slide image:", err);
    } finally {
      setRegeneratingSlideIdx(null);
      setEditingImageSlideIdx(null);
    }
  };

  // Apply Google / Web Image selection
  const handleApplyImageFromSearch = (imageUrl: string, imageSource?: string) => {
    if (searchImageSlideIdx === null || !presentation) return;
    const targetIdx = searchImageSlideIdx;
    setPresentation(prev => {
      if (!prev) return null;
      const updatedSlides = [...prev.slides];
      updatedSlides[targetIdx] = {
        ...updatedSlides[targetIdx],
        imageUrl,
        imageSource: imageSource || "Google / Web Image"
      };
      return { ...prev, slides: updatedSlides };
    });
    setSearchImageSlideIdx(null);
  };

  // Update slide content directly
  const handleUpdateSlideField = (slideIdx: number, field: string, value: any) => {
    if (!presentation || !presentation.slides[slideIdx]) return;
    setPresentation(prev => {
      if (!prev) return null;
      const updatedSlides = [...prev.slides];
      updatedSlides[slideIdx] = {
        ...updatedSlides[slideIdx],
        [field]: value
      };
      return { ...prev, slides: updatedSlides };
    });
  };

  const handleExportGoogleSlides = async () => {
    if (!presentation) return;
    setGoogleSlidesLoading(true);
    setGoogleSlidesError(null);
    try {
      const res = await createGoogleSlideDeck(presentation);
      setGoogleSlidesUrl(res.presentationUrl);
    } catch (err: any) {
      console.error("Google Slides export error:", err);
      setGoogleSlidesError(err.message || "Failed to create presentation in Google Slides.");
    } finally {
      setGoogleSlidesLoading(false);
    }
  };

  useEffect(() => {
    if (prefillTopic) setTopic(prefillTopic);
    if (prefillGrade) setGrade(prefillGrade);
    if (prefillSlideCount) setSlideCount(prefillSlideCount);

    if (prefillMaterialIds.length > 0) {
      setSelectedMaterialIds(prefillMaterialIds);
      const firstMat = savedMaterials.find(m => prefillMaterialIds.includes(m.id));
      if (firstMat && !topic && !prefillTopic) {
        setTopic(firstMat.title);
      }
    }
  }, [prefillMaterialIds, prefillTopic, prefillGrade, prefillSlideCount, savedMaterials]);

  const toggleMaterialSelection = (id: string) => {
    setSelectedMaterialIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const filteredSavedMaterials = savedMaterials.filter(mat => {
    if (materialCategoryFilter === 'textbook') return mat.type === 'scanned-chapter';
    if (materialCategoryFilter === 'notebook') return mat.type === 'notebook';
    if (materialCategoryFilter === 'exam') return ['worksheet', 'question-paper', 'slip-test', 'quiz'].includes(mat.type);
    if (materialCategoryFilter === 'plan') return ['lesson-plan', 'revision', 'study-plan'].includes(mat.type);
    return true;
  });

  const compileSourceContent = () => {
    if (selectedMaterialIds.length === 0) return "";
    return selectedMaterialIds
      .map(id => {
        const mat = savedMaterials.find(m => m.id === id);
        if (!mat) return "";
        return `[Material: ${mat.title} (${mat.type})]\n${compileClipboardText(mat)}`;
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && selectedMaterialIds.length === 0) {
      setError("Please enter a presentation topic or select at least one material from your saved library.");
      return;
    }

    setLoading(true);
    setError(null);
    setPresentation(null);
    setStrokesBySlide({});

    try {
      const sourceContent = compileSourceContent();
      const combinedInstructions = [customInstructions.presentation, customInstructions.generalTone, inlineInstructions].filter(Boolean).join("\n\n");

      const res = await fetch("/api/edu/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || (selectedMaterialIds.length > 0 ? "Saved Material Presentation" : "Educational Lesson"),
          sourceContent,
          grade,
          slideCount,
          theme: useCanvaAi ? canvaArchetype : theme,
          useCanvaAi,
          canvaArchetype: useCanvaAi ? canvaArchetype : undefined,
          customInstructions: combinedInstructions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate presentation slides.");

      setPresentation(data);
      setCurrentSlideIndex(0);
    } catch (err: any) {
      setError(err.message || "Something went wrong while generating presentation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!presentation) return;
    onSaveItem('presentation', presentation.title, presentation);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleCopy = () => {
    if (!presentation) return;
    const text = compileClipboardText({ type: 'presentation', title: presentation.title, data: presentation });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportToCanva = async () => {
    if (!presentation) return;
    setCanvaExportLoading(true);
    setCanvaFeedback(null);
    try {
      const res = await fetch("/api/canva/export-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to export presentation to Canva.");
      
      const targetUrl = data.editUrl || data.canvaDesignUrl;
      if (targetUrl) {
        window.open(targetUrl, "_blank");
        setCanvaFeedback(data.connected ? "Exported & opened in your Canva account!" : "Opened in Canva Design Studio!");
        setTimeout(() => setCanvaFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error("Canva export error:", err);
      setCanvaFeedback(err.message || "Failed to export to Canva.");
    } finally {
      setCanvaExportLoading(false);
    }
  };

  const handleCanvaRemix = async () => {
    if (!presentation) return;
    setCanvaRemixLoading(true);
    try {
      const res = await fetch("/api/canva/remix-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentation,
          targetArchetype: selectedRemixArchetype
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remix Canva style.");
      setPresentation(data);
      setCanvaRemixModalOpen(false);
      setCanvaFeedback(`Remixed presentation styling with ${selectedRemixArchetype}!`);
      setTimeout(() => setCanvaFeedback(null), 3500);
    } catch (err: any) {
      console.error("Canva remix error:", err);
      alert(err.message || "Failed to remix Canva styling.");
    } finally {
      setCanvaRemixLoading(false);
    }
  };

  const handleLaunchCanvaMagicStudio = async (customTopic?: string) => {
    const t = customTopic || topic || (presentation ? presentation.title : "Educational Presentation");
    try {
      const res = await fetch("/api/canva/magic-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: t,
          grade,
          slideCount,
          theme: useCanvaAi ? canvaArchetype : theme,
          customInstructions
        })
      });
      const data = await res.json();
      if (data.magicPrompt) {
        navigator.clipboard.writeText(data.magicPrompt);
        setCompiledCanvaMagicPrompt(data.magicPrompt);
        setCanvaFeedback("Canva AI Magic Prompt copied! Opening Canva Presentation Studio... 🎨");
        setTimeout(() => setCanvaFeedback(null), 4000);
      }
      const targetUrl = data.directCreateUrl || `https://www.canva.com/design?create=presentation&category=presentation&topic=${encodeURIComponent(t)}`;
      window.open(targetUrl, "_blank");
    } catch (e) {
      window.open(`https://www.canva.com/design?create=presentation&category=presentation&topic=${encodeURIComponent(t)}`, "_blank");
    }
  };

  const handleShowCanvaMagicPrompt = async () => {
    const t = (presentation ? presentation.title : topic) || "Educational Presentation";
    try {
      const res = await fetch("/api/canva/magic-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: t,
          grade,
          slideCount: presentation ? presentation.slides.length : slideCount,
          theme: presentation?.theme || (useCanvaAi ? canvaArchetype : theme),
          customInstructions
        })
      });
      const data = await res.json();
      setCompiledCanvaMagicPrompt(data.magicPrompt || "");
      setCanvaMagicPromptModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectCanva = async () => {
    setCanvaLoading(true);
    setCanvaFeedback(null);
    try {
      const res = await fetch("/api/canva/auth-url");
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        setCanvaModalOpen(true);
        throw new Error(data.error || "Canva credentials need to be configured.");
      }
      const width = 600;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.authUrl,
        "canva_oauth_popup",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      if (!popup) {
        alert("Popup blocked! Please allow popups for Canva Connect authorization.");
      }
    } catch (err: any) {
      console.warn("Canva auth error:", err);
      setCanvaFeedback(err.message);
    } finally {
      setCanvaLoading(false);
    }
  };

  const handleDisconnectCanva = async () => {
    try {
      await fetch("/api/canva/disconnect", { method: "POST" });
      setCanvaConnected(false);
      setCanvaFeedback("Canva disconnected.");
      setTimeout(() => setCanvaFeedback(null), 3000);
    } catch (err) {
      console.warn(err);
    }
  };

  // Generate rich standalone HTML presentation deck
  const generateStandaloneViewerHTML = (pres: Presentation, themeName: string) => {
    const slidesJSON = JSON.stringify(pres.slides);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pres.title} - Interactive Slideshow</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #020617; color: #f8fafc; overflow-x: hidden; }
    .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
  </style>
</head>
<body class="flex flex-col h-screen w-screen justify-between p-3 md:p-5 select-none bg-slate-950">
  <!-- Top Bar -->
  <header class="flex justify-between items-center border-b border-white/10 pb-2.5 z-20">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-indigo-600 rounded-xl text-white font-bold text-xs">PPT</div>
      <div>
        <h1 class="text-sm md:text-lg font-extrabold text-white truncate max-w-lg">${pres.title}</h1>
        <p class="text-[11px] text-slate-400 font-mono" id="slideCounter">Slide 1 of ${pres.slides.length}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="toggleHelp()" class="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 text-slate-300">
        <span>⌨️ Shortcuts (?)</span>
      </button>
      <button onclick="toggleFS()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md">
        ⛶ Fullscreen (F)
      </button>
    </div>
  </header>

  <!-- Slide Stage -->
  <main class="relative flex-1 flex items-center justify-center p-2 my-auto overflow-hidden">
    <!-- Left click area -->
    <button onclick="prevSlide()" class="absolute left-2 z-30 p-3 bg-black/50 hover:bg-indigo-600 rounded-full text-white/70 hover:text-white backdrop-blur transition border border-white/10 shadow-xl">
      ◀
    </button>
    <!-- Right click area -->
    <button onclick="nextSlide()" class="absolute right-2 z-30 p-3 bg-black/50 hover:bg-indigo-600 rounded-full text-white/70 hover:text-white backdrop-blur transition border border-white/10 shadow-xl">
      ▶
    </button>

    <!-- Slide Frame -->
    <div id="slideContent" class="w-full max-w-[1400px] aspect-[16/9] max-h-[82vh] bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col justify-between overflow-hidden relative">
      <!-- Injected by JS -->
    </div>
  </main>

  <!-- Trackpad Feedback Toast -->
  <div id="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl transition-opacity duration-300 opacity-0 pointer-events-none z-50">
    Slide
  </div>

  <!-- Shortcuts Modal -->
  <div id="helpModal" class="fixed inset-0 z-50 bg-black/85 backdrop-blur flex items-center justify-center p-4 hidden" onclick="toggleHelp()">
    <div class="max-w-md w-full bg-slate-900 border border-white/20 rounded-2xl p-6 shadow-2xl text-white space-y-4" onclick="e => e.stopPropagation()">
      <div class="flex justify-between items-center border-b border-white/10 pb-2">
        <h3 class="font-bold text-base">💻 Laptop & Presentation Controls</h3>
        <button onclick="toggleHelp()" class="text-slate-400 hover:text-white">✕</button>
      </div>
      <div class="space-y-2 text-xs text-slate-300">
        <div class="flex justify-between py-1 border-b border-white/5"><span class="font-mono text-indigo-300">2-Finger Trackpad Swipe</span><span>Previous / Next Slide</span></div>
        <div class="flex justify-between py-1 border-b border-white/5"><span class="font-mono text-indigo-300">← / → or Space</span><span>Navigate Slides</span></div>
        <div class="flex justify-between py-1 border-b border-white/5"><span class="font-mono text-indigo-300">Home / End</span><span>First / Last Slide</span></div>
        <div class="flex justify-between py-1 border-b border-white/5"><span class="font-mono text-indigo-300">F</span><span>Toggle Fullscreen</span></div>
        <div class="flex justify-between py-1"><span class="font-mono text-indigo-300">?</span><span>Toggle this help</span></div>
      </div>
    </div>
  </div>

  <!-- Bottom Bar -->
  <footer class="flex justify-between items-center pt-2.5 border-t border-white/10 z-20">
    <button id="prevBtn" onclick="prevSlide()" class="px-5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl text-xs font-bold transition">
      ← Previous
    </button>
    <div id="dotsBar" class="flex items-center gap-1.5 overflow-x-auto max-w-md px-2"></div>
    <button id="nextBtn" onclick="nextSlide()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition">
      Next →
    </button>
  </footer>

  <script>
    const slides = ${slidesJSON};
    let index = 0;
    let lastWheel = 0;

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.remove('opacity-0');
      setTimeout(() => t.classList.add('opacity-0'), 800);
    }

    function toggleHelp() {
      const modal = document.getElementById('helpModal');
      modal.classList.toggle('hidden');
    }

    function render() {
      const s = slides[index];
      document.getElementById('slideCounter').innerText = 'Slide ' + (index + 1) + ' of ' + slides.length;
      document.getElementById('prevBtn').disabled = index === 0;
      document.getElementById('nextBtn').disabled = index === slides.length - 1;

      // Update dots
      const dotsEl = document.getElementById('dotsBar');
      dotsEl.innerHTML = slides.map((_, i) => 
        '<button onclick="jumpTo(' + i + ')" class="h-2.5 rounded-full transition-all ' + (i === index ? 'w-8 bg-indigo-500' : 'w-2.5 bg-white/20 hover:bg-white/40') + '"></button>'
      ).join('');

      let html = '<div class="flex items-center justify-between mb-3 shrink-0"><span class="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Slide ' + (s.slideNumber || index + 1) + '</span>';
      if (s.keyTakeaway) {
        html += '<span class="text-xs italic font-medium bg-black/40 px-3 py-1 rounded-xl border border-white/10 text-amber-300">💡 ' + s.keyTakeaway + '</span>';
      }
      html += '</div>';

      html += '<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 min-h-0 overflow-y-auto custom-scroll pr-1">';
      html += '<div class="lg:col-span-7 space-y-3">';
      html += '<h2 class="text-2xl md:text-4xl font-extrabold text-white leading-tight">' + s.title + '</h2>';
      if (s.subtitle) html += '<p class="text-sm md:text-base text-indigo-300 italic">' + s.subtitle + '</p>';
      
      html += '<ul class="space-y-2.5 my-4 text-sm md:text-base text-slate-200">';
      if (s.bulletPoints) {
        s.bulletPoints.forEach(bp => {
          html += '<li class="flex items-start gap-2.5"><span class="text-indigo-400 mt-1 font-bold">•</span><span class="leading-relaxed">' + bp + '</span></li>';
        });
      }
      html += '</ul>';
      html += '</div>';

      html += '<div class="lg:col-span-5 flex flex-col items-center justify-center min-h-[200px]">';
      if (s.imageUrl) {
        html += '<img src="' + s.imageUrl + '" alt="' + s.title + '" class="w-full max-h-72 object-cover rounded-xl border border-white/15 shadow-xl" />';
      }
      if (s.visualDescription) {
        html += '<p class="mt-2 text-xs text-slate-400 italic text-center max-w-sm">"' + s.visualDescription + '"</p>';
      }
      html += '</div></div>';

      document.getElementById('slideContent').innerHTML = html;
    }

    function prevSlide() { if (index > 0) { index--; render(); } }
    function nextSlide() { if (index < slides.length - 1) { index++; render(); } }
    function jumpTo(i) { index = i; render(); }
    function toggleFS() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') nextSlide();
      if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') prevSlide();
      if (e.key === 'Home') jumpTo(0);
      if (e.key === 'End') jumpTo(slides.length - 1);
      if (e.key.toLowerCase() === 'f') toggleFS();
      if (e.key === '?' || (e.shiftKey && e.key === '/')) toggleHelp();
    });

    // Touchpad 2-finger horizontal swipe
    window.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > 35 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const now = Date.now();
        if (now - lastWheel > 380) {
          lastWheel = now;
          if (e.deltaX > 0) {
            if (index < slides.length - 1) {
              nextSlide();
              showToast('Slide ' + (index + 1) + ' ➔');
            }
          } else {
            if (index > 0) {
              prevSlide();
              showToast('⬅ Slide ' + (index + 1));
            }
          }
        }
      }
    }, { passive: false });

    render();
  </script>
</body>
</html>`;
  };

  // Open standalone presentation viewer in new tab
  const handleOpenStandaloneViewer = () => {
    if (!presentation) return;
    const html = generateStandaloneViewerHTML(presentation, activeThemeClass);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Downloadable standalone HTML presentation
  const handleDownloadHTML = () => {
    if (!presentation) return;
    const htmlContent = generateStandaloneViewerHTML(presentation, activeThemeClass);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presentation.title.replace(/\s+/g, '_')}_Presentation.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getThemeStyles = () => {
    switch (activeThemeClass) {
      case "emerald":
        return {
          bg: "bg-emerald-950/90 border-emerald-500/30 text-emerald-50",
          heading: "text-emerald-300",
          bulletIcon: "text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          notesBg: "bg-emerald-900/40 border-emerald-500/20 text-emerald-200"
        };
      case "dark":
        return {
          bg: "bg-slate-950 border-slate-800 text-slate-100",
          heading: "text-cyan-400",
          bulletIcon: "text-cyan-400",
          badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
          notesBg: "bg-slate-900 border-slate-800 text-slate-300"
        };
      case "amber":
        return {
          bg: "bg-amber-950/90 border-amber-500/30 text-amber-50",
          heading: "text-amber-300",
          bulletIcon: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          notesBg: "bg-amber-900/40 border-amber-500/20 text-amber-200"
        };
      case "white":
        return {
          bg: "bg-slate-50 border-slate-300 text-slate-900",
          heading: "text-indigo-900",
          bulletIcon: "text-indigo-600",
          badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
          notesBg: "bg-slate-200/80 border-slate-300 text-slate-800"
        };
      default: // indigo
        return {
          bg: "bg-slate-900/95 border-indigo-500/30 text-slate-100",
          heading: "text-indigo-300",
          bulletIcon: "text-indigo-400",
          badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
          notesBg: "bg-indigo-950/60 border-indigo-500/20 text-indigo-200"
        };
    }
  };

  const currentTheme = getThemeStyles();
  const activeSlide = presentation?.slides?.[currentSlideIndex] || null;

  // Format Elapsed Time MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in" id="presentation_maker_container">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 border border-indigo-500/30 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
              <PresentationIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Presentation & Slides Studio
                <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Visuals & Diagrams
                </span>
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                Generate high-resolution visual slide decks with real topic images, interactive diagrams, presenter laser pointer, and 1:1 PowerPoint export.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Presentation Creation Form */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl space-y-6">
        <form onSubmit={handleGenerate} className="space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Topic Input */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Presentation Topic / Lesson Title *
              </label>
              <input
                id="input_ppt_topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis: Light & Dark Reactions, The Solar System, Calculus Integrals"
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950 text-white placeholder-slate-500"
              />
            </div>

            {/* Target Grade Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Target Grade Level
              </label>
              <select
                id="select_ppt_grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950 text-white"
              >
                <option value="Elementary (Grades 1-5)">Elementary (Grades 1-5)</option>
                <option value="Middle School (Grades 6-8)">Middle School (Grades 6-8)</option>
                <option value="High School (Grades 9-12)">High School (Grades 9-12)</option>
                <option value="Undergraduate / College">Undergraduate / College</option>
                <option value="Graduate / Professional">Graduate / Professional</option>
              </select>
            </div>
          </div>

          {/* Integrate Canva AI Engine Mode Section */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            useCanvaAi 
              ? 'bg-gradient-to-r from-teal-950/70 via-slate-900/90 to-purple-950/70 border-teal-500/40 shadow-lg shadow-teal-500/10' 
              : 'bg-slate-950/60 border-white/10'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md font-extrabold text-sm tracking-wider">
                  CA
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      Integrate Canva AI
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {useCanvaAi ? 'Canva AI Active' : 'EduOS Standard'}
                      </span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate slides with Canva AI layouts (Bento grids, hero splits), custom hex palettes, Canva element tags &amp; 1-click export to Canva.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  id="toggle_integrate_canva_ai"
                  checked={useCanvaAi}
                  onChange={(e) => setUseCanvaAi(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-teal-500 peer-checked:to-purple-600"></div>
                <span className="ml-2.5 text-xs font-semibold text-white">
                  {useCanvaAi ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            {useCanvaAi && (
              <div className="pt-3 space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-300 uppercase tracking-wider mb-1">
                      Canva AI Design Archetype
                    </label>
                    <select
                      id="select_canva_archetype"
                      value={canvaArchetype}
                      onChange={(e) => setCanvaArchetype(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-teal-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-950 text-white font-medium"
                    >
                      <option value="Canva AI Modern Gradient Pitch">🔮 Modern Gradient Pitch (Vibrant Tech Gradients & Bento Cards)</option>
                      <option value="Canva AI Minimalist Editorial">📰 Minimalist Editorial (Refined Typography & Clean Grid)</option>
                      <option value="Canva AI Vibrant Creative Agency">🎨 Vibrant Creative Agency (Bold Pop Accents & Visual Tags)</option>
                      <option value="Canva AI Cyberpunk & Dark Tech">⚡ Cyberpunk & Dark Tech (Neon Glow Accents & Metric Cards)</option>
                      <option value="Canva AI Pastel Classroom Storyboard">🌸 Pastel Classroom Storyboard (Soft Educational Aesthetics)</option>
                      <option value="Canva AI Corporate Executive Brief">🏛️ Corporate Executive Brief (Navy & Gold Formal Brief)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Canva AI Features Included
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300">
                        ✨ Bento Grids
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300">
                        🎨 6-Color Palettes
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                        🏷️ Canva Element Tags
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300">
                        🚀 1-Click Canva Studio
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Slide Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Slide Count ({slideCount} slides)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="range_ppt_slide_count"
                  type="range"
                  min={4}
                  max={15}
                  value={slideCount}
                  onChange={(e) => setSlideCount(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-500/30">
                  {slideCount}
                </span>
              </div>
            </div>

            {/* Slide Visual Theme */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {useCanvaAi ? "Theme Accent" : "Presentation Theme Style"}
              </label>
              <select
                id="select_ppt_theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                disabled={useCanvaAi}
                className={`w-full px-3 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950 text-white ${
                  useCanvaAi ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="Academic Clean">Academic Clean (Light & Sharp)</option>
                <option value="Modern Indigo">Modern Indigo (Tech & Visual)</option>
                <option value="Emerald Botanical">Emerald Botanical (Nature & Science)</option>
                <option value="Sunset Warmth">Sunset Warmth (History & Humanities)</option>
                <option value="Midnight Cyber">Midnight Cyber (Dark High-Contrast)</option>
                <option value="Ocean Deep">Ocean Deep (Azure Blue)</option>
              </select>
            </div>
          </div>

          {/* Library Materials Selector */}
          {savedMaterials.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Synthesize from Saved Library Materials ({selectedMaterialIds.length} selected)
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs">
                  {['all', 'textbook', 'notebook', 'exam'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMaterialCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        materialCategoryFilter === cat 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat === 'textbook' ? 'Chapters' : cat === 'notebook' ? 'Notebooks' : 'Exams'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {filteredSavedMaterials.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 text-center">
                    No saved materials match this category.
                  </p>
                ) : (
                  filteredSavedMaterials.map((mat) => {
                    const isChecked = selectedMaterialIds.includes(mat.id);
                    const textSnippet = compileClipboardText(mat).slice(0, 120);
                    return (
                      <label
                        key={mat.id}
                        className={`flex items-start justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-indigo-950/90 border-indigo-500/70 text-white shadow-md' 
                            : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMaterialSelection(mat.id)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                          />
                          <div className="space-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white truncate">{mat.title}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                                mat.type === 'scanned-chapter' 
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                  : mat.type === 'notebook'
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                                  : 'bg-slate-800 text-slate-300 border-white/10'
                              }`}>
                                {mat.type === 'scanned-chapter' ? '📖 Textbook Chapter' : mat.type === 'notebook' ? '📓 Notebook' : mat.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                              "{textSnippet}..."
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">{mat.date}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Custom Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Custom Slide & Visual Instructions (Optional)
            </label>
            <textarea
              id="input_ppt_custom_instructions"
              value={inlineInstructions}
              onChange={(e) => setInlineInstructions(e.target.value)}
              placeholder="e.g. Include photorealistic scientific diagrams, keep bullets under 10 words, add real-world analogies"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950 text-white placeholder-slate-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">⚠️ {error}</span>
              <button
                type="button"
                onClick={(e) => handleGenerate(e)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Direct Canva Magic Design Launcher Button */}
            <button
              id="btn_ppt_direct_canva_magic"
              type="button"
              onClick={() => handleLaunchCanvaMagicStudio()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-teal-500/40 text-teal-300 font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all transform hover:scale-[1.01]"
              title="Open Canva's official Magic AI Presentation Maker directly"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Open in Canva Magic Design AI</span>
              <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            </button>

            <button
              id="btn_ppt_generate"
              type="submit"
              disabled={loading}
              className={`px-6 py-3 text-white font-semibold text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:scale-[1.01] disabled:opacity-50 ${
                useCanvaAi 
                  ? 'bg-gradient-to-r from-teal-500 via-indigo-600 to-purple-600 hover:from-teal-400 hover:via-indigo-500 hover:to-purple-500 shadow-teal-500/20' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Designing Slides with Canva AI Engine...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-200" />
                  <span>{useCanvaAi ? "Generate PPT with Canva AI" : "Generate PPT Presentation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Presentation Results & Interactive Presenter View */}
      {presentation && activeSlide && (
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-indigo-500/30 p-6 shadow-2xl space-y-6 animate-fade-in" id="presentation_result_viewer">
          
          {/* Deck Action Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  {presentation.totalSlides} Slides
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>AI Images Included</span>
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                {presentation.title}
              </h3>
              {presentation.subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{presentation.subtitle}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              
              {/* PowerPoint (.pptx) Native Download Button */}
              <button
                id="btn_ppt_export_pptx"
                onClick={() => handleExportToPPTX(presentation)}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all transform hover:scale-[1.02]"
                title="Download PowerPoint Presentation with Embedded Images"
              >
                <PresentationIcon className="w-4 h-4 text-orange-200" />
                <span>Download PowerPoint (.pptx)</span>
                <Download className="w-3.5 h-3.5 text-orange-200" />
              </button>

              {/* Google Slides Export Button */}
              <button
                id="btn_ppt_export_google_slides"
                onClick={handleExportGoogleSlides}
                disabled={googleSlidesLoading}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50"
                title="Create Google Slides Presentation in Google Drive"
              >
                {googleSlidesLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <PresentationIcon className="w-4 h-4 text-slate-950" />
                    <span>Google Slides</span>
                    <ExternalLink className="w-3 h-3 text-slate-800" />
                  </>
                )}
              </button>

              {/* Fullscreen Slideshow Mode */}
              <button
                id="btn_ppt_fullscreen"
                onClick={handleEnterFullscreen}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all transform hover:scale-[1.02]"
                title="Launch Fullscreen Slideshow (F)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-purple-200" />
                <span>Present Fullscreen (F)</span>
              </button>

              {/* Open in Standalone New Tab */}
              <button
                id="btn_ppt_open_new_tab"
                onClick={handleOpenStandaloneViewer}
                className="px-3.5 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Open Presentation in Separate Browser Tab"
              >
                <Tv className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open in Tab</span>
                <ExternalLink className="w-3 h-3 text-indigo-400" />
              </button>

              {/* Slide Grid Overview */}
              <button
                type="button"
                onClick={() => setShowSlideGrid(true)}
                className="p-2 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition"
                title="Slide Grid Overview (G)"
              >
                <Grid className="w-4 h-4" />
              </button>

              {/* Open & Edit in Canva Studio */}
              <button
                id="btn_ppt_export_canva"
                onClick={handleExportToCanva}
                disabled={canvaExportLoading}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 via-indigo-600 to-purple-600 hover:from-teal-400 hover:via-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50"
                title="Export and Open presentation directly in Canva Studio"
              >
                {canvaExportLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Opening Canva...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                    <span>Open in Canva AI</span>
                    <ExternalLink className="w-3 h-3 text-purple-200" />
                  </>
                )}
              </button>

              {/* Canva AI Remix Style */}
              <button
                id="btn_ppt_canva_remix"
                onClick={() => setCanvaRemixModalOpen(true)}
                className="px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                title="Remix slide styles and bento layouts with Canva AI Archetypes"
              >
                <Palette className="w-3.5 h-3.5 text-purple-300" />
                <span>Canva AI Remix</span>
              </button>

              {/* Canva Magic Prompt Helper */}
              <button
                id="btn_ppt_canva_magic_prompt"
                onClick={handleShowCanvaMagicPrompt}
                className="px-3.5 py-2 bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                title="View & copy formatted prompt for Canva Magic Write & Magic Design"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>Canva Magic Prompt</span>
              </button>

              {/* Canva Connect / Status Button */}
              <button
                id="btn_ppt_canva"
                onClick={() => {
                  if (canvaConnected) {
                    setCanvaModalOpen(true);
                  } else {
                    handleConnectCanva();
                  }
                }}
                disabled={canvaLoading}
                className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                  canvaConnected
                    ? 'bg-gradient-to-r from-teal-500/25 to-purple-500/25 border border-teal-400/50 text-teal-200 hover:border-teal-300'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
                }`}
                title={canvaConnected ? "Canva Account Linked (Click to Manage)" : "Connect Canva account"}
              >
                <div className={`w-2 h-2 rounded-full ${canvaConnected ? 'bg-teal-400 animate-pulse' : 'bg-slate-400'}`} />
                <span>{canvaLoading ? "Connecting..." : canvaConnected ? "Canva Linked" : "Connect Canva"}</span>
              </button>

              {/* Interactive HTML Deck Download */}
              <button
                id="btn_ppt_download_html"
                onClick={handleDownloadHTML}
                className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Download Standalone HTML Slide Deck"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-300" />
                <span>HTML Deck</span>
              </button>

              {/* PDF Export */}
              <button
                id="btn_ppt_export_pdf"
                onClick={() => handleExportToPDF({ type: 'presentation', title: presentation.title, data: presentation })}
                className="px-3 py-2 border border-rose-500/30 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Export PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF</span>
              </button>

              {/* Word Export */}
              <button
                id="btn_ppt_export_word"
                onClick={() => handleExportToWord({ type: 'presentation', title: presentation.title, data: presentation })}
                className="px-3 py-2 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Export Word"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Word</span>
              </button>

              {/* Copy Clipboard */}
              <button
                id="btn_ppt_copy"
                onClick={handleCopy}
                className="p-2 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                title="Copy Slide Deck Text"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Save to Library */}
              <button
                id="btn_ppt_save_library"
                onClick={handleSave}
                className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                  savedFeedback
                    ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{savedFeedback ? "Saved!" : "Save"}</span>
              </button>
            </div>
          </div>

          {/* Google Slides Created Banner */}
          {googleSlidesUrl && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0">
                  <PresentationIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-100 text-sm">Created in Google Slides!</h4>
                  <p className="text-xs text-amber-300/90">
                    Your presentation deck was built and saved to your Google Drive account.
                  </p>
                </div>
              </div>
              <a
                href={googleSlidesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-lg shadow-amber-500/30 transition-all"
              >
                <span>Open in Google Slides</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {googleSlidesError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>{googleSlidesError}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleExportToPPTX(presentation)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-medium transition-colors"
                >
                  Download .pptx Instead
                </button>
                <button
                  onClick={() => setGoogleSlidesError(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Canva Connect Status / Feedback Banner */}
          {canvaFeedback && (
            <div className="p-3.5 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-200 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span>{canvaFeedback}</span>
              </div>
              <button
                onClick={() => setCanvaFeedback(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Slide Stage Controls & Quick Tools Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-slate-900/60 p-2.5 sm:p-3 rounded-2xl border border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-400 hidden sm:inline">Theme:</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'indigo', name: 'Indigo', color: 'bg-indigo-600' },
                    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-600' },
                    { id: 'amber', name: 'Amber', color: 'bg-amber-600' },
                    { id: 'dark', name: 'Dark Cyber', color: 'bg-slate-900 border border-slate-700' },
                    { id: 'white', name: 'Light Paper', color: 'bg-slate-200' }
                  ].map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setActiveThemeClass(th.id)}
                      className={`px-2 py-1 rounded-lg flex items-center gap-1.5 border transition-all ${
                        activeThemeClass === th.id 
                          ? 'border-indigo-400 bg-indigo-500/20 text-white font-semibold' 
                          : 'border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${th.color}`} />
                      <span className="hidden md:inline">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Laptop Dock Toggle (Side Dock vs Bottom Filmstrip) */}
              <button
                type="button"
                onClick={() => setFilmstripLayout(prev => prev === 'bottom' ? 'side' : 'bottom')}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition ${
                  filmstripLayout === 'side'
                    ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
                title="Toggle Laptop Widescreen Side Dock vs Bottom Filmstrip"
              >
                {filmstripLayout === 'side' ? <Columns className="w-3.5 h-3.5 text-indigo-400" /> : <PanelsLeftBottom className="w-3.5 h-3.5 text-indigo-400" />}
                <span className="hidden sm:inline">{filmstripLayout === 'side' ? 'Side Dock' : 'Bottom Strip'}</span>
              </button>

              {/* Laptop Shortcuts Help Cheatsheet */}
              <button
                type="button"
                onClick={() => setShowShortcutsModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition"
                title="Laptop Gestures & Shortcuts (?)"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-300" />
                <span className="hidden md:inline">Shortcuts</span>
                <span className="text-[10px] font-mono bg-white/10 px-1 py-0.2 rounded text-slate-400">?</span>
              </button>

              {/* Google & Web Image Finder Button */}
              <button
                type="button"
                id="btn_search_google_images"
                onClick={() => setSearchImageSlideIdx(currentSlideIndex)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 font-bold flex items-center gap-1.5 text-xs transition shadow-sm"
                title="Search Google Images & Wikimedia for real educational photos & diagrams"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Search Google Images</span>
                <span className="sm:hidden">Images</span>
              </button>

              {/* Customize AI Visual Prompt */}
              <button
                type="button"
                onClick={() => setEditingImageSlideIdx(currentSlideIndex)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 text-xs transition"
                title="Generate custom AI illustration prompt"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">AI Visual Prompt</span>
              </button>

              {/* Inline Edit Slide Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsEditingInline(prev => !prev)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition ${
                  isEditingInline
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
                title="Click to edit slide text directly (E)"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingInline ? 'Done' : 'Edit Slide'}</span>
              </button>
            </div>
          </div>

          {/* Trackpad Gesture Floating Feedback Toast */}
          {trackpadFeedback && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl z-50 animate-bounce flex items-center gap-2 border border-indigo-400/50">
              <Laptop className="w-3.5 h-3.5" />
              <span>{trackpadFeedback} (Trackpad Gesture)</span>
            </div>
          )}

          {/* Main Slide Workspace (Responsive Side Dock vs Stacked Layout) */}
          <div className={`w-full flex ${filmstripLayout === 'side' ? 'flex-col lg:flex-row gap-4' : 'flex-col gap-4'}`}>
            
            {/* Widescreen Laptop Side Dock Filmstrip */}
            {filmstripLayout === 'side' && (
              <div className="w-full lg:w-48 xl:w-56 shrink-0 bg-slate-900/60 p-2 rounded-2xl border border-white/10 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto max-h-36 lg:max-h-[580px] scrollbar-thin">
                <div className="hidden lg:flex items-center justify-between px-2 py-1 text-[11px] font-mono text-slate-400 border-b border-white/10 mb-1">
                  <span>SLIDES ({presentation.slides.length})</span>
                  <Laptop className="w-3 h-3 text-indigo-400" />
                </div>
                {presentation.slides.map((s, idx) => {
                  const isActive = idx === currentSlideIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-32 lg:w-full p-1.5 rounded-xl border text-left transition-all shrink-0 ${
                        isActive
                          ? 'border-indigo-400 bg-indigo-600/20 ring-2 ring-indigo-500 shadow-md scale-[1.02]'
                          : 'border-white/10 bg-slate-950/60 hover:bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full h-14 lg:h-18 rounded-lg overflow-hidden bg-slate-900 border border-white/10 mb-1 relative">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <span className="absolute top-1 left-1 bg-black/70 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded text-white">
                          #{s.slideNumber || idx + 1}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-white truncate px-0.5">
                        {s.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Slide Stage Container - 16:9 Widescreen Responsive Presentation Frame */}
            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              <div className={`w-full max-w-5xl rounded-2xl border shadow-2xl transition-all duration-300 flex flex-col justify-between p-5 md:p-8 min-h-[440px] max-h-[calc(100vh-230px)] overflow-y-auto scrollbar-thin ${currentTheme.bg}`}>
                
                {/* Top Badge & Key Takeaway Banner */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border ${currentTheme.badge}`}>
                      Slide {activeSlide.slideNumber} of {presentation.slides.length}
                    </span>

                    {/* Canva AI Layout Type Badge */}
                    {activeSlide.layoutType && (
                      <span className="text-[10px] font-mono uppercase bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1">
                        <Layout className="w-3 h-3" />
                        <span>{activeSlide.layoutType}</span>
                      </span>
                    )}

                    {/* Canva Palette Color Dots */}
                    {activeSlide.palette && (
                      <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10" title="Canva AI 6-Color Palette">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeSlide.palette.primary }} />
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeSlide.palette.secondary }} />
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeSlide.palette.accent }} />
                      </div>
                    )}
                  </div>
                  
                  {isEditingInline ? (
                    <div className="flex-1 max-w-md ml-auto">
                      <input
                        type="text"
                        value={activeSlide.keyTakeaway || ""}
                        onChange={(e) => handleUpdateSlideField(currentSlideIndex, 'keyTakeaway', e.target.value)}
                        placeholder="Slide Key Takeaway..."
                        className="w-full text-xs px-2.5 py-1 bg-black/50 border border-amber-500/40 rounded-lg text-amber-300 focus:outline-none"
                      />
                    </div>
                  ) : activeSlide.keyTakeaway ? (
                    <span className="text-xs italic opacity-95 max-w-lg truncate bg-black/40 px-3 py-1 rounded-lg border border-white/10 text-amber-300">
                      💡 {activeSlide.keyTakeaway}
                    </span>
                  ) : null}
                </div>

                {/* 2-Column Split: Content & Visual Media */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-auto items-stretch flex-1">
                  
                  {/* Left Column: Title & Bullet Points */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                    <div>
                      {isEditingInline ? (
                        <div className="space-y-2 mb-3">
                          <input
                            type="text"
                            value={activeSlide.title}
                            onChange={(e) => handleUpdateSlideField(currentSlideIndex, 'title', e.target.value)}
                            className="w-full text-lg md:text-xl font-bold bg-black/40 border border-indigo-400/50 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            value={activeSlide.subtitle || ""}
                            onChange={(e) => handleUpdateSlideField(currentSlideIndex, 'subtitle', e.target.value)}
                            placeholder="Subtitle (optional)"
                            className="w-full text-xs italic bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className={`text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mb-1 ${currentTheme.heading}`}>
                            {activeSlide.title}
                          </h3>
                          {activeSlide.subtitle && (
                            <p className="text-xs sm:text-sm italic opacity-85 mb-2.5">{activeSlide.subtitle}</p>
                          )}
                        </>
                      )}

                      {/* Bullet Points */}
                      <div className="space-y-2 mt-3">
                        {activeSlide.bulletPoints?.map((bullet, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className={`text-base font-bold mt-0.5 shrink-0 ${currentTheme.bulletIcon}`}>
                              •
                            </span>
                            {isEditingInline ? (
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => {
                                  const newBullets = [...(activeSlide.bulletPoints || [])];
                                  newBullets[idx] = e.target.value;
                                  handleUpdateSlideField(currentSlideIndex, 'bulletPoints', newBullets);
                                }}
                                className="w-full text-xs sm:text-sm bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-white focus:outline-none"
                              />
                            ) : (
                              <span className="text-xs sm:text-sm md:text-base leading-relaxed">
                                {bullet}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Canva Element Tags & Visual Concept */}
                    <div className="space-y-2 mt-2">
                      {activeSlide.canvaElementTags && activeSlide.canvaElementTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-mono">Canva Tags:</span>
                          {activeSlide.canvaElementTags.map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {activeSlide.visualDescription && (
                        <div className="p-2.5 rounded-xl border border-white/10 bg-black/35 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-indigo-300 text-[10px]">
                            <Eye className="w-3 h-3" />
                            <span>Visual Concept</span>
                          </div>
                          <p className="opacity-90 leading-snug text-[11px] sm:text-xs">{activeSlide.visualDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Slide Media (Photo + Diagram) */}
                  <div className="lg:col-span-5 min-h-[220px] sm:min-h-[260px] flex">
                    <SlideGraphicRenderer 
                      slide={activeSlide} 
                      themeStyle={activeThemeClass}
                      onRegenerateImage={() => handleRegenerateSlideImage(currentSlideIndex)}
                      onOpenSearchGoogleImages={() => setSearchImageSlideIdx(currentSlideIndex)}
                      isRegeneratingImage={regeneratingSlideIdx === currentSlideIndex}
                    />
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Slide Navigation Controls & Bottom Filmstrip (when not in side dock mode) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                id="btn_ppt_prev_slide"
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Slide</span>
              </button>

              <span className="text-xs font-mono text-slate-400">
                Slide <strong className="text-white">{currentSlideIndex + 1}</strong> of {presentation.slides.length}
              </span>

              <button
                id="btn_ppt_next_slide"
                disabled={currentSlideIndex === presentation.slides.length - 1}
                onClick={() => setCurrentSlideIndex(prev => Math.min(presentation.slides.length - 1, prev + 1))}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
              >
                <span>Next Slide</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Filmstrip Thumbnails (Visible when layout is 'bottom') */}
            {filmstripLayout === 'bottom' && (
              <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {presentation.slides.map((s, idx) => {
                    const isActive = idx === currentSlideIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`relative shrink-0 w-28 md:w-36 p-1.5 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'border-indigo-400 bg-indigo-600/20 ring-2 ring-indigo-500 shadow-lg scale-105'
                            : 'border-white/10 bg-slate-950/60 hover:bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="w-full h-14 rounded-lg overflow-hidden bg-slate-900 border border-white/10 mb-1 relative">
                          {s.imageUrl ? (
                            <img src={s.imageUrl} alt={s.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <span className="absolute top-1 left-1 bg-black/70 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded text-white">
                            #{s.slideNumber || idx + 1}
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-white truncate px-0.5">
                          {s.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 UPGRADED FULLSCREEN SLIDESHOW / PRESENTER MODE WITH LASER & DRAWING 🚀 */}
      {/* ========================================================================= */}
      {isFullscreen && presentation && activeSlide && (
        <div className={`fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-2 sm:p-4 md:p-6 animate-fade-in text-white select-none overflow-hidden ${isCinemaMode ? 'cursor-default' : ''}`}>
          
          {/* Top Presenter Toolbar - Floating & Sleek */}
          <div className={`flex items-center justify-between border-b border-white/10 pb-2.5 z-30 transition-all ${isCinemaMode ? 'opacity-20 hover:opacity-100 bg-slate-950/80 backdrop-blur px-4 py-2 rounded-2xl border border-white/15 shadow-2xl' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white shrink-0">
                <PresentationIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm md:text-base font-bold text-white truncate max-w-xs md:max-w-md">{presentation.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Slide {activeSlide.slideNumber} of {presentation.slides.length}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 font-mono text-emerald-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(elapsedSeconds)}</span>
                  </div>
                  {zoomScale !== 1 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-mono text-[11px]">{Math.round(zoomScale * 100)}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Presenter Interactive Action Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Virtual Laser Pointer Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsLaserActive(prev => !prev);
                  setIsPenActive(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  isLaserActive 
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/40 animate-pulse' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/15'
                }`}
                title="Toggle Virtual Laser Pointer (L)"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Laser (L)</span>
              </button>

              {/* Live Pen / Highlighter Annotation Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsPenActive(prev => !prev);
                  setIsLaserActive(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  isPenActive 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/40' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/15'
                }`}
                title="Toggle Live Pen Annotation (P)"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pen (P)</span>
              </button>

              {/* Pen Color Picker (Visible when Pen Active) */}
              {isPenActive && (
                <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-xl border border-white/15 animate-fade-in">
                  {[
                    { color: '#ef4444', name: 'Red' },
                    { color: '#facc15', name: 'Yellow' },
                    { color: '#06b6d4', name: 'Cyan' },
                    { color: '#22c55e', name: 'Green' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setPenColor(c.color)}
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        penColor === c.color ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleUndoDrawing}
                    className="p-1 text-slate-300 hover:text-white text-xs ml-1"
                    title="Undo stroke"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSlideDrawings}
                    className="p-1 text-rose-400 hover:text-rose-300 text-xs"
                    title="Clear Slide Annotations"
                  >
                    <Eraser className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Zoom In & Out Controls */}
              <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.7, prev - 0.1))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1.0)}
                  className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-white"
                  title="Reset Zoom (0)"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(1.4, prev + 0.1))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Layout Switcher */}
              <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPresenterLayout('split')}
                  className={`px-2 py-1 rounded-lg font-medium transition ${presenterLayout === 'split' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Balanced 60/40 Layout"
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => setPresenterLayout('visual-large')}
                  className={`px-2 py-1 rounded-lg font-medium transition ${presenterLayout === 'visual-large' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Large Visual Focus"
                >
                  Visual Focus
                </button>
              </div>

              {/* Auto-play Timer */}
              <button
                type="button"
                onClick={() => setIsAutoPlaying(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                  isAutoPlaying 
                    ? 'bg-amber-600 text-white border-amber-400' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/15'
                }`}
                title="Auto-Play Slides"
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isAutoPlaying ? `${autoPlayInterval}s` : 'Auto'}</span>
              </button>

              {/* Slide Grid Overview */}
              <button
                type="button"
                onClick={() => setShowSlideGrid(true)}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                title="Open Slide Grid (G)"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid (G)</span>
              </button>

              {/* Standalone Tab Popout */}
              <button
                type="button"
                onClick={handleOpenStandaloneViewer}
                className="px-2.5 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                title="Open Standalone in Separate Browser Tab"
              >
                <Tv className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xl:inline">Popout Tab</span>
              </button>

              {/* Cinema Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsCinemaMode(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                  isCinemaMode 
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/15'
                }`}
                title="Cinema / Focus Mode (C)"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cinema (C)</span>
              </button>

              {/* Exit Presenter Button */}
              <button
                id="btn_ppt_exit_fullscreen"
                onClick={handleExitFullscreen}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Main Slide Stage: True 16:9 Widescreen Layout with Responsive Fitting */}
          {/* ========================================================================= */}
          <div className="relative w-full flex-1 flex items-center justify-center py-2 sm:py-4 px-2 sm:px-6 mx-auto overflow-hidden">
            
            {/* Left Fast Slide Navigation Click Target */}
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 p-3 sm:p-4 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white/70 hover:text-white disabled:opacity-0 backdrop-blur-md border border-white/10 shadow-2xl transition-all transform hover:scale-110 active:scale-95"
              title="Previous Slide (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Right Fast Slide Navigation Click Target */}
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.min(presentation.slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === presentation.slides.length - 1}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 p-3 sm:p-4 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white/70 hover:text-white disabled:opacity-0 backdrop-blur-md border border-white/10 shadow-2xl transition-all transform hover:scale-110 active:scale-95"
              title="Next Slide (→ / Space)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Slide Stage Container with Ref and Transform Zoom */}
            <div 
              ref={slideFrameRef}
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
              className={`w-full max-w-[1550px] aspect-[16/9] ${isCinemaMode ? 'max-h-[92vh]' : 'max-h-[82vh]'} rounded-2xl md:rounded-3xl border shadow-2xl flex flex-col justify-between relative overflow-hidden p-6 sm:p-8 md:p-10 transition-transform ${currentTheme.bg}`}
            >
              {/* Top Slide Info & Actions */}
              <div className="flex items-center justify-between mb-3 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <span className={`text-xs sm:text-sm font-mono font-bold px-3 py-1 rounded-full border ${currentTheme.badge}`}>
                    Slide {activeSlide.slideNumber} of {presentation.slides.length}
                  </span>
                  {activeSlide.imageSource && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-900/70 border border-white/10 text-slate-300">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      <span>{activeSlide.imageSource}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeSlide.keyTakeaway && (
                    <span className="text-xs sm:text-sm italic font-medium bg-black/50 px-3.5 py-1 rounded-xl border border-white/15 text-amber-300 shadow-sm max-w-md truncate">
                      💡 {activeSlide.keyTakeaway}
                    </span>
                  )}

                  {/* Inline Google Image Search shortcut in presenter mode */}
                  <button
                    type="button"
                    onClick={() => setSearchImageSlideIdx(currentSlideIndex)}
                    className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/70 border border-white/15 text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition"
                    title="Search Google / Wikimedia Images for this slide"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Search Image</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Presentation Content Body */}
              <div className={`grid ${presenterLayout === 'visual-large' ? 'grid-cols-1 lg:grid-cols-12 gap-6' : 'grid-cols-1 lg:grid-cols-12 gap-8'} items-center flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin z-10 my-auto`}>
                
                {/* Left Content */}
                <div className={`${presenterLayout === 'visual-large' ? 'lg:col-span-5' : 'lg:col-span-7'} space-y-4`}>
                  <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight ${currentTheme.heading}`}>
                    {activeSlide.title}
                  </h1>
                  {activeSlide.subtitle && (
                    <p className="text-sm sm:text-base md:text-lg italic opacity-85 leading-snug">{activeSlide.subtitle}</p>
                  )}

                  <ul className="space-y-3 sm:space-y-4 my-4 sm:my-6 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed">
                    {activeSlide.bulletPoints?.map((bp, i) => (
                      <li key={i} className="flex items-start gap-3 sm:gap-3.5">
                        <span className={`font-bold mt-0.5 text-lg sm:text-xl ${currentTheme.bulletIcon}`}>•</span>
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Visual Graphic / Real Topic Image */}
                <div className={`${presenterLayout === 'visual-large' ? 'lg:col-span-7' : 'lg:col-span-5'} flex flex-col justify-center h-full max-h-[500px]`}>
                  <SlideGraphicRenderer 
                    slide={activeSlide} 
                    themeStyle={activeThemeClass}
                    onRegenerateImage={() => handleRegenerateSlideImage(currentSlideIndex)}
                    onOpenSearchGoogleImages={() => setSearchImageSlideIdx(currentSlideIndex)}
                    isRegeneratingImage={regeneratingSlideIdx === currentSlideIndex}
                  />
                </div>

              </div>

              {/* Subtle Progress Line along bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-10">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${((currentSlideIndex + 1) / presentation.slides.length) * 100}%` }}
                />
              </div>

              {/* Live Annotation / Pen Canvas Overlay & Laser Tracker */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className={`absolute inset-0 w-full h-full rounded-2xl md:rounded-3xl z-20 ${
                  isPenActive 
                    ? 'cursor-crosshair pointer-events-auto' 
                    : isLaserActive 
                    ? 'cursor-none pointer-events-auto' 
                    : 'pointer-events-none'
                }`}
              />

              {/* Virtual Laser Pointer Dot */}
              {isLaserActive && (
                <div
                  className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: laserPos.x, top: laserPos.y }}
                >
                  <div className="w-4 h-4 rounded-full bg-rose-500 shadow-lg shadow-rose-500 ring-4 ring-rose-400/50 animate-ping absolute" />
                  <div className="w-4 h-4 rounded-full bg-rose-500 shadow-lg shadow-rose-500 ring-2 ring-white" />
                </div>
              )}

            </div>
          </div>

          {/* Bottom Navigation Toolbar */}
          <div className={`flex items-center justify-between border-t border-white/10 pt-2.5 z-30 transition-all ${isCinemaMode ? 'opacity-20 hover:opacity-100 bg-slate-950/80 backdrop-blur px-4 py-2 rounded-2xl border border-white/15 shadow-2xl' : ''}`}>
            <button
              disabled={currentSlideIndex === 0}
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition shadow"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous (←)</span>
            </button>

            {/* Interactive Thumbnail Filmstrip / Dot Bar */}
            <div className="flex items-center gap-1.5 max-w-xl overflow-x-auto px-2 scrollbar-none">
              {presentation.slides.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === currentSlideIndex ? 'w-8 bg-indigo-500 shadow-md shadow-indigo-500/50' : 'w-2.5 bg-white/20 hover:bg-white/40'
                  }`}
                  title={`Slide ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>

            <button
              disabled={currentSlideIndex === presentation.slides.length - 1}
              onClick={() => setCurrentSlideIndex(prev => Math.min(presentation.slides.length - 1, prev + 1))}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30"
            >
              <span>Next (→ / Space)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🗂️ SLIDE GRID OVERVIEW MODAL (QUICK JUMP TO ANY SLIDE) 🗂️ */}
      {/* ========================================================================= */}
      {showSlideGrid && presentation && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowSlideGrid(false)}>
          <div className="max-w-5xl w-full max-h-[85vh] bg-slate-950 rounded-2xl border border-white/20 p-6 flex flex-col space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-indigo-400" />
                  <span>Slide Grid Overview</span>
                </h3>
                <p className="text-xs text-slate-400">Click any slide to jump directly</p>
              </div>
              <button
                onClick={() => setShowSlideGrid(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pr-1">
              {presentation.slides.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentSlideIndex(idx);
                    setShowSlideGrid(false);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 group ${
                    idx === currentSlideIndex 
                      ? 'bg-indigo-950 border-indigo-500 ring-2 ring-indigo-400 shadow-lg' 
                      : 'bg-slate-900/80 border-white/10 hover:bg-slate-800 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-indigo-300">Slide {s.slideNumber}</span>
                    {idx === currentSlideIndex && (
                      <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded text-white font-semibold">Active</span>
                    )}
                  </div>

                  {s.imageUrl && (
                    <div className="h-24 w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                      <img src={s.imageUrl} alt={s.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-indigo-200 transition line-clamp-1">{s.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{s.bulletPoints?.[0] || s.visualDescription}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔍 REAL EDUCATIONAL GOOGLE & WIKIMEDIA IMAGE SEARCH MODAL 🔍 */}
      {/* ========================================================================= */}
      {searchImageSlideIdx !== null && presentation && presentation.slides[searchImageSlideIdx] && (
        <ImageSearchModal
          isOpen={true}
          onClose={() => setSearchImageSlideIdx(null)}
          onSelectImage={(url, source) => handleApplyImageFromSearch(url, source)}
          initialQuery={`${presentation.slides[searchImageSlideIdx].title} ${presentation.title}`}
          slideTitle={presentation.slides[searchImageSlideIdx].title}
          slideNumber={presentation.slides[searchImageSlideIdx].slideNumber || searchImageSlideIdx + 1}
        />
      )}

      {/* ========================================================================= */}
      {/* 🎨 CUSTOMIZE SLIDE IMAGE MODAL 🎨 */}
      {/* ========================================================================= */}
      {editingImageSlideIdx !== null && presentation && presentation.slides[editingImageSlideIdx] && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setEditingImageSlideIdx(null)}>
          <div className="max-w-lg w-full bg-slate-950 rounded-2xl border border-white/20 p-6 flex flex-col space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Customize Slide {editingImageSlideIdx + 1} Visual</h3>
              </div>
              <button onClick={() => setEditingImageSlideIdx(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  AI Visual Prompt Description
                </label>
                <textarea
                  value={customImagePrompt || presentation.slides[editingImageSlideIdx].imagePrompt || presentation.slides[editingImageSlideIdx].visualDescription || ""}
                  onChange={(e) => setCustomImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Photorealistic 3D medical render of plant cells, sunlight beam passing through chloroplasts, 4k"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingImageSlideIdx(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={regeneratingSlideIdx !== null}
                  onClick={() => handleRegenerateSlideImage(editingImageSlideIdx, customImagePrompt)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {regeneratingSlideIdx !== null ? (
                    <>
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Visual...</span>
                    </>
                  ) : (
                    <>
                      <Sparkle className="w-3.5 h-3.5 text-indigo-200" />
                      <span>Regenerate Visual</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💻 LAPTOP GESTURES & SHORTCUTS MODAL 💻 */}
      {/* ========================================================================= */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowShortcutsModal(false)}>
          <div className="max-w-lg w-full bg-slate-950 rounded-2xl border border-white/20 p-6 flex flex-col space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <Laptop className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Laptop Gestures & Shortcuts</h3>
                  <p className="text-xs text-slate-400">Optimized for trackpads & keyboard navigation</p>
                </div>
              </div>
              <button onClick={() => setShowShortcutsModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <MousePointer className="w-4 h-4 text-indigo-400" />
                  <span>Trackpad Gestures</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-white/5">
                    <span className="font-mono text-cyan-300">2-Finger Swipe ↔</span>
                    <span className="text-slate-400">Previous / Next Slide</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-white/5">
                    <span className="font-mono text-cyan-300">Pinch / Ctrl+Wheel</span>
                    <span className="text-slate-400">Zoom Slide In / Out</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Keyboard Shortcuts</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Next Slide</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">Space / →</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Previous Slide</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">← / Backspace</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Toggle Fullscreen</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">F</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Slide Grid</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">G</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Laser Pointer</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">L</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Draw / Pen</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">P</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Cinema Focus</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">C</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Edit Slide</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">E</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Image Search</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">I</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-white/5">
                    <span className="text-slate-300">Exit Presenter</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
              >
                Got It (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎨 CANVA CONNECT OAUTH INTEGRATION MODAL 🎨 */}
      {/* ========================================================================= */}
      {canvaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setCanvaModalOpen(false)}>
          <div className="max-w-lg w-full bg-slate-950 rounded-2xl border border-white/20 p-6 flex flex-col space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                  C
                </div>
                <div>
                  <h3 className="font-bold text-base">Canva Connect OAuth Integration</h3>
                  <p className="text-xs text-slate-400">Authenticate & export slide decks directly to Canva</p>
                </div>
              </div>
              <button onClick={() => setCanvaModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-200">
              {/* Connection Status Card */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                canvaConnected 
                  ? 'bg-teal-950/40 border-teal-500/40 text-teal-200' 
                  : 'bg-slate-900 border-white/10 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${canvaConnected ? 'bg-teal-400 animate-pulse' : 'bg-slate-500'}`} />
                  <div>
                    <div className="font-bold text-sm">{canvaConnected ? "Connected to Canva" : "Not Connected to Canva"}</div>
                    <div className="text-[11px] text-slate-400">
                      {canvaConnected ? "Your Canva Connect token is active and ready." : "Link your Canva account to export presentations."}
                    </div>
                  </div>
                </div>
                {canvaConnected ? (
                  <button
                    onClick={handleDisconnectCanva}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectCanva}
                    disabled={canvaLoading}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/30"
                  >
                    {canvaLoading ? "Connecting..." : "Connect Canva"}
                  </button>
                )}
              </div>

              {/* Canva Developer Portal Callback URL Info */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                <div className="font-bold text-slate-300 flex items-center justify-between">
                  <span>Redirect URI for Canva Developer Portal:</span>
                  <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-mono">OAuth 2.0 Callback</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 font-mono text-[11px] text-teal-300 select-all break-all">
                  {canvaStatusInfo?.redirectUri || `${window.location.origin}/canvaOAuthCallback`}
                </div>
                <p className="text-[11px] text-slate-400">
                  Add this exact HTTPS callback URL in your <strong>Canva Developer Portal &gt; App Settings &gt; Authentication &gt; Redirect URLs</strong>.
                </p>
              </div>

              {/* Configuration Requirements Note */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-200 space-y-1">
                <div className="font-bold text-indigo-300">Required Environment Secrets:</div>
                <div className="flex flex-wrap gap-2 text-slate-300 font-mono text-[10px] pt-1">
                  <span className="bg-slate-900 px-2 py-1 rounded border border-white/10">CANVA_CLIENT_ID</span>
                  <span className="bg-slate-900 px-2 py-1 rounded border border-white/10">CANVA_CLIENT_SECRET</span>
                </div>
                <p className="text-slate-400 text-[10px] pt-1">
                  Configure these in the <strong>Settings &gt; Secrets</strong> panel of Google AI Studio.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCanvaModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🪄 CANVA AI REMIX MODAL 🪄 */}
      {/* ========================================================================= */}
      {canvaRemixModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setCanvaRemixModalOpen(false)}>
          <div className="max-w-lg w-full bg-slate-950 rounded-2xl border border-purple-500/40 p-6 flex flex-col space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <div className="p-2 bg-gradient-to-br from-teal-400 to-purple-600 rounded-xl text-white shadow-md">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Canva AI Style Remix</h3>
                  <p className="text-xs text-slate-400">Instantly transform slide layouts &amp; color archetypes</p>
                </div>
              </div>
              <button onClick={() => setCanvaRemixModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-200">
              <p className="text-slate-300">
                Select a new Canva AI Design Archetype to dynamically restyle your current deck:
              </p>

              <div className="space-y-2">
                {[
                  {
                    id: "Canva AI Modern Gradient Pitch",
                    name: "🔮 Modern Gradient Pitch",
                    desc: "Vibrant tech gradients, high-contrast bento metrics & dynamic cards",
                    colors: ["#6366F1", "#EC4899", "#8B5CF6", "#0F172A"]
                  },
                  {
                    id: "Canva AI Minimalist Editorial",
                    name: "📰 Minimalist Editorial",
                    desc: "Refined serif typography, monochrome borders, high contrast grid",
                    colors: ["#0F172A", "#475569", "#E2E8F0", "#F8FAFC"]
                  },
                  {
                    id: "Canva AI Vibrant Creative Agency",
                    name: "🎨 Vibrant Creative Agency",
                    desc: "Bold pop colors, graphic sticker tags, energetic educational layout",
                    colors: ["#FF5722", "#00BCD4", "#FFEB3B", "#18181B"]
                  },
                  {
                    id: "Canva AI Cyberpunk & Dark Tech",
                    name: "⚡ Cyberpunk & Dark Tech",
                    desc: "Neon cyan and magenta accents on deep onyx canvas with terminal aesthetics",
                    colors: ["#06B6D4", "#F43F5E", "#10B981", "#030712"]
                  },
                  {
                    id: "Canva AI Pastel Classroom Storyboard",
                    name: "🌸 Pastel Classroom Storyboard",
                    desc: "Gentle mint, lavender & cream cards for warm, friendly lessons",
                    colors: ["#A7F3D0", "#DDD6FE", "#FDE68A", "#1E1E2E"]
                  },
                  {
                    id: "Canva AI Corporate Executive Brief",
                    name: "🏛️ Corporate Executive Brief",
                    desc: "Deep navy, brushed gold & crisp structured executive cards",
                    colors: ["#1E3A8A", "#D97706", "#93C5FD", "#0B132B"]
                  }
                ].map(arch => {
                  const isSelected = selectedRemixArchetype === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setSelectedRemixArchetype(arch.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-500/40 text-white shadow-lg'
                          : 'bg-slate-900/80 border-white/10 hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[320px]">
                        <div className="font-bold text-xs">{arch.name}</div>
                        <div className="text-[11px] text-slate-400 leading-tight">{arch.desc}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {arch.colors.map((c, cIdx) => (
                          <div key={cIdx} className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCanvaRemixModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={canvaRemixLoading}
                onClick={handleCanvaRemix}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 disabled:opacity-50"
              >
                {canvaRemixLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Remixing Styles with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                    <span>Apply Canva AI Remix</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔮 CANVA AI MAGIC PROMPT MODAL 🔮 */}
      {/* ========================================================================= */}
      {canvaMagicPromptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setCanvaMagicPromptModalOpen(false)}>
          <div className="max-w-lg w-full bg-slate-950 rounded-2xl border border-teal-500/40 p-6 flex flex-col space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <div className="p-2 bg-gradient-to-br from-teal-400 to-indigo-600 rounded-xl text-white shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Canva Magic Design AI Prompt</h3>
                  <p className="text-xs text-slate-400">Formatted for Canva Magic Write &amp; Presentation Generator</p>
                </div>
              </div>
              <button onClick={() => setCanvaMagicPromptModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <p className="text-slate-300">
                You can copy this prompt and paste it directly into Canva's Magic Design AI search bar or Magic Write to instantly create this deck in your Canva workspace:
              </p>

              <div className="relative">
                <textarea
                  readOnly
                  value={compiledCanvaMagicPrompt}
                  rows={6}
                  className="w-full p-3.5 bg-slate-900/90 border border-teal-500/30 rounded-xl text-teal-200 font-mono text-xs focus:outline-none select-all"
                />
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(compiledCanvaMagicPrompt);
                  setCanvaFeedback("Canva Magic Prompt copied to clipboard! 📋");
                  setTimeout(() => setCanvaFeedback(null), 3000);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-teal-300" />
                <span>Copy Prompt</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCanvaMagicPromptModalOpen(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(compiledCanvaMagicPrompt);
                    setCanvaMagicPromptModalOpen(false);
                    handleLaunchCanvaMagicStudio();
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 via-indigo-600 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/30"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                  <span>Copy &amp; Open in Canva Studio</span>
                  <ExternalLink className="w-3 h-3 text-purple-200" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

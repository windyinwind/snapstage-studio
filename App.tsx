import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { STORE_PRESETS, Dimension, ImageState, LayoutMode, TextConfig } from './types';
import { analyzeScreenshotColors } from './services/geminiService';

const FONT_FAMILIES = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Playfair', value: "'Playfair Display', serif" },
  { name: 'Modern', value: "'Outfit', sans-serif" },
  { name: 'Mono', value: "'JetBrains Mono', monospace" },
  { name: 'Classic', value: "'Bebas Neue', cursive" },
];

const DEFAULT_BEZEL_THICKNESS = 4.5;

const App: React.FC = () => {
  const [images, setImages] = useState<ImageState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetDimension, setTargetDimension] = useState<Dimension>(STORE_PRESETS[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'storefront'>('storefront');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('marketing');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [bezelThickness, setBezelThickness] = useState(DEFAULT_BEZEL_THICKNESS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});

  const [textConfig, setTextConfig] = useState<TextConfig>({
    fontSize: 80,
    color: '#0f172a',
    fontWeight: '800',
    padding: 100,
    fontFamily: "'Inter', sans-serif"
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [bgUploadMode, setBgUploadMode] = useState<'single' | 'panoramic'>('single');

  const selectedImage = useMemo(() => 
    images.find(img => img.id === selectedId) || null
  , [images, selectedId]);

  const applyToAll = () => {
    if (!images.length || !selectedImage) return;
    setImages(prev => prev.map(img => ({
      ...img,
      title: selectedImage.title
    })));
  };

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const processSingleImage = useCallback(async (
    imgState: ImageState,
    dimension: Dimension, 
    fallbackBg: string,
    layout: LayoutMode,
    tConfig: TextConfig,
    deviceFrame: boolean,
    bezelThick: number
  ): Promise<string | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = dimension.width;
    canvas.height = dimension.height;

    if (imgState.customBgUrl) {
      const bgImg = new Image();
      bgImg.src = imgState.customBgUrl;
      await new Promise((r) => (bgImg.onload = r));
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = fallbackBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const imgSource = new Image();
    imgSource.src = imgState.originalUrl;
    await new Promise(resolve => imgSource.onload = resolve);

    let imageAreaY = 0;
    let imageAreaHeight = canvas.height;

    if (layout === 'marketing' && imgState.title) {
      ctx.fillStyle = tConfig.color;
      ctx.font = `${tConfig.fontWeight} ${tConfig.fontSize}px ${tConfig.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const words = imgState.title.split(' ');
      let line = '';
      let lines = [];
      const maxWidth = canvas.width - (tConfig.padding * 2);
      const lineHeight = tConfig.fontSize * 1.3;

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      lines.forEach((l, i) => {
        ctx.fillText(l.trim(), canvas.width / 2, tConfig.padding + (i * lineHeight));
      });

      const totalTextHeight = lines.length * lineHeight;
      imageAreaY = tConfig.padding + totalTextHeight + (tConfig.padding * 0.8);
      imageAreaHeight = canvas.height - imageAreaY;
    }

    const margin = canvas.width * 0.12; 
    const availableWidth = canvas.width - (margin * 2);
    const availableHeight = imageAreaHeight - margin; 

    const imgAspect = imgSource.width / imgSource.height;
    const containerAspect = availableWidth / availableHeight;

    let deviceWidth = availableWidth;
    let deviceHeight = availableHeight;

    if (imgAspect > containerAspect) {
      deviceHeight = availableWidth / imgAspect;
    } else {
      deviceWidth = availableHeight * imgAspect;
    }

    const deviceX = (canvas.width - deviceWidth) / 2;
    const deviceY = imageAreaY + (availableHeight - deviceHeight) / 2;

    if (deviceFrame) {
      const bezelWidth = deviceWidth * (bezelThick / 100); 
      const cornerRadius = deviceWidth * 0.16; 
      
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 100;
      ctx.shadowOffsetY = 50;
      drawRoundedRect(ctx, deviceX, deviceY, deviceWidth, deviceHeight, cornerRadius);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      
      ctx.fillStyle = '#1c1c1e'; 
      drawRoundedRect(ctx, deviceX, deviceY, deviceWidth, deviceHeight, cornerRadius);
      ctx.fill();

      const screenX = deviceX + bezelWidth;
      const screenY = deviceY + bezelWidth;
      const screenWidth = deviceWidth - (bezelWidth * 2);
      const screenHeight = deviceHeight - (bezelWidth * 2);
      const screenRadius = Math.max(0, cornerRadius - bezelWidth);

      ctx.save();
      drawRoundedRect(ctx, screenX, screenY, screenWidth, screenHeight, screenRadius);
      ctx.clip();
      ctx.drawImage(imgSource, screenX, screenY, screenWidth, screenHeight);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (imgAspect < 0.6) { 
          const islandWidth = deviceWidth * 0.28;
          const islandHeight = deviceHeight * 0.024;
          const islandX = deviceX + (deviceWidth - islandWidth) / 2;
          const islandY = deviceY + bezelWidth + (deviceHeight * 0.012);
          ctx.fillStyle = '#000000';
          drawRoundedRect(ctx, islandX, islandY, islandWidth, islandHeight, islandHeight / 2);
          ctx.fill();
      }
    } else {
      ctx.drawImage(imgSource, deviceX, deviceY, deviceWidth, deviceHeight);
    }
    return canvas.toDataURL('image/png');
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const newId = Math.random().toString(36).substr(2, 9);
          const newImage: ImageState = {
            id: newId,
            originalUrl: event.target?.result as string,
            processedUrl: null,
            name: file.name,
            width: img.width,
            height: img.height,
            title: '',
            customBgUrl: null
          };
          setImages(prev => {
            const updated = [...prev, newImage];
            if (updated.length === 1 && !selectedId) setSelectedId(newImage.id);
            return updated;
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const bgImg = new Image();
      bgImg.src = event.target?.result as string;
      bgImg.onload = () => {
        if (bgUploadMode === 'single' && selectedId) {
          setImages(prev => prev.map(img => img.id === selectedId ? { ...img, customBgUrl: bgImg.src } : img));
        } else if (bgUploadMode === 'panoramic' && images.length > 0) {
          const count = images.length;
          const totalTargetWidth = targetDimension.width * count;
          const bgAspect = bgImg.width / bgImg.height;
          const totalAspect = totalTargetWidth / targetDimension.height;
          setImages(prev => prev.map((img, idx) => {
            const canvas = document.createElement('canvas');
            canvas.width = targetDimension.width;
            canvas.height = targetDimension.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return img;
            let sourceW, sourceH, sourceX, sourceY;
            if (bgAspect > totalAspect) {
              sourceH = bgImg.height;
              sourceW = bgImg.height * totalAspect;
              sourceY = 0;
              sourceX = (bgImg.width - sourceW) / 2;
            } else {
              sourceW = bgImg.width;
              sourceH = bgImg.width / totalAspect;
              sourceX = 0;
              sourceY = (bgImg.height - sourceH) / 2;
            }
            const sliceSourceW = sourceW / count;
            const sliceSourceX = sourceX + (idx * sliceSourceW);
            ctx.drawImage(bgImg, sliceSourceX, sourceY, sliceSourceW, sourceH, 0, 0, canvas.width, canvas.height);
            return { ...img, customBgUrl: canvas.toDataURL('image/png') };
          }));
        }
      };
    };
    reader.readAsDataURL(file);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const harmonizeTheme = async (imgState: ImageState) => {
    setAnalyzingId(imgState.id);
    const base64 = imgState.originalUrl.split(',')[1];
    try {
      const suggestions = await analyzeScreenshotColors(base64);
      setBgColor(suggestions.backgroundColor);
      setTextConfig(prev => ({ ...prev, color: suggestions.accentColor }));
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingId(null);
    }
  };

  useEffect(() => {
    if (images.length === 0) return;
    
    const updateAllImages = async () => {
      setIsProcessing(true);
      const newCache: Record<string, string> = {};
      
      for (const imgState of images) {
        const result = await processSingleImage(
          imgState, 
          targetDimension, 
          bgColor, 
          layoutMode, 
          textConfig, 
          showDeviceFrame, 
          bezelThickness
        );
        if (result) newCache[imgState.id] = result;
      }
      
      setPreviewCache(newCache);
      setIsProcessing(false);
    };

    const timeoutId = setTimeout(updateAllImages, 150); 
    return () => clearTimeout(timeoutId);
  }, [targetDimension, bgColor, layoutMode, textConfig, showDeviceFrame, bezelThickness, images, processSingleImage]);

  const updateImageTitle = (id: string, title: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, title } : img));
  };

  const handleDownload = (img: ImageState) => {
    const url = previewCache[img.id];
    if (!url) return;
    const link = document.createElement('a');
    link.download = `snapstage-${targetDimension.width}x${targetDimension.height}-${img.name}`;
    link.href = url;
    link.click();
  };

  const groupedPresets = useMemo<Record<string, Dimension[]>>(() => {
    return STORE_PRESETS.reduce((acc, preset) => {
      if (!acc[preset.category]) acc[preset.category] = [];
      acc[preset.category].push(preset);
      return acc;
    }, {} as Record<string, Dimension[]>);
  }, []);

  const hasApiKey = !!(typeof process !== "undefined" && process.env.API_KEY);

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden font-inter select-none">
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden h-full z-40">
        <div className="h-16 shrink-0 px-5 flex items-center gap-3 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
           <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-200">
             <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M7 3C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V7C21 4.79086 19.2091 3 17 3H7Z" stroke="currentColor" strokeWidth="2.5" />
               <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2.5" />
               <path d="M17 7L17.01 7.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
             </svg>
          </div>
          <h1 className="text-slate-900 font-extrabold text-base tracking-tighter">SnapStage</h1>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Library</h2>
              <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Import</button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <div 
                  key={img.id} 
                  onClick={() => setSelectedId(img.id)} 
                  className={`aspect-[9/16] rounded-lg cursor-pointer border-2 transition-all relative overflow-hidden ${selectedId === img.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-50' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <img src={img.originalUrl} alt={img.name} className="w-full h-full object-cover" />
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-[9/16] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-500 hover:border-indigo-500 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Store Presets</h2>
            <div className="space-y-6">
              {(Object.entries(groupedPresets) as [string, Dimension[]][]).map(([category, presets]) => (
                <div key={category} className="space-y-1.5">
                  <h3 className="text-[9px] font-bold text-slate-900 px-1 uppercase tracking-tighter opacity-30">{category}</h3>
                  <div className="space-y-1">
                    {presets.map((p) => (
                      <button 
                        key={p.label} 
                        onClick={() => setTargetDimension(p)} 
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${targetDimension.label === p.label ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <div className="text-[10px] font-bold truncate leading-tight">{p.label}</div>
                        <div className={`text-[8px] font-mono mt-0.5 ${targetDimension.label === p.label ? 'text-indigo-100' : 'text-slate-400'}`}>{p.width} × {p.height}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-6">
             <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Workspace</button>
                <button onClick={() => setViewMode('storefront')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'storefront' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Storefront</button>
             </div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               Targeting <span className="text-slate-900">{targetDimension.category}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isProcessing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Rendering</span>
              </div>
            )}
            <button 
              onClick={() => images.forEach(img => handleDownload(img))} 
              disabled={images.length === 0} 
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-black rounded-xl transition-all shadow-xl disabled:opacity-10 flex items-center gap-2 uppercase tracking-widest"
            >
              Export All
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <section className="flex-1 overflow-auto custom-scrollbar relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage: 'radial-gradient(#000 1.5px, transparent 0)', backgroundSize: '32px 32px'}}></div>
            
            <div className={`min-h-full flex items-center justify-center p-12 lg:p-24 ${viewMode === 'storefront' ? 'flex-row' : 'flex-wrap gap-20'}`}>
              {images.length > 0 ? (
                <div className={`flex ${viewMode === 'storefront' ? 'flex-row items-center gap-4 px-12' : 'flex-wrap justify-center gap-20 w-full max-w-7xl'} animate-in`}>
                  {images.map((img) => (
                    <div 
                      key={img.id}
                      onClick={() => setSelectedId(img.id)}
                      className={`relative shrink-0 transition-all duration-500 ease-in-out cursor-pointer ${selectedId === img.id ? 'scale-100 z-10' : 'scale-[0.92] opacity-60 hover:opacity-100'}`}
                    >
                      <div className={`shadow-[0_50px_100px_rgba(0,0,0,0.12)] rounded-[3rem] overflow-hidden border-[8px] transition-all bg-white ${selectedId === img.id ? 'border-indigo-600 ring-[20px] ring-indigo-500/5' : 'border-white'}`}>
                        {previewCache[img.id] ? (
                          <img src={previewCache[img.id]} alt={img.name} className="h-[60vh] lg:h-[75vh] w-auto block select-none pointer-events-none" />
                        ) : (
                          <div className="h-[60vh] lg:h-[75vh] aspect-[9/19.5] flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      {selectedId === img.id && (
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">Editing</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 animate-in">
                  <div className="w-24 h-24 bg-indigo-50 rounded-[3rem] flex items-center justify-center mb-8 border border-indigo-100 shadow-xl shadow-indigo-50">
                    <svg viewBox="0 0 24 24" className="w-10 h-10 text-indigo-500" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 3C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V7C21 4.79086 19.2091 3 17 3H7Z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M17 7L17.01 7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h3 className="text-slate-900 font-black text-2xl mb-3 tracking-tight">SnapStage is Empty</h3>
                  <p className="text-slate-400 text-xs font-medium mb-8 max-w-[240px]">Import screenshots to start building your panoramic store gallery.</p>
                  <button onClick={() => fileInputRef.current?.click()} className="px-10 py-4 bg-indigo-600 text-white font-black text-[11px] rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 uppercase tracking-widest">Get Started</button>
                </div>
              )}
            </div>
          </section>

          <aside className={`w-80 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden h-full z-40 transition-transform duration-300 ${selectedImage ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}>
            {selectedImage ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Properties</h3>
                  <div className="flex items-center gap-2">
                    {hasApiKey ? (
                      <button 
                        onClick={() => harmonizeTheme(selectedImage)} 
                        className="group relative p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" /></svg>
                        <span className="absolute -left-20 -top-8 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">AI Match</span>
                      </button>
                    ) : (
                      <div className="group relative p-2.5 bg-slate-50 text-slate-300 rounded-xl cursor-help">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                          <p className="text-[9px] font-bold text-slate-900 leading-tight">Gemini AI is not connected. Add your API_KEY to unlock smart color matching.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Headline Content</label>
                    <button onClick={applyToAll} className="text-[9px] font-bold text-indigo-600 uppercase hover:underline">Sync Text</button>
                  </div>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none resize-none h-28 transition-all shadow-inner"
                    value={selectedImage.title}
                    onChange={(e) => updateImageTitle(selectedId!, e.target.value)}
                    placeholder="Enter headline copy..."
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Typeface</label>
                      <select 
                        value={textConfig.fontFamily} 
                        onChange={(e) => setTextConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] font-bold outline-none cursor-pointer focus:bg-white transition-colors"
                      >
                        {FONT_FAMILIES.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Fill</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input type="color" value={textConfig.color} onChange={(e) => setTextConfig(prev => ({ ...prev, color: e.target.value }))} className="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer shadow-sm overflow-hidden" />
                        <span className="text-[10px] font-mono font-bold text-slate-400">{textConfig.color.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                      <span>Font Size</span>
                      <span className="text-indigo-600">{textConfig.fontSize}pt</span>
                    </div>
                    <input type="range" min="40" max="280" value={textConfig.fontSize} onChange={(e) => setTextConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                  </div>
                </section>

                <section className="space-y-4 pt-8 border-t border-slate-100">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Environment</label>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">Backdrop</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">{bgColor.toUpperCase()}</span>
                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer shadow-sm overflow-hidden" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Texture</label>
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                        <button onClick={() => setBgUploadMode('single')} className={`flex-1 py-1.5 text-[9px] font-black rounded-xl uppercase transition-all ${bgUploadMode === 'single' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}>Unique</button>
                        <button onClick={() => setBgUploadMode('panoramic')} className={`flex-1 py-1.5 text-[9px] font-black rounded-xl uppercase transition-all ${bgUploadMode === 'panoramic' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}>Panoramic</button>
                      </div>
                      <button onClick={() => bgInputRef.current?.click()} className="w-full py-3 bg-white border border-slate-200 text-indigo-600 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all shadow-sm">Upload Texture</button>
                      <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 pt-8 border-t border-slate-100">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Device Rendering</label>
                  <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-2">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-indigo-950 uppercase tracking-tight">Show Chassis</span>
                      <span className="text-[9px] text-indigo-400 font-bold uppercase mt-0.5">Compatible Frame</span>
                    </div>
                    <button onClick={() => setShowDeviceFrame(!showDeviceFrame)} className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${showDeviceFrame ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${showDeviceFrame ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  
                  {showDeviceFrame && (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                        <div className="flex items-center gap-2">
                          <span>Bezel Thickness</span>
                          <button 
                            onClick={() => setBezelThickness(DEFAULT_BEZEL_THICKNESS)}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors p-0.5 hover:bg-indigo-50 rounded"
                            title="Reset to default"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        </div>
                        <span className="text-indigo-600">{bezelThickness.toFixed(1)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="12.0" 
                        step="0.1"
                        value={bezelThickness} 
                        onChange={(e) => setBezelThickness(parseFloat(e.target.value))} 
                        className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" 
                      />
                    </div>
                  )}
                </section>

                <div className="pt-10">
                  <button onClick={() => handleDownload(selectedImage)} className="w-full py-4 bg-slate-900 text-white font-black text-[11px] rounded-[1.5rem] hover:bg-black transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Frame
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300 gap-6 opacity-30">
                <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 3C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V7C21 4.79086 19.2091 3 17 3H7Z" stroke="currentColor" strokeWidth="1" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" />
                </svg>
                <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">Stage is waiting.<br/>Select a snapshot.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
      
      <style>{`
        .font-inter { font-family: 'Inter', sans-serif !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: fade-in 0.4s ease-out, zoom-in 0.4s cubic-bezier(0.2, 0, 0, 1); }
      `}</style>
    </div>
  );
};

export default App;
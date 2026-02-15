
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { STORE_PRESETS, Dimension, ImageState, LayoutMode, TextConfig } from './types';
import { analyzeScreenshotColors } from './services/geminiService';

const FONT_FAMILIES = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Playfair', value: "'Playfair Display', serif" },
  { name: 'Modern', value: "'Outfit', sans-serif" },
  { name: 'Mono', value: "'JetBrains Mono', monospace" },
  { name: 'Classic', value: "'Bebas Neue', cursive" },
  { name: 'Chinese (SC)', value: "'Noto Sans SC', sans-serif" },
  { name: 'Japanese', value: "'Noto Sans JP', sans-serif" },
  { name: 'Korean', value: "'Noto Sans KR', sans-serif" },
];

const LANGUAGES = [
  { label: 'EN', value: 'en' },
  { label: '简', value: 'zh' },
  { label: '日', value: 'ja' },
  { label: '韩', value: 'ko' }
];

const TRANSLATIONS: Record<string, any> = {
  en: {
    library: 'Library',
    import: 'Import',
    presets: 'Export Targets (Output)',
    workspace: 'Workspace',
    storefront: 'Storefront',
    targeting: 'Targeting Output:',
    exportAll: 'Export All',
    generating: 'Generating ZIP',
    rendering: 'Rendering',
    editing: 'Editing',
    emptyTitle: 'SnapStage is Empty',
    emptyDesc: 'Import screenshots to start building your panoramic store gallery.',
    getStarted: 'Get Started',
    properties: 'Properties',
    syncText: 'Sync Text',
    headlinePlaceholder: 'Enter headline copy...',
    typeface: 'Typeface',
    fill: 'Fill',
    fontSize: 'Font Size',
    textSpacing: 'Text Spacing',
    backdrop: 'Backdrop',
    texture: 'Texture',
    unique: 'Unique',
    panoramic: 'Panoramic',
    uploadTexture: 'Upload Texture',
    uploadGlobal: 'Upload Global Texture',
    uploadLocal: 'Upload Local Texture',
    resetShared: 'Reset to Shared',
    deviceRendering: 'Device Rendering',
    showChassis: 'Show Chassis',
    compatibleFrame: 'Compatible Frame',
    bezelThickness: 'Bezel Thickness',
    downloadFrame: 'Download Frame',
    stageWaiting: 'Stage is waiting.',
    selectSnapshot: 'Select a snapshot.',
    headlineContent: 'Headline Content',
    environment: 'Environment',
    aiMatch: 'AI Match',
    aiNotConnected: 'Gemini AI is not connected. Add your API_KEY to unlock smart color matching.',
    solid: 'Solid',
    image: 'Image'
  },
  zh: {
    library: '媒体库',
    import: '导入',
    presets: '输出尺寸 (Output)',
    workspace: '工作区',
    storefront: '商店预览',
    targeting: '目标输出:',
    exportAll: '全部导出',
    generating: '正在打包 ZIP',
    rendering: '正在渲染',
    editing: '正在编辑',
    emptyTitle: 'SnapStage 是空的',
    emptyDesc: '导入截图以开始构建您的全景商店画廊。',
    getStarted: '开始使用',
    properties: '属性',
    syncText: '同步文字',
    headlinePlaceholder: '输入标题内容...',
    typeface: '字体',
    fill: '颜色',
    fontSize: '字号',
    textSpacing: '文字间距',
    backdrop: '底色',
    texture: '纹理',
    unique: '独立',
    panoramic: '全景',
    uploadTexture: '上传纹理',
    uploadGlobal: '上传全局纹理',
    uploadLocal: '上传局部纹理',
    resetShared: '重置为共享',
    deviceRendering: '设备渲染',
    showChassis: '显示外壳',
    compatibleFrame: '适配框架',
    bezelThickness: '边框厚度',
    downloadFrame: '下载单图',
    stageWaiting: '等待中',
    selectSnapshot: '请选择一张截图。',
    headlineContent: '标题内容',
    environment: '环境',
    aiMatch: '智能配色',
    aiNotConnected: 'Gemini AI 未连接。请添加 API_KEY 以解锁智能配色功能。',
    solid: '纯色',
    image: '图片'
  }
};

const DEFAULT_BEZEL_THICKNESS = 2.0;

const App: React.FC = () => {
  const [locale, setLocale] = useState('en');
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const [images, setImages] = useState<ImageState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetDimension, setTargetDimension] = useState<Dimension>(STORE_PRESETS[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'storefront'>('storefront');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('marketing');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgSource, setBgSource] = useState<'solid' | 'image'>('solid');
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [bezelThickness, setBezelThickness] = useState(DEFAULT_BEZEL_THICKNESS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [panoramicBgUrl, setPanoramicBgUrl] = useState<string | null>(null);
  
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [textConfig, setTextConfig] = useState<TextConfig>({
    fontSize: 80,
    color: '#0f172a',
    fontWeight: '800',
    padding: 100,
    fontFamily: "'Inter', sans-serif",
    spacing: 60,
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIdx];
    newImages.splice(draggedIdx, 1);
    newImages.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setImages(newImages);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (selectedId === id) {
        setSelectedId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    setPreviewCache(prev => {
      const newCache = { ...prev };
      delete newCache[id];
      return newCache;
    });
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
    idx: number,
    totalCount: number,
    dimension: Dimension, 
    fallbackBg: string,
    sourceBg: 'solid' | 'image',
    layout: LayoutMode,
    tConfig: TextConfig,
    deviceFrame: boolean,
    bezelThick: number,
    bgMode: 'single' | 'panoramic',
    globalPanoramic: string | null
  ): Promise<string | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = dimension.width;
    canvas.height = dimension.height;

    if (sourceBg === 'image') {
      if (bgMode === 'panoramic' && globalPanoramic) {
        const bgImg = new Image();
        bgImg.src = globalPanoramic;
        await new Promise((r) => (bgImg.onload = r));
        const totalTargetWidth = dimension.width * totalCount;
        const bgAspect = bgImg.width / bgImg.height;
        const totalAspect = totalTargetWidth / dimension.height;
        let sW, sH, sX, sY;
        if (bgAspect > totalAspect) {
          sH = bgImg.height; sW = bgImg.height * totalAspect;
          sY = 0; sX = (bgImg.width - sW) / 2;
        } else {
          sW = bgImg.width; sH = bgImg.width / totalAspect;
          sX = 0; sY = (bgImg.height - sH) / 2;
        }
        const sliceSourceW = sW / totalCount;
        const sliceSourceX = sX + (idx * sliceSourceW);
        ctx.drawImage(bgImg, sliceSourceX, sY, sliceSourceW, sH, 0, 0, canvas.width, canvas.height);
      } else {
        const activeTexture = imgState.customBgUrl || globalPanoramic;
        if (activeTexture) {
          const bgImg = new Image();
          bgImg.src = activeTexture;
          await new Promise((r) => (bgImg.onload = r));
          const imgAspect = bgImg.width / bgImg.height;
          const canvasAspect = canvas.width / canvas.height;
          let dW, dH, dX, dY;
          if (imgAspect > canvasAspect) {
            dH = canvas.height; dW = canvas.height * imgAspect;
            dY = 0; dX = (canvas.width - dW) / 2;
          } else {
            dW = canvas.width; dH = canvas.width / imgAspect;
            dX = 0; dY = (canvas.height - dH) / 2;
          }
          ctx.drawImage(bgImg, dX, dY, dW, dH);
        } else {
          ctx.fillStyle = fallbackBg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
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

      const maxWidth = canvas.width - (tConfig.padding * 2);
      const lineHeight = tConfig.fontSize * 1.3;
      const manualLines = imgState.title.split('\n');
      const finalLines: string[] = [];

      manualLines.forEach(manualLine => {
        const words = manualLine.split(' ');
        let currentLine = '';
        for (let n = 0; n < words.length; n++) {
          let testLine = currentLine + (currentLine ? ' ' : '') + words[n];
          let metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            finalLines.push(currentLine);
            currentLine = words[n];
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine || manualLine === '') finalLines.push(currentLine);
      });

      finalLines.forEach((l, i) => {
        if (l.trim()) ctx.fillText(l.trim(), canvas.width / 2, tConfig.padding + (i * lineHeight));
      });

      const totalTextHeight = finalLines.length * lineHeight;
      imageAreaY = tConfig.padding + totalTextHeight + tConfig.spacing;
      imageAreaHeight = canvas.height - imageAreaY;
    }

    const isLandscape = canvas.width > canvas.height;
    const margin = canvas.width * (isLandscape ? 0.08 : 0.12); 
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
            id: newId, originalUrl: event.target?.result as string, processedUrl: null,
            name: file.name, width: img.width, height: img.height, title: '', customBgUrl: null
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
      const dataUrl = event.target?.result as string;
      if (bgUploadMode === 'panoramic') {
        setPanoramicBgUrl(dataUrl);
      } else if (selectedId) {
        setImages(prev => prev.map(img => img.id === selectedId ? { ...img, customBgUrl: dataUrl } : img));
        if (!panoramicBgUrl) setPanoramicBgUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const resetCustomBg = () => {
    if (!selectedId) return;
    setImages(prev => prev.map(img => img.id === selectedId ? { ...img, customBgUrl: null } : img));
  };

  const harmonizeTheme = async (imgState: ImageState) => {
    setAnalyzingId(imgState.id);
    const base64 = imgState.originalUrl.split(',')[1];
    try {
      const suggestions = await analyzeScreenshotColors(base64);
      setBgColor(suggestions.backgroundColor);
      setBgSource('solid');
      setTextConfig(prev => ({ ...prev, color: suggestions.accentColor }));
    } catch (err) { console.error(err); } finally { setAnalyzingId(null); }
  };

  useEffect(() => {
    if (images.length === 0) return;
    const updateAllImages = async () => {
      setIsProcessing(true);
      const newCache: Record<string, string> = {};
      for (let i = 0; i < images.length; i++) {
        const imgState = images[i];
        const result = await processSingleImage(
          imgState, i, images.length, targetDimension, bgColor, bgSource,
          layoutMode, textConfig, showDeviceFrame, bezelThickness, bgUploadMode, panoramicBgUrl
        );
        if (result) newCache[imgState.id] = result;
      }
      setPreviewCache(newCache);
      setIsProcessing(false);
    };
    const timeoutId = setTimeout(updateAllImages, 150); 
    return () => clearTimeout(timeoutId);
  }, [targetDimension, bgColor, bgSource, layoutMode, textConfig, showDeviceFrame, bezelThickness, images, bgUploadMode, panoramicBgUrl, processSingleImage]);

  const updateImageTitle = (id: string, title: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, title } : img));
  };

  const handleDownload = (img: ImageState) => {
    const url = previewCache[img.id];
    if (!url) return;
    const link = document.createElement('a');
    link.download = `snapstage-${targetDimension.width}x${targetDimension.height}-${img.name.replace(/\.[^/.]+$/, "")}.png`;
    link.href = url;
    link.click();
  };

  // Fixed handleExportAll to address 'unknown' type issues with ZIP generation and image handling
  const handleExportAll = async () => {
    if (images.length === 0) return;
    setIsExporting(true);

    try {
      if (images.length === 1) {
        // Explicitly cast to ImageState to resolve 'unknown' type issues
        const firstImg = images[0] as ImageState;
        handleDownload(firstImg);
      } else {
        const zip = new JSZip();
        // Explicitly type the iterator variable to avoid inference issues
        images.forEach((img: ImageState, idx: number) => {
          const url = previewCache[img.id];
          if (url) {
            const base64Data = url.split(',')[1];
            // Accessing the name property of a typed object correctly
            const fileName = `${idx + 1}-${img.name.replace(/\.[^/.]+$/, "")}.png`;
            zip.file(fileName, base64Data, { base64: true });
          }
        });

        // zip.generateAsync may return any or unknown, cast it to ensure compatibility with createObjectURL
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        // Ensure the generated content is treated as a Blob for URL.createObjectURL
        link.href = URL.createObjectURL(content as Blob);
        link.download = `SnapStage-Export-${targetDimension.width}x${targetDimension.height}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const groupedPresets = useMemo<Record<string, Dimension[]>>(() => {
    return STORE_PRESETS.reduce((acc, preset) => {
      if (!acc[preset.category]) acc[preset.category] = [];
      acc[preset.category].push(preset);
      return acc;
    }, {} as Record<string, Dimension[]>);
  }, []);

  const hasApiKey = !!(typeof process !== "undefined" && process.env.API_KEY);

  // Helper to ensure hex code starts with #
  const formatHex = (val: string) => val.startsWith('#') ? val : `#${val}`;
  // Basic validation to prevent crashing on invalid typed hex codes
  const isValidHex = (val: string) => /^#([A-Fa-f0-9]{3}){1,2}$/.test(val);

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden font-inter select-none">
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden h-full z-40">
        <div className="h-16 shrink-0 px-5 flex items-center gap-3 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
           <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-200">
             <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" xmlns="http://www.w3.org/2000/swap">
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
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.library}</h2>
              <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">{t.import}</button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div key={img.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd} onClick={() => setSelectedId(img.id)} className={`aspect-[9/16] rounded-lg cursor-grab active:cursor-grabbing border-2 transition-all relative group overflow-hidden ${selectedId === img.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-50' : 'border-slate-100 hover:border-slate-300'} ${draggedIdx === idx ? 'opacity-40 scale-95' : 'opacity-100'}`}>
                  <img src={img.originalUrl} alt={img.name} className="w-full h-full object-cover pointer-events-none" />
                  
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono text-white pointer-events-none uppercase">
                    Input: {img.width}x{img.height}
                  </div>

                  <button onClick={(e) => removeImage(img.id, e)} className="absolute top-1 right-1 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all z-20 hover:bg-rose-600 hover:scale-110 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-[9/16] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-500 hover:border-indigo-500 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.presets}</h2>
              <div className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[8px] font-black rounded uppercase">Output</div>
            </div>
            <div className="space-y-6">
              {(Object.entries(groupedPresets) as [string, Dimension[]][]).map(([category, presets]) => (
                <div key={category} className="space-y-1.5">
                  <h3 className={`text-[9px] font-bold px-1 uppercase tracking-tighter ${category === 'iPhone' ? 'text-indigo-600 opacity-100 font-black' : 'text-slate-900 opacity-30'}`}>{category}</h3>
                  <div className="space-y-1">
                    {presets.map((p) => (
                      <button 
                        key={p.label} 
                        onClick={() => setTargetDimension(p)} 
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all border-l-2 ${targetDimension.label === p.label ? 'bg-indigo-600 text-white shadow-md border-indigo-400' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-transparent'}`}
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
                <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t.workspace}</button>
                <button onClick={() => setViewMode('storefront')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'storefront' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t.storefront}</button>
             </div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               {t.targeting} <span className="text-slate-900 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full font-mono">{targetDimension.width} × {targetDimension.height}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {LANGUAGES.map(lang => (
                <button key={lang.value} onClick={() => setLocale(lang.value)} className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${locale === lang.value ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>{lang.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {(isProcessing || isExporting) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full animate-pulse">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    {isExporting ? t.generating : t.rendering}
                  </span>
                </div>
              )}
              <button 
                onClick={handleExportAll} 
                disabled={images.length === 0 || isExporting} 
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-black rounded-xl transition-all shadow-xl disabled:opacity-50 uppercase tracking-widest"
              >
                {t.exportAll}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <section className="flex-1 overflow-auto custom-scrollbar relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage: 'radial-gradient(#000 1.5px, transparent 0)', backgroundSize: '32px 32px'}}></div>
            <div className={`min-h-full flex items-center justify-center p-12 lg:p-24 ${viewMode === 'storefront' ? 'flex-row' : 'flex-wrap gap-20'}`}>
              {images.length > 0 ? (
                <div className={`flex ${viewMode === 'storefront' ? 'flex-row items-center gap-4 px-12' : 'flex-wrap justify-center gap-20 w-full max-w-7xl'} animate-in`}>
                  {images.map((img, idx) => (
                    <div key={img.id} ref={(el) => { if (el) itemRefs.current.set(img.id, el); else itemRefs.current.delete(img.id); }} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd} onClick={() => setSelectedId(img.id)} className={`relative shrink-0 transition-all duration-300 ease-in-out cursor-grab active:cursor-grabbing ${selectedId === img.id ? 'scale-100 z-10' : 'scale-[0.92] opacity-60 hover:opacity-100'} ${draggedIdx === idx ? 'opacity-20 scale-90 grayscale' : 'opacity-100'}`}>
                      <div className={`shadow-[0_50px_100px_rgba(0,0,0,0.12)] rounded-[3rem] overflow-hidden border-[8px] transition-all bg-white ${selectedId === img.id ? 'border-indigo-600 ring-[20px] ring-indigo-500/5' : 'border-white'}`}>
                        {previewCache[img.id] ? <img src={previewCache[img.id]} alt={img.name} className="h-[60vh] lg:h-[75vh] w-auto block select-none pointer-events-none" /> : <div className="h-[60vh] lg:h-[75vh] aspect-[9/19.5] flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
                      </div>
                      {selectedId === img.id && <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">{t.editing}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 animate-in">
                  <div className="w-24 h-24 bg-indigo-50 rounded-[3rem] flex items-center justify-center mb-8 border border-indigo-100 shadow-xl shadow-indigo-50"><svg viewBox="0 0 24 24" className="w-10 h-10 text-indigo-500" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V7C21 4.79086 19.2091 3 17 3H7Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M17 7L17.01 7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
                  <h3 className="text-slate-900 font-black text-2xl mb-3 tracking-tight">{t.emptyTitle}</h3>
                  <p className="text-slate-400 text-xs font-medium mb-8 max-w-[240px]">{t.emptyDesc}</p>
                  <button onClick={() => fileInputRef.current?.click()} className="px-10 py-4 bg-indigo-600 text-white font-black text-[11px] rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 uppercase tracking-widest">{t.getStarted}</button>
                </div>
              )}
            </div>
          </section>

          <aside className={`w-80 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden h-full z-40 transition-transform duration-300 ${selectedImage ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}>
            {selectedImage ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
                <div className="flex items-center justify-between"><h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{t.properties}</h3>
                  <div className="flex items-center gap-2">{hasApiKey ? (<button onClick={() => harmonizeTheme(selectedImage)} className="group relative p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" /></svg><span className="absolute -left-20 -top-8 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t.aiMatch}</span></button>) : (<div className="group relative p-2.5 bg-slate-50 text-slate-300 rounded-xl cursor-help"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none"><p className="text-[9px] font-bold text-slate-900 leading-tight">{t.aiNotConnected}</p></div></div>)}</div>
                </div>
                <section className="space-y-4">
                  <div className="flex items-center justify-between"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.headlineContent}</label><button onClick={applyToAll} className="text-[9px] font-bold text-indigo-600 uppercase hover:underline">{t.syncText}</button></div>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none resize-none h-28 transition-all shadow-inner" value={selectedImage.title} onChange={(e) => updateImageTitle(selectedId!, e.target.value)} placeholder={t.headlinePlaceholder} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.typeface}</label><select value={textConfig.fontFamily} onChange={(e) => setTextConfig(prev => ({ ...prev, fontFamily: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] font-bold outline-none cursor-pointer focus:bg-white transition-colors">{FONT_FAMILIES.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}</select></div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.fill}</label>
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 group-focus-within:border-indigo-400 transition-colors">
                        <div className="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer shadow-sm overflow-hidden relative">
                          <input 
                            type="color" 
                            value={isValidHex(textConfig.color) ? textConfig.color : '#000000'} 
                            onChange={(e) => setTextConfig(prev => ({ ...prev, color: e.target.value }))} 
                            className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer" 
                          />
                        </div>
                        <input 
                          type="text" 
                          value={textConfig.color}
                          onChange={(e) => {
                            const val = formatHex(e.target.value);
                            setTextConfig(prev => ({ ...prev, color: val }));
                          }}
                          className="w-full bg-transparent border-0 p-0 text-[10px] font-mono font-bold text-slate-600 outline-none focus:ring-0 uppercase"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 pt-2">
                    <div className="space-y-3"><div className="flex justify-between text-[9px] font-black text-slate-400 uppercase"><span>{t.fontSize}</span><span className="text-indigo-600">{textConfig.fontSize}pt</span></div><input type="range" min="40" max="280" value={textConfig.fontSize} onChange={(e) => setTextConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" /></div>
                    <div className="space-y-3"><div className="flex justify-between text-[9px] font-black text-slate-400 uppercase"><span>{t.textSpacing}</span><span className="text-indigo-600">{textConfig.spacing}px</span></div><input type="range" min="-150" max="400" value={textConfig.spacing} onChange={(e) => setTextConfig(prev => ({ ...prev, spacing: parseInt(e.target.value) }))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" /></div>
                  </div>
                </section>
                <section className="space-y-4 pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{t.environment}</label><div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setBgSource('solid')} className={`px-2.5 py-1 text-[8px] font-black rounded-md uppercase transition-all ${bgSource === 'solid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t.solid}</button><button onClick={() => setBgSource('image')} className={`px-2.5 py-1 text-[8px] font-black rounded-md uppercase transition-all ${bgSource === 'image' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t.image}</button></div></div>
                  <div className="space-y-5 animate-in">
                    {bgSource === 'solid' ? (
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 group-focus-within:border-indigo-400 transition-colors">
                        <span className="text-[11px] font-bold text-slate-600 uppercase whitespace-nowrap mr-2">{t.backdrop}</span>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <input 
                            type="text" 
                            value={bgColor}
                            onChange={(e) => {
                              const val = formatHex(e.target.value);
                              setBgColor(val);
                            }}
                            className="w-16 bg-transparent border-0 p-0 text-[10px] font-mono font-bold text-slate-600 text-right outline-none focus:ring-0 uppercase"
                            maxLength={7}
                          />
                          <div className="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer shadow-sm overflow-hidden relative shrink-0">
                            <input 
                              type="color" 
                              value={isValidHex(bgColor) ? bgColor : '#ffffff'} 
                              onChange={(e) => setBgColor(e.target.value)} 
                              className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer" 
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                          <button onClick={() => setBgUploadMode('single')} className={`flex-1 py-1.5 text-[9px] font-black rounded-xl uppercase transition-all ${bgUploadMode === 'single' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}>{t.unique}</button>
                          <button onClick={() => setBgUploadMode('panoramic')} className={`flex-1 py-1.5 text-[9px] font-black rounded-xl uppercase transition-all ${bgUploadMode === 'panoramic' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}>{t.panoramic}</button>
                        </div>
                        <div className="space-y-2">
                          <button onClick={() => bgInputRef.current?.click()} className="w-full py-3 bg-white border border-slate-200 text-indigo-600 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all shadow-sm">{bgUploadMode === 'panoramic' ? t.uploadGlobal : t.uploadLocal}</button>
                          {bgUploadMode === 'single' && selectedImage?.customBgUrl && (<button onClick={resetCustomBg} className="w-full py-1.5 text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors">{t.resetShared}</button>)}
                          <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
                <section className="space-y-4 pt-8 border-t border-slate-100"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{t.deviceRendering}</label><div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-2"><div className="flex flex-col"><span className="text-[11px] font-black text-indigo-950 uppercase tracking-tight">{t.showChassis}</span><span className="text-[9px] text-indigo-400 font-bold uppercase mt-0.5">{t.compatibleFrame}</span></div><button onClick={() => setShowDeviceFrame(!showDeviceFrame)} className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${showDeviceFrame ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${showDeviceFrame ? 'left-7' : 'left-1'}`}></div></button></div>{showDeviceFrame && (<div className="space-y-3 pt-2"><div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase"><div className="flex items-center gap-2"><span>{t.bezelThickness}</span><button onClick={() => setBezelThickness(DEFAULT_BEZEL_THICKNESS)} className="text-indigo-600 hover:text-indigo-800 transition-colors p-0.5 hover:bg-indigo-50 rounded" title="Reset to default"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button></div><span className="text-indigo-600">{bezelThickness.toFixed(1)}%</span></div><input type="range" min="0.5" max="12.0" step="0.1" value={bezelThickness} onChange={(e) => setBezelThickness(parseFloat(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" /></div>)}</section>
                <div className="pt-10"><button onClick={() => handleDownload(selectedImage)} className="w-full py-4 bg-slate-900 text-white font-black text-[11px] rounded-[1.5rem] hover:bg-black transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>{t.downloadFrame}</button></div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300 gap-6 opacity-30"><svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V7C21 4.79086 19.2091 3 17 3H7Z" stroke="currentColor" strokeWidth="1" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" /></svg><p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">{t.stageWaiting}<br/>{t.selectSnapshot}</p></div>
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

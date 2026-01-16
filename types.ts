
export interface Dimension {
  width: number;
  height: number;
  label: string;
  category: 'iPhone' | 'iPad' | 'Watch';
}

export const APPLE_PRESETS: Dimension[] = [
  // iPhone
  { width: 1242, height: 2688, label: "6.5\" (XS Max/11 Pro Max) - Port", category: 'iPhone' },
  { width: 2688, height: 1242, label: "6.5\" (XS Max/11 Pro Max) - Land", category: 'iPhone' },
  { width: 1284, height: 2778, label: "6.7\" (12/13/14 Pro Max) - Port", category: 'iPhone' },
  { width: 2778, height: 1284, label: "6.7\" (12/13/14 Pro Max) - Land", category: 'iPhone' },
  
  // iPad
  { width: 2048, height: 2732, label: "iPad Pro 12.9\" - Port", category: 'iPad' },
  { width: 2732, height: 2048, label: "iPad Pro 12.9\" - Land", category: 'iPad' },
  { width: 1668, height: 2388, label: "iPad Pro 11\" - Port", category: 'iPad' },
  { width: 2388, height: 1668, label: "iPad Pro 11\" - Land", category: 'iPad' },

  // Watch
  { width: 410, height: 502, label: "Watch Ultra (49mm)", category: 'Watch' },
  { width: 396, height: 484, label: "Watch Series 7-9 (45mm)", category: 'Watch' },
  { width: 368, height: 448, label: "Watch Series 4-6/SE (44mm)", category: 'Watch' }
];

export type ResizeMode = 'contain' | 'cover' | 'stretch';

export interface ImageState {
  id: string;
  originalUrl: string;
  processedUrl: string | null;
  name: string;
  width: number;
  height: number;
}

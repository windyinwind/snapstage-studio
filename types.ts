
export interface Dimension {
  width: number;
  height: number;
  label: string;
  category: 'iPhone' | 'iPad' | 'Watch' | 'Android Phone' | 'Android Tablet';
}

export const STORE_PRESETS: Dimension[] = [
  // iPhone
  { width: 1290, height: 2796, label: "6.7\" (14/15/16 Pro Max) - Port", category: 'iPhone' },
  { width: 1284, height: 2778, label: "6.7\" (12/13 Pro Max) - Port", category: 'iPhone' },
  { width: 1242, height: 2688, label: "6.5\" (XS Max/11 Pro Max) - Port", category: 'iPhone' },
  { width: 1242, height: 2208, label: "5.5\" (6s/7/8 Plus) - Port", category: 'iPhone' },
  
  // Android
  { width: 1080, height: 1920, label: "Phone (1080p) - Port", category: 'Android Phone' },
  { width: 1440, height: 2560, label: "Phone (QHD) - Port", category: 'Android Phone' },
  { width: 1920, height: 1080, label: "Phone (1080p) - Land", category: 'Android Phone' },

  // iPad
  { width: 2048, height: 2732, label: "iPad Pro 12.9\" - Port", category: 'iPad' },
  { width: 1668, height: 2388, label: "iPad Pro 11\" - Port", category: 'iPad' },

  // Android Tablet
  { width: 1200, height: 1920, label: "7-inch Tablet - Port", category: 'Android Tablet' },
  { width: 2048, height: 1536, label: "10-inch Tablet - Port", category: 'Android Tablet' },

  // Watch
  { width: 410, height: 502, label: "Watch Ultra (49mm)", category: 'Watch' },
  { width: 396, height: 484, label: "Watch Series 7-9 (45mm)", category: 'Watch' }
];

export type ResizeMode = 'contain' | 'cover' | 'stretch';
export type LayoutMode = 'standard' | 'marketing';

export interface TextConfig {
  fontSize: number;
  color: string;
  fontWeight: string;
  padding: number;
  fontFamily: string;
  spacing: number; // Vertical spacing between text and device
}

export interface ImageState {
  id: string;
  originalUrl: string;
  processedUrl: string | null;
  name: string;
  width: number;
  height: number;
  title: string;
  customBgUrl: string | null;
}

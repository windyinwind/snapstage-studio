
export interface Dimension {
  width: number;
  height: number;
  label: string;
  category: 'iPhone' | 'iPad' | 'Watch' | 'Android';
}

export const STORE_PRESETS: Dimension[] = [
  // iPhone Portrait - Prioritized by most common submission requirements
  { width: 1284, height: 2778, label: "1284 × 2778 px (6.7\" Display)", category: 'iPhone' },
  { width: 1242, height: 2688, label: "1242 × 2688 px (6.5\" Display)", category: 'iPhone' },
  { width: 1290, height: 2796, label: "1290 × 2796 px (6.7\" iPhone 15/14)", category: 'iPhone' },
  { width: 1320, height: 2868, label: "1320 × 2868 px (6.9\" iPhone 16)", category: 'iPhone' },
  { width: 1242, height: 2208, label: "1242 × 2208 px (5.5\" Display)", category: 'iPhone' },

  // iPhone Landscape
  { width: 2778, height: 1284, label: "2778 × 1284 px (6.7\" Landscape)", category: 'iPhone' },
  { width: 2688, height: 1242, label: "2688 × 1242 px (6.5\" Landscape)", category: 'iPhone' },
  { width: 2796, height: 1290, label: "2796 × 1290 px (6.7\" Landscape)", category: 'iPhone' },
  { width: 2208, height: 1242, label: "2208 × 1242 px (5.5\" Landscape)", category: 'iPhone' },

  // iPad
  { width: 2048, height: 2732, label: "2048 × 2732 px (iPad Pro 12.9\")", category: 'iPad' },
  { width: 2732, height: 2048, label: "2732 × 2048 px (iPad Landscape)", category: 'iPad' },

  // Android
  { width: 1080, height: 1920, label: "1080 × 1920 px (Android Phone)", category: 'Android' },
  { width: 1440, height: 2560, label: "1440 × 2560 px (Android QHD)", category: 'Android' },

  // Watch
  { width: 410, height: 502, label: "410 × 502 px (Watch Ultra)", category: 'Watch' }
];

export type ResizeMode = 'contain' | 'cover' | 'stretch';
export type LayoutMode = 'standard' | 'marketing';

export interface TextConfig {
  fontSize: number;
  color: string;
  fontWeight: string;
  padding: number;
  fontFamily: string;
  spacing: number;
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

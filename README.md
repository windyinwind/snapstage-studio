# SnapStage

**SnapStage** is a high-performance design tool for mobile developers to transform raw app screenshots into polished, store-ready marketing materials. Designed specifically to navigate the strict requirements of Apple App Store Connect and Google Play Store.

## 🚀 Key Features

- **Store-Perfect Dimensions**: One-click resizing for all mandatory iPhone, iPad, Apple Watch, and Android device sizes.
- **Dynamic Panoramic Backgrounds**: Upload a single wide image and automatically slice it across multiple frames. Reorder screenshots via drag-and-drop, and the background slices update in real-time to maintain a continuous visual flow.
- **Shared & Unique Textures**: Intelligently switch between "Panoramic" (shared) and "Unique" (local) texture modes. Textures uploaded in one mode are remembered, allowing you to quickly experiment without re-uploading.
- **Multi-Language Support (CJK)**: Full support for **Chinese (Simplified), Japanese, and Korean** rendering with high-quality Noto Sans typography.
- **i18n Interface**: Localized UI available in English, Chinese (Simplified), Japanese, and Korean.
- **Precision Typography**: Full control over font size, typeface (Inter, Playfair, Modern, etc.), and a dedicated **Vertical Spacing** slider to adjust the gap between headlines and device frames.
- **AI Color Harmonization**: Uses Gemini AI to analyze your screenshot's palette and suggest perfectly matching background and accent colors.
- **Custom Chassis Rendering**: Toggle high-quality device frames with adjustable bezel thickness and dynamic "Dynamic Island" rendering for modern iPhones.
- **Real-time Store Preview**: A "Storefront" mode that displays your screenshots horizontally exactly as they appear in the App Store or Google Play.

## 🤖 Connecting AI (Gemini)

SnapStage uses **Google Gemini 3 Flash** to power its "AI Match" feature. This analyzes your screenshots to suggest brand-accurate color palettes.

### How to connect:
1. **Get an API Key**: Visit [Google AI Studio](https://aistudio.google.com/) and create a free API key.
2. **Set Environment Variable**: The app looks for an environment variable named `API_KEY`.
   - **Local Development**: Create a `.env` file in the root and add `API_KEY=your_key_here`.
   - **Deployment**: Add `API_KEY` to your platform's (Vercel, Netlify, etc.) environment variables.
3. **Usage**: Once connected, an **AI Match** button will appear in the Properties panel when a screenshot is selected.

## 🛠 Technical Highlights

- **Frontend**: React 18 with Tailwind CSS.
- **AI Integration**: Powered by `@google/genai`.
- **Rendering**: Asynchronous canvas-based rendering engine that handles complex image slicing and multi-line CJK text wrapping.
- **Performance**: Decoupled state cache to ensure fluid UI interaction even with high-resolution source images.
- **Privacy**: Image processing is performed locally on your device; only image data for color analysis is sent to the AI provider.

## 📖 Usage

1. **Import Snapshots**: Drag and drop your mobile screenshots into the Library.
2. **Select Target**: Choose your target store preset (e.g., iPhone 16 Pro Max).
3. **Design**: Add headlines, choose your language/typeface, and adjust vertical spacing to fit your copy.
4. **Panoramic Mode**: Toggle "Panoramic" background mode to spread a single image across multiple frames. Drag and reorder thumbnails in the library to see the panorama adjust automatically.
5. **AI Magic**: Use the "AI Match" button to instantly sync your frame colors with your app's brand.
6. **Export**: Bulk export your entire project or download individual frames.

---

*Built for developers who care about aesthetics.*
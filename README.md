# SnapStage

**SnapStage** is a high-performance design tool for mobile developers to transform raw app screenshots into polished, store-ready marketing materials. Designed specifically to navigate the strict requirements of Apple App Store Connect and Google Play Store.

## 🚀 Key Features

- **Store-Perfect Dimensions**: One-click resizing for all mandatory iPhone, iPad, and Android device sizes.
- **Panoramic Backgrounds**: Upload a single wide image and automatically slice it across multiple screenshot frames for a continuous visual experience.
- **AI Color Harmonization**: Uses Gemini AI to analyze your screenshot's palette and suggest perfectly matching background and accent colors.
- **Custom Chassis Rendering**: Toggle high-quality device frames with adjustable bezel thickness and dynamic "Dynamic Island" rendering.
- **Real-time Store Preview**: A "Storefront" mode that displays your screenshots horizontally exactly as they appear in the App Store or Google Play.

## 🤖 Connecting AI (Gemini)

SnapStage uses **Google Gemini 3 Flash** to power its "AI Match" feature. This analyzes your screenshots to suggest brand-accurate color palettes.

### How to connect:
1. **Get an API Key**: Visit [Google AI Studio](https://aistudio.google.com/) and create a free API key.
2. **Set Environment Variable**: The app looks for an environment variable named `API_KEY`.
   - **Local Development**: Create a `.env` file in the root and add `API_KEY=your_key_here`.
   - **Deployment**: Add `API_KEY` to your platform's (Vercel, Netlify, etc.) environment variables.
3. **Usage**: Once connected, a ✨ icon will appear next to the "Properties" header in the inspector when a screenshot is selected.

## 🛠 Technical Highlights

- **Frontend**: React 18 with Tailwind CSS.
- **AI Integration**: Powered by `@google/genai`.
- **Performance**: Asynchronous canvas-based rendering with a decoupled state cache to ensure fluid typing.
- **Privacy**: Image processing is performed locally; only image data for color analysis is sent to the AI provider.

## 📖 Usage

1. **Import Snapshots**: Drag and drop your mobile screenshots into the Library.
2. **Select Target**: Choose your target store preset (e.g., iPhone 15 Pro Max).
3. **Design**: Add headlines, adjust fonts, and choose a background color.
4. **Panoramic Mode**: Toggle "Panoramic" background mode to spread a single image across multiple frames.
5. **AI Magic**: Use the "AI Match" button to instantly sync your frame colors with your app's brand.
6. **Export**: Bulk export your entire project or download individual frames.

---

*Built for developers who care about aesthetics.*
# Vylant - Next-Gen Social Communication Platform

Vylant is a modern, real-time social communication and community platform featuring instant messaging, voice & video mesh calls, rich global servers with role-based permissions, scheduled messages, vanish mode, stories, and AI assistant capabilities.

---

## 🚀 Quick Start in Visual Studio Code

### 1. Open the Project
1. Open Visual Studio Code.
2. Select **File > Open Folder...** and select the `vylant` project root folder (or in your terminal run `code .`).
3. If prompted by VS Code to install recommended extensions (Tailwind CSS IntelliSense, Prettier), click **Install All**.

### 2. Install Dependencies
Open the integrated terminal in VS Code (`Ctrl + \`` or `Cmd + \``) and run:
```bash
npm install
```

### 3. Configure Environment Variables
Create your local `.env` file by copying `.env.example`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux / Git Bash:**
```bash
cp .env.example .env
```

*(Optional)* If you wish to enable Google Gemini AI assistant features, add your Gemini API key inside `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
JWT_SECRET=your_custom_jwt_secret
```

---

## 💻 Running & Debugging in VS Code

### Option A: One-Click Run & Debug (F5)
1. In VS Code, open the **Run & Debug** panel (`Ctrl + Shift + D` / `Cmd + Shift + D`).
2. Select **"Full-Stack Dev Server (Node/tsx)"** or **"Full-Stack: Dev Server + Chrome"** from the dropdown.
3. Press **F5** (or click the green Play button).
4. The server will start and the app will open at **`http://localhost:3000`**.

### Option B: Terminal Command
Run the unified full-stack development server directly in VS Code's integrated terminal:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🛠️ VS Code Tasks & Shortcuts

VS Code is pre-configured with workspace tasks (`Ctrl + Shift + B` / `Cmd + Shift + B`):

| Task | Description |
| :--- | :--- |
| **`npm: dev`** | Starts the live development server with hot reload and TypeScript compilation (`tsx server.ts`) on port 3000. |
| **`npm: build`** | Runs full client build (Vite) and bundles backend into `dist/server.cjs` (esbuild). |
| **`npm: lint`** | Runs TypeScript type-checking across frontend and backend (`tsc --noEmit`). |
| **`npm: start`** | Starts the production bundle (`node dist/server.cjs`). |
| **`npm: clean`** | Cleans the `dist` build directory. |

---

## 📦 Production Build & Self-Hosting

To test or deploy the production build locally:

1. **Build the production assets**:
   ```bash
   npm run build
   ```
2. **Start the production server**:
   ```bash
   npm start
   ```
3. The standalone production server will serve the optimized frontend and backend at `http://localhost:3000`.

---

## 🗄️ Local Data Persistence

- User accounts, channels, roles, direct messages, group chats, scheduled messages, and events are stored locally in **`vylant.db`** (SQLite database powered by `better-sqlite3`).
- Uploaded media, attachments, and avatars are stored in the local **`uploads/`** directory.
- Database tables and schema migrations initialize automatically on first launch.

---

## ✨ Features Included

- **Direct Messages & Group Chats**: Real-time messaging, typing indicators, audio voice notes, file/image uploads, message scheduling, vanish mode, starring, and emoji reactions.
- **Servers & Communities**: Rich custom servers with channels (text & voice), categories, granular permission roles, invite system, and banner/icon personalization.
- **Scheduled Messages**: Schedule messages for any future timestamp with editing, instant delivery, and cancellation manager.
- **Voice & Video**: WebRTC mesh voice and video communication with mute, deafen, and screen sharing.
- **AI Assistant**: Conversational AI companion powered by Google Gemini.
- **Stories**: Ephemeral 24-hour visual stories with text overlays and custom viewer stats.
- **Dark/Light Mode**: Polished cyberpunk and clean modern themes.

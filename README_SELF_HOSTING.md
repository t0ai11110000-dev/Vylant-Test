# Self-Hosting Vylant on Your Computer

You can use your own computer as a server for Vylant. Follow these steps to set it up:

## 1. Prerequisites
- **Node.js**: Install the latest LTS version from [nodejs.org](https://nodejs.org/).
- **SQLite**: The app uses SQLite (`vylant.db`) by default, so no database installation is required.

## 2. Preparation
Download the project files to your computer.

## 3. Installation
Open your terminal in the project folder and run:
```bash
npm install
```

## 4. Environment Configuration
Create a file named `.env` in the root directory (you can copy `.env.example`) and add your keys:
```env
PORT=3000
JWT_SECRET=your_random_secret_here
# Optional: Add GEMINI_API_KEY for AI features
GEMINI_API_KEY=your_key_here
```

## 5. Build and Start
Run the following commands to build the app and start it in production mode:
```bash
# Build the client and server
npm run build

# Start the server
npm start
```

## 6. Accessing Your Server
- **Locally**: Visit `http://localhost:3000` in your browser.
- **On Your Network**: Find your computer's local IP (e.g., `192.168.1.5`) and visit `http://192.168.1.5:3000` from other devices on the same Wi-Fi.
- **Externally (For Others)**: 
  - **Option A (Port Forwarding)**: Log in to your router and forward port `3000` to your computer's IP.
  - **Option B (Tunnels)**: Use a tool like [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/pages/how-to/use-cloudflare-tunnel/) to create a secure public URL.
    ```bash
    npx ngrok http 3000
    ```

## 7. Installing the App
Once you open the URL in Chrome (or any modern browser), look for the **Install** icon in the address bar (on desktop) or the **"Add to Home Screen"** prompt (on mobile). This is enabled by the PWA support I've added.

# Video Text Overlay

A browser-based tool for adding overlay text to MP4 and MOV video files using FFmpeg.wasm. Optimized for YouTube and X.com (Twitter) with preset configurations that account for platform player controls.

## Features

- 🎬 Add text overlays to MP4 and MOV videos
- 📺 YouTube and X.com presets with optimized positioning
- 🎨 Custom positioning and styling options
- 💻 100% browser-based - no server required
- ⚡ Powered by FFmpeg.wasm

## Platform Presets

### YouTube Preset
- Song title: 150px from left, 250px from bottom, 70px font
- Artist: 150px from left, 200px from bottom, 45px font
- Optimized to avoid YouTube's bottom player controls (120px buffer)

### X.com (Twitter) Preset
- Song title: 110px from left, 220px from bottom, 60px font
- Artist: 110px from left, 180px from bottom, 38px font
- Optimized for X.com's mobile-heavy player interface

### Custom Preset
- Full control over text positioning, font size, and styling
- All values scale proportionally with video resolution

## How It Works

1. Select a video file (MP4 or MOV)
2. Choose a platform preset or use custom settings
3. Enter song title and/or artist name
4. Click "Add Text Overlay & Download"
5. The processed video downloads automatically

## Technical Details

- Built with React and Vite
- Uses FFmpeg.wasm (multi-threaded) for video processing - automatically falls back to single-threaded if SharedArrayBuffer is unavailable
- Text positioning uses FFmpeg expressions that scale automatically with video resolution
- White text with black border for maximum visibility
- Audio is copied without re-encoding for faster processing
- **Performance**: Uses split-process-stitch approach - only processes start and end segments with overlays, significantly faster than processing entire video
- **Multi-threading**: Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for SharedArrayBuffer support. If headers are not configured, automatically falls back to single-threaded mode.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Setting Up the Repository and Pushing to GitHub

1. **Initialize Git repository** (if not already initialized):
   ```bash
   git init
   ```

2. **Create a `.gitignore` file** (if it doesn't exist) with at least:
   ```
   node_modules/
   dist/
   .env
   .DS_Store
   ```

3. **Add all files to Git**:
   ```bash
   git add .
   ```

4. **Create your first commit**:
   ```bash
   git commit -m "Initial commit: Video text overlay tool"
   ```

5. **Create a new repository on GitHub**:
   - Go to [GitHub](https://github.com) and create a new repository
   - Do NOT initialize it with a README, .gitignore, or license (if you already have these locally)

6. **Connect your local repository to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

7. **Push your code to GitHub**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

## Deploying to GitHub Pages

### Option 1: Using GitHub Actions (Recommended)

1. **Create a GitHub Actions workflow**:
   - Create the directory: `.github/workflows/`
   - Create a file: `.github/workflows/deploy.yml`

2. **Add the following workflow configuration**:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches:
         - main

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       permissions:
         contents: read
         pages: write
         id-token: write

       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '18'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build
           env:
             VITE_BASE_PATH: /${{ github.event.repository.name }}/

         - name: Setup Pages
           uses: actions/configure-pages@v4

         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: './dist'

         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```

3. **Enable GitHub Pages in your repository settings**:
   - Go to Settings → Pages
   - Under "Source", select "GitHub Actions"
   - Save the settings

4. **Push the workflow file**:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Pages deployment workflow"
   git push
   ```

5. **Your site will be available at**:
   `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

### Option 2: Manual Deployment using gh-pages

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add deploy scripts to `package.json`**:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Update `vite.config.js`** to set the base path (or use environment variable):
   ```bash
   # Build with base path
   VITE_BASE_PATH=/YOUR_REPO_NAME/ npm run build
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages in repository settings**:
   - Go to Settings → Pages
   - Under "Source", select "gh-pages" branch
   - Save the settings

### Important Notes for GitHub Pages

- If your repository name is not the root URL (e.g., `https://username.github.io/repo-name/`), you need to set the `VITE_BASE_PATH` environment variable during build
- The GitHub Actions workflow automatically sets this based on your repository name
- For manual deployment, ensure the base path matches your repository name

## Browser Compatibility

Works in modern browsers that support WebAssembly:
- Chrome/Edge (recommended)
- Firefox
- Safari

## License

MIT


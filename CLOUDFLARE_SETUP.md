# Cloudflare Setup Guide for Multi-Threaded FFmpeg.wasm

This guide will help you configure Cloudflare to enable multi-threaded FFmpeg.wasm by adding the required HTTP headers.

## Step 1: Configure DNS in Cloudflare

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your domain (`lilbiff.com`)

2. **Set up DNS Records**
   - Go to **DNS** → **Records**
   - You need a CNAME record pointing to GitHub Pages:
     - **Type:** CNAME
     - **Name:** `video-text-overlay` (or `@` if you want it at the root)
     - **Target:** `your-username.github.io` (replace with your GitHub username)
     - **Proxy status:** Proxied (orange cloud icon) - **IMPORTANT: Must be proxied for headers to work**
     - **TTL:** Auto

3. **Update Namecheap DNS (if needed)**
   - If you're keeping DNS at Namecheap, update the nameservers to Cloudflare's nameservers
   - Cloudflare will show you the nameservers to use (usually something like `ns1.cloudflare.com` and `ns2.cloudflare.com`)
   - Update these in your Namecheap domain settings

## Step 2: Add Required HTTP Headers via Transform Rules

1. **Navigate to Transform Rules**
   - In Cloudflare Dashboard, go to **Rules** → **Transform Rules**

2. **Create Response Header Modification Rule**
   - Click **Create rule** → **Modify response header**
   - **Rule name:** `Add COOP and COEP Headers for SharedArrayBuffer`

3. **Configure the Rule**
   - **When incoming requests match:**
     - **Field:** URI Path
     - **Operator:** starts with
     - **Value:** `/` (applies to all paths)
   
   - **Then modify response header:**
     - Click **Set static** for each header:
     
     **Header 1:**
     - **Header name:** `Cross-Origin-Opener-Policy`
     - **Value:** `same-origin`
     
     **Header 2:**
     - **Header name:** `Cross-Origin-Embedder-Policy`
     - **Value:** `require-corp`
     
     Click **Add header** to add the second one.

4. **Deploy the Rule**
   - Click **Deploy** to save and activate

## Step 3: Verify the Setup

1. **Wait for DNS propagation** (can take a few minutes to 24 hours)
2. **Test the headers:**
   - Visit your site: `https://video-text-overlay.lilbiff.com`
   - Open browser DevTools (F12) → Network tab
   - Reload the page
   - Click on any request → Headers tab
   - Verify you see:
     - `Cross-Origin-Opener-Policy: same-origin`
     - `Cross-Origin-Embedder-Policy: require-corp`

3. **Test SharedArrayBuffer:**
   - Open browser console (F12 → Console)
   - Type: `typeof SharedArrayBuffer`
   - Should return: `"function"` (not `"undefined"`)

## Step 4: Verify Multi-Threaded FFmpeg

Once headers are working:
1. Open your app
2. Check browser console
3. You should see: `"SharedArrayBuffer available - using multi-threaded FFmpeg"`
4. Video processing should be faster!

## Troubleshooting

- **Headers not showing:** Make sure DNS is proxied (orange cloud) in Cloudflare
- **SharedArrayBuffer still undefined:** Clear browser cache and hard refresh (Ctrl+Shift+R)
- **Site not loading:** Check DNS propagation status in Cloudflare dashboard

## Alternative: Using Cloudflare Workers (Advanced)

If Transform Rules don't work, you can use a Cloudflare Worker:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newHeaders = new Headers(response.headers)
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
  newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}
```

But Transform Rules should be sufficient and easier to set up.


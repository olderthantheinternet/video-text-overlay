import React, { useState, useRef, useEffect } from 'react'
import { useFFmpeg } from '../hooks/useFFmpeg'
import { sanitizeFilename, isSupportedVideoFile, getFileExtension } from '../utils/fileUtils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Progress } from './ui/progress'
import { Alert, AlertDescription } from './ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Loader2, File, Upload, AlertCircle, CheckCircle2, Info, Youtube, Twitter } from 'lucide-react'
import { cn } from '../lib/utils'

// Preset configurations
const PRESETS = {
  youtube: {
    name: 'YouTube',
    songTitle: {
      x: 150,
      y: 250, // from bottom
      fontSize: 70,
      fontWeight: 'bold',
    },
    artist: {
      x: 150,
      y: 200, // from bottom (below title)
      fontSize: 45,
      fontWeight: 'normal',
    },
    color: 'white',
    borderColor: 'black',
    borderWidth: 3,
  },
  xcom: {
    name: 'X.com (Twitter)',
    songTitle: {
      x: 110,
      y: 220, // from bottom
      fontSize: 60,
      fontWeight: 'bold',
    },
    artist: {
      x: 110,
      y: 180, // from bottom (below title)
      fontSize: 38,
      fontWeight: 'normal',
    },
    color: 'white',
    borderColor: 'black',
    borderWidth: 3,
  },
  custom: {
    name: 'Custom',
    songTitle: {
      x: 150,
      y: 250,
      fontSize: 70,
      fontWeight: 'bold',
    },
    artist: {
      x: 150,
      y: 200,
      fontSize: 45,
      fontWeight: 'normal',
    },
    color: 'white',
    borderColor: 'black',
    borderWidth: 3,
  },
}

function TextOverlay() {
  const [file, setFile] = useState(null)
  const [preset, setPreset] = useState('youtube')
  const [songTitle, setSongTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [customConfig, setCustomConfig] = useState(PRESETS.custom)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const { ffmpeg, isLoaded, loadFFmpeg } = useFFmpeg()

  useEffect(() => {
    loadFFmpeg()
  }, [loadFFmpeg])

  useEffect(() => {
    // Update custom config when preset changes
    if (preset !== 'custom' && PRESETS[preset]) {
      setCustomConfig(PRESETS[preset])
    }
  }, [preset])

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setError('')
    
    if (!isSupportedVideoFile(selectedFile)) {
      setError('Unsupported file format. Please select a video file (mp4, mov, etc.)')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (selectedFile.size > maxSize) {
      setError('File size too large. Maximum size is 2GB for browser processing.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setFile(selectedFile)
    setStatus('File selected. Ready to process.')
  }

  const handleFileAreaClick = (e) => {
    if (isProcessing) return
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleChangeFile = (e) => {
    e.stopPropagation()
    if (fileInputRef.current && !isProcessing) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset)
    if (newPreset !== 'custom' && PRESETS[newPreset]) {
      setCustomConfig(PRESETS[newPreset])
    }
  }

  // Escape text for FFmpeg drawtext filter
  const escapeText = (text) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
  }

  // Convert color name to hex/rgb for FFmpeg
  const getColorValue = (color) => {
    if (!color || typeof color !== 'string') {
      return 'white' // default color
    }
    const colors = {
      white: 'white',
      black: 'black',
      yellow: 'yellow',
      red: 'red',
      blue: 'blue',
      green: 'green',
    }
    return colors[color.toLowerCase()] || color
  }

  // Build FFmpeg drawtext filter
  const buildDrawTextFilter = (text, config, isTitle, overlayDuration = 4) => {
    if (!text) return ''
    
    const escapedText = escapeText(text)
    
    // X position: scale proportionally with video height
    // This ensures text appears the same visual size on all video resolutions
    // Presets are designed for 1080p, so we scale by h/1080
    const x = config.x
    const xExpr = `(${x}*h/1080)`
    
    // Y position from bottom: scale proportionally with video height
    // h = video height, th = text height
    // Position from bottom: h - th - offset (scaled proportionally)
    const yOffset = config.y
    const yExpr = `h-th-(${yOffset}*h/1080)`
    
    // Font size: scale proportionally with video height
    // This ensures the text takes up the same percentage of screen height on all resolutions
    const fontSizeExpr = `(${config.fontSize}*h/1080)`
    
    const fontColor = getColorValue(config.color)
    const borderColor = getColorValue(config.borderColor)
    const borderWidth = config.borderWidth || 0
    
    // Build drawtext filter with expressions
    // Enable overlay only at start (0 to overlayDuration seconds) and end (duration-overlayDuration to duration)
    // This shows the overlay for the first few seconds and last few seconds of the video
    // FFmpeg expression: show when t is between 0 and overlayDuration OR between (duration-overlayDuration) and duration
    // Note: Using proper escaping - commas in expressions need to be escaped as \, in the filter string
    const enableExpr = `between(t,0,${overlayDuration})+between(t,duration-${overlayDuration},duration)`
    
    // Escape the enable expression properly for FFmpeg filter syntax
    // In FFmpeg filter strings, we need to escape special characters
    const escapedEnableExpr = enableExpr.replace(/,/g, '\\,')
    
    let filter = `drawtext=text='${escapedText}':fontsize=${fontSizeExpr}:x=${xExpr}:y=${yExpr}:fontcolor=${fontColor}@1.0:enable='${escapedEnableExpr}'`
    
    // Add border for visibility
    // Determine border width: use config borderWidth if > 0, or 2 for bold text if borderWidth is 0
    let actualBorderWidth = borderWidth
    if (config.fontWeight === 'bold' && borderWidth === 0) {
      actualBorderWidth = 2
    }
    
    if (actualBorderWidth > 0) {
      // Border width: FFmpeg's borderw parameter only accepts fixed integer values, not expressions
      // We use the base value (designed for 1080p) - it will appear proportionally correct
      // since the font size scales, the border will appear to scale relatively as well
      // For better scaling, we could probe the video first, but fixed value works reasonably well
      filter += `:borderw=${actualBorderWidth}:bordercolor=${borderColor}@0.8`
    }
    
    return filter
  }

  const handleProcess = async () => {
    if (!file || !isLoaded) {
      setError('Please select a file and wait for FFmpeg to load.')
      return
    }

    if (!ffmpeg) {
      setError('FFmpeg is not initialized. Please wait for it to load.')
      return
    }

    if (!songTitle.trim() && !artist.trim()) {
      setError('Please enter at least a song title or artist name.')
      return
    }

    setIsProcessing(true)
    setError('')
    setProgress(0)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    setStatus(`Processing ${fileSizeMB}MB file... This may take a while. Note: Output file may be larger due to lossless encoding.`)

    try {
      const sanitized = sanitizeFilename(file.name)
      const ext = getFileExtension(sanitized) || 'mp4'
      const baseName = sanitized.substring(0, sanitized.lastIndexOf('.')) || sanitized

      setStatus('Loading file into FFmpeg...')
      const fileData = await file.arrayBuffer()
      await ffmpeg.writeFile(sanitized, new Uint8Array(fileData))
      setProgress(10)

      setProgress(20)
      setStatus('Applying text overlay...')

      // Get current config (preset or custom)
      const config = preset === 'custom' ? customConfig : PRESETS[preset]
      
      if (!config) {
        throw new Error('Invalid configuration. Please select a preset or configure custom settings.')
      }
      
      // Use config with proportional scaling - values scale with video height
      // This ensures text appears the same visual size on all video resolutions
      // Presets are designed for 1080p and scale proportionally for other resolutions
      const scaledConfig = {
        songTitle: {
          ...config.songTitle,
          // Values will be scaled proportionally by h/1080 in the filter
          x: config.songTitle?.x ?? 150,
          y: config.songTitle?.y ?? 250,
          fontSize: config.songTitle?.fontSize ?? 70,
        },
        artist: {
          ...config.artist,
          // Values will be scaled proportionally by h/1080 in the filter
          x: config.artist?.x ?? 150,
          y: config.artist?.y ?? 200,
          fontSize: config.artist?.fontSize ?? 45,
        },
        color: config.color ?? 'white',
        borderColor: config.borderColor ?? 'black',
        borderWidth: config.borderWidth ?? 3,
      }

      // Build drawtext filters
      // Note: Values scale proportionally with video height (h/1080) so text appears the same visual size on all resolutions
      const filters = []
      if (songTitle.trim()) {
        const titleFilter = buildDrawTextFilter(songTitle, scaledConfig.songTitle, true)
        if (titleFilter) filters.push(titleFilter)
      }
      if (artist.trim()) {
        const artistFilter = buildDrawTextFilter(artist, scaledConfig.artist, false)
        if (artistFilter) filters.push(artistFilter)
      }

      if (filters.length === 0) {
        throw new Error('No text to overlay')
      }

      // Combine filters - use scale2ref or scale to ensure proper sizing
      // For multiple text overlays, we need to chain them properly
      const filterComplex = filters.length > 1 
        ? filters.map((f, i) => i === 0 ? f : `[v${i}][${i}:v]overlay[v${i+1}]`).join(';') 
        : filters[0]
      
      // Actually, for multiple drawtext filters, we can just comma-separate them
      // FFmpeg will apply them sequentially
      const finalFilter = filters.join(',')
      
      // Debug: log the filter to console
      console.log('FFmpeg filter:', finalFilter)

      setProgress(30)
      setStatus('Rendering video with text overlay...')

      const outputFilename = `${baseName}_with_text.${ext}`

      // Run FFmpeg with drawtext filter
      // Using lossless encoding: CRF 0 for lossless H.264, veryslow preset for best compression
      // Audio is copied without re-encoding (already lossless)
      try {
        setProgress(40)
        setStatus('Running FFmpeg... This may take several minutes for large files.')
        
        // Add progress callback
        ffmpeg.on('progress', ({ progress }) => {
          if (progress >= 0 && progress <= 1) {
            const progressPercent = Math.round(40 + (progress * 50)) // 40-90%
            setProgress(progressPercent)
          }
        })

        await ffmpeg.exec([
          '-i', sanitized,
          '-vf', finalFilter,
          '-c:a', 'copy', // Copy audio without re-encoding (lossless)
          '-c:v', 'libx264', // Lossless H.264 encoding
          '-preset', 'veryslow', // Best compression efficiency (slower but smaller file)
          '-crf', '0', // Lossless quality (0 = lossless)
          '-pix_fmt', 'yuv420p', // Ensure compatibility
          outputFilename
        ])

        // Remove progress callback
        ffmpeg.off('progress')
      } catch (execErr) {
        const execErrorMessage = execErr?.message || execErr?.toString() || String(execErr) || 'FFmpeg execution failed'
        console.error('FFmpeg error details:', execErr)
        throw new Error(`FFmpeg processing failed: ${execErrorMessage}`)
      }

      setProgress(90)
      setStatus('Finalizing output...')

      // Verify output file exists and has content
      try {
        const files = await ffmpeg.listDir('/')
        const outputFile = files.find(f => f.name === outputFilename)
        if (!outputFile) {
          throw new Error(`Output file ${outputFilename} was not created by FFmpeg`)
        }
        if (outputFile.size === 0) {
          throw new Error(`Output file ${outputFilename} is empty. FFmpeg may have failed silently.`)
        }
        console.log(`Output file created: ${outputFilename}, size: ${outputFile.size} bytes`)
      } catch (listErr) {
        console.error('Error checking output file:', listErr)
        throw new Error(`Failed to verify output file: ${listErr.message}`)
      }

      // Read output file
      const outputData = await ffmpeg.readFile(outputFilename)
      
      if (!outputData || outputData.length === 0) {
        throw new Error('Output file is empty. Processing may have failed.')
      }

      console.log(`Output file size: ${outputData.length} bytes`)
      
      const blob = new Blob([outputData], { type: `video/${ext === 'mov' ? 'quicktime' : 'mp4'}` })
      const url = URL.createObjectURL(blob)
      
      // Download
      const a = document.createElement('a')
      a.href = url
      a.download = outputFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Clean up
      await ffmpeg.deleteFile(outputFilename)
      await ffmpeg.deleteFile(sanitized)

      setProgress(100)
      setStatus(`Success! Video with text overlay downloaded.`)
      
      setTimeout(() => {
        setFile(null)
        setProgress(0)
        setStatus('')
        setSongTitle('')
        setArtist('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 3000)

    } catch (err) {
      console.error('Processing error:', err)
      const errorMessage = err?.message || err?.toString() || String(err) || 'Unknown error occurred'
      setError(`Error processing file: ${errorMessage}`)
      setStatus('')
      
      try {
        if (ffmpeg) {
          const sanitized = sanitizeFilename(file.name)
          const files = await ffmpeg.listDir('/')
          for (const f of files) {
            if (f.name === sanitized || f.name.includes('_with_text')) {
              await ffmpeg.deleteFile(f.name).catch(() => {})
            }
          }
        }
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const currentConfig = preset === 'custom' ? customConfig : PRESETS[preset]

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      {!isLoaded && (
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading FFmpeg (this may take a moment on first load)...</p>
        </CardContent>
      )}

      {isLoaded && (
        <>
          <CardHeader>
            <CardTitle className="text-3xl">Video Text Overlay</CardTitle>
            <CardDescription>
              Add overlay text to your MP4 or MOV videos - optimized for YouTube and X.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/*"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
              />
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  file
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 cursor-pointer",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
                onClick={!file ? handleFileAreaClick : undefined}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <File className="h-12 w-12 text-primary" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium text-lg">{file.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleChangeFile}
                      disabled={isProcessing}
                      className="mt-2"
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <span className="font-medium text-lg">Click to select a video file</span>
                    <span className="text-sm text-muted-foreground">
                      Supports: MP4, MOV, and other video formats
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Preset Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform Preset</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={preset === 'youtube' ? 'default' : 'outline'}
                  onClick={() => handlePresetChange('youtube')}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Youtube className="h-4 w-4" />
                  YouTube
                </Button>
                <Button
                  type="button"
                  variant={preset === 'xcom' ? 'default' : 'outline'}
                  onClick={() => handlePresetChange('xcom')}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Twitter className="h-4 w-4" />
                  X.com
                </Button>
                <Button
                  type="button"
                  variant={preset === 'custom' ? 'default' : 'outline'}
                  onClick={() => handlePresetChange('custom')}
                  disabled={isProcessing}
                >
                  Custom
                </Button>
              </div>
            </div>

            {/* Text Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="song-title" className="text-sm font-medium">
                  Song Title
                </label>
                <Input
                  id="song-title"
                  type="text"
                  placeholder="Enter song title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="artist" className="text-sm font-medium">
                  Artist / Band
                </label>
                <Input
                  id="artist"
                  type="text"
                  placeholder="Enter artist or band name"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Custom Configuration (only shown for custom preset) */}
            {preset === 'custom' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <h3 className="font-semibold">Custom Position Settings</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Title X (px)</label>
                    <Input
                      type="number"
                      value={customConfig.songTitle.x}
                      onChange={(e) => setCustomConfig({
                        ...customConfig,
                        songTitle: { ...customConfig.songTitle, x: parseInt(e.target.value) || 0 }
                      })}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Title Y from bottom (px)</label>
                    <Input
                      type="number"
                      value={customConfig.songTitle.y}
                      onChange={(e) => setCustomConfig({
                        ...customConfig,
                        songTitle: { ...customConfig.songTitle, y: parseInt(e.target.value) || 0 }
                      })}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Title Font Size (px)</label>
                    <Input
                      type="number"
                      value={customConfig.songTitle.fontSize}
                      onChange={(e) => setCustomConfig({
                        ...customConfig,
                        songTitle: { ...customConfig.songTitle, fontSize: parseInt(e.target.value) || 0 }
                      })}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Artist Y from bottom (px)</label>
                    <Input
                      type="number"
                      value={customConfig.artist.y}
                      onChange={(e) => setCustomConfig({
                        ...customConfig,
                        artist: { ...customConfig.artist, y: parseInt(e.target.value) || 0 }
                      })}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preset Info */}
            {preset !== 'custom' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{PRESETS[preset].name} Preset:</strong> Title at ({currentConfig.songTitle.x}px, {currentConfig.songTitle.y}px from bottom), 
                  {currentConfig.songTitle.fontSize}px font. Artist at ({currentConfig.artist.x}px, {currentConfig.artist.y}px from bottom), 
                  {currentConfig.artist.fontSize}px font. Optimized for {PRESETS[preset].name} player controls.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Status Alert */}
            {status && !error && (
              <Alert>
                {status.includes('Success') ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <AlertDescription>{status}</AlertDescription>
              </Alert>
            )}

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Process Button */}
            <Button
              onClick={handleProcess}
              disabled={!file || isProcessing || !isLoaded || (!songTitle.trim() && !artist.trim())}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Add Text Overlay & Download'
              )}
            </Button>

            {/* Info Section */}
            <div className="pt-6 border-t space-y-3">
              <h3 className="font-semibold text-lg">How it works:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Select a video file (MP4 or MOV)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Choose a platform preset (YouTube or X.com) or use custom settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Enter song title and/or artist name</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Click "Add Text Overlay & Download" to process</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Text is positioned to avoid platform player controls</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>All processing happens in your browser - no server needed!</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                Powered by FFmpeg.wasm (FFmpeg 6.0 WebAssembly) via @ffmpeg/ffmpeg 0.12.6
              </p>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  )
}

export default TextOverlay


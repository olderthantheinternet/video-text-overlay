import { useState, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

export function useFFmpeg() {
  const [ffmpeg, setFFmpeg] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadFFmpeg = useCallback(async () => {
    if (isLoaded || isLoading) return

    setIsLoading(true)
    try {
      const ffmpegInstance = new FFmpeg()
      
      // Set up logging
      ffmpegInstance.on('log', ({ message }) => {
        console.log('FFmpeg:', message)
      })

      // Set up error handling
      ffmpegInstance.on('error', ({ message }) => {
        console.error('FFmpeg error:', message)
      })

      // Load FFmpeg with CDN URLs
      // Try jsdelivr as primary CDN (more reliable), fallback to unpkg
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'
      try {
        await ffmpegInstance.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
      } catch (cdnError) {
        console.warn('Primary CDN failed, trying fallback...', cdnError)
        // Fallback to unpkg
        const fallbackURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
        await ffmpegInstance.load({
          coreURL: await toBlobURL(`${fallbackURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${fallbackURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
      }

      setFFmpeg(ffmpegInstance)
      setIsLoaded(true)
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isLoading])

  return { ffmpeg, isLoaded, isLoading, loadFFmpeg }
}


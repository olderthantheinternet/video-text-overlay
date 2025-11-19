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

      // Check if SharedArrayBuffer is available (required for multi-threaded)
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
      
      if (hasSharedArrayBuffer) {
        // Load FFmpeg with multi-threaded core for better performance
        // Multi-threaded version uses Web Workers and SharedArrayBuffer
        // Requires COOP/COEP headers (configured via server or CDN)
        console.log('SharedArrayBuffer available - using multi-threaded FFmpeg')
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.6/dist/esm'
        try {
          await ffmpegInstance.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
          })
          console.log('FFmpeg multi-threaded core loaded successfully')
        } catch (cdnError) {
          console.warn('Multi-threaded CDN failed, trying fallback...', cdnError)
          // Fallback to unpkg
          const fallbackURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
          await ffmpegInstance.load({
            coreURL: await toBlobURL(`${fallbackURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${fallbackURL}/ffmpeg-core.wasm`, 'application/wasm'),
            workerURL: await toBlobURL(`${fallbackURL}/ffmpeg-core.worker.js`, 'text/javascript'),
          })
        }
      } else {
        // Fallback to single-threaded if SharedArrayBuffer not available
        console.log('SharedArrayBuffer not available - using single-threaded FFmpeg')
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


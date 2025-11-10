import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

const MAX_CANVAS_SIZE = 360
const DEFAULT_CANVAS_SIZE = 280
const BACKGROUND_COLOR = '#ffffff'
const STROKE_COLOR = '#1f1d1b'
const LINE_WIDTH = 3

const DoodleBoard = forwardRef(function DoodleBoard(
  { disabled = false, className = '', onHasDrawingChange },
  ref
) {
  const canvasRef = useRef(null)
  const contextRef = useRef(null)
  const isDrawingRef = useRef(false)
  const displaySizeRef = useRef(DEFAULT_CANVAS_SIZE)
  const [hasDrawing, setHasDrawing] = useState(false)

  const notifyHasDrawing = useCallback(
    (value) => {
      if (typeof onHasDrawingChange === 'function') {
        onHasDrawingChange(value)
      }
    },
    [onHasDrawingChange]
  )

  const initializeCanvas = useCallback(() => {
    if (typeof document === 'undefined') return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const parentWidth = Math.max(canvas.parentElement?.clientWidth || DEFAULT_CANVAS_SIZE, 1)
    const displaySize = Math.min(parentWidth, MAX_CANVAS_SIZE)
    const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
    canvas.width = displaySize * ratio
    canvas.height = displaySize * ratio
    canvas.style.width = `${displaySize}px`
    canvas.style.height = `${displaySize}px`
    if (typeof context.setTransform === 'function') {
      context.setTransform(1, 0, 0, 1, 0, 0)
    }
    context.scale(ratio, ratio)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = STROKE_COLOR
    context.lineWidth = LINE_WIDTH
    context.fillStyle = BACKGROUND_COLOR
    context.clearRect(0, 0, displaySize, displaySize)
    context.fillRect(0, 0, displaySize, displaySize)
    contextRef.current = context
    displaySizeRef.current = displaySize
    setHasDrawing(false)
  }, [])

  useEffect(() => {
    initializeCanvas()
  }, [initializeCanvas])

  useEffect(() => {
    notifyHasDrawing(hasDrawing)
  }, [hasDrawing, notifyHasDrawing])

  const getRelativePoint = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const pointer = event.nativeEvent || event
    const displaySize = displaySizeRef.current || DEFAULT_CANVAS_SIZE
    const safeWidth = rect.width || displaySize
    const safeHeight = rect.height || displaySize
    const x = ((pointer.clientX - rect.left) / safeWidth) * displaySize
    const y = ((pointer.clientY - rect.top) / safeHeight) * displaySize
    return { x, y }
  }

  const startDrawing = (event) => {
    if (disabled) return
    event.preventDefault()
    const context = contextRef.current
    if (!context) return
    const { x, y } = getRelativePoint(event)
    context.beginPath()
    context.moveTo(x, y)
    isDrawingRef.current = true
  }

  const drawStroke = (event) => {
    if (!isDrawingRef.current || disabled) return
    event.preventDefault()
    const context = contextRef.current
    if (!context) return
    const { x, y } = getRelativePoint(event)
    context.lineTo(x, y)
    context.stroke()
    setHasDrawing(true)
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        initializeCanvas()
      },
      toDataUrl: () => canvasRef.current?.toDataURL('image/png') || '',
      hasDoodle: () => hasDrawing,
    }),
    [hasDrawing, initializeCanvas]
  )

  return (
    <div className={`relative rounded-2xl bg-white ${className}`}>
      <canvas
        ref={canvasRef}
        className={`h-auto w-full rounded-2xl bg-white transition ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}`}
        onPointerDown={startDrawing}
        onPointerMove={drawStroke}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
        role="img"
        aria-label="Wedding doodle canvas"
      />
      {!hasDrawing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-[0.65rem] uppercase tracking-[0.4em] text-sage-dark/50">
          Doodle something here!
        </div>
      )}
    </div>
  )
})

export default DoodleBoard

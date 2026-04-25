import { useState, useCallback, useRef } from 'react'
import type { RoomAnalysis, ContextualQuestion } from '@/lib/types'
import type { PhotoSlotId } from '../find-page-model'

interface RoomAnalysisFlowProps {
  roomPhotos: Record<PhotoSlotId, File | null>
  compressImageFileForApi: (file: File) => Promise<string>
  onShowMessage: (title: string, detail: string, tone: 'info' | 'success' | 'error') => void
}

/**
 * Orchestrates room photo analysis and contextual question generation
 */
export function useRoomAnalysisFlow(props: RoomAnalysisFlowProps) {
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [contextualQuestions, setContextualQuestions] = useState<ContextualQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState('')

  const generateContextualQuestions = useCallback(
    async (analysis: RoomAnalysis | null, furnitureType: string, roomType: string) => {
      setQuestionsLoading(true)
      setQuestionsError('')
      try {
        const res = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            furnitureType,
            roomType,
            roomAnalysis: analysis,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch((): { error?: string } => ({}))
          throw new Error(err.error ?? 'Failed to generate follow-up questions')
        }

        const data = await res.json() as { questions?: ContextualQuestion[] }
        const questions = Array.isArray(data.questions) ? data.questions.slice(0, 4) : []
        setContextualQuestions(questions)

        if (questions.length > 0) {
          props.onShowMessage(
            'Questions ready',
            `I found ${Math.min(questions.length, 4)} follow-ups based on your room and ${furnitureType} choice.`,
            'success'
          )
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to generate follow-up questions'
        setQuestionsError(message)
        setContextualQuestions([])
        props.onShowMessage('Question generation failed', message, 'error')
      } finally {
        setQuestionsLoading(false)
      }
    },
    [props]
  )

  const triggerRoomAnalysis = useCallback(
    async (furnitureType: string, roomType: string) => {
      setAnalysisLoading(true)
      setAnalysisError('')
      setRoomAnalysis(null)
      setContextualQuestions([])
      setQuestionsError('')

      try {
        // Collect and compress all room photos for API (with retry logic)
        const compressWithRetry = async (file: File, attempt = 1): Promise<string | null> => {
          try {
            return await props.compressImageFileForApi(file)
          } catch (error) {
            if (attempt < 2) {
              console.warn(`[room-analysis] Compression attempt ${attempt} failed, retrying...`, error)
              await new Promise(resolve => setTimeout(resolve, 300))
              return compressWithRetry(file, attempt + 1)
            }
            console.error(`[room-analysis] Failed to compress image after retries:`, error)
            return null // Return null on failure, will be filtered out
          }
        }

        const apiImages = await Promise.all(
          Object.values(props.roomPhotos)
            .filter(Boolean)
            .map(file => (file ? compressWithRetry(file) : null))
        ).then(images => images.filter(Boolean) as string[])

        if (apiImages.length === 0) {
          throw new Error('No images could be processed. Please try uploading your photos again.')
        }

        const res = await fetch('/api/analyze-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: apiImages,
            furnitureType,
            roomType,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch((): { error?: string } => ({}))
          throw new Error(err.error ?? 'Room analysis failed')
        }

        const data: RoomAnalysis = await res.json()
        setRoomAnalysis(data)
        props.onShowMessage('Room understood', data.roomSummary, 'success')
        await generateContextualQuestions(data, furnitureType, roomType)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Analysis failed'
        setAnalysisError(message)
        props.onShowMessage('Room analysis failed', message, 'error')
      } finally {
        setAnalysisLoading(false)
      }
    },
    [props, generateContextualQuestions]
  )

  const resetAnalysis = useCallback(() => {
    setRoomAnalysis(null)
    setContextualQuestions([])
    setQuestionsError('')
    setAnalysisError('')
  }, [])

  return {
    roomAnalysis,
    analysisLoading,
    analysisError,
    contextualQuestions,
    questionsLoading,
    questionsError,
    triggerRoomAnalysis,
    generateContextualQuestions,
    resetAnalysis,
  }
}

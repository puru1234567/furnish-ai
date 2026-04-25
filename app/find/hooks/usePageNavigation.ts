import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Manages step navigation and keyboard control for multi-step form
 */
export function usePageNavigation() {
  const [step, setStep] = useState(0)
  const [questionSubIndex, setQuestionSubIndex] = useState(0)
  const stepRef = useRef(0)
  const questionSubIndexRef = useRef(0)
  const stepEnteredAt = useRef<number>(Date.now())
  const hesitations = useRef<Record<number, number>>({})

  const next = useCallback(() => {
    hesitations.current[stepRef.current] = (Date.now() - stepEnteredAt.current) / 1000
    stepEnteredAt.current = Date.now()
    setStep(s => s + 1)
  }, [])

  const back = useCallback(() => {
    stepEnteredAt.current = Date.now()
    setStep(s => s - 1)
  }, [])

  const incrementQuestionSubIndex = useCallback(() => {
    setQuestionSubIndex(qi => qi + 1)
  }, [])

  const decrementQuestionSubIndex = useCallback(() => {
    setQuestionSubIndex(qi => Math.max(0, qi - 1))
  }, [])

  // Sync step/questionSubIndex to refs for stable keyboard handler
  useEffect(() => {
    stepRef.current = step
  }, [step])

  useEffect(() => {
    questionSubIndexRef.current = questionSubIndex
  }, [questionSubIndex])

  return {
    step,
    setStep,
    questionSubIndex,
    setQuestionSubIndex,
    next,
    back,
    incrementQuestionSubIndex,
    decrementQuestionSubIndex,
    stepRef,
    questionSubIndexRef,
    stepEnteredAt,
    hesitations,
  }
}

import { useEffect } from 'react'

interface UseKeyboardNavigationProps {
  stepRef: React.MutableRefObject<number>
  questionSubIndexRef: React.MutableRefObject<number>
  contextualQuestionsLength: number
  onNext: () => void
  onBack: () => void
  onNextQuestion: () => void
  onPreviousQuestion: () => void
}

/**
 * Keyboard navigation for multi-step form (Enter = advance, ArrowUp/Backspace = back)
 */
export function useKeyboardNavigation(props: UseKeyboardNavigationProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const s = props.stepRef.current
      const qi = props.questionSubIndexRef.current

      if (e.key === 'Enter' && s >= 0 && s <= 4) {
        if (s === 2) {
          // On questions step
          if (qi < props.contextualQuestionsLength - 1) {
            props.onNextQuestion()
          } else {
            props.onNext()
          }
        } else {
          props.onNext()
        }
      }

      if ((e.key === 'ArrowUp' || e.key === 'Backspace') && s > 0 && s <= 4) {
        if (s === 2 && qi > 0) {
          props.onPreviousQuestion()
        } else {
          props.onBack()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])
}

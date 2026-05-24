'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { unsaveResult } from '@/lib/services/userDataService'

interface SavedItemActionsProps {
  userId: string
  productId: string
}

export function SavedItemActions({ userId, productId }: SavedItemActionsProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    if (removing) return
    setRemoving(true)
    try {
      await unsaveResult(userId, productId)
      router.refresh()
    } finally {
      setRemoving(false)
    }
  }

  return (
    <button
      type="button"
      className="ctrl-btn"
      onClick={handleRemove}
      disabled={removing}
      aria-label="Remove saved item"
    >
      {removing ? 'Removing...' : 'Remove'}
    </button>
  )
}

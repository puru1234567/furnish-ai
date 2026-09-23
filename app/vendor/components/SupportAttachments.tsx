'use client'

import { useRef } from 'react'
import { createSupportAttachment, type SupportAttachment } from '@/lib/vendor/support'

export function SupportAttachments({ attachments, onChange }: { attachments: SupportAttachment[]; onChange: (attachments: SupportAttachment[]) => void }) { const inputRef = useRef<HTMLInputElement>(null); return <div className="support-attachments"><input ref={inputRef} type="file" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); onChange([...attachments, ...files.map(createSupportAttachment)]); event.target.value = '' }} /><button type="button" className="btn-skip" onClick={() => inputRef.current?.click()}>Attach files</button>{attachments.map((attachment) => <span key={attachment.id}>{attachment.fileName}<button type="button" onClick={() => onChange(attachments.filter((item) => item.id !== attachment.id))}>Remove</button></span>)}</div> }
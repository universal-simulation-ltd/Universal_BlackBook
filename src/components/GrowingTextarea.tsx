import { useLayoutEffect, useRef, type RefObject, type TextareaHTMLAttributes } from 'react'
import { growToFit, useTypingRoom } from '../lib/typingRoom'

/**
 * A text box that grows as it fills (James, 2026-10-30: "grow the size of the
 * details box in to do if you fill it" — a rule for every text entry form
 * unless said otherwise). `rows` is where it starts, never a ceiling; the
 * page or the dialog scrolls rather than the box. While it has the keyboard,
 * the line being typed is kept above it (`useTypingRoom`), so a growing box
 * never pushes what is being typed under the phone's keyboard.
 *
 * The full-screen note editor (NotesFullscreen) stays as it is: it already
 * fills the screen.
 */
export function GrowingTextarea({
  textareaRef,
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; textareaRef?: RefObject<HTMLTextAreaElement> }) {
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = textareaRef ?? own
  useLayoutEffect(() => {
    if (ref.current) growToFit(ref.current)
  }, [ref, value])
  useTypingRoom(ref)
  return <textarea ref={ref} value={value} {...props} />
}

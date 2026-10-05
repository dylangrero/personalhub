import { useState, type FormEvent } from 'react'

export type EventFormValues = {
  title: string
  startTime: string
  endTime: string
  location: string
  description: string
}

type EventFormProps = {
  initialValues?: EventFormValues
  submitLabel: string
  onSubmit: (values: EventFormValues) => Promise<void>
  onCancel: () => void
}

const fieldClasses =
  'min-w-0 border border-white/10 bg-[#0a0b0d] px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-amber-300/60'

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function defaultEventValues(): EventFormValues {
  const now = new Date()
  const nextHalfHour = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30
  const startMinutes = Math.min(nextHalfHour, 23 * 60)
  const endMinutes = Math.min(startMinutes + 60, 23 * 60 + 59)

  return {
    title: '',
    startTime: formatTime(startMinutes),
    endTime: formatTime(endMinutes),
    location: '',
    description: '',
  }
}

export function EventForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [values, setValues] = useState(() => initialValues ?? defaultEventValues())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    if (values.endTime <= values.startTime) {
      setValidationError('End time must be after start time.')
      return
    }

    setValidationError(null)
    setIsSubmitting(true)

    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        location: values.location.trim(),
        description: values.description.trim(),
      })
    } catch {
      // The parent surfaces request errors alongside the schedule.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase sm:col-span-2">
          Title
          <input
            required
            pattern=".*\S.*"
            autoFocus
            value={values.title}
            onChange={(event) => setValues({ ...values, title: event.target.value })}
            className={fieldClasses}
            placeholder="What’s happening?"
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Start time
          <input
            required
            type="time"
            value={values.startTime}
            onChange={(event) => setValues({ ...values, startTime: event.target.value })}
            className={fieldClasses}
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          End time
          <input
            required
            type="time"
            value={values.endTime}
            onChange={(event) => setValues({ ...values, endTime: event.target.value })}
            className={fieldClasses}
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase sm:col-span-2">
          Location <span className="normal-case">(optional)</span>
          <input
            value={values.location}
            onChange={(event) => setValues({ ...values, location: event.target.value })}
            className={fieldClasses}
            placeholder="Home office"
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase sm:col-span-2">
          Description <span className="normal-case">(optional)</span>
          <textarea
            rows={2}
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            className={`${fieldClasses} resize-y`}
            placeholder="A short note"
          />
        </label>
      </div>
      {validationError && (
        <p role="alert" className="text-xs text-rose-300">
          {validationError}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="cursor-pointer text-xs text-zinc-500 transition-colors hover:text-zinc-200 disabled:cursor-wait disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer border border-amber-300/50 px-3 py-2 text-xs font-medium text-amber-100 transition-colors hover:border-amber-300 hover:bg-amber-300/10 disabled:cursor-wait disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

import { useState, type FormEvent } from 'react'

import type { TaskCreate, TaskPriority } from '../types/task'

export type TaskFormValues = Pick<
  TaskCreate,
  'title' | 'category' | 'priority' | 'dueDate'
>

type TaskFormProps = {
  initialValues?: TaskFormValues
  submitLabel: string
  onSubmit: (values: TaskFormValues) => Promise<void>
  onCancel: () => void
}

const emptyTask: TaskFormValues = {
  title: '',
  category: '',
  priority: 'Medium',
  dueDate: null,
}

const fieldClasses =
  'min-w-0 border border-white/10 bg-[#0a0b0d] px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-[#00ffd4]/60'

export function TaskForm({
  initialValues = emptyTask,
  submitLabel,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [values, setValues] = useState(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        category: values.category.trim(),
      })
    } catch {
      // The parent surfaces request errors alongside the task list.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Title
          <input
            required
            pattern=".*\S.*"
            autoFocus
            value={values.title}
            onChange={(event) => setValues({ ...values, title: event.target.value })}
            className={fieldClasses}
            placeholder="What needs doing?"
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Category
          <input
            required
            pattern=".*\S.*"
            value={values.category}
            onChange={(event) => setValues({ ...values, category: event.target.value })}
            className={fieldClasses}
            placeholder="Personal"
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Priority
          <select
            value={values.priority}
            onChange={(event) =>
              setValues({ ...values, priority: event.target.value as TaskPriority })
            }
            className={fieldClasses}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Due date
          <input
            type="date"
            value={values.dueDate ?? ''}
            onChange={(event) => setValues({ ...values, dueDate: event.target.value || null })}
            className={fieldClasses}
          />
        </label>
      </div>
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
          className="cursor-pointer border border-[#00ffd4]/50 px-3 py-2 text-xs font-medium text-[#8fffea] transition-colors hover:border-[#00ffd4] hover:bg-[#00ffd4]/10 disabled:cursor-wait disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

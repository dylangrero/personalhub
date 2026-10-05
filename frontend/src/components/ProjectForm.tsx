import { useState, type FormEvent } from 'react'

import type { ProjectCreate, ProjectStatus } from '../types/project'

export type ProjectFormValues = Pick<
  ProjectCreate,
  'name' | 'description' | 'status' | 'progress' | 'nextAction' | 'deadline'
>

type ProjectFormProps = {
  initialValues?: ProjectFormValues
  submitLabel: string
  onSubmit: (values: ProjectFormValues) => Promise<void>
  onCancel: () => void
}

const emptyProject: ProjectFormValues = {
  name: '',
  description: '',
  status: 'Planning',
  progress: 0,
  nextAction: '',
  deadline: null,
}

const fieldClasses =
  'min-w-0 border border-white/10 bg-[#0a0b0d] px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-[#00ffd4]/60'

function sliderProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress / 5) * 5))
}

export function ProjectForm({
  initialValues = emptyProject,
  submitLabel,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [values, setValues] = useState(() => ({
    ...initialValues,
    progress: sliderProgress(initialValues.progress),
  }))
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
        name: values.name.trim(),
        description: values.description.trim(),
        nextAction: values.nextAction.trim(),
      })
    } catch {
      // The parent surfaces request errors alongside the project grid.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Name
          <input
            required
            pattern=".*\S.*"
            autoFocus
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            className={fieldClasses}
            placeholder="Project name"
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase sm:col-span-2">
          Description
          <input
            required
            pattern=".*\S.*"
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            className={fieldClasses}
            placeholder="A concise project description"
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Status
          <select
            value={values.status}
            onChange={(event) =>
              setValues({ ...values, status: event.target.value as ProjectStatus })
            }
            className={fieldClasses}
          >
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="On hold">On hold</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <label className="grid gap-2 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          <span className="flex items-center justify-between gap-3">
            Progress
            <output className="font-mono text-xs tracking-normal text-[#00ffd4]" htmlFor="project-progress">
              {values.progress}%
            </output>
          </span>
          <input
            required
            id="project-progress"
            type="range"
            min="0"
            max="100"
            step="5"
            value={values.progress}
            onChange={(event) => {
              const progress = Number(event.target.value)
              setValues({
                ...values,
                progress: Number.isNaN(progress) ? 0 : sliderProgress(progress),
              })
            }}
            className="h-2 w-full cursor-pointer appearance-none bg-zinc-800 accent-[#00ffd4]"
            aria-valuetext={`${values.progress}%`}
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase">
          Deadline
          <input
            type="date"
            value={values.deadline ?? ''}
            onChange={(event) => setValues({ ...values, deadline: event.target.value || null })}
            className={fieldClasses}
          />
        </label>
        <label className="grid gap-1.5 text-[0.65rem] tracking-wider text-zinc-500 uppercase sm:col-span-2 lg:col-span-3">
          Next action
          <input
            required
            pattern=".*\S.*"
            value={values.nextAction}
            onChange={(event) => setValues({ ...values, nextAction: event.target.value })}
            className={fieldClasses}
            placeholder="The next concrete step"
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

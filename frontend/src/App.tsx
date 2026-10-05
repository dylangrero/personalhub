import { useCallback, useEffect, useState } from 'react'

import { EventForm, type EventFormValues } from './components/EventForm'
import { ProjectForm, type ProjectFormValues } from './components/ProjectForm'
import { TaskForm, type TaskFormValues } from './components/TaskForm'
import { createEvent, deleteEvent, updateEvent } from './services/events'
import { createProject, deleteProject, updateProject } from './services/projects'
import { createTask, deleteTask, updateTask } from './services/tasks'
import { fetchToday } from './services/today'
import type { Event as CalendarEvent } from './types/event'
import type { Project } from './types/project'
import type { Task } from './types/task'
import type { Today } from './types/today'

const scheduleAccentClasses = ['bg-amber-300', 'bg-sky-300', 'bg-emerald-300']

function formatToday() {
  const today = new Date()

  return {
    day: new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(today),
    date: new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(today),
    shortDate: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
    })
      .format(today)
      .toUpperCase(),
  }
}

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string
  title: string
  meta?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
      <div>
        <p className="mb-2 text-[0.65rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
          {eyebrow}
        </p>
        <h2 className="text-lg font-medium tracking-tight text-zinc-100">{title}</h2>
      </div>
      {meta && <span className="text-xs text-zinc-500">{meta}</span>}
    </div>
  )
}

function formatEventTime(dateTime: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateTime))
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function eventTimeInputValue(dateTime: string) {
  const date = new Date(dateTime)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function localDateTime(date: string, time: string) {
  return `${date}T${time}:00`
}

function eventDurationMinutes(event: CalendarEvent) {
  return Math.max(
    0,
    Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60_000),
  )
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

type RefreshToday = () => Promise<boolean>

type ScheduleProps = {
  events: CalendarEvent[]
  todayDate: string
  isLoading: boolean
  loadError: string | null
  refreshToday: RefreshToday
}

function Schedule({ events, todayDate, isLoading, loadError, refreshToday }: ScheduleProps) {
  const [error, setError] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [confirmingDeleteEventId, setConfirmingDeleteEventId] = useState<number | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)

  const sectionError = error ?? loadError
  const scheduledMinutes = events.reduce(
    (total, event) => total + eventDurationMinutes(event),
    0,
  )

  async function addEvent(values: EventFormValues) {
    setError(null)

    try {
      await createEvent({
        title: values.title,
        description: values.description || null,
        startTime: localDateTime(todayDate, values.startTime),
        endTime: localDateTime(todayDate, values.endTime),
        location: values.location || null,
      })
      setIsAddingEvent(false)
    } catch (requestError) {
      setError('The event could not be created. Check the details and try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError('The event was created, but Today could not be refreshed. Please reload.')
    }
  }

  async function editEvent(event: CalendarEvent, values: EventFormValues) {
    setError(null)
    const eventDate = localDateKey(new Date(event.startTime))

    try {
      await updateEvent(event.id, {
        title: values.title,
        description: values.description || null,
        startTime: localDateTime(eventDate, values.startTime),
        endTime: localDateTime(eventDate, values.endTime),
        location: values.location || null,
      })
      setEditingEventId(null)
    } catch (requestError) {
      setError('The event could not be saved. Check the details and try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError('The event was saved, but Today could not be refreshed. Please reload.')
    }
  }

  async function removeEvent(eventId: number) {
    setDeletingEventId(eventId)
    setError(null)

    try {
      await deleteEvent(eventId)
      setConfirmingDeleteEventId(null)
      if (!(await refreshToday())) {
        setError('The event was deleted, but Today could not be refreshed. Please reload.')
      }
    } catch {
      setError('The event could not be deleted. Please try again.')
    } finally {
      setDeletingEventId(null)
    }
  }

  return (
    <section
      aria-busy={isLoading}
      className="border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:p-7"
    >
      <SectionHeading
        eyebrow="Timeline"
        title="Today’s schedule"
        meta={isLoading ? 'Loading' : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}
      />
      {!isLoading && (
        <div className="flex justify-end border-b border-white/[0.07] py-3">
          <button
            type="button"
            onClick={() => {
              setEditingEventId(null)
              setConfirmingDeleteEventId(null)
              setIsAddingEvent((isOpen) => !isOpen)
            }}
            className="cursor-pointer text-xs font-medium text-amber-200 transition-colors hover:text-amber-100"
          >
            {isAddingEvent ? 'Close' : '+ Add event'}
          </button>
        </div>
      )}
      {isAddingEvent && (
        <EventForm
          submitLabel="Add event"
          onSubmit={addEvent}
          onCancel={() => setIsAddingEvent(false)}
        />
      )}
      <div className="mt-2">
        {isLoading && (
          <p role="status" className="py-5 text-sm text-zinc-500">
            Loading today’s schedule…
          </p>
        )}
        {!isLoading && sectionError && events.length === 0 && (
          <p role="alert" className="py-5 text-sm text-rose-300">
            {sectionError}
          </p>
        )}
        {!isLoading && !sectionError && events.length === 0 && (
          <p className="py-5 text-sm text-zinc-500">No events scheduled for today.</p>
        )}
        {sectionError && events.length > 0 && (
          <p role="alert" className="border-b border-white/[0.07] py-3 text-xs text-rose-300">
            {sectionError}
          </p>
        )}
        {!isLoading && events.map((event, index) => (
          <article key={event.id} className="border-b border-white/[0.07] last:border-b-0">
            {editingEventId === event.id ? (
              <EventForm
                initialValues={{
                  title: event.title,
                  startTime: eventTimeInputValue(event.startTime),
                  endTime: eventTimeInputValue(event.endTime),
                  location: event.location ?? '',
                  description: event.description ?? '',
                }}
                submitLabel="Save changes"
                onSubmit={(values) => editEvent(event, values)}
                onCancel={() => setEditingEventId(null)}
              />
            ) : (
              <div className="group grid grid-cols-[3.5rem_0.5rem_1fr] gap-3 py-5 sm:grid-cols-[4.25rem_0.5rem_1fr_auto] sm:items-center sm:gap-4">
                <div className="flex flex-col font-mono text-xs text-zinc-400">
                  <time dateTime={event.startTime}>{formatEventTime(event.startTime)}</time>
                  <time dateTime={event.endTime} className="text-zinc-600">
                    {formatEventTime(event.endTime)}
                  </time>
                </div>
                <span
                  className={`h-2 w-2 ${scheduleAccentClasses[index % scheduleAccentClasses.length]}`}
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-medium text-zinc-100 transition-colors group-hover:text-white">
                    {event.title}
                  </h3>
                  {(event.location || event.description) && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {[event.location, event.description].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="mt-2 flex gap-3 text-[0.65rem]">
                    <button
                      type="button"
                      aria-label={`Edit ${event.title}`}
                      onClick={() => {
                        setIsAddingEvent(false)
                        setConfirmingDeleteEventId(null)
                        setEditingEventId(event.id)
                      }}
                      className="cursor-pointer text-zinc-600 transition-colors hover:text-zinc-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${event.title}`}
                      onClick={() => setConfirmingDeleteEventId(event.id)}
                      className="cursor-pointer text-zinc-600 transition-colors hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <span className="col-start-3 text-xs text-zinc-600 sm:col-start-auto">
                  {formatDuration(eventDurationMinutes(event))}
                </span>
              </div>
            )}
            {confirmingDeleteEventId === event.id && (
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] py-3 text-xs">
                <span className="text-rose-200">Delete this event?</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    aria-label={`Cancel deleting ${event.title}`}
                    onClick={() => setConfirmingDeleteEventId(null)}
                    disabled={deletingEventId === event.id}
                    className="cursor-pointer text-zinc-500 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    aria-label={`Confirm deleting ${event.title}`}
                    onClick={() => void removeEvent(event.id)}
                    disabled={deletingEventId === event.id}
                    className="cursor-pointer text-rose-300 hover:text-rose-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    {deletingEventId === event.id ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      {!isLoading && !sectionError && events.length > 0 && (
        <div className="mt-2 flex items-center gap-3 border-t border-dashed border-white/10 pt-5 text-xs text-zinc-500">
          <span className="h-px flex-1 bg-white/10" />
          {formatDuration(scheduledMinutes)} scheduled today
        </div>
      )}
    </section>
  )
}

type PriorityTasksProps = {
  overdueTasks: Task[]
  dueTasks: Task[]
  highPriorityTasks: Task[]
  todayDate: string
  isLoading: boolean
  loadError: string | null
  refreshToday: RefreshToday
}

type PriorityTaskEntry = {
  task: Task
  context: 'Overdue' | 'Due today' | 'High priority'
}

function PriorityTasks({
  overdueTasks,
  dueTasks,
  highPriorityTasks,
  todayDate,
  isLoading,
  loadError,
  refreshToday,
}: PriorityTasksProps) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [confirmingDeleteTaskId, setConfirmingDeleteTaskId] = useState<number | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null)
  const [isAddingTask, setIsAddingTask] = useState(false)

  const tasks: PriorityTaskEntry[] = [
    ...overdueTasks.map((task) => ({ task, context: 'Overdue' as const })),
    ...dueTasks.map((task) => ({ task, context: 'Due today' as const })),
    ...highPriorityTasks.map((task) => ({ task, context: 'High priority' as const })),
  ]
  const sectionError = error ?? loadError

  async function toggleTaskStatus(task: Task) {
    setUpdatingTaskId(task.id)
    setError(null)
    setNotice(null)

    try {
      await updateTask(task.id, {
        status: task.status === 'Done' ? 'To do' : 'Done',
      })
      if (!(await refreshToday())) {
        setError('The task was updated, but Today could not be refreshed. Please reload.')
      }
    } catch {
      setError('The task could not be updated. Please try again.')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function addTask(values: TaskFormValues) {
    setError(null)
    setNotice(null)

    try {
      await createTask({ ...values, status: 'To do' })
      setIsAddingTask(false)
    } catch (requestError) {
      setError('The task could not be created. Please try again.')
      throw requestError
    }

    const belongsInToday =
      values.priority === 'High' ||
      (values.dueDate !== null && values.dueDate <= todayDate)
    if (!(await refreshToday())) {
      setError('The task was created, but Today could not be refreshed. Please reload.')
    } else if (!belongsInToday) {
      setNotice('Task saved. It is outside Today’s priority view.')
    }
  }

  async function editTask(taskId: number, values: TaskFormValues) {
    setError(null)
    setNotice(null)

    try {
      await updateTask(taskId, values)
      setEditingTaskId(null)
    } catch (requestError) {
      setError('The task could not be saved. Please try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError('The task was saved, but Today could not be refreshed. Please reload.')
    }
  }

  async function removeTask(taskId: number) {
    setDeletingTaskId(taskId)
    setError(null)
    setNotice(null)

    try {
      await deleteTask(taskId)
      setConfirmingDeleteTaskId(null)
      if (!(await refreshToday())) {
        setError('The task was deleted, but Today could not be refreshed. Please reload.')
      }
    } catch {
      setError('The task could not be deleted. Please try again.')
    } finally {
      setDeletingTaskId(null)
    }
  }

  return (
    <section
      aria-busy={isLoading}
      className="border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:p-7"
    >
      <SectionHeading
        eyebrow="Focus"
        title="Priority tasks"
        meta={isLoading ? 'Loading' : `${tasks.length} remaining`}
      />
      {!isLoading && (
        <div className="flex justify-end border-b border-white/[0.07] py-3">
          <button
            type="button"
            onClick={() => {
              setEditingTaskId(null)
              setIsAddingTask((isOpen) => !isOpen)
            }}
            className="cursor-pointer text-xs font-medium text-amber-200 transition-colors hover:text-amber-100"
          >
            {isAddingTask ? 'Close' : '+ Add task'}
          </button>
        </div>
      )}
      {isAddingTask && (
        <div>
          <p className="pt-4 text-xs leading-5 text-zinc-500">
            Today shows overdue, due today, and high-priority tasks. Other tasks are still saved.
          </p>
          <TaskForm
            submitLabel="Add task"
            onSubmit={addTask}
            onCancel={() => setIsAddingTask(false)}
          />
        </div>
      )}
      <div className="mt-2">
        {isLoading && (
          <p role="status" className="py-5 text-sm text-zinc-500">Loading tasks…</p>
        )}
        {!isLoading && sectionError && tasks.length === 0 && (
          <p role="alert" className="py-5 text-sm leading-6 text-rose-300">{sectionError}</p>
        )}
        {!isLoading && !sectionError && tasks.length === 0 && (
          <p className="py-5 text-sm text-zinc-500">No priority tasks yet.</p>
        )}
        {sectionError && tasks.length > 0 && (
          <p role="alert" className="border-b border-white/[0.07] py-3 text-xs text-rose-300">{sectionError}</p>
        )}
        {notice && (
          <p role="status" className="border-b border-white/[0.07] py-3 text-xs text-amber-200">
            {notice}
          </p>
        )}
        {tasks.map(({ task, context }, index) => (
          <article key={task.id} className="border-b border-white/[0.07] last:border-b-0">
            {editingTaskId === task.id ? (
              <TaskForm
                initialValues={{
                  title: task.title,
                  category: task.category,
                  priority: task.priority,
                  dueDate: task.dueDate,
                }}
                submitLabel="Save changes"
                onSubmit={(values) => editTask(task.id, values)}
                onCancel={() => setEditingTaskId(null)}
              />
            ) : (
              <div className="group flex items-start gap-4 py-4">
                <button
                  type="button"
                  aria-label={`Mark ${task.title} ${task.status === 'Done' ? 'to do' : 'complete'}`}
                  disabled={updatingTaskId === task.id || deletingTaskId === task.id}
                  onClick={() => void toggleTaskStatus(task)}
                  className="mt-0.5 grid h-5 w-5 shrink-0 cursor-pointer place-items-center border border-zinc-600 transition-colors hover:border-amber-300 disabled:cursor-wait disabled:opacity-50"
                >
                  <span
                    className={`h-1.5 w-1.5 transition-colors group-hover:bg-amber-300 ${task.status === 'Done' ? 'bg-amber-300' : 'bg-transparent'}`}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-sm font-medium ${task.status === 'Done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
                  >
                    {task.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className={context === 'Overdue' ? 'text-rose-300' : 'text-amber-200'}>
                      {context}
                    </span>
                    {` · ${task.category}`}{task.dueDate ? ` · Due ${task.dueDate}` : ''}
                  </p>
                  <div className="mt-2 flex gap-3 text-[0.65rem]">
                    <button
                      type="button"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => {
                        setIsAddingTask(false)
                        setEditingTaskId(task.id)
                      }}
                      className="cursor-pointer text-zinc-600 transition-colors hover:text-zinc-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${task.title}`}
                      onClick={() => setConfirmingDeleteTaskId(task.id)}
                      className="cursor-pointer text-zinc-600 transition-colors hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className={`h-1.5 w-1.5 ${task.priority === 'High' ? 'bg-rose-300' : 'bg-zinc-600'}`}
                  />
                  <span className="hidden text-[0.65rem] tracking-wider text-zinc-500 uppercase sm:inline">
                    {task.priority}
                  </span>
                </div>
                <span className="font-mono text-[0.65rem] text-zinc-700">0{index + 1}</span>
              </div>
            )}
            {confirmingDeleteTaskId === task.id && (
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] py-3 text-xs">
                <span className="text-rose-200">Delete this task?</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    aria-label={`Cancel deleting ${task.title}`}
                    onClick={() => setConfirmingDeleteTaskId(null)}
                    disabled={deletingTaskId === task.id}
                    className="cursor-pointer text-zinc-500 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    aria-label={`Confirm deleting ${task.title}`}
                    onClick={() => void removeTask(task.id)}
                    disabled={deletingTaskId === task.id}
                    className="cursor-pointer text-rose-300 hover:text-rose-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    {deletingTaskId === task.id ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

type ActiveProjectsProps = {
  projects: Project[]
  isLoading: boolean
  loadError: string | null
  refreshToday: RefreshToday
}

function ActiveProjects({ projects, isLoading, loadError, refreshToday }: ActiveProjectsProps) {
  const [error, setError] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [confirmingDeleteProjectId, setConfirmingDeleteProjectId] = useState<number | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null)
  const [isAddingProject, setIsAddingProject] = useState(false)

  const sectionError = error ?? loadError

  async function addProject(values: ProjectFormValues) {
    setError(null)

    try {
      await createProject(values)
      setIsAddingProject(false)
    } catch (requestError) {
      setError('The project could not be created. Please try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError('The project was created, but Today could not be refreshed. Please reload.')
    }
  }

  async function editProject(projectId: number, values: ProjectFormValues) {
    setError(null)

    try {
      await updateProject(projectId, values)
      setEditingProjectId(null)
    } catch (requestError) {
      setError('The project could not be saved. Please try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError('The project was saved, but Today could not be refreshed. Please reload.')
    }
  }

  async function removeProject(projectId: number) {
    setDeletingProjectId(projectId)
    setError(null)

    try {
      await deleteProject(projectId)
      setConfirmingDeleteProjectId(null)
      if (!(await refreshToday())) {
        setError('The project was deleted, but Today could not be refreshed. Please reload.')
      }
    } catch {
      setError('The project could not be deleted. Please try again.')
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <section aria-busy={isLoading} className="border-t border-white/10 pt-6">
      <SectionHeading
        eyebrow="Momentum"
        title="Active projects"
        meta={isLoading ? 'Loading' : `${projects.length} in motion`}
      />
      {!isLoading && (
        <div className="flex justify-end border-b border-white/[0.07] py-3">
          <button
            type="button"
            onClick={() => {
              setEditingProjectId(null)
              setIsAddingProject((isOpen) => !isOpen)
            }}
            className="cursor-pointer text-xs font-medium text-amber-200 transition-colors hover:text-amber-100"
          >
            {isAddingProject ? 'Close' : '+ Add project'}
          </button>
        </div>
      )}
      {isAddingProject && (
        <div className="border-x border-b border-white/10 bg-[#0d0f12] p-5 sm:p-6">
          <ProjectForm
            submitLabel="Add project"
            onSubmit={addProject}
            onCancel={() => setIsAddingProject(false)}
          />
        </div>
      )}
      <div className="mt-5 grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
        {isLoading && (
          <p role="status" className="bg-[#0d0f12] p-5 text-sm text-zinc-500 sm:p-6 md:col-span-3">
            Loading projects…
          </p>
        )}
        {!isLoading && sectionError && projects.length === 0 && (
          <p role="alert" className="bg-[#0d0f12] p-5 text-sm text-rose-300 sm:p-6 md:col-span-3">
            {sectionError}
          </p>
        )}
        {sectionError && projects.length > 0 && (
          <p role="alert" className="bg-[#0d0f12] p-4 text-xs text-rose-300 md:col-span-3">{sectionError}</p>
        )}
        {!isLoading && !sectionError && projects.length === 0 && (
          <p className="bg-[#0d0f12] p-5 text-sm text-zinc-500 sm:p-6 md:col-span-3">
            No active projects yet.
          </p>
        )}
        {!isLoading && projects.map((project) => (
          <article
            key={project.id}
            className={`bg-[#0d0f12] p-5 sm:p-6 ${editingProjectId === project.id ? 'md:col-span-3' : ''}`}
          >
            {editingProjectId === project.id ? (
              <ProjectForm
                initialValues={{
                  name: project.name,
                  description: project.description,
                  status: project.status,
                  progress: project.progress,
                  nextAction: project.nextAction,
                  deadline: project.deadline,
                }}
                submitLabel="Save changes"
                onSubmit={(values) => editProject(project.id, values)}
                onCancel={() => setEditingProjectId(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-zinc-100">{project.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500">{project.description}</p>
                  </div>
                  <span className="font-mono text-xs text-zinc-600">{project.progress}%</span>
                </div>
                <div className="mt-7 h-px bg-white/10">
                  <div className="h-px bg-amber-300" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="mt-5 flex items-center justify-between gap-4 text-xs">
                  <span className="text-zinc-600">Next</span>
                  <span className="text-right text-zinc-300">{project.nextAction}</span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-4 text-[0.65rem]">
                  <span className="text-zinc-600">
                    {project.status}{project.deadline ? ` · ${project.deadline}` : ''}
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      aria-label={`Edit ${project.name}`}
                      onClick={() => {
                        setIsAddingProject(false)
                        setEditingProjectId(project.id)
                      }}
                      className="cursor-pointer text-zinc-600 transition-colors hover:text-zinc-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${project.name}`}
                      onClick={() => setConfirmingDeleteProjectId(project.id)}
                      className="cursor-pointer text-zinc-600 transition-colors hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
            {confirmingDeleteProjectId === project.id && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4 text-xs">
                <span className="text-rose-200">Delete this project?</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    aria-label={`Cancel deleting ${project.name}`}
                    onClick={() => setConfirmingDeleteProjectId(null)}
                    disabled={deletingProjectId === project.id}
                    className="cursor-pointer text-zinc-500 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    aria-label={`Confirm deleting ${project.name}`}
                    onClick={() => void removeProject(project.id)}
                    disabled={deletingProjectId === project.id}
                    className="cursor-pointer text-rose-300 hover:text-rose-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    {deletingProjectId === project.id ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

function DailyBrief() {
  return (
    <aside className="relative overflow-hidden border border-amber-200/20 bg-amber-100/[0.045] p-5 sm:p-6 lg:p-7">
      <div className="absolute top-0 left-0 h-px w-24 bg-amber-300" />
      <SectionHeading eyebrow="Daily brief" title="A clear runway" meta="08:02" />
      <p className="mt-6 text-base leading-7 text-zinc-300">
        Your morning is intentionally light. Use the first focus block to settle the Personal Hub
        structure, then step away before the afternoon.
      </p>
      <div className="mt-7 grid grid-cols-2 gap-6 border-t border-white/10 pt-5">
        <div>
          <p className="text-2xl font-light tracking-tight text-zinc-100">12°</p>
          <p className="mt-1 text-xs text-zinc-500">Cloudy · London</p>
        </div>
        <div>
          <p className="text-2xl font-light tracking-tight text-zinc-100">4h 45m</p>
          <p className="mt-1 text-xs text-zinc-500">Open time</p>
        </div>
      </div>
      <p className="mt-6 border-l border-amber-300/50 pl-4 text-xs leading-5 text-zinc-500">
        One thing at a time. The important work already has space.
      </p>
    </aside>
  )
}

function App() {
  const todayDisplay = formatToday()
  const todayDate = localDateKey(new Date())
  const [today, setToday] = useState<Today | null>(null)
  const [isTodayLoading, setIsTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState<string | null>(null)

  const requestToday = useCallback(() => fetchToday(todayDate), [todayDate])

  const refreshToday = useCallback(async () => {
    try {
      setToday(await requestToday())
      setTodayError(null)
      return true
    } catch {
      return false
    }
  }, [requestToday])

  useEffect(() => {
    let isCurrent = true

    requestToday()
      .then((loadedToday) => {
        if (isCurrent) {
          setToday(loadedToday)
          setTodayError(null)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setTodayError('Today is unavailable. Check that the backend is running.')
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsTodayLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [requestToday])

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-zinc-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center border border-amber-300/40 text-[0.65rem] font-bold tracking-widest text-amber-200">
              PH
            </span>
            <span className="text-sm font-medium tracking-wide text-zinc-300">Personal Hub</span>
          </div>
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-xs text-zinc-500 sm:flex">
            <a href="#today" className="border-b border-amber-300 pb-1 text-zinc-100">Today</a>
            <a href="#tasks" className="pb-1 transition-colors hover:text-zinc-200">Tasks</a>
            <a href="#projects" className="pb-1 transition-colors hover:text-zinc-200">Projects</a>
          </nav>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            All clear
          </div>
        </div>
      </header>

      <main id="today" className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <section className="grid gap-8 border-b border-white/10 pb-10 sm:pb-14 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-4 text-[0.65rem] font-semibold tracking-[0.25em] text-amber-200 uppercase">
              Your day at a glance
            </p>
            <h1 className="max-w-3xl text-4xl font-light tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Good morning. <span className="text-zinc-500">Here’s what matters today.</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 lg:flex-col lg:items-end lg:gap-1">
            <span className="font-mono text-xs tracking-wider text-amber-200">{todayDisplay.shortDate}</span>
            <div className="text-right">
              <p className="text-xl font-medium text-zinc-100">{todayDisplay.day}</p>
              <p className="mt-1 text-xs text-zinc-500">{todayDisplay.date}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_1fr_0.8fr]">
          <Schedule
            events={today?.events ?? []}
            todayDate={todayDate}
            isLoading={isTodayLoading}
            loadError={todayError}
            refreshToday={refreshToday}
          />
          <div id="tasks">
            <PriorityTasks
              overdueTasks={today?.overdueTasks ?? []}
              dueTasks={today?.dueTasks ?? []}
              highPriorityTasks={today?.highPriorityTasks ?? []}
              todayDate={todayDate}
              isLoading={isTodayLoading}
              loadError={todayError}
              refreshToday={refreshToday}
            />
          </div>
          <DailyBrief />
        </div>

        <div id="projects" className="mt-12 sm:mt-16">
          <ActiveProjects
            projects={today?.activeProjects ?? []}
            isLoading={isTodayLoading}
            loadError={todayError}
            refreshToday={refreshToday}
          />
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 text-[0.65rem] tracking-wider text-zinc-600 uppercase sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>Personal Hub · Local workspace</span>
          <span>Make space for what matters</span>
        </div>
      </footer>
    </div>
  )
}

export default App

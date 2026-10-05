import { useEffect, useState } from 'react'

import { ProjectForm, type ProjectFormValues } from './components/ProjectForm'
import { TaskForm, type TaskFormValues } from './components/TaskForm'
import { fetchEvents } from './services/events'
import { createProject, deleteProject, fetchProjects, updateProject } from './services/projects'
import { createTask, deleteTask, fetchTasks, updateTask } from './services/tasks'
import type { Event as CalendarEvent } from './types/event'
import type { Project } from './types/project'
import type { Task } from './types/task'

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

function occursToday(startTime: string, today: Date) {
  const eventDate = new Date(startTime)

  return (
    !Number.isNaN(eventDate.getTime()) &&
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getDate() === today.getDate()
  )
}

function formatEventTime(dateTime: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateTime))
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

function Schedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    fetchEvents()
      .then((loadedEvents) => {
        if (isCurrent) {
          setEvents(loadedEvents)
          setError(null)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError('Schedule is unavailable. Check that the backend is running.')
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const today = new Date()
  const todaysEvents = events
    .filter((event) => occursToday(event.startTime, today))
    .sort((firstEvent, secondEvent) => {
      const timeDifference =
        new Date(firstEvent.startTime).getTime() - new Date(secondEvent.startTime).getTime()
      return timeDifference || firstEvent.id - secondEvent.id
    })
  const scheduledMinutes = todaysEvents.reduce(
    (total, event) => total + eventDurationMinutes(event),
    0,
  )

  return (
    <section
      aria-busy={isLoading}
      className="border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:p-7"
    >
      <SectionHeading
        eyebrow="Timeline"
        title="Today’s schedule"
        meta={isLoading ? 'Loading' : `${todaysEvents.length} ${todaysEvents.length === 1 ? 'event' : 'events'}`}
      />
      <div className="mt-2">
        {isLoading && (
          <p role="status" className="py-5 text-sm text-zinc-500">
            Loading today’s schedule…
          </p>
        )}
        {!isLoading && error && (
          <p role="alert" className="py-5 text-sm text-rose-300">
            {error}
          </p>
        )}
        {!isLoading && !error && todaysEvents.length === 0 && (
          <p className="py-5 text-sm text-zinc-500">No events scheduled for today.</p>
        )}
        {!isLoading && !error && todaysEvents.map((event, index) => (
          <article
            key={event.id}
            className="group grid grid-cols-[3.5rem_0.5rem_1fr] gap-3 border-b border-white/[0.07] py-5 last:border-b-0 sm:grid-cols-[4.25rem_0.5rem_1fr_auto] sm:items-center sm:gap-4"
          >
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
            </div>
            <span className="col-start-3 text-xs text-zinc-600 sm:col-start-auto">
              {formatDuration(eventDurationMinutes(event))}
            </span>
          </article>
        ))}
      </div>
      {!isLoading && !error && todaysEvents.length > 0 && (
        <div className="mt-2 flex items-center gap-3 border-t border-dashed border-white/10 pt-5 text-xs text-zinc-500">
          <span className="h-px flex-1 bg-white/10" />
          {formatDuration(scheduledMinutes)} scheduled today
        </div>
      )}
    </section>
  )
}

function PriorityTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [confirmingDeleteTaskId, setConfirmingDeleteTaskId] = useState<number | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null)
  const [isAddingTask, setIsAddingTask] = useState(false)

  useEffect(() => {
    let isCurrent = true

    fetchTasks()
      .then((loadedTasks) => {
        if (isCurrent) {
          setTasks(loadedTasks)
          setError(null)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError('Tasks are unavailable. Check that the backend is running.')
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const remainingTaskCount = tasks.filter((task) => task.status !== 'Done').length

  async function toggleTaskStatus(task: Task) {
    setUpdatingTaskId(task.id)
    setError(null)

    try {
      const updatedTask = await updateTask(task.id, {
        status: task.status === 'Done' ? 'To do' : 'Done',
      })

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === updatedTask.id ? updatedTask : currentTask,
        ),
      )
    } catch {
      setError('The task could not be updated. Please try again.')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function addTask(values: TaskFormValues) {
    setError(null)

    try {
      const createdTask = await createTask({ ...values, status: 'To do' })
      setTasks((currentTasks) => [...currentTasks, createdTask])
      setIsAddingTask(false)
    } catch (requestError) {
      setError('The task could not be created. Please try again.')
      throw requestError
    }
  }

  async function editTask(taskId: number, values: TaskFormValues) {
    setError(null)

    try {
      const updatedTask = await updateTask(taskId, values)
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
      )
      setEditingTaskId(null)
    } catch (requestError) {
      setError('The task could not be saved. Please try again.')
      throw requestError
    }
  }

  async function removeTask(taskId: number) {
    setDeletingTaskId(taskId)
    setError(null)

    try {
      await deleteTask(taskId)
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
      setConfirmingDeleteTaskId(null)
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
        meta={isLoading ? 'Loading' : `${remainingTaskCount} remaining`}
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
        <TaskForm
          submitLabel="Add task"
          onSubmit={addTask}
          onCancel={() => setIsAddingTask(false)}
        />
      )}
      <div className="mt-2">
        {isLoading && (
          <p role="status" className="py-5 text-sm text-zinc-500">Loading tasks…</p>
        )}
        {!isLoading && error && tasks.length === 0 && (
          <p role="alert" className="py-5 text-sm leading-6 text-rose-300">{error}</p>
        )}
        {!isLoading && !error && tasks.length === 0 && (
          <p className="py-5 text-sm text-zinc-500">No priority tasks yet.</p>
        )}
        {error && tasks.length > 0 && (
          <p role="alert" className="border-b border-white/[0.07] py-3 text-xs text-rose-300">{error}</p>
        )}
        {tasks.map((task, index) => (
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
                    {task.category}{task.dueDate ? ` · Due ${task.dueDate}` : ''}
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

function ActiveProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [confirmingDeleteProjectId, setConfirmingDeleteProjectId] = useState<number | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null)
  const [isAddingProject, setIsAddingProject] = useState(false)

  useEffect(() => {
    let isCurrent = true

    fetchProjects()
      .then((loadedProjects) => {
        if (isCurrent) {
          setProjects(loadedProjects)
          setError(null)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError('Projects are unavailable. Check that the backend is running.')
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const activeProjectCount = projects.filter((project) => project.status !== 'Completed').length

  async function addProject(values: ProjectFormValues) {
    setError(null)

    try {
      const createdProject = await createProject(values)
      setProjects((currentProjects) => [...currentProjects, createdProject])
      setIsAddingProject(false)
    } catch (requestError) {
      setError('The project could not be created. Please try again.')
      throw requestError
    }
  }

  async function editProject(projectId: number, values: ProjectFormValues) {
    setError(null)

    try {
      const updatedProject = await updateProject(projectId, values)
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === updatedProject.id ? updatedProject : project,
        ),
      )
      setEditingProjectId(null)
    } catch (requestError) {
      setError('The project could not be saved. Please try again.')
      throw requestError
    }
  }

  async function removeProject(projectId: number) {
    setDeletingProjectId(projectId)
    setError(null)

    try {
      await deleteProject(projectId)
      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId),
      )
      setConfirmingDeleteProjectId(null)
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
        meta={isLoading ? 'Loading' : `${activeProjectCount} in motion`}
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
        {!isLoading && error && projects.length === 0 && (
          <p role="alert" className="bg-[#0d0f12] p-5 text-sm text-rose-300 sm:p-6 md:col-span-3">
            {error}
          </p>
        )}
        {error && projects.length > 0 && (
          <p role="alert" className="bg-[#0d0f12] p-4 text-xs text-rose-300 md:col-span-3">{error}</p>
        )}
        {!isLoading && !error && projects.length === 0 && (
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
  const today = formatToday()

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
            <span className="font-mono text-xs tracking-wider text-amber-200">{today.shortDate}</span>
            <div className="text-right">
              <p className="text-xl font-medium text-zinc-100">{today.day}</p>
              <p className="mt-1 text-xs text-zinc-500">{today.date}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_1fr_0.8fr]">
          <Schedule />
          <div id="tasks"><PriorityTasks /></div>
          <DailyBrief />
        </div>

        <div id="projects" className="mt-12 sm:mt-16">
          <ActiveProjects />
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

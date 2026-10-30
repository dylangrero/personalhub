import { useEffect, useState } from 'react'
import { TaskForm, type TaskFormValues } from '../TaskForm'
import { createTask, deleteTask, updateTask } from '../../services/tasks'
import type { Task } from '../../types/task'
import {
  Icon,
  PanelHeading,
  SectionState,
  type DashboardAction,
  type RefreshToday,
} from './ui'
import { priorityTasks } from './utils'

type PriorityTasksProps = {
  overdueTasks: Task[]
  dueTasks: Task[]
  highPriorityTasks: Task[]
  todayDate: string
  isLoading: boolean
  loadError: string | null
  refreshToday: RefreshToday
  action: DashboardAction
  search: string
}

export function PriorityTasks({
  overdueTasks,
  dueTasks,
  highPriorityTasks,
  todayDate,
  isLoading,
  loadError,
  refreshToday,
  action,
  search,
}: PriorityTasksProps) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [confirmingDeleteTaskId, setConfirmingDeleteTaskId] = useState<
    number | null
  >(null)
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null)
  const [isAddingTask, setIsAddingTask] = useState(false)

  const tasks = priorityTasks(overdueTasks, dueTasks, highPriorityTasks)
  const visibleTasks = tasks.filter(({ task }) =>
    [task.title, task.category]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  useEffect(() => {
    if (action?.kind === 'task') {
      setIsAddingTask(action.id === undefined)
      setEditingTaskId(action.id ?? null)
      setConfirmingDeleteTaskId(null)
    }
  }, [action])

  const sectionError = error ?? loadError

  async function toggleTaskStatus(task: Task) {
    setUpdatingTaskId(task.id)
    setError(null)
    setNotice(null)

    try {
      await updateTask(task.id, {
        status: task.status === 'Done' ? 'To do' : 'Done',
      })
      setNotice(
        task.status === 'Done'
          ? 'Task reopened.'
          : 'Task complete. One less thing on your mind.'
      )
      if (!(await refreshToday())) {
        setError(
          'The task was updated, but Today could not be refreshed. Please reload.'
        )
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
      setError(
        'The task was created, but Today could not be refreshed. Please reload.'
      )
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
      setError(
        'The task was saved, but Today could not be refreshed. Please reload.'
      )
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
        setError(
          'The task was deleted, but Today could not be refreshed. Please reload.'
        )
      }
    } catch {
      setError('The task could not be deleted. Please try again.')
    } finally {
      setDeletingTaskId(null)
    }
  }

  return (
    <section id="tasks" aria-busy={isLoading} className="panel tasks-panel">
      <PanelHeading
        title="Priority tasks"
        icon="check"
        meta={isLoading ? undefined : String(tasks.length)}
        action={
          <button
            className="button button-small button-accent"
            onClick={() => {
              setIsAddingTask(!isAddingTask)
              setEditingTaskId(null)
              setConfirmingDeleteTaskId(null)
            }}
          >
            <Icon name={isAddingTask ? 'close' : 'plus'} size={14} />
            {isAddingTask ? 'Close' : 'Add task'}
          </button>
        }
      />
      {isAddingTask && (
        <div className="form-surface">
          <p className="form-note">
            Today shows overdue, due today, and high-priority tasks. Other tasks
            are still saved.
          </p>
          <TaskForm
            submitLabel="Add task"
            onSubmit={addTask}
            onCancel={() => setIsAddingTask(false)}
          />
        </div>
      )}
      <SectionState
        loading={isLoading}
        error={sectionError}
        empty={tasks.length === 0}
      >
        <Icon name="check" size={28} />
        <strong>A little breathing room.</strong>
        <span>No priority tasks right now.</span>
        <button
          className="text-button accent"
          onClick={() => setIsAddingTask(true)}
        >
          Add a task <Icon name="arrow" size={14} />
        </button>
      </SectionState>
      {notice && (
        <p role="status" className="inline-message success-message">
          {notice}
        </p>
      )}
      {!isLoading && tasks.length > 0 && visibleTasks.length === 0 && (
        <p className="section-message">No tasks match your search.</p>
      )}
      {!isLoading && (
        <div className="task-list">
          {visibleTasks.map(({ task, context }) => (
            <article
              key={task.id}
              className={`task-row ${updatingTaskId === task.id ? 'task-saving' : ''}`}
            >
              {editingTaskId === task.id ? (
                <div className="form-surface">
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
                </div>
              ) : (
                <div className="task-content">
                  <button
                    className="task-checkbox"
                    aria-label={`Mark ${task.title} ${task.status === 'Done' ? 'to do' : 'complete'}`}
                    disabled={
                      updatingTaskId === task.id || deletingTaskId === task.id
                    }
                    onClick={() => void toggleTaskStatus(task)}
                  >
                    {updatingTaskId === task.id ? (
                      <Icon name="check" size={17} />
                    ) : (
                      <span />
                    )}
                  </button>
                  <div className="task-details">
                    <h3>{task.title}</h3>
                    <div className="task-meta">
                      <span className="category-tag">{task.category}</span>
                      <span
                        className={
                          context === 'Overdue'
                            ? 'overdue-label'
                            : 'context-label'
                        }
                      >
                        {context}
                        {task.dueDate ? ` · ${task.dueDate}` : ''}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button
                        className="text-button"
                        aria-label={`Edit ${task.title}`}
                        onClick={() => {
                          setIsAddingTask(false)
                          setEditingTaskId(task.id)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button danger-hover"
                        aria-label={`Delete ${task.title}`}
                        onClick={() => setConfirmingDeleteTaskId(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <span
                    className={`priority-badge priority-${task.priority.toLowerCase()}`}
                  >
                    {task.priority}
                  </span>
                </div>
              )}
              {confirmingDeleteTaskId === task.id && (
                <div className="delete-confirmation">
                  <span>Delete this task?</span>
                  <button
                    className="text-button"
                    disabled={deletingTaskId === task.id}
                    onClick={() => setConfirmingDeleteTaskId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-button danger"
                    disabled={deletingTaskId === task.id}
                    onClick={() => void removeTask(task.id)}
                  >
                    {deletingTaskId === task.id
                      ? 'Deleting…'
                      : 'Confirm delete'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {!isLoading && tasks.length > 0 && (
        <div className="panel-footer">
          <span className="connection-dot connected" />
          {tasks.length} things worth your attention<span>One at a time.</span>
        </div>
      )}
    </section>
  )
}

import type { Task, TaskCreate, TaskPriority, TaskStatus, TaskUpdate } from '../types/task'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

type TaskApiResponse = {
  id: number
  title: string
  category: string
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  created_at: string
}

type TaskApiPayload = {
  title?: string
  category?: string
  priority?: TaskPriority
  status?: TaskStatus
  due_date?: string | null
}

function fromApiTask(task: TaskApiResponse): Task {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    priority: task.priority,
    status: task.status,
    dueDate: task.due_date,
    createdAt: task.created_at,
  }
}

function toApiPayload(task: TaskCreate | TaskUpdate): TaskApiPayload {
  return {
    ...(task.title !== undefined && { title: task.title }),
    ...(task.category !== undefined && { category: task.category }),
    ...(task.priority !== undefined && { priority: task.priority }),
    ...(task.status !== undefined && { status: task.status }),
    ...(task.dueDate !== undefined && { due_date: task.dueDate }),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)

  if (!response.ok) {
    throw new Error(`Task API request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchTasks(): Promise<Task[]> {
  const tasks = await request<TaskApiResponse[]>('/tasks')
  return tasks.map(fromApiTask)
}

export async function createTask(task: TaskCreate): Promise<Task> {
  const createdTask = await request<TaskApiResponse>('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(task)),
  })

  return fromApiTask(createdTask)
}

export async function updateTask(id: number, updates: TaskUpdate): Promise<Task> {
  const updatedTask = await request<TaskApiResponse>(`/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(updates)),
  })

  return fromApiTask(updatedTask)
}

export async function deleteTask(id: number): Promise<void> {
  await request<{ status: string }>(`/tasks/${id}`, { method: 'DELETE' })
}

export type TaskPriority = 'High' | 'Medium' | 'Low'

export type TaskStatus = 'To do' | 'In progress' | 'Done'

export interface Task {
  id: number
  title: string
  category: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  createdAt: string
}

export type TaskCreate = Omit<Task, 'id' | 'createdAt'>

export type TaskUpdate = Partial<TaskCreate>

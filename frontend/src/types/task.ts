export type TaskPriority = 'High' | 'Medium' | 'Low'

export type TaskStatus = 'To do' | 'In progress' | 'Done'

export interface Task {
  id: string
  title: string
  category: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
}

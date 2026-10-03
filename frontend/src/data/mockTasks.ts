import type { Task } from '../types/task'

export const mockTasks: Task[] = [
  {
    id: 'task-001',
    title: 'Map the dashboard data model',
    category: 'Personal Hub',
    priority: 'High',
    status: 'In progress',
    dueDate: '2026-10-03',
  },
  {
    id: 'task-002',
    title: 'Send revised weekend plans',
    category: 'Personal',
    priority: 'High',
    status: 'To do',
    dueDate: '2026-10-03',
  },
  {
    id: 'task-003',
    title: 'Review October budget',
    category: 'Finance',
    priority: 'Medium',
    status: 'To do',
    dueDate: '2026-10-05',
  },
  {
    id: 'task-004',
    title: 'Book annual boiler service',
    category: 'Home',
    priority: 'Medium',
    status: 'To do',
    dueDate: null,
  },
]

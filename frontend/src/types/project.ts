export type ProjectStatus = 'Planning' | 'Active' | 'On hold' | 'Completed'

export interface Project {
  id: number
  name: string
  description: string
  status: ProjectStatus
  progress: number
  nextAction: string
  deadline: string | null
  createdAt: string
}

export type ProjectCreate = Omit<Project, 'id' | 'createdAt'>

export type ProjectUpdate = Partial<ProjectCreate>

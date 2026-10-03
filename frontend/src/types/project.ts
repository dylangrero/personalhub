export type ProjectStatus = 'Planning' | 'Active' | 'On hold' | 'Completed'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  progress: number
  nextAction: string
  deadline: string | null
}

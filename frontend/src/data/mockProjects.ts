import type { Project } from '../types/project'

export const mockProjects: Project[] = [
  {
    id: 'project-001',
    name: 'Personal Hub',
    description: 'Dashboard shell',
    status: 'Active',
    progress: 38,
    nextAction: 'Define tasks view',
    deadline: null,
  },
  {
    id: 'project-002',
    name: 'Home reset',
    description: 'Autumn maintenance',
    status: 'Active',
    progress: 65,
    nextAction: 'Finish study shelves',
    deadline: '2026-10-31',
  },
  {
    id: 'project-003',
    name: 'Spain trip',
    description: 'November planning',
    status: 'Planning',
    progress: 22,
    nextAction: 'Shortlist stays',
    deadline: '2026-11-12',
  },
]

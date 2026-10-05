import type {
  Project,
  ProjectCreate,
  ProjectStatus,
  ProjectUpdate,
} from '../types/project'
import { apiRequest } from './api'

type ProjectApiResponse = {
  id: number
  name: string
  description: string
  status: ProjectStatus
  progress: number
  next_action: string
  deadline: string | null
  created_at: string
}

type ProjectApiPayload = {
  name?: string
  description?: string
  status?: ProjectStatus
  progress?: number
  next_action?: string
  deadline?: string | null
}

function fromApiProject(project: ProjectApiResponse): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    progress: project.progress,
    nextAction: project.next_action,
    deadline: project.deadline,
    createdAt: project.created_at,
  }
}

function toApiPayload(project: ProjectCreate | ProjectUpdate): ProjectApiPayload {
  return {
    ...(project.name !== undefined && { name: project.name }),
    ...(project.description !== undefined && { description: project.description }),
    ...(project.status !== undefined && { status: project.status }),
    ...(project.progress !== undefined && { progress: project.progress }),
    ...(project.nextAction !== undefined && { next_action: project.nextAction }),
    ...(project.deadline !== undefined && { deadline: project.deadline }),
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const projects = await apiRequest<ProjectApiResponse[]>('/projects')
  return projects.map(fromApiProject)
}

export async function createProject(project: ProjectCreate): Promise<Project> {
  const createdProject = await apiRequest<ProjectApiResponse>('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(project)),
  })

  return fromApiProject(createdProject)
}

export async function updateProject(id: number, updates: ProjectUpdate): Promise<Project> {
  const updatedProject = await apiRequest<ProjectApiResponse>(`/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(updates)),
  })

  return fromApiProject(updatedProject)
}

export async function deleteProject(id: number): Promise<void> {
  await apiRequest<{ status: string }>(`/projects/${id}`, { method: 'DELETE' })
}

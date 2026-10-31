import { useEffect, useState } from 'react'
import { ProjectForm, type ProjectFormValues } from '../ProjectForm'
import {
  createProject,
  deleteProject,
  updateProject,
} from '../../services/projects'
import type { Project } from '../../types/project'
import {
  Icon,
  PanelHeading,
  SectionState,
  type DashboardAction,
  type RefreshToday,
} from './ui'

type ActiveProjectsProps = {
  projects: Project[]
  isLoading: boolean
  loadError: string | null
  refreshToday: RefreshToday
  action: DashboardAction
  search: string
}

export function ActiveProjects({
  projects,
  isLoading,
  loadError,
  refreshToday,
  action,
  search,
}: ActiveProjectsProps) {
  const [error, setError] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [confirmingDeleteProjectId, setConfirmingDeleteProjectId] = useState<
    number | null
  >(null)
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(
    null
  )
  const [isAddingProject, setIsAddingProject] = useState(false)

  useEffect(() => {
    if (action?.kind === 'project') {
      setIsAddingProject(action.id === undefined)
      setEditingProjectId(action.id ?? null)
      setConfirmingDeleteProjectId(null)
    }
  }, [action])
  const visibleProjects = projects.filter((project) =>
    [project.name, project.description, project.nextAction]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const sectionError = error ?? loadError

  async function addProject(values: ProjectFormValues) {
    setError(null)

    try {
      await createProject(values)
      setIsAddingProject(false)
    } catch (requestError) {
      setError('The project could not be created. Please try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError(
        'The project was created, but Today could not be refreshed. Please reload.'
      )
    }
  }

  async function editProject(projectId: number, values: ProjectFormValues) {
    setError(null)

    try {
      await updateProject(projectId, values)
      setEditingProjectId(null)
    } catch (requestError) {
      setError('The project could not be saved. Please try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError(
        'The project was saved, but Today could not be refreshed. Please reload.'
      )
    }
  }

  async function removeProject(projectId: number) {
    setDeletingProjectId(projectId)
    setError(null)

    try {
      await deleteProject(projectId)
      setConfirmingDeleteProjectId(null)
      if (!(await refreshToday())) {
        setError(
          'The project was deleted, but Today could not be refreshed. Please reload.'
        )
      }
    } catch {
      setError('The project could not be deleted. Please try again.')
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <section
      id="projects"
      className="panel projects-panel"
      aria-busy={isLoading}
    >
      <PanelHeading
        title="Active projects"
        icon="layers"
        meta={isLoading ? undefined : `${projects.length} in motion`}
        action={
          <button
            className="button button-small"
            onClick={() => {
              setIsAddingProject(!isAddingProject)
              setEditingProjectId(null)
              setConfirmingDeleteProjectId(null)
            }}
          >
            <Icon name={isAddingProject ? 'close' : 'plus'} size={14} />
            {isAddingProject ? 'Close' : 'New project'}
          </button>
        }
      />
      {isAddingProject && (
        <div className="form-surface">
          <ProjectForm
            submitLabel="Add project"
            onSubmit={addProject}
            onCancel={() => setIsAddingProject(false)}
          />
        </div>
      )}
      <SectionState
        loading={isLoading}
        error={sectionError}
        empty={projects.length === 0}
      >
        <Icon name="layers" size={28} />
        <strong>No active projects</strong>
        <span>Create a project to track its progress.</span>
        <button
          className="text-button accent"
          onClick={() => setIsAddingProject(true)}
        >
          Start a project <Icon name="arrow" size={14} />
        </button>
      </SectionState>
      {!isLoading && projects.length > 0 && visibleProjects.length === 0 && (
        <p className="section-message">No projects match your search.</p>
      )}
      {!isLoading && (
        <div className="project-grid">
          {visibleProjects.map((project, index) => (
            <article
              key={project.id}
              className={`project-card project-tone-${index % 4} ${editingProjectId === project.id ? 'project-expanded' : ''}`}
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
                  <div className="project-title">
                    <h3>{project.name}</h3>
                    <button
                      className="project-open"
                      aria-label={`Open ${project.name}`}
                      onClick={() => {
                        setIsAddingProject(false)
                        setEditingProjectId(project.id)
                      }}
                    >
                      <Icon name="chevron" size={15} />
                    </button>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-progress">
                    <div
                      role="progressbar"
                      aria-label={`${project.name} progress`}
                      aria-valuenow={project.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${project.progress}%` }} />
                    </div>
                    <span>{project.progress}%</span>
                  </div>
                  <p className="project-next">
                    <span>Next</span>
                    {project.nextAction}
                  </p>
                  <div className="project-bottom">
                    <span>
                      {project.status}
                      {project.deadline ? ` · ${project.deadline}` : ''}
                    </span>
                    <div className="row-actions">
                      <button
                        className="text-button"
                        aria-label={`Edit ${project.name}`}
                        onClick={() => {
                          setIsAddingProject(false)
                          setEditingProjectId(project.id)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button danger-hover"
                        aria-label={`Delete ${project.name}`}
                        onClick={() => setConfirmingDeleteProjectId(project.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
              {confirmingDeleteProjectId === project.id && (
                <div className="delete-confirmation">
                  <span>Delete this project?</span>
                  <button
                    className="text-button"
                    disabled={deletingProjectId === project.id}
                    onClick={() => setConfirmingDeleteProjectId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-button danger"
                    disabled={deletingProjectId === project.id}
                    onClick={() => void removeProject(project.id)}
                  >
                    {deletingProjectId === project.id
                      ? 'Deleting…'
                      : 'Confirm delete'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

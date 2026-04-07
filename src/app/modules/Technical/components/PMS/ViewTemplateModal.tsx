import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { PmsTemplateDto, PmsTemplateTaskDto } from '../../core/pms/_models'
import { getPmsTemplateTasks, deletePmsTemplateTask } from '../../core/pms/_requests'
import { toast } from 'react-toastify'
import { AddTemplateTaskModal } from './AddTemplateTaskModal'
import { EditTemplateTaskModal } from './EditTemplateTaskModal'

interface Props {
  visible: boolean
  onClose: () => void
  template: PmsTemplateDto
  onTemplateUpdated?: () => void
}

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const ViewTemplateModal: FC<Props> = ({ visible, onClose, template, onTemplateUpdated }) => {
  const [tasks, setTasks] = useState<PmsTemplateTaskDto[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [editTaskOpen, setEditTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<PmsTemplateTaskDto | null>(null)

  useEffect(() => {
    if (visible && template.id) {
      loadTasks()
    }
  }, [visible, template.id])

  const loadTasks = async () => {
    if (!template.id) return
    setLoadingTasks(true)
    try {
      const data = await getPmsTemplateTasks(template.id)
      setTasks(data)
    } catch (error) {
      console.error('Error loading template tasks:', error)
      toast.error('Failed to load template tasks', { position: 'top-center' })
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }
    try {
      await deletePmsTemplateTask(taskId)
      toast.success('Task deleted successfully', { position: 'top-center' })
      loadTasks()
      onTemplateUpdated?.()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task', { position: 'top-center' })
    }
  }

  const handleEditTask = (task: PmsTemplateTaskDto) => {
    setEditingTask(task)
    setEditTaskOpen(true)
  }

  if (!visible) return null

  const getWorkTypeLabel = (workType: string) => {
    const labels: { [key: string]: string } = {
      CHECK: 'Check',
      OVERHAUL: 'Overhaul',
      RENEW: 'Renew',
      ADJUST: 'Adjust',
      INSPECT: 'Inspect',
      TEST: 'Test',
      CLEAN: 'Clean',
    }
    return labels[workType] || workType
  }

  const getScheduleTypeLabel = (scheduleType: string) => {
    const labels: { [key: string]: string } = {
      TIME: 'Time',
      RUNNING_HOURS: 'Running Hours',
      EVENT: 'Event',
      DOCK: 'Dock',
      AS_REQUIRED: 'As Required',
    }
    return labels[scheduleType] || scheduleType
  }

  return (
    <>
      <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div
          className='bg-white text-dark rounded shadow-lg d-flex flex-column'
          style={{
            width: '90vw',
            maxWidth: '1400px',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
            <h5 className='modal-title text-dark m-0'>View PMS Template</h5>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            <div className='row g-3 mb-5'>
              <div className='col-md-12'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Template Name</div>
                <div className='fw-bold'>{template.name}</div>
              </div>
              {template.description && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Description</div>
                  <div className='border rounded p-2 bg-light-subtle' style={{ minHeight: '60px' }}>
                    {template.description}
                  </div>
                </div>
              )}
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Machinery Type</div>
                <div className='fw-bold'>{template.machineryType || '-'}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Maker</div>
                <div className='fw-bold'>{template.maker || '-'}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Model</div>
                <div className='fw-bold'>{template.model || '-'}</div>
              </div>
              <div className='col-md-3'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Power (kW)</div>
                <div className='fw-bold'>{template.power || '-'}</div>
              </div>
              <div className='col-md-3'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Cylinders</div>
                <div className='fw-bold'>{template.cylinders || '-'}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Status</div>
                <div>
                  <span className={`badge ${template.active ? 'badge-light-success' : 'badge-light-secondary'}`}>
                    {template.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Template Tasks */}
            <div className='mt-5'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h6 className='fw-bold m-0'>Template Tasks ({tasks.length})</h6>
                <button
                  type='button'
                  className='btn btn-sm btn-primary'
                  onClick={() => setAddTaskOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add Task
                </button>
              </div>
              {loadingTasks ? (
                <div className='text-center py-5'>
                  <div className='spinner-border' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div className='text-muted text-center py-5'>No tasks defined for this template.</div>
              ) : (
                <div className='table-responsive'>
                  <table className='table table-bordered table-hover'>
                    <thead>
                      <tr>
                        <th>Group Title</th>
                        <th>Item Title</th>
                        <th>Work Type</th>
                        <th>Schedule Type</th>
                        <th>Interval</th>
                        <th>OEM Code</th>
                        <th>Hierarchy</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id}>
                          <td>{task.groupTitle || '-'}</td>
                          <td>{task.itemTitle || '-'}</td>
                          <td>
                            <span className='badge badge-light-info'>{getWorkTypeLabel(task.workType)}</span>
                          </td>
                          <td>
                            <span className='badge badge-light-primary'>{getScheduleTypeLabel(task.scheduleType)}</span>
                          </td>
                          <td>
                            {/* Templates no longer use intervalValue/intervalUnit */}
                            -
                          </td>
                          <td>{task.oemCode || '-'}</td>
                          <td>
                            <span className='badge badge-light-secondary'>
                              {task.hierarchyLevel === 'COMPONENT' ? 'Component' : 'Sub-Component'}
                            </span>
                          </td>
                          <td>
                            <div className='d-flex gap-2'>
                              <button
                                className='btn btn-sm btn-light-primary'
                                onClick={() => handleEditTask(task)}
                                title='Edit'
                              >
                                <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-3' />
                              </button>
                              <button
                                className='btn btn-sm btn-light-danger'
                                onClick={() => task.id && handleDeleteTask(task.id)}
                                title='Delete'
                              >
                                <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-3' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {addTaskOpen && template.id && (
        <AddTemplateTaskModal
          visible={addTaskOpen}
          templateId={template.id}
          templateName={template.name || ''}
          onClose={() => setAddTaskOpen(false)}
          onSuccess={() => {
            loadTasks()
            onTemplateUpdated?.()
          }}
        />
      )}

      {editTaskOpen && editingTask && template.id && (
        <EditTemplateTaskModal
          visible={editTaskOpen}
          templateId={template.id}
          templateName={template.name || ''}
          task={editingTask}
          onClose={() => {
            setEditTaskOpen(false)
            setEditingTask(null)
          }}
          onSuccess={() => {
            loadTasks()
            onTemplateUpdated?.()
          }}
        />
      )}
    </>
  )
}


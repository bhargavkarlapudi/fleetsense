import React, { FC, useState, useEffect, useCallback } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { PmsJobRecord, PmsJobCompletionDto, SpareUsageItem } from '../../core/pms/_models'
import { completePmsJob } from '../../core/pms/_requests'
import { getInventory } from '../../../Procurement/core/_requests'
import { useAuth } from '../../../auth'
import { toast } from 'react-toastify'

interface Props {
  visible: boolean
  onClose: () => void
  job: PmsJobRecord
  onSuccess: () => void
}

const LABEL = 'form-label fw-semibold fs-6 mb-2 text-dark'

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const CompleteJobModal: FC<Props> = ({ visible, onClose, job, onSuccess }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState<PmsJobCompletionDto>({
    actualCompletionDate: new Date().toISOString().split('T')[0],
    actualCounterAtCompletion: undefined,
    remarks: '',
    findings: '',
    measuredValues: '',
    timeTaken: undefined,
    personsInvolved: undefined,
    performerUserId: currentUser?.id || undefined,
    verifierUserId: undefined,
    spareUsages: [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [selectedSpare, setSelectedSpare] = useState<{ itemId: number; quantity: number }>({ itemId: 0, quantity: 1 })
  const [checklistItems, setChecklistItems] = useState<Array<{ id: string; text: string; checked: boolean }>>([])
  
  // Load checklist from job when modal opens
  useEffect(() => {
    if (visible && job.checklist) {
      const items = job.checklist.split('\n')
        .filter(line => line.trim().length > 0)
        .map((line, index) => ({
          id: `checklist-${index}`,
          text: line.trim(),
          checked: false,
        }))
      setChecklistItems(items)
    } else if (visible) {
      setChecklistItems([])
    }
  }, [visible, job.checklist])
  
  // Calculate man-hours when timeTaken or personsInvolved changes
  useEffect(() => {
    if (formData.timeTaken && formData.personsInvolved && formData.personsInvolved > 0) {
      // Man-hours will be calculated on backend, but we can show it here for preview
    }
  }, [formData.timeTaken, formData.personsInvolved])

  const loadInventory = useCallback(async () => {
    if (!job.vesselId) return
    setLoadingInventory(true)
    try {
      const response = await getInventory(job.vesselId, 0, 100)
      setInventoryItems(response.content || [])
    } catch (error) {
      console.error('Error loading inventory:', error)
      toast.error('Failed to load inventory items')
    } finally {
      setLoadingInventory(false)
    }
  }, [job.vesselId])

  useEffect(() => {
    if (visible && job.vesselId) {
      loadInventory()
    }
  }, [visible, job.vesselId, loadInventory])

  const getSelectedItem = () => {
    return inventoryItems.find((i: any) => i.id === selectedSpare.itemId)
  }

  const addSpareUsage = () => {
    if (!selectedSpare.itemId || selectedSpare.quantity <= 0) {
      toast.error('Please select an item and enter quantity', { position: 'top-center' })
      return
    }
    const item = getSelectedItem()
    if (item && item.currentQty !== undefined && selectedSpare.quantity > item.currentQty) {
      toast.error(`Quantity cannot exceed available stock (${item.currentQty})`, { position: 'top-center' })
      return
    }
    // Check if item already added
    const existingIndex = formData.spareUsages?.findIndex(s => s.inventoryItemId === selectedSpare.itemId)
    if (existingIndex !== undefined && existingIndex >= 0) {
      toast.error('This item is already added. Please remove it first or update the quantity.', { position: 'top-center' })
      return
    }
    const newSpare: SpareUsageItem = {
      inventoryItemId: selectedSpare.itemId,
      quantity: selectedSpare.quantity,
    }
    setFormData(prev => ({
      ...prev,
      spareUsages: [...(prev.spareUsages || []), newSpare],
    }))
    setSelectedSpare({ itemId: 0, quantity: 1 })
  }

  const getTotalSpareCost = () => {
    if (!formData.spareUsages || formData.spareUsages.length === 0) return 0
    return formData.spareUsages.reduce((total, spare) => {
      const item = inventoryItems.find((i: any) => i.id === spare.inventoryItemId)
      const unitCost = item?.unitCost || 0
      return total + (unitCost * spare.quantity)
    }, 0)
  }

  const removeSpareUsage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      spareUsages: prev.spareUsages?.filter((_, i) => i !== index) || [],
    }))
  }

  if (!visible) return null

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await completePmsJob(job.id!, formData)
      toast.success('Job completed successfully')
      onSuccess()
    } catch (error) {
      toast.error('Failed to complete job')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '75vw',
          height: '75vh',
          maxWidth: '1400px',
          maxHeight: '900px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Complete Job</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <div className='flex-grow-1 overflow-auto px-4 py-3'>
          <div className='row g-3'>
            <div className="col-md-6">
              <label className={LABEL}>Completion Date</label>
              <input
                type="date"
                className="form-control text-dark"
                value={formData.actualCompletionDate || ''}
                onChange={(e) => setFormData({ ...formData, actualCompletionDate: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className={LABEL}>Running Hours at Completion</label>
              <input
                type="number"
                className="form-control text-dark"
                value={formData.actualCounterAtCompletion || ''}
                onChange={(e) => setFormData({ ...formData, actualCounterAtCompletion: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="col-md-12">
              <label className={LABEL}>Remarks</label>
              <textarea
                className="form-control text-dark"
                rows={3}
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
            <div className="col-md-12">
              <label className={LABEL}>Findings</label>
              <textarea
                className="form-control text-dark"
                rows={3}
                value={formData.findings || ''}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              />
            </div>
            <div className="col-md-12">
              <label className={LABEL}>Measured Values</label>
              <textarea
                className="form-control text-dark"
                rows={2}
                value={formData.measuredValues || ''}
                onChange={(e) => setFormData({ ...formData, measuredValues: e.target.value })}
                placeholder="Enter measured values (e.g., pressure, temperature, etc.)"
              />
            </div>

            {/* Checklist Section */}
            {checklistItems.length > 0 && (
              <div className="mb-5">
                <label className={LABEL}>Checklist</label>
              <div className="card bg-light p-3">
                <div className="form-check-list">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={item.id}
                        checked={item.checked}
                        onChange={(e) => {
                          setChecklistItems(prev =>
                            prev.map(i => i.id === item.id ? { ...i, checked: e.target.checked } : i)
                          )
                        }}
                      />
                      <label className="form-check-label" htmlFor={item.id}>
                        {item.text}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-top">
                  <small className="text-muted">
                    Completed: {checklistItems.filter(i => i.checked).length} / {checklistItems.length}
                  </small>
                </div>
              </div>
            </div>
          )}

            {/* Man-Hours Tracking */}
            <div className="mb-5">
              <label className={LABEL}>Man-Hours Tracking</label>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7 mb-2 text-dark">Time Taken (Hours)</label>
                  <input
                    type="number"
                    className="form-control text-dark"
                    min={0}
                    step={0.5}
                    value={formData.timeTaken ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined
                      setFormData((prev) => ({ ...prev, timeTaken: val }))
                    }}
                    placeholder="Hours"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7 mb-2 text-dark">Persons Involved</label>
                  <input
                    type="number"
                    className="form-control text-dark"
                    min={1}
                    value={formData.personsInvolved ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined
                      setFormData((prev) => ({ ...prev, personsInvolved: val }))
                    }}
                    placeholder="Number of persons"
                  />
                </div>
              {formData.timeTaken && formData.personsInvolved && formData.personsInvolved > 0 && (
                <div className="col-md-12">
                  <div className="alert alert-info py-2 mb-0">
                    <strong>Calculated Man-Hours:</strong>{' '}
                    {(formData.timeTaken * formData.personsInvolved).toFixed(2)} hours
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Performer Sign-off */}
            <div className="mb-5">
              <label className={LABEL}>Performed By</label>
              <input
                type="text"
                className="form-control text-dark"
                value={currentUser?.username || 'Current User'}
                disabled
                readOnly
              />
              <div className="form-text text-muted">This will be recorded as the performer of the work.</div>
            </div>

            {/* Spares Used Section */}
            <div className="mb-5">
              <label className={LABEL}>Spares Used</label>
              <div className="card bg-light p-3">
                <div className="row g-2 mb-3">
                  <div className="col-md-5">
                    <label className="form-label fw-semibold fs-7 mb-2 text-dark">Select Item</label>
                    <select
                      className="form-select form-select-sm text-dark"
                      value={selectedSpare.itemId}
                      onChange={(e) => setSelectedSpare({ ...selectedSpare, itemId: Number(e.target.value) })}
                      disabled={loadingInventory}
                    >
                      <option value="0">Select Inventory Item</option>
                      {inventoryItems.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName || item.partName || item.part?.name || `Item #${item.id}`}
                          {item.partNumber && ` (${item.partNumber})`}
                        </option>
                      ))}
                    </select>
                    {selectedSpare.itemId > 0 && (() => {
                      const item = getSelectedItem()
                      return item && (
                        <div className="mt-1">
                          <small className="text-muted">
                            Stock: <strong>{item.currentQty || 0}</strong>
                            {item.unitCost && ` | Unit Cost: $${item.unitCost.toFixed(2)}`}
                          </small>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold fs-7 mb-2 text-dark">Quantity</label>
                    <input
                      type="number"
                      className="form-control form-control-sm text-dark"
                      placeholder="Qty"
                      min="1"
                      max={getSelectedItem()?.currentQty || undefined}
                      value={selectedSpare.quantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value) || 1
                        const item = getSelectedItem()
                        if (item && item.currentQty !== undefined && qty > item.currentQty) {
                          toast.warning(`Maximum available: ${item.currentQty}`, { position: 'top-center' })
                          setSelectedSpare({ ...selectedSpare, quantity: item.currentQty })
                        } else {
                          setSelectedSpare({ ...selectedSpare, quantity: qty })
                        }
                      }}
                    />
                  </div>
                <div className="col-md-4 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary w-100"
                    onClick={addSpareUsage}
                  >
                    <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                    Add
                  </button>
                </div>
              </div>
              {formData.spareUsages && formData.spareUsages.length > 0 && (
                <>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>Part Number</th>
                          <th>Quantity</th>
                          <th>Unit Cost</th>
                          <th>Total Cost</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.spareUsages.map((spare, index) => {
                          const item = inventoryItems.find((i: any) => i.id === spare.inventoryItemId)
                          const unitCost = item?.unitCost || 0
                          const totalCost = unitCost * spare.quantity
                          return (
                            <tr key={index}>
                              <td>{item?.itemName || item?.partName || item?.part?.name || `Item #${spare.inventoryItemId}`}</td>
                              <td>{item?.partNumber || item?.part?.partNumber || '-'}</td>
                              <td>
                                {spare.quantity}
                                {item?.currentQty !== undefined && (
                                  <span className={`badge ms-2 ${spare.quantity > item.currentQty ? 'badge-light-danger' : 'badge-light-success'}`}>
                                    Stock: {item.currentQty}
                                  </span>
                                )}
                              </td>
                              <td>${unitCost.toFixed(2)}</td>
                              <td><strong>${totalCost.toFixed(2)}</strong></td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light-danger"
                                  onClick={() => removeSpareUsage(index)}
                                  title="Remove"
                                >
                                  <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="fw-bold">
                          <td colSpan={4} className="text-end">Grand Total:</td>
                          <td>${getTotalSpareCost().toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button type="button" className="btn btn-light btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Complete Job'}
          </button>
        </div>
      </div>
    </div>
  )
}


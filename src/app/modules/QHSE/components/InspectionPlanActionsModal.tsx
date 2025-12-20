import React, { FC, useEffect, useState } from 'react'
import { listUnlinkedInspections, linkPlanToInspection } from '../core/_requests'
import type { InspectionPlanDto } from '../core/_models'

type Candidate = {
  id: number
  inspectionType?: string          // human label (e.g., "Internal Audit - ISM")
  internalInspectorName?: string
  externalInspectorName?: string
  inspectionFromDate?: string      // ISO string or dd-MM-yyyy
  vesselName?: string              // optional if your API returns it
  kindName?: string                // optional if your API returns it
}

export const InspectionPlanActionsModal: FC<{
  visible: boolean
  onClose: () => void
  plan: InspectionPlanDto | null
  onCreateAndLink: (prefill: { vesselId: number; inspectionKindId: number; planId: number; planMonthDate: string }) => void
  onViewInspection: (inspectionId: number) => void
  refreshPlans: () => Promise<void>
}> = ({ visible, onClose, plan, onCreateAndLink, onViewInspection, refreshPlans }) => {
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  // helpers
  const monthLabel = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const inspectorName = (c: Candidate) =>
    c.internalInspectorName || c.externalInspectorName || '—'

  useEffect(() => {
    const load = async () => {
      if (!plan) { setCandidates([]); return }
      setLoading(true)
      try {
        const list = await listUnlinkedInspections({
          vesselId: plan.vesselId,
          inspectionKindId: plan.inspectionKindId,
          forDate: plan.planDate,
        })
        setCandidates(Array.isArray(list) ? list : [])
      } finally { setLoading(false) }
    }
    if (visible) load()
  }, [visible, plan])

  if (!visible || !plan) return null

  const doLink = async (inspectionId: number) => {
    await linkPlanToInspection(plan.id, inspectionId) // IDs still used internally
    await refreshPlans()
    onClose()
  }

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050 }}
      aria-modal
      role="dialog"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content bg-white text-dark">
          <div className="modal-header">
            {/* Title shows readable info only */}
            <h5 className="modal-title text-dark">
              Plan Actions • {monthLabel(plan.planDate)}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {/* Subhead with vessel & kind names if you have them on the DTO; otherwise remove */}
            {(plan as any).vesselName || (plan as any).inspectionKindName ? (
              <div className="text-muted mb-3">
                {(plan as any).vesselName ? <span className="me-2">{(plan as any).vesselName}</span> : null}
                {(plan as any).inspectionKindName ? <span>• {(plan as any).inspectionKindName}</span> : null}
              </div>
            ) : null}

            {plan.inspectionId ? (
              // Linked state: no raw IDs shown; tooltip contains them if needed
              <div className="alert alert-success d-flex justify-content-between align-items-center">
                <div>
                  Linked to Inspection
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  title={`Open inspection (id=${plan.inspectionId})`}
                  onClick={() => onViewInspection(plan.inspectionId!)}
                  data-inspection-id={plan.inspectionId}
                  data-plan-id={plan.id}
                >
                  View Inspection
                </button>
              </div>
            ) : (
              <>
                <div className="d-flex gap-2 mb-3">
                  <button
                    className="btn btn_primary"
                    onClick={() =>
                      onCreateAndLink({
                        vesselId: plan.vesselId,               // keep IDs internally
                        inspectionKindId: plan.inspectionKindId,
                        planId: plan.id,
                        planMonthDate: plan.planDate,
                      })
                    }
                    title="Create a new inspection for this plan and link it"
                    data-plan-id={plan.id}
                  >
                    Create Inspection & Link
                  </button>
                </div>

                <h6 className="text-muted mb-2">
                  Link an existing inspection (same vessel, kind & month)
                </h6>

                {loading ? (
                  <div className="text-muted">Loading…</div>
                ) : candidates.length === 0 ? (
                  <div className="text-muted">No matching unlinked inspections found for this month.</div>
                ) : (
                  <div className="list-group">
                    {candidates.map((it) => (
                      <div
                        key={it.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                        title={`Inspection id=${it.id}`}            // tooltip only
                        data-inspection-id={it.id}                  // data-* keeps the id
                        data-plan-id={plan.id}
                      >
                        <div>
                          <div className="fw-semibold">
                            {it.inspectionType || 'Inspection'}
                            {it.kindName ? ` — ${it.kindName}` : ''}
                            {it.vesselName ? ` • ${it.vesselName}` : ''}
                          </div>
                          <div className="small text-muted">
                            {it.inspectionFromDate || 'Date —'} • {inspectorName(it)}
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-light btn-sm"
                            onClick={() => onViewInspection(it.id)}
                            title="Preview inspection"
                          >
                            View
                          </button>
                          <button
                            className="btn btn_primary btn-sm"
                            onClick={() => doLink(it.id)}
                            title="Link this inspection to the plan"
                          >
                            Link
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-light btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

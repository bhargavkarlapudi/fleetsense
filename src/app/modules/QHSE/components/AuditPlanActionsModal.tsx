import React, {FC, useEffect, useState} from 'react'
import {listUnlinkedAudits, linkAuditPlanToAudit} from '../core/_requests'
import type {AuditPlanDto} from '../core/_models'

type Candidate = {
  id: number
  auditType?: string          // human label (e.g., "Internal Audit - ISM")
  internalAuditorName?: string
  externalAuditorName?: string
  auditFromDate?: string      // ISO string or dd-MM-yyyy
  vesselName?: string
  kindName?: string
}

export const AuditPlanActionsModal: FC<{
  visible: boolean
  onClose: () => void
  plan: AuditPlanDto | null
  onCreateAndLink: (prefill: {
    vesselId: number
    auditKindId: number
    planId: number
    planMonthDate: string
  }) => void
  onViewAudit: (auditId: number) => void
  refreshPlans: () => Promise<void>
}> = ({visible, onClose, plan, onCreateAndLink, onViewAudit, refreshPlans}) => {
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  // helpers
  const monthLabel = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})

  const auditorName = (c: Candidate) =>
  c.internalAuditorName || c.externalAuditorName || '—'

  useEffect(() => {
    const load = async () => {
      if (!plan) {
        setCandidates([])
        return
      }
      setLoading(true)
      try {
        const list = await listUnlinkedAudits({
          vesselId: plan.vesselId,
          auditKindId: plan.auditKindId,
          forDate: plan.planDate,
        })
        setCandidates(Array.isArray(list) ? list : [])
      } finally {
        setLoading(false)
      }
    }
    if (visible) load()
  }, [visible, plan])

  if (!visible || !plan) return null

  const doLink = async (auditId: number) => {
    await linkAuditPlanToAudit(plan.id, auditId)
    await refreshPlans()
    onClose()
  }

  return (
    <div
      className='modal fade show d-flex align-items-center justify-content-center'
      style={{background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050}}
      aria-modal
      role='dialog'
    >
      <div className='modal-dialog modal-lg modal-dialog-centered'>
        <div className='modal-content bg-white text-dark'>
          <div className='modal-header'>
            {/* Title shows readable info only */}
            <h5 className='modal-title text-dark'>
              Audit Plan Actions • {monthLabel(plan.planDate)}
            </h5>
            <button type='button' className='btn-close' onClick={onClose} />
          </div>

          <div className='modal-body'>
            {/* Subhead with vessel & kind names if you have them on the DTO; otherwise remove */}
            {(plan as any).vesselName || (plan as any).auditKindName ? (
              <div className='text-muted mb-3'>
                {(plan as any).vesselName ? (
                  <span className='me-2'>{(plan as any).vesselName}</span>
                ) : null}
                {(plan as any).auditKindName ? (
                  <span>• {(plan as any).auditKindName}</span>
                ) : null}
              </div>
            ) : null}

            {/* 🔁 HERE: use auditId instead of auditId */}
            {plan.auditId ? (
              <div className='alert alert-success d-flex justify-content-between align-items-center'>
                <div>Linked to Audit</div>
                <button
                  className='btn btn-sm btn-primary'
                  title={`Open audit (id=${plan.auditId})`}
                  onClick={() => onViewAudit(plan.auditId!)}
                  data-audit-id={plan.auditId}
                  data-plan-id={plan.id}
                >
                  View Audit
                </button>
              </div>
            ) : (
              <>
                <div className='d-flex gap-2 mb-3'>
                  <button
                    className='btn btn_primary'
                    onClick={() =>
                      onCreateAndLink({
                        vesselId: plan.vesselId, // keep IDs internally
                        auditKindId: plan.auditKindId,
                        planId: plan.id,
                        planMonthDate: plan.planDate,
                      })
                    }
                    title='Create a new audit for this plan and link it'
                    data-plan-id={plan.id}
                  >
                    Create Audit & Link
                  </button>
                </div>

                <h6 className='text-muted mb-2'>
                  Link an existing audit (same vessel, kind & month)
                </h6>

                {loading ? (
                  <div className='text-muted'>Loading…</div>
                ) : candidates.length === 0 ? (
                  <div className='text-muted'>
                    No matching unlinked audits found for this month.
                  </div>
                ) : (
                  <div className='list-group'>
                    {candidates.map(it => (
                      <div
                        key={it.id}
                        className='list-group-item d-flex justify-content-between align-items-center'
                        title={`Audit id=${it.id}`} // tooltip only
                        data-audit-id={it.id}
                        data-plan-id={plan.id}
                      >
                        <div>
                          <div className='fw-semibold'>
                            {it.auditType || 'Audit'}
                            {it.kindName ? ` — ${it.kindName}` : ''}
                            {it.vesselName ? ` • ${it.vesselName}` : ''}
                          </div>
                          <div className='small text-muted'>
                           {it.auditFromDate || 'Date —'} • {auditorName(it)}
                          </div>
                        </div>
                        <div className='d-flex gap-2'>
                          <button
                            className='btn btn-light btn-sm'
                            onClick={() => onViewAudit(it.id)}
                            title='Preview audit'
                          >
                            View
                          </button>
                          <button
                            className='btn btn_primary btn-sm'
                            onClick={() => doLink(it.id)}
                            title='Link this audit to the plan'
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

          <div className='modal-footer'>
            <button className='btn btn-light btn-sm' onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

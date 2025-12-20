import React, {FC, useMemo} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import type {
  QHSENearMissReportDto,
  NearMissOccurrenceType,
  NearMissLocationOfOccurrence,
  NearMissSubstandardAct,
  NearMissSubstandardCondition,
} from '../core/_models'

type Props = {
  visible: boolean
  record: QHSENearMissReportDto | null
  onCancel: () => void
  onOpenSupporting?: (id: number, reportNumber?: string | null) => void
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

const LABEL_SMALL = 'fw-semibold text-muted d-block mb-1'

const occurrenceTypeLabel = (t: NearMissOccurrenceType): string => {
  switch (t) {
    case 'ACCIDENT':
      return 'Accident'
    case 'INCIDENT':
      return 'Incident'
    case 'NEAR_MISS':
      return 'Near miss'
    case 'HIGH_SEVERITY_NEAR_MISS':
      return 'High severity near miss'
    default:
      return t
  }
}

const locationOfOccurrenceLabel = (loc: NearMissLocationOfOccurrence): string => {
  switch (loc) {
    case 'ACCOMMODATION':
      return 'Accommodation'
    case 'BRIDGE':
      return 'Bridge'
    case 'ASHORE':
      return 'Ashore'
    case 'ENGINE_ROOM_MACHINERY_SPACES':
      return 'Engine Room / Machinery Spaces'
    case 'DECK':
      return 'Deck'
    case 'ALOFT_OVERBOARD':
      return 'Aloft / Overboard'
    case 'ENCLOSED_SPACES':
      return 'Enclosed Spaces'
    case 'ENCLOSED_SPACES_MACHINERY':
      return 'Enclosed Spaces (Machinery)'
    case 'OFFICE':
      return 'Office'
    case 'STORE':
      return 'Store'
    case 'TRAFFIC_ROAD':
      return 'Traffic Road'
    case 'OTHER':
      return 'Other'
    default:
      return loc
  }
}

const substandardActLabel = (a: NearMissSubstandardAct): string => {
  switch (a) {
    case 'FAILURE_TO_FOLLOW_RULES':
      return 'Failure To Follow Rules'
    case 'FAILURE_TO_USE_PPE_PROPERLY':
      return 'Failure To Use PPE Properly'
    case 'OPERATING_EQUIPMENT_WITHOUT_AUTHORITY':
      return 'Operating Equipment Without Authority'
    case 'INCORRECT_USE_OF_EQUIPMENT_OR_MACHINERY':
      return 'Incorrect Use of Equipment / Machinery'
    case 'USE_OF_DEFECTIVE_EQUIPMENT_OR_MACHINERY':
      return 'Use Of Defective Equipment / Machinery'
    case 'FAILURE_TO_FOLLOW_REPAIR_OR_MAINTENANCE_INSTRUCTIONS':
      return 'Failure To Follow Repair /Maintenance Instructions'
    case 'FAILURE_TO_WARN':
      return 'Failure To Warn'
    case 'FAILURE_TO_SECURE':
      return 'Failure To Secure'
    case 'BY_PASSING_SAFETY_DEVICE':
      return 'By-Passing Safety Device'
    case 'IMPROPER_POSITION_FOR_TASK':
      return 'Improper Position for Task'
    case 'IMPROPER_LIFTING_HANDLING_OR_STORAGE':
      return 'Improper Lifting, Handling or Storage'
    case 'HORSEPLAY_OR_INAPPROPRIATE_BEHAVIOUR':
      return 'Horseplay / Inappropriate Behaviour'
    case 'UNDER_INFLUENCE_OF_ALCOHOL_OR_DRUGS':
      return 'Under Influence of Alcohol or Drugs'
    default:
      return a
  }
}

const substandardConditionLabel = (c: NearMissSubstandardCondition): string => {
  switch (c) {
    case 'INADEQUATE_GUARDS_OR_BARRIERS':
      return 'Inadequate Guards or Barriers'
    case 'INADEQUATE_OR_DEFECTIVE_PPE':
      return 'Inadequate Or Defective PPE'
    case 'DEFECTIVE_EQUIPMENT_OR_MACHINERY':
      return 'Defective Equipment / Machinery'
    case 'UNFAVOURABLE_HULL_OR_STRUCTURE_CONDITION':
      return 'Unfavourable Hull or Structure Condition'
    case 'POOR_HOUSEKEEPING':
      return 'Poor Housekeeping'
    case 'CONGESTION_OR_RESTRICTED_ACTION':
      return 'Congestion or Restricted Action'
    case 'INADEQUATE_OR_EXCESS_ILLUMINATION':
      return 'Inadequate or Excess Illumination'
    case 'INADEQUATE_VENTILATION':
      return 'Inadequate Ventilation'
    case 'OTHER_FACTORS':
      return 'Other Factors'
    default:
      return c
  }
}

export const ViewNearMissModal: FC<Props> = ({
  visible,
  record,
  onCancel,
  onOpenSupporting,
}) => {
  const occurrenceLabel = useMemo(() => {
    if (!record?.occurrenceTypes || !record.occurrenceTypes.length) return '-'
    return record.occurrenceTypes.map(occurrenceTypeLabel).join(', ')
  }, [record])

  const locationLabel = useMemo(() => {
    if (!record?.locationOfOccurrence || !record.locationOfOccurrence.length) return '-'
    return record.locationOfOccurrence.map(locationOfOccurrenceLabel).join(', ')
  }, [record])

  const actsLabel = useMemo(() => {
    if (!record?.substandardActs || !record.substandardActs.length) return '-'
    return record.substandardActs.map(substandardActLabel).join(', ')
  }, [record])

  const conditionsLabel = useMemo(() => {
    if (!record?.substandardConditions || !record.substandardConditions.length) return '-'
    return record.substandardConditions.map(substandardConditionLabel).join(', ')
  }, [record])

  const statusLabel = useMemo(() => {
    if (!record?.status) return '-'
    switch (record.status) {
      case 'SAVE':
        return 'Saved'
      case 'SUBMIT':
        return 'Submitted'
      case 'CLOSE':
        if (record.closureResult === 'TO_BE_REVIEWED_NEXT_INSPECTION') {
          return 'Closed and TBR'
        }
        return 'Closed Satisfactorily'
      default:
        return record.status
    }
  }, [record])

  if (!visible || !record) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '75vw',
          height: '75vh',
          maxWidth: '1400px',
          maxHeight: '900px',
        }}
      >
        {/* Header – same outer shell as Add/Edit */}
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <div className='d-flex flex-column'>
            <h5 className='modal-title text-dark m-6'>
              Near Miss Report – {record.reportNumber || '-'}
            </h5>
            <div className='text-muted fs-7 mx-6'>
              Vessel:&nbsp;
              <span className='fw-semibold'>
                {record.vesselName || '-'}
              </span>
              {record.dateOfOccurrence && (
                <>
                  <span className='mx-2'>•</span>
                  Occurrence Date:&nbsp;
                  <span className='fw-semibold'>
                    {record.dateOfOccurrence}
                    {record.timeOfOccurrence && (
                      <span className='text-muted ms-1'>
                        {record.timeOfOccurrence}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className='d-flex align-items-center gap-3'>
            <span className='badge badge-light-primary'>
              {statusLabel}
            </span>

            {record.supportingDocsPrimaryPath && onOpenSupporting && record.id && (
              <button
                type='button'
                className='btn btn-light-primary btn-sm d-flex align-items-center'
                onClick={() => onOpenSupporting(record.id!, record.reportNumber ?? null)}
              >
                <KTSVG
                  path='/media/icons/duotune/files/fil003.svg'
                  className='svg-icon-3 me-1'
                />
                View Supporting Docs
              </button>
            )}

            <button
              type='button'
              className='btn-close m-6'
              aria-label='Close'
              onClick={onCancel}
            />
          </div>
        </div>

        {/* Body with scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='row g-4'>
            {/* Left column */}
            <div className='col-lg-6'>
              <div className='mb-3'>
                <label className={LABEL_SMALL}>
                  Report Issued By
                </label>
                <div>{record.reportIssuedBy || '-'}</div>
              </div>

              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label className={LABEL_SMALL}>
                    Date Issued
                  </label>
                  <div>{record.dateIssued || '-'}</div>
                </div>
                <div className='col-md-6 mb-3'>
                  <label className={LABEL_SMALL}>
                    Date Reported
                  </label>
                  <div>
                    {record.dateReported || '-'}
                    {record.timeReported && (
                      <span className='text-muted ms-1'>
                        {record.timeReported}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label className={LABEL_SMALL}>
                    Reported By
                  </label>
                  <div>{record.reportedBy || '-'}</div>
                </div>
                <div className='col-md-6 mb-3'>
                  <label className={LABEL_SMALL}>
                    Reported To
                  </label>
                  <div>{record.reportedTo || '-'}</div>
                </div>
              </div>

              <div className='mb-3'>
                <label className={LABEL_SMALL}>
                  Position / Location
                </label>
                <div>{record.locationPosition || '-'}</div>
              </div>

              <div className='mb-3'>
                <label className={LABEL_SMALL}>
                  Occurrence Types
                </label>
                {record.occurrenceTypes && record.occurrenceTypes.length ? (
                  <div className='d-flex flex-wrap gap-2'>
                    {record.occurrenceTypes?.map((occ: NearMissOccurrenceType) => (
                      <span
                        key={occ}
                        className='badge badge-light-primary'
                      >
                        {occurrenceTypeLabel(occ)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div>-</div>
                )}
              </div>

              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label className={LABEL_SMALL}>
                    Personal Injury Form Completed
                  </label>
                  <div>
                    {record.personalInjuryFormCompleted == null
                      ? '-'
                      : record.personalInjuryFormCompleted
                      ? 'Yes'
                      : 'No'}
                  </div>
                </div>
                <div className='col-md-6 mb-3'>
                  <label className={LABEL_SMALL}>
                    Any Statements Attached
                  </label>
                  <div>
                    {record.anyStatementsAttached == null
                      ? '-'
                      : record.anyStatementsAttached
                      ? 'Yes'
                      : 'No'}
                  </div>
                </div>
              </div>

              <div className='mb-3'>
                <label className={LABEL_SMALL}>
                  Location of Occurrence
                </label>
                <div>{locationLabel}</div>
              </div>
            </div>

            {/* Right column */}
            <div className='col-lg-6'>
              <div className='mb-3'>
                <label className={LABEL_SMALL}>
                  Description of the Occurrence
                </label>
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {record.descriptionOfOccurrence || '-'}
                </div>
              </div>

              <div className='mb-3'>
                <h6 className='fw-bold mb-2'>Analysis of the Occurrence</h6>
                <div className='mb-2'>
                  <span className='fw-semibold'>Substandard Acts:&nbsp;</span>
                  <span>{actsLabel}</span>
                </div>
                <div>
                  <span className='fw-semibold'>Substandard Conditions:&nbsp;</span>
                  <span>{conditionsLabel}</span>
                </div>
              </div>

              <div className='mb-3'>
                <h6 className='fw-bold mb-2'>Persons Involved</h6>
                <div className='mb-1'>
                  <span className='fw-semibold'>Injured:&nbsp;</span>
                  <span>{record.personsInjured || '-'}</span>
                </div>
                <div className='mb-1'>
                  <span className='fw-semibold'>Involved:&nbsp;</span>
                  <span>{record.personsInvolved || '-'}</span>
                </div>
                <div className='mb-1'>
                  <span className='fw-semibold'>Witness:&nbsp;</span>
                  <span>{record.personsWitness || '-'}</span>
                </div>
                <div className='mb-1'>
                  <span className='fw-semibold'>Type of Injury:&nbsp;</span>
                  <span>{record.typeOfInjury || '-'}</span>
                </div>
              </div>

              <div className='mb-3'>
                <h6 className='fw-bold mb-2'>Causes & Actions</h6>
                <div className='mb-1'>
                  <span className='fw-semibold'>Immediate / Basic Cause:&nbsp;</span>
                  <span>{record.immediateBasicCause || '-'}</span>
                </div>
                <div className='mb-1'>
                  <span className='fw-semibold'>Root Cause:&nbsp;</span>
                  <span>{record.rootCause || '-'}</span>
                </div>
                <div className='mb-1'>
                  <span className='fw-semibold'>Corrective Actions Proposed:&nbsp;</span>
                  <span>{record.correctiveActionsProposed || '-'}</span>
                </div>
                <div className='mb-1'>
                  <span className='fw-semibold'>Preventative Actions Proposed:&nbsp;</span>
                  <span>{record.preventativeActionsProposed || '-'}</span>
                </div>
              </div>

              <div className='mb-3'>
                <h6 className='fw-bold mb-2'>Review</h6>
                <div className='mb-1'>
                  <span className='fw-semibold'>Objective Evidence:&nbsp;</span>
                  <span>{record.objectiveEvidence || '-'}</span>
                </div>
                <div className='mb-1'>
                  <span className='fw-semibold'>DPA Conclusions & Recommendations:&nbsp;</span>
                  <span>{record.dpaConclusionsAndRecommendations || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0 m-6'>
          <button type='button' className='btn btn-light btn-sm' onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

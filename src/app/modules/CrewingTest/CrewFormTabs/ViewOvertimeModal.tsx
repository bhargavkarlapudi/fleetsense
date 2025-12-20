import { FC } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

interface OvertimeEntry {
  id: number
  date: string
  extraHours: number
  remarks: string
}

interface CrewMember {
  id: number
  name: string
  rank: string
  overtimeEntries?: OvertimeEntry[]
}

interface ViewOvertimeModalProps {
  isOpen: boolean
  onClose: () => void
  member: CrewMember | null
}

const ViewOvertimeModal: FC<ViewOvertimeModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  if (!isOpen || !member) return null

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
      }}
    >
      <div
        className="modal-dialog modal-xl"
        style={{
          maxWidth: '100%',
          width: '500px',
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Overtime Details - {member.name} ({member.rank})
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            {member.overtimeEntries && member.overtimeEntries.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead className="table-header">
                    <tr>
                      <th>Date</th>
                      <th>Extra Hours</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.overtimeEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          {new Date(entry.date).toLocaleDateString('en-GB')}
                        </td>
                        <td>{entry.extraHours} hours</td>
                        <td>{entry.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                No overtime entries found for this crew member.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewOvertimeModal

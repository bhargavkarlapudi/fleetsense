import { FC } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

interface TrainingEntry {
  id: number
  trainingName: string
  vesselType: string
  applicableRank: string
  completionDate: string
}

interface CrewMember {
  id: number
  name: string
  rank: string
  trainingEntries?: TrainingEntry[]
}

interface ViewTrainingModalProps { 
  isOpen: boolean
  onClose: () => void
  member: CrewMember | null
}

const ViewTrainingModal: FC<ViewTrainingModalProps> = ({
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
          width: '800px',
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Training Details - {member.name} ({member.rank})
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            {member.trainingEntries && member.trainingEntries.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead className="table-header">
                    <tr>
                      <th>Training Name</th>
                      <th>Vessel Type</th>
                      <th>Applicable Rank</th>
                      <th>Completion Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.trainingEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.trainingName}</td>
                        <td>{entry.vesselType}</td>
                        <td>{entry.applicableRank}</td>
                        <td>
                          {new Date(entry.completionDate).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                No training records found for this crew member.
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

export default ViewTrainingModal

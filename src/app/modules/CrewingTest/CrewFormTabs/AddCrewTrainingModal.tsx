import { FC, useState, useEffect } from 'react';

interface TrainingEntry {
  name: string;
  trainingName: string;
  vesselType: string;
  applicableRank: string;
  completionDate: string;
}

interface AddCrewTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (training: TrainingEntry) => void;
}

const AddCrewTrainingModal: FC<AddCrewTrainingModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    trainingName: '',
    vesselType: '',
    applicableRank: '',
    completionDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Predefined vessel types and ranks
  const vesselTypes = ['Container Ship', 'Bulk Carrier', 'Tanker', 'General Cargo', 'RoRo', 'Cruise Ship'];
  const ranks = ['Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Able Seaman', 'Ordinary Seaman'];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        trainingName: '',
        vesselType: '',
        applicableRank: '',
        completionDate: '',
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.trainingName || !formData.vesselType || !formData.applicableRank || !formData.completionDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: formData.name,
        trainingName: formData.trainingName,
        vesselType: formData.vesselType,
        applicableRank: formData.applicableRank,
        completionDate: formData.completionDate,
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting training entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal fade show d-flex align-items-center justify-content-center" 
      tabIndex={-1} 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1050
      }}
    >
      <div className="modal-dialog modal-xl" style={{ maxWidth: '1000px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Add Crew Training
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-12 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Crew Member Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter crew member name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Training Name</label>
                  <input
                    type="text"
                    name="trainingName"
                    className="form-control"
                    placeholder="Enter training name"
                    value={formData.trainingName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Vessel Type</label>
                  <select
                    name="vesselType"
                    className="form-select"
                    value={formData.vesselType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select vessel type</option>
                    {vesselTypes.map((type, index) => (
                      <option key={index} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label"style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Applicable Rank</label>
                  <select
                    name="applicableRank"
                    className="form-select"
                    value={formData.applicableRank}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select rank</option>
                    {ranks.map((rank, index) => (
                      <option key={index} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-4">
                  <label className="form-label"style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Completion Date</label>
                  <input
                    type="date"
                    name="completionDate"
                    className="form-control"
                    value={formData.completionDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name || !formData.trainingName || !formData.vesselType || !formData.applicableRank || !formData.completionDate}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCrewTrainingModal;

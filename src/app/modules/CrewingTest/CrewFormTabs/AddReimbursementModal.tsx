import { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface CrewMember {
  id: number;
  name: string;
  position: string;
  department: string;
}

interface ReimbursementEntry {
  id: number;
  crewName: string;
  date: string;
  purpose: string;
  amount: number;
  supportingDocument: string;
}

interface AddReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reimbursementEntry: Omit<ReimbursementEntry, 'id'>) => void;
}

const AddReimbursementModal: FC<AddReimbursementModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    crewName: '',
    date: '',
    purpose: '',
    amount: '',
    supportingDocument: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [isLoadingCrew, setIsLoadingCrew] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState('');

  // Fetch crew members function
  const fetchCrewMembers = async () => {
    setIsLoadingCrew(true);
    try {
      // TODO: Replace with actual API endpoint
      // const response = await fetch('/api/crew-members');
      // const data = await response.json();
      
      // Mock data for now - replace with actual API call
      const mockCrewMembers: CrewMember[] = [
        { id: 1, name: 'John Smith', position: 'Captain', department: 'Navigation' },
        { id: 2, name: 'Maria Garcia', position: 'Chief Engineer', department: 'Engineering' },
        { id: 3, name: 'Ahmed Hassan', position: 'First Officer', department: 'Navigation' },
        { id: 4, name: 'Sarah Johnson', position: 'Cook', department: 'Catering' },
        { id: 5, name: 'Carlos Rodriguez', position: 'Bosun', department: 'Deck' },
        { id: 6, name: 'Li Wei', position: 'Second Engineer', department: 'Engineering' },
        { id: 7, name: 'David Brown', position: 'AB Seaman', department: 'Deck' },
        { id: 8, name: 'Anna Kowalski', position: 'Steward', department: 'Catering' }
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCrewMembers(mockCrewMembers);
    } catch (error) {
      console.error('Error fetching crew members:', error);
      setCrewMembers([]);
    } finally {
      setIsLoadingCrew(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        crewName: '',
        date: '',
        purpose: '',
        amount: '',
        supportingDocument: ''
      });
      setSelectedFile(null);
      setSelectedCrewId('');
      fetchCrewMembers();
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCrewSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const crewId = e.target.value;
    setSelectedCrewId(crewId);
    
    if (crewId) {
      const selectedCrew = crewMembers.find(crew => crew.id.toString() === crewId);
      if (selectedCrew) {
        setFormData(prev => ({
          ...prev,
          crewName: selectedCrew.name
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        crewName: ''
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid file type (PNG, JPEG, or PDF)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setFormData(prev => ({
        ...prev,
        supportingDocument: file.name
      }));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormData(prev => ({
      ...prev,
      supportingDocument: ''
    }));
    // Reset the file input
    const fileInput = document.getElementById('supportingDocumentFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.crewName || !formData.date || !formData.purpose || !formData.amount) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        crewName: formData.crewName,
        date: formData.date,
        purpose: formData.purpose,
        amount: parseFloat(formData.amount),
        supportingDocument: formData.supportingDocument || 'No document provided'
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting reimbursement entry:', error);
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
      <div className="modal-dialog" style={{ maxWidth: '1000px !important', width: '95%' }}>
        <div className="modal-content" style={{ width: '900px !important'}}>
          <div className="modal-header">
            <h5 className="modal-title">
              Add New Reimbursement Entry
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
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Crew Member</label>
                  {isLoadingCrew ? (
                    <div className="form-control d-flex align-items-center">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Loading crew members...
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={selectedCrewId}
                      onChange={handleCrewSelection}
                      required
                    >
                      <option value="">Select a crew member</option>
                      {crewMembers.map((crew) => (
                        <option key={crew.id} value={crew.id.toString()}>
                          {crew.name} - {crew.position} ({crew.department})
                        </option>
                      ))}
                    </select>
                  )}
                  {crewMembers.length === 0 && !isLoadingCrew && (
                    <small className="text-muted">No crew members available</small>
                  )}
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Date</label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-12 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Purpose</label>
                  <textarea
                    name="purpose"
                    className="form-control"
                    placeholder="Enter purpose of reimbursement (e.g., Medical expenses, Travel allowance, etc.)"
                    rows={3}
                    value={formData.purpose}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control"
                    placeholder="Enter reimbursement amount"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Supporting Document</label>
                  
                  {/* File Upload Input */}
                  <div className="d-flex gap-2 align-items-center mb-2">
                    <input
                      type="file"
                      id="supportingDocumentFile"
                      className="form-control"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileChange}
                      style={{ display: selectedFile ? 'none' : 'block' }}
                    />
                    {selectedFile && (
                      <div className="d-flex align-items-center gap-2 w-100">
                        <div className="flex-grow-1 p-2 bg-light border rounded d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <i className={`fas ${
                              selectedFile.type === 'application/pdf' ? 'fa-file-pdf text-danger' : 'fa-image text-success'
                            }`}></i>
                            <span className="text-truncate" style={{ maxWidth: '200px' }}>
                              {selectedFile.name}
                            </span>
                            <small className="text-muted">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</small>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={handleRemoveFile}
                            title="Remove file"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  
                  
                  <small className="text-muted d-block mt-1">
                    Upload PNG, JPEG, or PDF files (max 10MB)
                  </small>
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
              disabled={isSubmitting || !formData.crewName || !formData.date || !formData.purpose || !formData.amount}
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

export default AddReimbursementModal;

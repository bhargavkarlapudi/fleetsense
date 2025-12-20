import React, { FC, useState, useEffect } from 'react';
import { getCrewList, getRanks } from '../core/_requests';
import { Crew, Rank } from '../core/_models';

interface RestHourEntry {
  crewName: string;
  rank: string;
  date: string;
  timeline: string;
  remarks: string;
}

interface CrewMember {
  id: number;
  name: string;
  rank: string;
}

interface AddRestHourModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (entry: RestHourEntry) => void;
}

const AddRestHourModal: FC<AddRestHourModalProps> = ({ visible, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    selectedMemberId: 0,
    date: '',
    timeline: '',
    remarks: '',
  });
  
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimelineDropdownOpen, setIsTimelineDropdownOpen] = useState(false);

  const timeBlocks = Array.from({ length: 48 }, (_, i) =>
    `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`
  );

  // Fetch crew members when modal becomes visible
  useEffect(() => {
    if (visible) {
      setFormData({
        selectedMemberId: 0,
        date: '',
        timeline: '',
        remarks: '',
      });
      setSelectedMember(null);
      setIsTimelineDropdownOpen(false);
      fetchCrewAndRanks();
    }
  }, [visible]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isTimelineDropdownOpen && !target.closest('.timeline-dropdown')) {
        setIsTimelineDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimelineDropdownOpen]);

  const fetchCrewAndRanks = async () => {
    setLoading(true);
    try {
      const [crewData, ranksData] = await Promise.all([
        getCrewList(),
        getRanks(),
      ]);

      const ranksMap = new Map(ranksData.map((rank) => [rank.id, rank.rank]));

      const enrichedCrew: CrewMember[] = crewData.map((crew) => ({
        id: crew.id,
        name: crew.name,
        rank: ranksMap.get(crew.rankId) || 'Unknown Rank',
      }));

      setCrewMembers(enrichedCrew);
      setRanks(ranksData);
    } catch (error) {
      console.error("Error fetching crew data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'selectedMemberId') {
      const memberId = parseInt(value);
      const member = crewMembers.find(m => m.id === memberId) || null;
      setSelectedMember(member);
      setFormData(prev => ({
        ...prev,
        [name]: memberId
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTimelineSelect = (time: string) => {
    setFormData(prev => ({
      ...prev,
      timeline: time
    }));
    setIsTimelineDropdownOpen(false); // Close dropdown after selection
  };

  const getTimelineDisplayText = () => {
    return formData.timeline || 'Select time';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If crew members are provided, require selection
    if (crewMembers.length > 0 && !formData.selectedMemberId) {
      return;
    }
    
    if (!formData.date || !formData.timeline || !formData.remarks) {
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedMember = crewMembers.find(m => m.id === formData.selectedMemberId);
      await onSubmit({
        crewName: selectedMember ? selectedMember.name : '',
        rank: selectedMember ? selectedMember.rank : '',
        date: formData.date,
        timeline: formData.timeline,
        remarks: formData.remarks,
      });
      onClose();
    } catch (error) {
      console.error('Error submitting rest hour entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

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
      <div className="modal-dialog modal-xl" style={{ width: '500px',maxWidth: '1000px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Rest Hour Entry</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="row mb-4">
                <div className="col-md-12">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Select Crew Member</label>
                  <select
                    name="selectedMemberId"
                    className="form-select"
                    value={formData.selectedMemberId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select crew member</option>
                    {crewMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.rank}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{ color: '#66686c', fontSize: '1.1rem', marginBottom: '0.1rem', paddingBottom: '0.3rem' }}>Date</label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{ color: '#66686c', fontSize: '1.1rem', marginBottom: '0.1rem', paddingBottom: '0.3rem' }}>24-Hour Timeline</label>
                  <div className="position-relative timeline-dropdown">
                    <div
                      className="form-select"
                      style={{ cursor: 'pointer', minHeight: '38px', display: 'flex', alignItems: 'center' }}
                      onClick={() => setIsTimelineDropdownOpen(!isTimelineDropdownOpen)}
                    >
                      <span style={{ color: !formData.timeline ? '#6c757d' : '#212529' }}>
                        {getTimelineDisplayText()}
                      </span>
                      {/* <i className={`fas fa-chevron-${isTimelineDropdownOpen ? 'up' : 'down'} ms-auto`}></i> */}
                    </div>
                    
                    {isTimelineDropdownOpen && (
                      <div 
                        className="position-absolute w-100 bg-white border rounded shadow-lg"
                        style={{ 
                          top: '100%', 
                          zIndex: 1051, 
                          maxHeight: '300px', 
                          overflowY: 'auto'
                        }}
                      >
                        <div className="p-2">
                          {timeBlocks.map((time, index) => (
                            <div key={index} className="mb-1">
                              <div
                                className={`p-2 text-center rounded cursor-pointer ${
                                  formData.timeline === time
                                    ? 'bg-primary text-white'
                                    : 'bg-light hover:bg-gray-100'
                                }`}
                                style={{ 
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => handleTimelineSelect(time)}
                              >
                                {time}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label" style={{ color: '#66686c', fontSize: '1.1rem', marginBottom: '0.1rem', paddingBottom: '0.3rem' }}>Remarks</label>
                <textarea
                  name="remarks"
                  className="form-control"
                  rows={3}
                  placeholder="Enter remarks..."
                  value={formData.remarks}
                  onChange={handleInputChange}
                  required
                ></textarea>
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
              disabled={isSubmitting || !formData.date || !formData.timeline || !formData.remarks || (crewMembers.length > 0 && !formData.selectedMemberId)}
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

export default AddRestHourModal;


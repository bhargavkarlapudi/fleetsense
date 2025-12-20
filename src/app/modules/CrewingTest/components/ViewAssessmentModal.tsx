import React, { FC, useEffect, useState, useRef } from 'react';
import { Crew } from '../core/_models';
import { AssessmentFormData } from './AssessmentModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  crewMember: Crew | null;
  rankName: string;
  assessmentData: AssessmentFormData | null;
  onDownloadPDF?: () => void; // Optional prop to trigger PDF download from parent
};

const ViewAssessmentModal: FC<Props> = ({ 
  isOpen, 
  onClose, 
  crewMember, 
  rankName, 
  assessmentData,
  onDownloadPDF 
}) => {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Create a URL for the signature file to display it
  useEffect(() => {
    if (assessmentData?.signatureFile) {
      const url = URL.createObjectURL(assessmentData.signatureFile);
      setSignatureUrl(url);

      // Clean up the object URL when the component unmounts or the file changes
      return () => URL.revokeObjectURL(url);
    }
  }, [assessmentData]);

  // PDF Download function
  const downloadPDF = async () => {
    if (!contentRef.current || !crewMember || !assessmentData) return;

    try {
      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = contentRef.current;
      const filename = `${crewMember.name.replace(/\s+/g, '_')}_Assessment_${assessmentData.date.replace(/\//g, '-')}.pdf`;
      
      const options = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Call onDownloadPDF when prop changes (triggered from parent)
  useEffect(() => {
    if (onDownloadPDF) {
      downloadPDF();
    }
  }, [onDownloadPDF]);

  if (!isOpen || !crewMember || !assessmentData) {
    return null;
  }

  const labelStyle: React.CSSProperties = {
    color: '#6c757d',
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '0.2rem',
    textTransform: 'uppercase'
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: '500',
  };

  const assessmentFields = [
    { key: 'personality', label: 'PERSONALITY' },
    { key: 'attitude', label: 'ATTITUDE' },
    { key: 'technicalKnowledge', label: 'TECHNICAL KNOWLEDGE' },
    { key: 'englishKnowledge', label: 'ENGLISH KNOWLEDGE' },
    { key: 'overallAssessment', label: 'OVERALL ASSESSMENT' },
  ];

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
      <div className="modal-dialog modal-xl" style={{ width: '500px', maxWidth: '1000px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">View Assessment for {crewMember.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* PDF Content Wrapper */}
            <div ref={contentRef} style={{ backgroundColor: 'white', padding: '20px' }}>
              {/* PDF Header - Add company logo/header if needed */}
              <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
                <h2 style={{ margin: '0', color: '#333' }}>CREW ASSESSMENT REPORT</h2>
              </div>

              {/* Header Info Grid */}
              <div className='row g-4 mb-4'>
                <div className='col-md-6'>
                  <div style={labelStyle}>Name of the Candidate</div>
                  <div style={valueStyle}>{crewMember.name}</div>
                </div>
                <div className='col-md-6'>
                  <div style={labelStyle}>Present Rank</div>
                  <div style={valueStyle}>{rankName}</div>
                </div>
                <div className='col-md-6'>
                  <div style={labelStyle}>Rank Applied</div>
                  <div style={valueStyle}>{assessmentData.rankApplied || 'N/A'}</div>
                </div>
                <div className='col-md-6'>
                  <div style={labelStyle}>Date of Assessment</div>
                  <div style={valueStyle}>{assessmentData.date}</div>
                </div>
                <div className='col-md-6'>
                  <div style={labelStyle}>Name of Interviewer</div>
                  <div style={valueStyle}>{assessmentData.interviewerName || 'N/A'}</div>
                </div>
                <div className='col-md-6'>
                  <div style={labelStyle}>Designation</div>
                  <div style={valueStyle}>{assessmentData.interviewerDesignation || 'N/A'}</div>
                </div>
                <div className='col-md-6'>
                  <div style={labelStyle}>Vessel Name</div>
                  <div style={valueStyle}>{assessmentData.vesselName || 'N/A'}</div>
                </div>
              </div>

              {/* Assessment Table */}
              <table className='table table-bordered mb-4' style={{ pageBreakInside: 'avoid' }}>
                <thead>
                  <tr className='bg-light'>
                    <th>ASSESSMENT</th>
                    <th style={{ width: '150px' }}>GRADE</th>
                  </tr>
                </thead>
                <tbody>
                  {assessmentFields.map((field) => (
                    <tr key={field.key}>
                      <td>{field.label}</td>
                      <td><strong>{assessmentData.grades[field.key as keyof typeof assessmentData.grades] || 'Not Graded'}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Comments & Signature Section */}
              <div className='mb-4' style={{ pageBreakInside: 'avoid' }}>
                <div style={labelStyle}>Comments from Interviewer</div>
                <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap', border: '1px solid #ddd' }}>
                  {assessmentData.comments || 'No comments provided.'}
                </div>
              </div>
              
              <div style={{ pageBreakInside: 'avoid' }}>
                <div style={labelStyle}>Signature of Interviewer</div>
                {signatureUrl ? (
                  <img 
                    src={signatureUrl} 
                    alt="Interviewer Signature" 
                    style={{ 
                      maxHeight: '150px', 
                      border: '1px solid #eee', 
                      borderRadius: '4px',
                      display: 'block',
                      marginTop: '10px'
                    }} 
                  />
                ) : (
                  <div className="p-3 bg-light rounded" style={{ border: '1px solid #ddd', marginTop: '10px' }}>
                    No signature was uploaded.
                  </div>
                )}
              </div>

              {/* PDF Footer */}
              <div style={{ 
                marginTop: '40px', 
                textAlign: 'center', 
                fontSize: '0.8rem', 
                color: '#666',
                borderTop: '1px solid #ddd',
                paddingTop: '15px'
              }}>
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={downloadPDF}>
              Download PDF
            </button>
            <button type="button" className="btn btn-light" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAssessmentModal;
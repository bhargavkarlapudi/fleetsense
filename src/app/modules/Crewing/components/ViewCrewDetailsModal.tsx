import React, { useEffect, useState } from 'react';
import { Crew, CrewCertification, CrewDocument, Rank } from '../core/_models';
import { KTSVG } from '../../../../_metronic/helpers';
import axios from 'axios';
import { getCrewDocuments, getCrewCertifications, getRanks } from '../core/_requests';


interface Props {
  isOpen: boolean;
  crewData?: Crew;
  onClose: () => void;
}

const ViewCrewModal: React.FC<Props> = ({ isOpen, crewData, onClose }) => {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [rankMap, setRankMap] = useState<Record<number,string>>({});
  const [viewerUrl, setViewerUrl] = useState<string>();
  const [viewerMime, setViewerMime] = useState<string>();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [documents, setDocuments] = useState<CrewDocument[]>([]);
const [certifications, setCertifications] = useState<CrewCertification[]>([]);



  useEffect(() => {
  if (!isOpen || !crewData) return;

  Promise.all([
    getCrewDocuments(crewData.id),
    getCrewCertifications(crewData.id),
    getRanks(),
  ])
  .then(([docs, certs, rankList]) => {
    setDocuments(docs);
    setCertifications(certs);
    setRanks(rankList);
    // build quick lookup map
        const m: Record<number,string> = {};
        rankList.forEach(r => (m[r.id] = r.rank));
        setRankMap(m);
  })
  .catch(err => {
    console.error('Failed to load files for view modal', err);
  });
}, [isOpen, crewData]);

  
  if (!isOpen || !crewData) return null;


  // Format dates to DD-MONTH-YYYY or locale string as needed
  const formatDate = (iso?: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  // Use English short month names
  const mmm = d.toLocaleString('en-US', { month: 'short' })
  const yyyy = d.getFullYear()
  return `${dd}-${mmm}-${yyyy}`
}

  // preview inline
  const fetchAndPreview = async (url: string) => {
    try {
      const { data: blob } = await axios.get<Blob>(url, { responseType: 'blob' });
      setViewerMime(blob.type);
      setViewerUrl(URL.createObjectURL(blob));
      setViewerOpen(true);
    } catch {
      alert('Failed to load preview');
    }
  };

   // download to user device
  const handleDownload = async (url: string, name: string) => {
    try {
      const { data: blob } = await axios.get<Blob>(url, { responseType: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Download failed');
    }
  };

  const renderFileItem = (
    label: string,
    url: string,
    idx: number
  ) => (
    <li key={idx} className="d-flex align-items-center mb-2 gap-2">
      {/* eye icon for preview */}
      <span
        className="btn btn-icon btn-sm btn-secondary"
        onClick={() => fetchAndPreview(url)}
      >
        <KTSVG path="/media/map/ph_eye.svg" />
      </span>
      <span className="flex-grow-1">{label}</span>
      {/* download icon */}
      <span
        className="btn btn-icon btn-sm btn_secondary"
        onClick={() => handleDownload(url, label)}
      >
        <KTSVG path="/media/map/download.svg" />
      </span>
    </li>
  );

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '70rem' }}
      >
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5 className="m-0">View Crew Details</h5>
          <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
        </div>

        <div className="custom-modal-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <strong>Full Name:</strong>
              <p>{crewData.name}</p>
            </div>
            <div className="col-md-4 mb-3">
              <strong>Date of Birth:</strong>
              <p>{formatDate(crewData.dateOfBirth)}</p>
            </div>
            <div className="col-md-4 mb-3">
              <strong>Nationality:</strong>
              <p>{crewData.nationality}</p>
            </div>

            <div className="col-md-4 mb-3">
                <strong>Rank:</strong>
                <p>{rankMap[crewData.rankId] ?? 'Unknown'}</p>
              </div>
            <div className="col-md-4 mb-3">
              <strong>Department:</strong>
              <p>{crewData.department}</p>
            </div>
            {/* <div className="col-md-4 mb-3">
              <strong>Vessel:</strong>
              <p>{crewData.vessel.fleet_name}</p>
            </div> */}

            <div className="col-md-4 mb-3">
              <strong>Contact No.:</strong>
              <p>{crewData.contactNumber}</p>
            </div>
            <div className="col-md-4 mb-3">
              <strong>Email:</strong>
              <p>{crewData.email || 'N/A'}</p>
            </div>

            {/* <div className="col-md-6 mb-3">
              <strong>Start Date:</strong>
              <p>{formatDate(crewData.startDate)}</p>
            </div>
            <div className="col-md-6 mb-3">
              <strong>End Date:</strong>
              <p>{formatDate(crewData.endDate)}</p>
            </div> */}

            <div className="col-4 mb-3">
              <strong>Notes:</strong>
              <p>{crewData.notes || 'N/A'}</p>
            </div>

           <div className="col-12 mb-3">
  <strong>Certifications:</strong>
  {certifications.length ? (
    <ul className="list-unstyled pl-0">
      {certifications.map((c, i) =>
        renderFileItem(c.documentName, c.fileUrl, i)
      )}
    </ul>
  ) : (
    <p style={{color:"orange"}}>No Certificates Found!</p>
  )}
</div>

<div className="col-12 mb-3">
  <strong>Documents:</strong>
  {documents.length ? (
    <ul className="list-unstyled pl-0">
      {documents.map((d, i) =>
        renderFileItem(d.documentName, d.fileUrl, i)
      )}
    </ul>
  ) : (
    <p style={{color:"orange"}}>No Documents Found!</p>
  )}
</div>

            </div>
        </div>

        {/* <div className="d-flex justify-content-end">
          <button className="btn btn_secondary" onClick={onClose}>
            Close
          </button>
        </div> */}
      </div>
    </div>
     {/* inline preview modal */}
      {viewerOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setViewerOpen(false);
            URL.revokeObjectURL(viewerUrl!);
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '80vw', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="close-btn"
              onClick={() => {
                setViewerOpen(false);
                URL.revokeObjectURL(viewerUrl!);
              }}
            >
              <KTSVG path="/media/map/x.svg" className="svg-icon-2x" />
            </button>
            <div style={{ textAlign: 'center' }}>
              {viewerMime?.startsWith('image/') ? (
                <img
                  src={viewerUrl}
                  alt="preview"
                  style={{ maxWidth: '100%', maxHeight: '75vh' }}
                />
              ) : (
                <iframe
                  src={viewerUrl}
                  title="preview"
                  style={{ width: '100%', height: '75vh', border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewCrewModal;
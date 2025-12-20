import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuth, useAuth } from '../../auth';
import { getVesselList } from '../../Management/core/_requests';
import { Vessel } from '../../operations/core/_models';
import { toast } from 'react-toastify';
import { KTSVG } from '../../../../_metronic/helpers';
import { Crew, CrewDocument, CrewCertification, Rank, CompanyAdmin  } from '../core/_models';
import {
  getRanks,
  updateCrew,
  getCrewDocuments,
  uploadCrewDocument,
  deleteCrewDocument,
  getCrewCertifications,
  uploadCrewCertification,
  deleteCrewCertification,
} from '../core/_requests';

// interface Certification {
//   documentName: string;
//   file: File | null;
//   filePath?: string; // for existing uploaded file
// }

// interface Document {
//   documentName: string;
//   file: File | null;
//   filePath?: string; // for existing uploaded file
// }

interface Props {
  isOpen: boolean;
  crewData?: Crew;
  onClose: () => void;
  onCrewUpdated: () => void;
}

interface FileEntry {
  id?: number;
  documentName: string;
  file?: File;
  fileUrl?: string;
}

const EditCrewModal: React.FC<Props> = ({ isOpen, crewData, onClose, onCrewUpdated }) => {
  const { currentUser } = useAuth();
  const roleEntityId = currentUser?.roleEntityId;
  const roleId = currentUser?.role?.id;

  // form fields
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [department, setDepartment] = useState('');
  const [ranks, setRanks]     = useState<Rank[]>([]);
  const [selectedRankId, setSelectedRankId] = useState<number | ''>('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  // const [selectedVesselId, setSelectedVesselId] = useState<number>(0);
  // const [startDate, setStartDate] = useState<Date | null>(null);
  // const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // file states
  const [documents, setDocuments] = useState<FileEntry[]>([]);
  const [certifications, setCertifications] = useState<FileEntry[]>([]);
  const [deletedDocIds, setDeletedDocIds] = useState<number[]>([]);
  const [deletedCertIds, setDeletedCertIds] = useState<number[]>([]);

  // viewer modal
  const [viewerUrl, setViewerUrl] = useState<string>();
  const [viewerMime, setViewerMime] = useState<string>();
  const [viewerOpen, setViewerOpen] = useState(false);

    const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
  const [selectedCompanyAdminId, setSelectedCompanyAdminId] = useState<number | ''>('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [loading, setLoading] = useState(false);


  // Fetch vessels once
  useEffect(() => {
    const fetchVessels = async () => {
      try {
        const vesselList = await getVesselList();

        const vesselsForCompany = vesselList.filter(vessel => {
          const isActive = vessel.active;

          if (roleId === 1) {
            // Super Admin: return all active vessels
            return isActive;
          } else if (roleId === 5) {
            // Group Admin: return active vessels assigned to their group
            return isActive && vessel.companyGroupAdmin?.id === roleEntityId;
          } else if (roleId === 2) {
            // Company Admin: return active vessels assigned to their company
            return isActive && vessel.companyAdmin?.id === roleEntityId;
          }

          return false; // default: no access
        });

        setVessels(vesselsForCompany);
      } catch (error) {
        console.error('Failed to fetch vessel list:', error);
      }
    };
    fetchVessels();
    getRanks().then(setRanks).catch(console.error);

  }, [roleEntityId, roleId]);

  // const formatCertificationsFromApi = (apiCerts: any[]) =>
  //   apiCerts.map(cert => ({
  //     documentName: cert.certificationName || '',
  //     filePath: cert.filePath || '',
  //     file: null, // File can't be pre-filled in <input type="file" />
  //   }));

  // const formatDocumentsFromApi = (apiDocs: any[]) =>
  //   apiDocs.map(doc => ({
  //     documentName: doc.documentName || '',
  //     filePath: doc.filePath || '',
  //     file: null, // Same here
  //   }));






  // When modal opens, populate fields
  useEffect(() => {
    if (!isOpen || !crewData) return;
      setName(crewData.name);
      setDateOfBirth(crewData.dateOfBirth);
      setNationality(crewData.nationality);
      setDepartment(crewData.department);
      setSelectedRankId(crewData.rankId);         
      setContact(crewData.contactNumber);
      setEmail(crewData.email);
      // setSelectedVesselId(crewData.vessel.id);
      // setStartDate(crewData.startDate ? new Date(crewData.startDate) : null);
      // setEndDate(crewData.endDate ? new Date(crewData.endDate) : null);
      setNotes(crewData.notes || '');
      // setCertifications(formatCertificationsFromApi(crewData.certifications || []));
      // setDocuments(formatDocumentsFromApi(crewData.documents || []));
      setError('');
      setDeletedDocIds([]);
      setDeletedCertIds([]);
// load existing docs & certs
    (async () => {
      const [docs, certs] = await Promise.all([
        getCrewDocuments(crewData.id),
        getCrewCertifications(crewData.id),
      ]);

      setDocuments(
        docs.map(d => ({
          id: d.id,
          documentName: d.documentName,
          fileUrl: d.fileUrl,
        }))
      );
      setCertifications(
        certs.map(c => ({
          id: c.id,
          documentName: c.documentName,
          fileUrl: c.fileUrl,
        }))
      );
    })();
  }, [isOpen, crewData]);


    const validateFile = (file: File | null) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 9 * 1024 * 1024; // 9 MB

    if (!file) return { isValid: false, message: 'No file selected.' };
    if (!validTypes.includes(file.type)) {
        return { isValid: false, message: 'Invalid file type. Only JPEG, PNG, JPG, and PDF are allowed.' };
    }
    if (file.size > maxSize) {
        return { isValid: false, message: 'File is too large. Maximum size is 9MB.' };
    }
    return { isValid: true, message: '' };
};

  const handleDocumentChange = (idx: number, key: 'documentName' | 'file', val: any) => {
    setDocuments(ds => ds.map((d, i) => i === idx ? { ...d, [key]: val } : d));
  };
  const handleCertificationChange = (idx: number, key: 'documentName' | 'file', val: any) => {
    setCertifications(cs => cs.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  };

  // ---- handlers for add/remove docs & certs ----
  const handleAddDocument = () => {
    setDocuments(ds => [...ds, { documentName: '', file: undefined }]);
  };
  const handleAddCertification = () => {
    setCertifications(cs => [...cs, { documentName: '', file: undefined }]);
  };

  // const validate = () => {
  //   if (!name || !dateOfBirth || !nationality || !selectedRankId || !contact) {
  //     setError('Please fill in all required fields.');
  //     return false;
  //   }
  //   // if (!startDate || !endDate) {
  //   //   setError('Start and end dates are required.');
  //   //   return false;
  //   // }
  //   return true;
  // };

  const handleRemoveFile = (
    list: FileEntry[],
    setList: React.Dispatch<React.SetStateAction<FileEntry[]>>,
    deletedIds: number[],
    setDeletedIds: React.Dispatch<React.SetStateAction<number[]>>,
    idx: number
  ) => {
    const entry = list[idx];
    if (entry.id) setDeletedIds(ids => [...ids, entry.id!]);
    setList(list.filter((_, i) => i !== idx));
  };

  const fetchAndView = async (url: string) => {
    try {
      const resp = await axios.get(url, { responseType: 'blob' });
      const blob = resp.data as Blob;
      setViewerMime(blob.type);
      setViewerUrl(URL.createObjectURL(blob));
      setViewerOpen(true);
    } catch {
      toast.error('Failed to load file');
    }
  };

  const validateFields = () => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) errors.name = 'Name is required';

    // Contact validation
    if (!contact.trim()) {
        errors.contact = 'Contact number is required';
    } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(contact)) {
        errors.contact = 'Invalid contact number';
    }

    // Email validation - If provided, check the format
    if (email.trim() && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
        errors.email = 'Invalid email format';
    }

    // Nationality validation
    if (!nationality.trim()) errors.nationality = 'Nationality is required';

    // Department validation
    if (!department.trim()) errors.department = 'Department is required';

    // Rank validation
    if (selectedRankId === '') errors.rank = 'Rank is required';

    // Date of Birth validation (must be 18+ years old)
    if (!dateOfBirth) {
        errors.dateOfBirth = 'Date of Birth is required';
    } else if (calculateAge(dateOfBirth) < 18) {
        errors.dateOfBirth = 'You must be at least 18 years old';
    }

    // Validate documents and certifications
    certifications.forEach((cert, idx) => {
  const hasName    = !!cert.documentName.trim();
  const hasAnyFile = !!cert.file || !!cert.fileUrl;

  if (hasName && !hasAnyFile) {
    errors[`certification_${idx}`] = 'A file is required when you enter a document name.';
  }
  if (hasAnyFile && !hasName) {
    errors[`certification_${idx}`] = 'Document name is required when you select or keep a file.';
  }
  if (cert.file) {
        const v = validateFile(cert.file);
        if (!v.isValid) errors[`certification_${idx}`] = v.message;
      }

});

    documents.forEach((doc, idx) => {
  const hasName    = !!doc.documentName.trim();
  const hasAnyFile = !!doc.file || !!doc.fileUrl;

  if (hasName && !hasAnyFile) {
    errors[`document_${idx}`] = 'A file is required when you enter a document name.';
  }
  if (hasAnyFile && !hasName) {
    errors[`document_${idx}`] = 'Document name is required when you select or keep a file.';
  }
  if (doc.file) {
        const v = validateFile(doc.file);
        if (!v.isValid) errors[`document_${idx}`] = v.message;
      }

});

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
};

  // ---- re-validate on every change ----
  useEffect(() => {
    setIsFormValid(validateFields());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, contact, email, nationality, department, selectedRankId, dateOfBirth, documents, certifications]);


// Calculate age
  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };


  const handleUpdate = async () => {
    if (!isFormValid || !crewData) return;

// const vesselIdToSend = selectedVesselId || crewData.vesselId;
const companyGroupToSend =
  roleId === 5
    ? Number(roleEntityId)               // Group Admin uses their own group
    : crewData.companyGroupAdminId;      // everyone else uses the existing value
console.log("company grp admin" ,companyGroupToSend );


setLoading(true);
    try {
// 2️⃣ build the DTO object
const dto = {
  name,
  dateOfBirth,            // e.g. "2025-07-03"
  nationality,
  department,
  contactNumber: contact,
  email,
  rankId: Number(selectedRankId),
  // vessel: { id: vesselIdToSend },
  companyGroupAdminId: companyGroupToSend,
  active: true,
  // startDate: startDate!,
  // endDate: endDate!,
  notes,
};

      // 1) update crew basic
      await updateCrew(crewData.id, dto);


      // 2) delete flagged files
      await Promise.all(deletedDocIds.map(id => deleteCrewDocument(crewData.id, id)));
      await Promise.all(deletedCertIds.map(id => deleteCrewCertification(crewData.id, id)));

            // 3) upload new ones
            await Promise.all(
        documents.filter(d => d.file)
          .map(d => uploadCrewDocument(crewData.id, d.documentName, d.file!))
      );
      await Promise.all(
        certifications.filter(c => c.file)
          .map(c => uploadCrewCertification(crewData.id, c.documentName, c.file!))
      );


      toast.success('Crew updated successfully');
      onCrewUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to update crew.');
      toast.error('Failed to update crew.');
    } finally {
      setLoading(false);
    }

  };

  if (!isOpen || !crewData) return null;

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '70rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5 className="m-0">Edit Crew</h5>
          <button className="close-btn" onClick={onClose}>
            <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
          </button>
        </div>

        <div className="custom-modal-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="row">
            {/* Full Name */}
            <div className="col-md-4 mb-3">
              <label className="modal_label">Full Name <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
              />
                            {fieldErrors.name && <small className="text-danger">{fieldErrors.name}</small>}
            </div>
            {/* Date of Birth */}
            <div className="col-md-4 mb-3">
              <label className="modal_label">Date of Birth <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
              />
                            {fieldErrors.dateOfBirth && <small className="text-danger">{fieldErrors.dateOfBirth}</small>}
            </div>
            {/* Nationality */}
            <div className="col-md-4 mb-3">
              <label className="modal_label">Nationality <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={nationality}
                onChange={e => setNationality(e.target.value)}
              >
                <option value="">--Select Nationality--</option>
                <option value="American">American</option>
                <option value="Australian">Australian</option>
                <option value="Brazilian">Brazilian</option>
                <option value="British">British</option>
                <option value="Canadian">Canadian</option>
                <option value="Chinese">Chinese</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Indian">Indian</option>
                <option value="Japanese">Japanese</option>
                <option value="Other">Other</option>
              </select>
                            {fieldErrors.nationality && <small className="text-danger">{fieldErrors.nationality}</small>}
            </div>
            {/* Rank */}
            <div className="col-md-4 mb-3">
              <label className="modal_label">Rank <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={selectedRankId}
                onChange={e => setSelectedRankId(e.target.value === '' ? '' : Number(e.target.value))}
              >
               <option value="">--Select Rank--</option>
                {ranks.map(r => (
                  <option key={r.id} value={r.id}>{r.rank}</option>
                ))}
              </select>
                            {fieldErrors.rank && <small className="text-danger">{fieldErrors.rank}</small>}
            </div>
            {/* Department */}
            <div className="col-md-4 mb-3">
              <label className="modal_label">Department <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              >
                <option value="">--Select Department--</option>
                {['Deck', 'Engine', 'Galley', 'Others']
                  .map(d => <option key={d} value={d}>{d}</option>)}
              </select>
                            {fieldErrors.department && <small className="text-danger">{fieldErrors.department}</small>}
            </div>
            {/* Vessel */}
            {/* <div className="col-md-4 mb-3">
              <label className="modal_label">Select Vessel <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={selectedVesselId}
                onChange={e => setSelectedVesselId(Number(e.target.value))}
              >
                <option value={0}>-- Select Vessel --</option>
                
                {vessels!.map(v => (
                  <option key={v.id} value={v.id}>{v.fleet_name}</option>
                ))}
              </select>
            </div> */}
            {/* Contact */}
            <div className="col-md-4 mb-3">
              <label className="modal_label">Contact No. <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={contact}
                onChange={e => setContact(e.target.value)}
              />
                            {fieldErrors.contact && <small className="text-danger">{fieldErrors.contact}</small>}
            </div>
            {/* Email */}
            <div className="col-md-8 mb-3">
              <label className="modal_label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
                            {fieldErrors.email && <small className="text-danger">{fieldErrors.email}</small>}
            </div>

            {/* Certifications */}
            <div className="col-12 mb-3">
              <label className="modal_label">Certifications</label>
              {certifications.map((c, idx) => (
                <div key={idx} className="d-flex align-items-center mb-2 gap-2">
                  {c.id ? (
                    <>
                      <span className="flex-grow-1">{c.documentName}</span>
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() => fetchAndView(c.fileUrl!)}
                      >
                        <KTSVG path="/media/map/ph_eye.svg" className='svg-icon-2'/>
                      </button>
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() =>
                          handleRemoveFile(
                            certifications,
                            setCertifications,
                            deletedCertIds,
                            setDeletedCertIds,
                            idx
                          )
                        }
                      >
                        <KTSVG path="/media/map/trash.svg" className='svg-icon-2'/>
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Document Name"
                        value={c.documentName}
                        style={{ maxWidth: '400px' }}
                        onChange={e =>
                          setCertifications(cs =>
                            cs.map((x, i) =>
                              i === idx
                                ? { ...x, documentName: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <input
                        type="file"
                        className="form-control"
                        style={{ maxWidth: '350px' }}
                        onChange={e =>
                          setCertifications(cs =>
                            cs.map((x, i) =>
                              i === idx
                                ? { ...x, file: e.target.files?.[0] }
                                : x
                            )
                          )
                        }
                      />
                      {fieldErrors[`certification_${idx}`] && <small className="text-danger">{fieldErrors[`certification_${idx}`]}</small>}
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() =>
                          setCertifications(cs => cs.filter((_, i) => i !== idx))
                        }
                      >
                        <KTSVG path="/media/map/trash.svg" className='svg-icon-2'/>
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button
                className="btn btn-sm btn-primary ms-2"
                onClick={() =>
                  setCertifications([
                    ...certifications,
                    { documentName: '', file: undefined },
                  ])
                }
              >Add Certifications
              </button>
            </div>

            {/* Documents */}
            <div className="col-12 mb-3">
              <label className="modal_label">Documents  &nbsp;&nbsp;</label>
              {documents.map((d, idx) => (
                <div key={idx} className="d-flex align-items-center mb-2 gap-2">
                  {d.id ? (
                    <>
                      <span className="flex-grow-1">{d.documentName}</span>
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() => fetchAndView(d.fileUrl!)}
                      >
                        <KTSVG path="/media/map/ph_eye.svg" className='svg-icon-2'/>
                      </button>
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() =>
                          handleRemoveFile(
                            documents,
                            setDocuments,
                            deletedDocIds,
                            setDeletedDocIds,
                            idx
                          )
                        }
                      >
                        <KTSVG path="/media/map/trash.svg" className='svg-icon-2' />
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Document Name"
                        value={d.documentName}
                        style={{ maxWidth: '400px' }}
                        onChange={e =>
                          setDocuments(ds =>
                            ds.map((x, i) =>
                              i === idx
                                ? { ...x, documentName: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <input
                        type="file"
                        className="form-control"
                        style={{ maxWidth: '350px' }}
                        onChange={e =>
                          setDocuments(ds =>
                            ds.map((x, i) =>
                              i === idx
                                ? { ...x, file: e.target.files?.[0] }
                                : x
                            )
                          )
                        }
                      />
                      {fieldErrors[`document_${idx}`] && <small className="text-danger">{fieldErrors[`document_${idx}`]}</small>}
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() =>
                          setDocuments(ds => ds.filter((_, i) => i !== idx))
                        }
                      >
                        <KTSVG path="/media/map/trash.svg"  className='svg-icon-2'/>
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button
                className="btn btn-sm btn-primary ms-2"
                onClick={() =>
                  setDocuments([
                    ...documents,
                    { documentName: '', file: undefined },
                  ])
                }
              >Add Documents
              </button>
            </div>


            {/* <div className="col-6 mb-3">
              <label className="modal_label">Start Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={startDate ? startDate.toISOString().slice(0, 10) : ''}
                onChange={e => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>
            <div className="col-6 mb-3">
              <label className="modal_label">End Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={endDate ? endDate.toISOString().slice(0, 10) : ''}
                onChange={e => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              />
            </div> */}

            {/* Notes */}
            <div className="col-12 mb-3">
              <label className="modal_label">Notes</label>
              <textarea
                className="form-control"
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
            <button
            className="btn btn_success"
            onClick={handleUpdate}
            disabled={loading || !isFormValid}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>

    {/* Inline viewer modal */}
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
            style={{ maxWidth: '80vw'}}
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
                  title="document"
                  style={{ width: '100%', height: '75vh' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditCrewModal;

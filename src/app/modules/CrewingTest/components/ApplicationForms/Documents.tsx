import React, { useState, useEffect } from 'react';
import { CrewDocumentForm, CrewDocumentResponse, CrewDocument , DocumentSlot } from '../../core/_models';
import { uploadCrewDocument, getCrewDocuments, deleteCrewDocument, fetchCrewDocumentBlob } from '../../core/_requests';
import { toast } from 'react-toastify';
import {DateTextInput} from '../../components/DateTextInput'

const API_URL = process.env.REACT_APP_API_URL 

interface DocumentsProps {
  documentForm: CrewDocumentForm;
  handleDocumentFormChange: (field: keyof CrewDocumentForm, value: any) => void;
  fieldErrors: Record<string, string>;
  existingDocument: CrewDocumentResponse | null;
  crewId: number | null;
}

interface DocumentFile {
  slot: DocumentSlot;
  documentName: string;
  file: File | null;
  id: number | null;        // ← was optional
  filePath: string | null;   // ← was optional
}



// one source of truth for the table rows (stable mapping by slot)
const TEMPLATE_ROWS: DocumentFile[] = [
  { slot: 'CV',                 documentName: 'CV',                                      file: null, id: null, filePath: null },
  { slot: 'PASSPORT',           documentName: 'Passport',                                file: null, id: null, filePath: null },
  { slot: 'NATIONAL_CDC',       documentName: 'National CDC',                            file: null, id: null, filePath: null },
  { slot: 'BIOMETRIC_SID',      documentName: 'Biometric SID',                           file: null, id: null, filePath: null },
  { slot: 'SCHENGEN_VISA',      documentName: 'Schengen Visa',                           file: null, id: null, filePath: null },
  { slot: 'US_VISA_C1D',        documentName: 'U.S. VISA C1/D',                          file: null, id: null, filePath: null },

  { slot: 'COC',                documentName: 'National Certificate of Competency (COC)',file: null, id: null, filePath: null },
  { slot: 'GMDSS',              documentName: 'GMDSS',                                   file: null, id: null, filePath: null },
  { slot: 'GMDSS_ENDORSEMENT',  documentName: 'GMDSS Endorsement',                        file: null, id: null, filePath: null },
  { slot: 'INDOS',              documentName: 'Indos No',                                file: null, id: null, filePath: null },
  { slot: 'OTHERS',             documentName: 'Others',                                  file: null, id: null, filePath: null },

  { slot: 'OIL_ENDORSEMENT',    documentName: 'Basic/Adv Oil Endorsement',               file: null, id: null, filePath: null },
  { slot: 'CHEM_ENDORSEMENT',   documentName: 'Basic/Adv Chem Endorsement',              file: null, id: null, filePath: null },
  { slot: 'GAS_ENDORSEMENT',    documentName: 'Basic/Adv Gas Endorsement',               file: null, id: null, filePath: null },
];

const API_ORIGIN = (API_URL || '').replace(/\/api\/?$/, '');

const startsWithUploads = (p: string) => /^\/?uploads\//i.test(p);
const looksLikeFsPath = (p: string) =>
  /^([A-Za-z]:\\|\/(home|var|opt|srv|tmp|etc|Users|mnt)\/)/i.test(p);
const isHttp = (p: string) => /^https?:\/\//i.test(p);

/** Prefer /view endpoint; fall back to /uploads when safe. */
const buildDocHref = (
  crewId: number | null,
  doc: { id: number | null; filePath: string | null }
): string | null => {
  // safest and most consistent: always works, regardless of filePath contents
  if (doc.id != null && crewId != null) {
    return `${API_URL}/documents/${crewId}/${doc.id}/view`;
  }

  // fallbacks (rarely used if id exists)
  const p = doc.filePath || '';
  if (!p) return null;
  if (isHttp(p)) return p;                    // already absolute
  if (startsWithUploads(p))                   // served by static /uploads
    return `${API_ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`;
  if (looksLikeFsPath(p)) return null;        // local disk path → not web-safe

  // last-ditch: treat as relative
  return `${API_ORIGIN}/${p.replace(/^\/+/, '')}`;
};



// normalize any string for comparison (case/space/punct insensitive)
const normalizeKey = (s: string) => (s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();


const Documents: React.FC<DocumentsProps> = ({
  documentForm,
  handleDocumentFormChange,
  fieldErrors,
  existingDocument,
  crewId,
}) => {
  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>(TEMPLATE_ROWS);
// const [viewer, setViewer] = useState<{open: boolean; href: string | null; title: string}>({
//   open: false, href: null, title: ''
// });

const [objectUrl, setObjectUrl] = useState<string | null>(null);
const [viewer, setViewer] = useState<{open: boolean; href: string | null; title: string; mime?: string}>({
  open: false, href: null, title: '', mime: undefined
});

const closeViewer = () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
  }
  setViewer({ open: false, href: null, title: '', mime: undefined });
};



  // Fetch existing documents when crewId is available
  useEffect(() => {
    if (crewId) {
      fetchDocuments();
    }
  }, [crewId]);

const fetchDocuments = async () => {
  try {
    if (!crewId) return;
    const docs = await getCrewDocuments(crewId);
    const bySlot = new Map(docs.map(d => [d.slot, d]));

    const rows: DocumentFile[] = TEMPLATE_ROWS.map(r => {
      const match = bySlot.get(r.slot);
      return {
        ...r,
        id: match?.id ?? null,
        filePath: match?.filePath ?? null,
      };
    });

    setDocumentFiles(rows);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    toast.error('Failed to fetch documents.');
  }
};





  // File validation
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

  const handleFileChange = (index: number, file: File | null) => {
    const updated = [...documentFiles];
    updated[index].file = file;
    setDocumentFiles(updated);

    const validation = validateFile(file);
    if (!validation.isValid) {
      handleDocumentFormChange(`file_${updated[index].documentName}` as keyof CrewDocumentForm, validation.message);
    } else {
      handleDocumentFormChange(`file_${updated[index].documentName}` as keyof CrewDocumentForm, '');
    }
  };

  const handlePreview = async (index: number) => {
  try {
    const df = documentFiles[index];
    if (!crewId || !df?.id) {
      toast.error('Missing crew/document id.');
      return;
    }
    const blob = await fetchCrewDocumentBlob(crewId, df.id); // ← calls requests.ts (authorized)
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    setViewer({ open: true, href: url, title: df.documentName, mime: blob.type || undefined });
  } catch (err) {
    console.error('Preview failed:', err);
    toast.error('Failed to load document preview.');
  }
};


  const handleRemoveFile = async (index: number) => {
  const doc = documentFiles[index];
  if (doc.id && crewId) {
    try {
      await deleteCrewDocument(crewId, doc.id);
      toast.success(`${doc.documentName} file removed.`);
      const updated = [...documentFiles];
updated[index] = { ...updated[index], file: null, id: null, filePath: null };

      setDocumentFiles(updated);
      await fetchDocuments(); // ok now
      return;
    } catch (error) {
      console.error(`Failed to delete ${doc.documentName} file:`, error);
      toast.error(`Failed to delete ${doc.documentName} file.`);
    }
  }
  // local fallback clear
  const updated = [...documentFiles];
updated[index] = { ...updated[index], file: null, id: null, filePath: null };

  setDocumentFiles(updated);
  handleDocumentFormChange(`file_${doc.documentName}` as keyof CrewDocumentForm, '');
};


const handleUpload = async (index: number) => {
  const row = documentFiles[index];
  if (!crewId || !row.file) {
    toast.error('Crew ID or file missing.');
    return;
  }
  const validation = validateFile(row.file);
  if (!validation.isValid) {
    toast.error(validation.message);
    return;
  }
  try {
    const uploaded = await uploadCrewDocument(crewId, row.slot, row.file); // ← slot
    const updated = [...documentFiles];
    updated[index] = { ...updated[index], id: uploaded.id, file: null, filePath: uploaded.filePath };
    setDocumentFiles(updated);
    toast.success(`${row.documentName} uploaded successfully.`);
    await fetchDocuments();
  } catch (error) {
    console.error(`Failed to upload ${row.documentName}:`, error);
    toast.error(`Failed to upload ${row.documentName}.`);
  }
};


  /** ---- cell renderer so we don't replace whole <td> blocks ---- */
const renderUploadCell = (index: number) => {
  const df = documentFiles[index];

  if (df?.id || df?.filePath) {
    return (
      <>
        <button
          className="btn btn-sm btn-icon btn-info"
          title="Preview"
          onClick={() => handlePreview(index)}
        >
          <i className="bi bi-eye"></i>
        </button>
        <button
          className="btn btn-sm btn-icon btn-secondary"
          onClick={() => handleRemoveFile(index)}
          title="Trash (remove)"
        >
          <i className="bi bi-trash"></i>
        </button>
      </>
    );
  }

  return (
    <>
      <span>No file uploaded</span>
      <input
        type="file"
        className="form-control form-control-sm"
        onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
        style={{ maxWidth: '200px' }}
        accept=".pdf,.png,.jpg,.jpeg"
      />
      {documentFiles[index].file && (
        <button className="btn btn-sm btn-primary" onClick={() => handleUpload(index)}>
          Upload
        </button>
      )}
    </>
  );
};

/** Slot-based accessor so UI never depends on numeric ordering */
const cell = (slot: DocumentSlot) => {
  const idx = documentFiles.findIndex(r => r.slot === slot);
  if (idx < 0) return <span>—</span>;
  return renderUploadCell(idx);
};






return (
  <>
    {/* Identity Documents Section */}
    <div className='col-12 mb-4'>
      <h6 className='mb-3 fw-bold'>Identity Documents</h6>
      <div className='table-responsive'>
        <table className='table table-bordered'>
          <thead className='table-light'>
            <tr>
              <th>Documents</th>
              <th>Number</th>
              <th>Date of Issue</th>
              <th>Place of Issue</th>
              <th>Date of Expiry</th>
              <th>ECNR</th>
              <th>Minimum 4 Blank Pages</th>
              <th>File Upload</th>
            </tr>
          </thead>
          <tbody>
            <tr>
  <td><strong>CV</strong></td>
  {/* Number / Issue / Place / Expiry / ECNR / Min 4 blank pages are not applicable for CV */}
  <td colSpan={6} className="text-muted">Not applicable</td>
  <td>
    <div className="d-flex align-items-center gap-2 flex-wrap">
      {cell('CV')}
    </div>
    {fieldErrors['file_CV'] && <small className="text-danger">{fieldErrors['file_CV']}</small>}
  </td>
</tr>
            <tr>
              <td><strong>Passport</strong></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.passportNumber || ''}
                  onChange={(e) => handleDocumentFormChange('passportNumber', e.target.value)}
                />
                {fieldErrors.passportNumber && <small className='text-danger'>{fieldErrors.passportNumber}</small>}
              </td>
              <td>
              <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.passportIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('passportIssueDate', val)}
/>  
                </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.passportPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('passportPlaceOfIssue', e.target.value)} /></td>
              <td><DateTextInput
  className='form-control form-control-sm'
  value={documentForm.passportExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('passportExpiryDate', val)}
/></td>
              <td>
                <div className="d-flex align-items-center">
                  <div className="form-check form-check-inline me-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="passportEcnr"
                      id="ecnrYes"
                      value="Yes"
                      checked={documentForm.passportEcnr === true}
                      onChange={() => handleDocumentFormChange('passportEcnr', true)}
                    />
                    <label className="form-check-label" htmlFor="ecnrYes">Yes</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="passportEcnr"
                      id="ecnrNo"
                      value="No"
                      checked={documentForm.passportEcnr === false}
                      onChange={() => handleDocumentFormChange('passportEcnr', false)}
                    />
                    <label className="form-check-label" htmlFor="ecnrNo">No</label>
                  </div>
                </div>
              </td>
              <td>
                <div className="d-flex align-items-center">
                  <div className="form-check form-check-inline me-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="passportMin4BlankPages"
                      id="blankPagesYes"
                      value="Yes"
                      checked={documentForm.passportMin4BlankPages === true}
                      onChange={() => handleDocumentFormChange('passportMin4BlankPages', true)}
                    />
                    <label className="form-check-label" htmlFor="blankPagesYes">Yes</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="passportMin4BlankPages"
                      id="blankPagesNo"
                      value="No"
                      checked={documentForm.passportMin4BlankPages === false}
                      onChange={() => handleDocumentFormChange('passportMin4BlankPages', false)}
                    />
                    <label className="form-check-label" htmlFor="blankPagesNo">No</label>
                  </div>
                </div>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('PASSPORT')}
                </div>
                {fieldErrors['file_Passport'] && <small className="text-danger">{fieldErrors['file_Passport']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>National CDC</strong></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.cdcNumber || ''}
                  onChange={(e) => handleDocumentFormChange('cdcNumber', e.target.value)}
                />
                {fieldErrors.cdcNumber && <small className='text-danger'>{fieldErrors.cdcNumber}</small>}
              </td>
              <td><DateTextInput
  className='form-control form-control-sm'
  value={documentForm.cdcIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('cdcIssueDate', val)}
/></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.cdcPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('cdcPlaceOfIssue', e.target.value)} /></td>
              <td><DateTextInput
  className='form-control form-control-sm'
  value={documentForm.cdcExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('cdcExpiryDate', val)}
/></td>
              <td colSpan={2}>
                <div className="mb-1">
                  <label className="form-label form-label-sm" style={{color:'black', fontWeight:'normal', fontSize:'14px',paddingLeft:'5px'}}>MUI/ NUI or any other Union Membership No:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={documentForm.unionMembershipNo || ''}
                    onChange={(e) => handleDocumentFormChange('unionMembershipNo', e.target.value)}
                  />
                </div>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('NATIONAL_CDC')}
                </div>
                {fieldErrors['file_National CDC'] && <small className="text-danger">{fieldErrors['file_National CDC']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>Biometric SID</strong></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.sidNumber || ''}
                  onChange={(e) => handleDocumentFormChange('sidNumber', e.target.value)}
                />
                {fieldErrors.sidNumber && <small className='text-danger'>{fieldErrors.sidNumber}</small>}
              </td>
              <td><DateTextInput
  className='form-control form-control-sm'
  value={documentForm.sidIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('sidIssueDate', val)}
/>
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.sidPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('sidPlaceOfIssue', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.sidExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('sidExpiryDate', val)}
/>
              </td>
              <td colSpan={2}></td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('BIOMETRIC_SID')}
                </div>
                {fieldErrors['file_Biometric SID'] && <small className="text-danger">{fieldErrors['file_Biometric SID']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>Schengen Visa</strong></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.schengenVisaNumber || ''}
                  onChange={(e) => handleDocumentFormChange('schengenVisaNumber', e.target.value)}
                />
                {fieldErrors.schengenVisaNumber && <small className='text-danger'>{fieldErrors.schengenVisaNumber}</small>}
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.schengenVisaIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('schengenVisaIssueDate', val)}
/>
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.schengenVisaPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('schengenVisaPlaceOfIssue', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.schengenVisaExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('schengenVisaExpiryDate', val)}
/>
              </td>
              <td colSpan={2}></td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('SCHENGEN_VISA')}
                </div>
                {fieldErrors['file_Schengen Visa'] && <small className="text-danger">{fieldErrors['file_Schengen Visa']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>U.S. VISA C1/D</strong></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.usVisaC1dNumber || ''}
                  onChange={(e) => handleDocumentFormChange('usVisaC1dNumber', e.target.value)}
                />
                {fieldErrors.usVisaC1dNumber && <small className='text-danger'>{fieldErrors.usVisaC1dNumber}</small>}
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.usVisaC1dIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('usVisaC1dIssueDate', val)}
/>
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.usVisaC1dPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('usVisaC1dPlaceOfIssue', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.usVisaC1dExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('usVisaC1dExpiryDate', val)}
/>
              </td>
              <td colSpan={2}></td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('US_VISA_C1D')}
                </div>
                {fieldErrors['file_U.S. VISA C1/D'] && <small className="text-danger">{fieldErrors['file_U.S. VISA C1/D']}</small>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    {/* Professional Certificates Section */}
    <div className='col-12 mb-4'>
      <h6 className='mb-3 fw-bold'>Professional Certificates</h6>
      <div className='table-responsive'>
        <table className='table table-bordered'>
          <thead className='table-light'>
            <tr>
              <th>Documents</th>
              <th>Grade/Level</th>
              <th>Number</th>
              <th>Issuing Authority</th>
              <th>Date of Issue</th>
              <th>Date of Expiry</th>
              <th>File Upload</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>National Certificate of Competency (COC)</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.cocGradeLevel || ''} onChange={(e) => handleDocumentFormChange('cocGradeLevel', e.target.value)} /></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.cocNumber || ''}
                  onChange={(e) => handleDocumentFormChange('cocNumber', e.target.value)}
                />
                {fieldErrors.cocNumber && <small className='text-danger'>{fieldErrors.cocNumber}</small>}
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.cocIssuingAuthority || ''} onChange={(e) => handleDocumentFormChange('cocIssuingAuthority', e.target.value)} /></td>
              <td> 
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.cocIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('cocIssueDate', val)}
/>
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.cocExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('cocExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('COC')}
                </div>
                {fieldErrors['file_National Certificate of Competency (COC)'] && <small className="text-danger">{fieldErrors['file_National Certificate of Competency (COC)']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>GMDSS</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.gmdssGradeLevel || ''} onChange={(e) => handleDocumentFormChange('gmdssGradeLevel', e.target.value)} /></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.gmdssNumber || ''}
                  onChange={(e) => handleDocumentFormChange('gmdssNumber', e.target.value)}
                />
                {fieldErrors.gmdssNumber && <small className='text-danger'>{fieldErrors.gmdssNumber}</small>}
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.gmdssIssuingAuthority || ''} onChange={(e) => handleDocumentFormChange('gmdssIssuingAuthority', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.gmdssIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('gmdssIssueDate', val)}
/>
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.gmdssExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('gmdssExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('GMDSS')}
                </div>
                {fieldErrors['file_GMDSS'] && <small className="text-danger">{fieldErrors['file_GMDSS']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>GMDSS Endorsement</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.gmdssEndorsementGradeLevel || ''} onChange={(e) => handleDocumentFormChange('gmdssEndorsementGradeLevel', e.target.value)} /></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.gmdssEndorsementNumber || ''}
                  onChange={(e) => handleDocumentFormChange('gmdssEndorsementNumber', e.target.value)}
                />
                {fieldErrors.gmdssEndorsementNumber && <small className='text-danger'>{fieldErrors.gmdssEndorsementNumber}</small>}
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.gmdssEndorsementIssuingAuthority || ''} onChange={(e) => handleDocumentFormChange('gmdssEndorsementIssuingAuthority', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.gmdssEndorsementIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('gmdssEndorsementIssueDate', val)}
/>
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.gmdssEndorsementExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('gmdssEndorsementExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('GMDSS_ENDORSEMENT')}
                </div>
                {fieldErrors['file_GMDSS Endorsement'] && <small className="text-danger">{fieldErrors['file_GMDSS Endorsement']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>Indos No</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.indosGradeLevel || ''} onChange={(e) => handleDocumentFormChange('indosGradeLevel', e.target.value)} /></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.indosNumber || ''}
                  onChange={(e) => handleDocumentFormChange('indosNumber', e.target.value)}
                />
                {fieldErrors.indosNumber && <small className='text-danger'>{fieldErrors.indosNumber}</small>}
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.indosIssuingAuthority || ''} onChange={(e) => handleDocumentFormChange('indosIssuingAuthority', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.indosIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('indosIssueDate', val)}
/>
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.indosExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('indosExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('INDOS')}
                </div>
                {fieldErrors['file_Indos No'] && <small className="text-danger">{fieldErrors['file_Indos No']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>Others</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.otherDocGradeLevel || ''} onChange={(e) => handleDocumentFormChange('otherDocGradeLevel', e.target.value)} /></td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.otherDocNumber || ''}
                  onChange={(e) => handleDocumentFormChange('otherDocNumber', e.target.value)}
                />
                {fieldErrors.otherDocNumber && <small className="text-danger">{fieldErrors.otherDocNumber}</small>}
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.otherDocIssuingAuthority || ''} onChange={(e) => handleDocumentFormChange('otherDocIssuingAuthority', e.target.value)} /></td>
              <td>  
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.otherDocIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('otherDocIssueDate', val)}
/>
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.otherDocExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('otherDocExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('OTHERS')}
                </div>
                {fieldErrors['file_Others'] && <small className="text-danger">{fieldErrors['file_Others']}</small>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    {/* Dangerous Cargo Endorsements Section */}
    <div className='col-12 mb-4'>
      <h6 className='mb-3 fw-bold'>Dangerous Cargo Endorsements</h6>
      <div className='table-responsive'>
        <table className='table table-bordered'>
          <thead className='table-light'>
            <tr>
              <th>Dangerous Cargo Endorsements</th>
              <th>Nationality</th>
              <th>Grade/Level I/II</th>
              <th>Number</th>
              <th>Date of Issue</th>
              <th>Place of Issue</th>
              <th>Date of Expiry</th>
              <th>File Upload</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Basic/Adv Oil Endorsement</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.oilEndorsementNationality || ''} onChange={(e) => handleDocumentFormChange('oilEndorsementNationality', e.target.value)} /></td>
              <td>
                <select
                  className='form-control form-control-sm'
                  value={documentForm.oilEndorsementGradeLevel || ''}
                  onChange={(e) => handleDocumentFormChange('oilEndorsementGradeLevel', e.target.value)}
                >
                  <option value=''>Select</option>
                  <option value='I'>I</option>
                  <option value='II'>II</option>
                </select>
              </td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.oilEndorsementNumber || ''}
                  onChange={(e) => handleDocumentFormChange('oilEndorsementNumber', e.target.value)}
                />
                {fieldErrors.oilEndorsementNumber && <small className='text-danger'>{fieldErrors.oilEndorsementNumber}</small>}
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.oilEndorsementIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('oilEndorsementIssueDate', val)}
/>
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.oilEndorsementPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('oilEndorsementPlaceOfIssue', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.oilEndorsementExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('oilEndorsementExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('OIL_ENDORSEMENT')}
                </div>
                {fieldErrors['file_Basic/Adv Oil Endorsement'] && <small className="text-danger">{fieldErrors['file_Basic/Adv Oil Endorsement']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>Basic/Adv Chem Endorsement</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.chemEndorsementNationality || ''} onChange={(e) => handleDocumentFormChange('chemEndorsementNationality', e.target.value)} /></td>
              <td>
                <select
                  className='form-control form-control-sm'
                  value={documentForm.chemEndorsementGradeLevel || ''}
                  onChange={(e) => handleDocumentFormChange('chemEndorsementGradeLevel', e.target.value)}
                >
                  <option value=''>Select</option>
                  <option value='I'>I</option>
                  <option value='II'>II</option>
                </select>
              </td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.chemEndorsementNumber || ''}
                  onChange={(e) => handleDocumentFormChange('chemEndorsementNumber', e.target.value)}
                />
                {fieldErrors.chemEndorsementNumber && <small className='text-danger'>{fieldErrors.chemEndorsementNumber}</small>}
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.chemEndorsementIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('chemEndorsementIssueDate', val)}
/>
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.chemEndorsementPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('chemEndorsementPlaceOfIssue', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.chemEndorsementExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('chemEndorsementExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('CHEM_ENDORSEMENT')}
                </div>
                {fieldErrors['file_Basic/Adv Chem Endorsement'] && <small className="text-danger">{fieldErrors['file_Basic/Adv Chem Endorsement']}</small>}
              </td>
            </tr>
            <tr>
              <td><strong>Basic/Adv Gas Endorsement</strong></td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.gasEndorsementNationality || ''} onChange={(e) => handleDocumentFormChange('gasEndorsementNationality', e.target.value)} /></td>
              <td>
                <select
                  className='form-control form-control-sm'
                  value={documentForm.gasEndorsementGradeLevel || ''}
                  onChange={(e) => handleDocumentFormChange('gasEndorsementGradeLevel', e.target.value)}
                >
                  <option value=''>Select</option>
                  <option value='I'>I</option>
                  <option value='II'>II</option>
                </select>
              </td>
              <td>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  value={documentForm.gasEndorsementNumber || ''}
                  onChange={(e) => handleDocumentFormChange('gasEndorsementNumber', e.target.value)}
                />
                {fieldErrors.gasEndorsementNumber && <small className='text-danger'>{fieldErrors.gasEndorsementNumber}</small>}
              </td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.gasEndorsementIssueDate || ''}
  onChange={(val) => handleDocumentFormChange('gasEndorsementIssueDate', val)}
/>
              </td>
              <td><input type='text' className='form-control form-control-sm' value={documentForm.gasEndorsementPlaceOfIssue || ''} onChange={(e) => handleDocumentFormChange('gasEndorsementPlaceOfIssue', e.target.value)} /></td>
              <td>
                <DateTextInput
  className='form-control form-control-sm'
  value={documentForm.gasEndorsementExpiryDate || ''}
  onChange={(val) => handleDocumentFormChange('gasEndorsementExpiryDate', val)}
/>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {cell('GAS_ENDORSEMENT')}
                </div>
                {fieldErrors['file_Basic/Adv Gas Endorsement'] && <small className="text-danger">{fieldErrors['file_Basic/Adv Gas Endorsement']}</small>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {viewer.open && (
  <div className="modal fade show" style={{display:'block'}} onClick={closeViewer}>
    <div className="modal-dialog modal-xl" onClick={e => e.stopPropagation()}>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title m-0">{viewer.title}</h5>
          <button type="button" className="btn-close" onClick={closeViewer} />
        </div>
        <div className="modal-body" style={{height:'80vh'}}>
          {viewer.mime?.startsWith('image/')
            ? <img src={viewer.href ?? ''} alt="" style={{maxWidth:'100%', maxHeight:'100%'}} />
            : <iframe src={viewer.href ?? ''} width="100%" height="100%" title="Document preview" />}
        </div>
      </div>
    </div>
  </div>
)}


  </>
);

};

export default Documents;
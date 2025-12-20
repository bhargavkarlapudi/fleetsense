import React, { useEffect, useState } from 'react';
import { deleteTemplate, getReportsForTemplate, getTemplateList, updateMenuItem } from '../core/_requests';
import { Reports } from '../core/_models';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onReportAdded: () => void;
}

const EditReportModal: React.FC<Props> = ({ onClose, isOpen, onReportAdded }) => {

    useEffect(() => {
        fetchReportsList();
    }, []);

    const [reports, setReports] = useState<Reports[]>([]);
    const [editingReportId, setEditingReportId] = useState<number | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [deletingReportId, setDeletingReportId] = useState<number | null>(null);
    const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);

    const fetchReportsList = async () => {
        try {
            const templateIDs = await fetchTemplateIds();

            if (templateIDs && templateIDs.length > 0) {
                if (templateIDs && templateIDs.length > 0) {
                    const reportsPerTemplate = await Promise.all(
                        templateIDs.map((templateId) => getReportsForTemplate(templateId))
                    );
                    console.log("Reports Per Template:", reportsPerTemplate);

                    const allReports = reportsPerTemplate.flat();

                    console.log(allReports);
                    setReports(allReports);
                } else {
                    console.warn('No template IDs found.');
                }
            }
        } catch (err) {
            console.error('Failed to fetch reports list:', err);
            return [];
        }
    };

    const fetchTemplateIds = async () => {
        try {
            const templateList = await getTemplateList();

            // Extract all IDs
            const templateIds: number[] = templateList.map(template => template.id);

            return templateIds;
        } catch (err) {
            console.error('Failed to fetch template list:', err);
        }
    };

    const handleUpdateClick = async (tempId: number, reportId: number) => {
        if (!editingReportId) return;

        if (!editingName.trim()) {
            alert("Please enter a report name");
            return;
        }

        try {
            const response = await updateMenuItem(tempId, reportId, editingName, true);
            console.log("report updated successfully", response);
            showSuccessAndReset('Report name updated successfully');
            onReportAdded();
        } catch (err) {
            console.error('Failed to update report:', err);
        }

    };

    const handleDeleteClick = async (tempId: number, reportId: number) => {
        if (!deletingReportId) return;

        try {

            // // Step 1: Fetch all tab IDs linked with the report
            // const tabList = await getTabsForReport(reportId);
            // const tabIds = tabList?.map(tab => tab.id) || [];

            // // Step 2: For each tab, fetch and delete fields
            // for (const tabId of tabIds) {
            //     const fieldsList = await getFieldsForTab(tabId);
            //     const fieldIds = fieldsList?.map(field => field.id) || [];

            //     for (const fieldId of fieldIds) {
            //         await deleteField(tabId, fieldId);
            //         console.log(`Deleted field ${fieldId} in tab ${tabId}`);
            //     }

            //     // Step 3: Delete tab (submenu)
            //     await deleteSubMenuItem(tempId, tabId);
            //     console.log(`Deleted tab (submenu) ${tabId}`);
            // }

            // Step 4: Finally, delete the report (menu item)
            // const response = await deleteMenuItem(tempId, reportId);
            const response = await deleteTemplate(tempId);
            console.log("Report deleted successfully", response);
            showSuccessAndReset('Report deleted successfully');
            onReportAdded();
        } catch (err) {
            console.error('Failed to delete report:', err);
        }
    };

    const showSuccessAndReset = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => {
            setSuccessMessage('');
            setEditingReportId(null);
            setEditingTemplateId(null);
            setDeletingReportId(null);
            setDeletingTemplateId(null);
            fetchReportsList();
        }, 2000);
    };


    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Edit Report</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {editingReportId === null && deletingReportId === null && successMessage === '' &&
                        (<ul>
                            {/* Show list only when not editing */}
                            {reports.map((report, index) => (
                                <li key={index} className='list-group-item d-flex align-items-center justify-content-between'>
                                    <div
                                        className='mt-3 p-4 border rounded-1 flex-grow-1 me-3'
                                        style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer' }}
                                    >
                                        {report.name}
                                    </div>
                                    <button
                                        className="btn btn-sm px-2"
                                        onClick={() => {
                                            setEditingReportId(report.id);
                                            setEditingTemplateId(report.templateId);
                                            setEditingName(report.name);
                                            setSuccessMessage('');
                                        }}
                                    >
                                        <KTSVG path='/media/map/edit-active.svg' className='' />
                                    </button>
                                    <button
                                        className="btn btn-sm px-2"
                                        onClick={() => {
                                            setDeletingReportId(report.id)
                                            setDeletingTemplateId(report.templateId);
                                            setSuccessMessage('');
                                        }}
                                    >
                                        <KTSVG path='/media/map/trash.svg' className='' />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        )
                    }

                    {/* Show edit form when editing */}
                    {editingReportId !== null && editingTemplateId !== null && successMessage === '' && (
                        <div>
                            <label className="modal_label">Report Name</label>
                            <input
                                type="text"
                                className="form-control mb-3"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                            />
                            <div className="d-flex gap-2 mt-5">
                                <button
                                    className="btn btn_success"
                                    onClick={() => handleUpdateClick(editingTemplateId, editingReportId)}
                                >
                                    Update
                                </button>
                                <button
                                    className="btn btn_secondary"
                                    onClick={() => {
                                        setEditingReportId(null)
                                        setEditingTemplateId(null)
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation */}
                    {deletingReportId !== null && deletingTemplateId !== null && successMessage === '' && (
                        <div className="mt-3">
                            <div className="d-flex justify-content-center mb-4">
                                <KTSVG path='/media/map/exclamation.svg' className='svg-icon-4x'></KTSVG>
                            </div>
                            <div className='text-center'>Are you sure you want to delete this report?</div>
                            <div className="d-flex justify-content-center gap-2 mt-5">
                                <button
                                    className="btn btn_secondary"
                                    onClick={() => {
                                        setDeletingReportId(null)
                                        setDeletingTemplateId(null)
                                    }}
                                >
                                    No, Keep it
                                </button>
                                <button
                                    className="btn btn_danger me-2"
                                    onClick={() => { handleDeleteClick(deletingTemplateId, deletingReportId) }}
                                >
                                    Yes, Delete!
                                </button>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success mt-3">{successMessage}</div>
                    )}

                </div>

                {/* <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_primary" onClick={handleAddMenuItem}>Update</button>
                </div> */}
            </div>
        </div>
    );
};

export default EditReportModal;

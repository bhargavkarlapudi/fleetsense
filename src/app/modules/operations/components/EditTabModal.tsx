import React, { useEffect, useState } from 'react';
import { createMenuItem, createTemplate, deleteField, deleteMenuItem, deleteSubMenuItem, getFieldsForTab, getReportsForTemplate, getTabsForReport, getTemplateList, updateMenuItem, updateSubMenuItem } from '../core/_requests';
import { getAuth } from '../../auth';
import { Reports, Submenu } from '../core/_models';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    menuId: number;
    onTabAdded: () => void;
}

const EditTabModal: React.FC<Props> = ({ onClose, isOpen, menuId, onTabAdded }) => {

    const [tabs, setTabs] = useState<Submenu[]>([]);
    const [editingTabId, setEditingTabId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [deletingTabId, setDeletingTabId] = useState<number | null>(null);
    const [reports, setReports] = useState<Reports[]>([]);

    useEffect(() => {
        fetchReportsList(); // This sets reports
    }, []);

    useEffect(() => {
        if (reports.length > 0) {
            fetchTabsList();
        }
    }, [reports]);

    const fetchTabsList = async () => {
        try {
            const allReports = reports.flatMap(report => report);

            // Find the submenu (tab) that matches the given tabId
            const targetReport = allReports.find(report => report.id === menuId);

            if (targetReport) {
                console.log(targetReport.submenus)
                setTabs(targetReport.submenus.filter(item => item.isActive));
            } else {
                console.warn(`No tab found with ID ${menuId}`);
                setTabs([]);
            }

        } catch (err) {
            console.error('Failed to fetch reports list:', err);
            return [];
        }
    };

    const fetchReportsList = async () => {
        try {

            const templateIDs = await fetchTemplateIds();

            if (templateIDs && templateIDs.length > 0) {
                console.log("Final templateIDs:", templateIDs);

                if (templateIDs && templateIDs.length > 0) {
                    const reportsPerTemplateResults = await Promise.allSettled(
                        templateIDs.map(templateId => getReportsForTemplate(templateId))
                    );

                    const reportsPerTemplate = reportsPerTemplateResults
                        .filter(result => result.status === 'fulfilled')
                        .map(result => (result as PromiseFulfilledResult<Reports[]>).value);

                    const allReports = reportsPerTemplate.flat();

                    console.log("All reports", allReports);
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
            const templateIds: number[] = templateList
                .map(template => template.id);

            return templateIds;
        } catch (err) {
            console.error('Failed to fetch template list:', err);
        }
    };

    const handleUpdateClick = async (tabId: number) => {
        if (!editingTabId) return;

        if (!editingName.trim()) {
            alert("Please enter a tab name");
            return;
        }

        try {

            const response = await updateSubMenuItem(menuId, tabId, editingName, true);
            console.log("Tab updated successfully", response);
            fetchTabsList();
            showSuccessAndReset('Tab name updated successfully');
            onTabAdded();
        } catch (err) {
            console.error('Failed to update Tab:', err);
        }

    };

    const handleDeleteClick = async (tabId: number) => {
        if (!deletingTabId) return;

        try {

            const fieldsList = await getFieldsForTab(tabId);
            const fieldIds = fieldsList?.map(field => field.id) || [];

            for (const fieldId of fieldIds) {
                await deleteField(tabId, fieldId);
                console.log(`Deleted field ${fieldId} in tab ${tabId}`);
            }

            const response = await deleteSubMenuItem(menuId, tabId);
            console.log("Tab deleted successfully", response);
            fetchTabsList();
            showSuccessAndReset('Tab deleted successfully');
            onTabAdded();
        } catch (err) {
            console.error('Failed to delete tab:', err);
        }
    };

    const showSuccessAndReset = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => {
            setSuccessMessage('');
            setEditingTabId(null);
            setDeletingTabId(null);
            fetchReportsList();
        }, 2000);
    };


    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Edit Tabs</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {editingTabId === null && deletingTabId === null && successMessage === '' &&
                        (<ul>
                            {/* Show list only when not editing */}
                            {tabs.map((tab, index) => (
                                <li key={index} className='list-group-item d-flex align-items-center justify-content-between'>
                                    <div
                                        className='mt-3 p-4 border rounded-1 flex-grow-1 me-3'
                                        style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer' }}
                                    >
                                        {tab.name}
                                    </div>
                                    <button
                                        className="btn btn-sm px-2"
                                        onClick={() => {
                                            setEditingTabId(tab.id);
                                            setEditingName(tab.name);
                                            setSuccessMessage('');
                                        }}
                                    >
                                        <KTSVG path='/media/map/edit-active.svg' className='' />
                                    </button>
                                    <button
                                        className="btn btn-sm px-2"
                                        onClick={() => {
                                            setDeletingTabId(tab.id)
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
                    {editingTabId !== null && successMessage === '' && (
                        <div>
                            <label className="modal_label">Tab Name</label>
                            <input
                                type="text"
                                className="form-control mb-3"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                            />
                            <div className="d-flex gap-2 mt-5">
                                <button
                                    className="btn btn_success"
                                    onClick={() => handleUpdateClick(editingTabId)}
                                >
                                    Update
                                </button>
                                <button
                                    className="btn btn_secondary"
                                    onClick={() => {
                                        setEditingTabId(null)
                                        setDeletingTabId(null)
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation */}
                    {deletingTabId !== null && successMessage === '' && (
                        <div className="mt-3">
                            <div className="d-flex justify-content-center mb-4">
                                <KTSVG path='/media/map/exclamation.svg' className='svg-icon-4x'></KTSVG>
                            </div>
                            <div className='text-center'>Are you sure you want to delete this Tab?</div>
                            <div className="d-flex justify-content-center gap-2 mt-5">
                                <button
                                    className="btn btn_secondary"
                                    onClick={() => {
                                        setDeletingTabId(null)
                                    }}
                                >
                                    No, Keep it
                                </button>
                                <button
                                    className="btn btn_danger me-2"
                                    onClick={() => { handleDeleteClick(deletingTabId) }}
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

export default EditTabModal;

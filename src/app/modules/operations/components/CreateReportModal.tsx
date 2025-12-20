import React, { useEffect, useState } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { getAssignedTemplatesByVessel, getAssignedTemplatesByVesselId } from '../core/_requests';
import { Voyage } from '../core/_models';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedVoyage: Voyage | null;
}

const CreateReportModal: React.FC<Props> = ({ onClose, isOpen, selectedVoyage }) => {

    const [reports, setReports] = useState<{ assignmentId: number, reportName: string }[]>([]);
    const { currentUser } = useAuth()
    const vesselId = currentUser?.vessel?.id;
    const vesselType = currentUser?.vessel?.vesselType || "";
    const companyId = currentUser?.vessel?.companyAdminId;
    const companyAdminId = currentUser?.vessel?.companyGroupAdminId;
    useEffect(() => {
        fetchAssignedTemplates();
    }, []);
    useEffect(() => {
        console.log(currentUser);
    }, [currentUser]);

    // const vesselId = sessionStorage.getItem('vesselId');
    // const vesselType = sessionStorage.getItem('vesselType');
    // const companyAdminId = sessionStorage.getItem('companyAdminId');
    // const companyId = sessionStorage.getItem('companyId');

    const fetchAssignedTemplates = async () => {
        try {
            let filteredList: any[] = [];

            if (vesselType !== null) {
                filteredList = await getAssignedTemplatesByVesselId(
                    Number(companyAdminId),
                    Number(companyId),
                    vesselType,
                    Number(vesselId)
                );
                console.log("Fetched filtered list:", filteredList);
            }

            if (!Array.isArray(filteredList)) {
                console.error('Invalid template list response.');
                return [];
            }

            // ✅ Extract only active menus and include parent assignmentId
            const result = filteredList.flatMap(item => {
                const menus = item.customTemplate?.menus || item.template?.menus || [];
                return menus
                    .filter((menu: { isActive: boolean }) => menu.isActive)
                    .map((menu: { name: any; }) => ({
                        assignmentId: item.id,
                        reportName: menu.name ?? 'Unnamed Report',
                    }));
            });

            console.log('Final Active Template Results:', result);
            setReports(result);
        } catch (err) {
            console.error('Failed to fetch template list:', err);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="custom-modal-overlay" onClick={onClose}>
            <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header" style={{ backgroundColor: "#F4F9FF" }}>
                    <div className="p-2 d-flex justify-content-between">
                        <div>
                            <h5>Choose next possible reports</h5>
                        </div>
                        <button onClick={onClose} className="close-btn">
                            &times;
                        </button>
                    </div>
                </div>

                <div
                    className="custom-modal-body"
                    style={{
                        maxHeight: '100vh',
                        overflowY: 'auto',
                        paddingRight: '1rem',
                    }}
                >
                    <div style={{ paddingRight: '5rem', marginBottom: '2rem' }}>
                        <p
                            className="pb-2 ps-3"
                            style={{ color: "#1C64F2", borderBottom: "1px solid #1C64F2" }}
                        >
                            Primary reports
                        </p>
                    </div>

                    {reports.map((report, index) => (
                        <div key={index} className="mb-5" style={{ paddingRight: '6rem' }}>
                            <p className="mb-1">{report.reportName}</p>
                            <Link
                                to={`/operations/create/${report.assignmentId}`}
                                state={{
                                    selectedVoyage,
                                    selectedTabId: 0, // 👈 or whatever default tab you want to start on
                                }}
                                className="ms-0 ps-3 btn border d-flex align-items-center gap-1"
                            >
                                <KTSVG path="media/map/Files.svg" className="svg-icon-2" />
                                {report.reportName}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>

    );
};

export default CreateReportModal;

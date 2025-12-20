import React, { useEffect, useState } from 'react';
import { getConsumptionROBData } from '../core/_requests';
import { Voyage } from '../core/_models';

interface ViewConsumptionROBModalProps {
    show: boolean;
    onClose: () => void;
    accessToken: string;
    userId: string;
    voyage: Voyage;
    companyId: string;
}

const ViewConsumptionROBModal: React.FC<ViewConsumptionROBModalProps> = ({
    show,
    onClose,
    accessToken,
    userId,
    voyage,
    companyId,
}) => {
    const [consumptionData, setConsumptionData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            fetchConsumptionData();
        }
    }, [show]);

    const fetchConsumptionData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getConsumptionROBData(accessToken, voyage.id);
            setConsumptionData(data);
        } catch (err: any) {
            console.error('Failed to fetch consumption data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-xl" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Consumption ROB Details</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {loading ? (
                            <p>Loading...</p>
                        ) : error ? (
                            <div className="alert alert-danger">{error}</div>
                        ) : consumptionData.length === 0 ? (
                            <p>No data available.</p>
                        ) : (
                            consumptionData.map((entry) => (
                                <div key={entry.id} className="mb-4 border-bottom pb-3">
                                    {/* <h6>User ID: {entry.userId}</h6> */}
                                    <h6>#{entry.voyageId}</h6>

                                    <table className="table table-bordered table-sm mt-3">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Field Type</th>
                                                <th>ROB</th>
                                                <th>Machinery</th>
                                                <th>Consumed</th>
                                                <th>ROB (Machinery)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entry.details.map((detail: any) =>
                                                detail.machineries.map((mach: any, idx: number) => (
                                                    <tr key={mach.id || `${detail.id}-${idx}`}>
                                                        <td>{detail.fieldType}</td>
                                                        <td>{detail.rob}</td>
                                                        <td>{mach.machinery}</td>
                                                        <td>{mach.consumed}</td>
                                                        <td>{mach.rob}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewConsumptionROBModal;

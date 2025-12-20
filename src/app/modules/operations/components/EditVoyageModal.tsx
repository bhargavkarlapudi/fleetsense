import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { KTSVG } from '../../../../_metronic/helpers';
import { updateVoyage } from '../core/_requests';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onVoyageUpdated: () => void;
    voyageData: any; // Replace 'any' with your proper Voyage model if available
}

const EditVoyageModal: React.FC<Props> = ({ isOpen, onClose, onVoyageUpdated, voyageData }) => {
    const [voyageNumber, setVoyageNumber] = useState('');
    const [departurePort, setDeparturePort] = useState('');
    const [arrivalPort, setArrivalPort] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('');
    const [securityLevel, setSecurityLevel] = useState('');
    const [iceVoyage, setIceVoyage] = useState(false);
    const [legId, setLegId] = useState('');
    const [eca, setEca] = useState(false);
    const [cosp, setCosp] = useState('');
    const [eosp, setEosp] = useState('');
    const [arrivalFew, setArrivalFew] = useState('');
    const [eta, setEta] = useState('');
    const [estimatedDistance, setEstimatedDistance] = useState('');
    const [displacement, setDisplacement] = useState('');
    const [draftFore, setDraftFore] = useState('');
    const [draftMid, setDraftMid] = useState('');
    const [draftAft, setDraftAft] = useState('');
    const [totalCargoOnboard, setTotalCargoOnboard] = useState('');
    const [loadingCondition, setLoadingCondition] = useState('');
    const [chartererName, setChartererName] = useState('');
    const [chartererNo, setChartererNo] = useState('');
    const [cpSpeed, setCpSpeed] = useState('');
    const [cpConsumptionTotal, setCpConsumptionTotal] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (voyageData && isOpen) {
            setVoyageNumber(voyageData.voyageNumber || '');
            setDeparturePort(voyageData.departurePort || '');
            setArrivalPort(voyageData.arrivalPort || '');
            setStartDate(voyageData.startDate || '');
            setEndDate(voyageData.endDate || '');

            // New fields
            setStatus(voyageData.status || '');
            setSecurityLevel(voyageData.securityLevel || '');
            setIceVoyage(voyageData.iceVoyage || false);
            setEca(voyageData.eca || false);
            setCosp(voyageData.cosp || '');
            setEosp(voyageData.eosp || '');
            setArrivalFew(voyageData.arrivalFew || '');
            setEta(voyageData.eta || '');
            setEstimatedDistance(voyageData.estimatedDistance?.toString() || '');
            setDisplacement(voyageData.displacement?.toString() || '');
            setDraftFore(voyageData.draftFore?.toString() || '');
            setDraftMid(voyageData.draftMid?.toString() || '');
            setDraftAft(voyageData.draftAft?.toString() || '');
            setTotalCargoOnboard(voyageData.totalCargoOnboard?.toString() || '');
            setLoadingCondition(voyageData.loadingCondition || '');
            setChartererName(voyageData.chartererName || '');
            setChartererNo(voyageData.chartererNo || '');
            setCpSpeed(voyageData.cpSpeed?.toString() || '');
            setCpConsumptionTotal(voyageData.cpConsumptionTotal?.toString() || '');
        }
    }, [voyageData, isOpen]);

    function formatDateTimeLocal(dateString: string) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    const handleUpdate = async () => {
        if (!voyageNumber || !departurePort || !arrivalPort || !startDate) {
            setError('Please fill in all fields.');
            return;
        }

        try {
            await updateVoyage(
                voyageData.id,
                voyageNumber,
                departurePort,
                arrivalPort,
                startDate,
                endDate,
                `${departurePort} - ${arrivalPort}`,
                voyageData.active,
                legId,
                status,
                securityLevel,
                iceVoyage,
                eca,
                cosp,
                eosp,
                arrivalFew,
                eta,
                estimatedDistance,
                displacement,
                draftFore,
                draftMid,
                draftAft,
                totalCargoOnboard,
                loadingCondition,
                chartererName,
                chartererNo,
                cpSpeed,
                cpConsumptionTotal
            );
            toast.success("Voyage updated successfully");

            onVoyageUpdated();
            onClose();
        } catch (err) {
            console.error('Failed to update voyage:', err);
            setError('Failed to update voyage.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '70rem' }}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Edit Voyage</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="row">
                        {/* <div className="col-md-4 mb-3">
                            <label className="modal_label">Voyage Number <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={voyageNumber} onChange={(e) => setVoyageNumber(e.target.value)} />
                        </div> */}
                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Departure Port <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={departurePort} onChange={(e) => setDeparturePort(e.target.value)} />
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Arrival Port <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={arrivalPort} onChange={(e) => setArrivalPort(e.target.value)} />
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Departure Datetime <span className="text-danger">*</span></label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={
                                    startDate
                                        ? formatDateTimeLocal(startDate)
                                        : ''
                                }
                                onChange={(e) => setStartDate(e.target.value)}
                            />

                            {/* <input
                                type="datetime-local"
                                className="form-control"
                                value={
                                    startDate
                                        ? new Date(startDate).toLocaleString('sv-SE', {
                                            hour12: false,
                                            timeZone: 'Asia/Kolkata',
                                        }).replace(' ', 'T')
                                        : ''
                                }
                                onChange={(e) => setStartDate(e.target.value)}
                            /> */}
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Arrival Datetime </label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={
                                    endDate
                                        ? formatDateTimeLocal(endDate)
                                        : ''
                                }
                                onChange={(e) => setEndDate(e.target.value)}
                            />

                            {/* <input
                                type="datetime-local"
                                className="form-control"
                                value={
                                    endDate
                                        ? new Date(endDate).toLocaleString('sv-SE', {
                                            hour12: false,
                                            timeZone: 'Asia/Kolkata',
                                        }).replace(' ', 'T')
                                        : ''
                                }
                                onChange={(e) => setEndDate(e.target.value)}
                            /> */}
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Leg ID</label>
                            <input type="text" className="form-control" value={legId} onChange={(e) => setLegId(e.target.value)} />
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Status</label>
                            <input type="text" className="form-control" value={status} onChange={(e) => setStatus(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Security Level</label>
                            <input type="text" className="form-control" value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Ice Voyage</label>
                            <input type="checkbox" className="form-check-input" checked={iceVoyage} onChange={(e) => setIceVoyage(e.target.checked)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">ECA</label>
                            <input type="checkbox" className="form-check-input" checked={eca} onChange={(e) => setEca(e.target.checked)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">COSP</label>
                            <input type="datetime-local" className="form-control" value={cosp} onChange={(e) => setCosp(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">EOSP</label>
                            <input type="datetime-local" className="form-control" value={eosp} onChange={(e) => setEosp(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Arrival FEW</label>
                            <input type="datetime-local" className="form-control" value={arrivalFew} onChange={(e) => setArrivalFew(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">ETA</label>
                            <input type="datetime-local" className="form-control" value={eta} onChange={(e) => setEta(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Estimated Distance</label>
                            <input type="number" className="form-control" value={estimatedDistance} onChange={(e) => setEstimatedDistance(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Displacement</label>
                            <input type="number" className="form-control" value={displacement} onChange={(e) => setDisplacement(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Draft Fore</label>
                            <input type="number" className="form-control" value={draftFore} onChange={(e) => setDraftFore(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Draft Mid</label>
                            <input type="number" className="form-control" value={draftMid} onChange={(e) => setDraftMid(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Draft Aft</label>
                            <input type="number" className="form-control" value={draftAft} onChange={(e) => setDraftAft(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Total Cargo Onboard</label>
                            <input type="number" className="form-control" value={totalCargoOnboard} onChange={(e) => setTotalCargoOnboard(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Loading Condition</label>
                            <input type="text" className="form-control" value={loadingCondition} onChange={(e) => setLoadingCondition(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Charterer Name</label>
                            <input type="text" className="form-control" value={chartererName} onChange={(e) => setChartererName(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Charterer No</label>
                            <input type="text" className="form-control" value={chartererNo} onChange={(e) => setChartererNo(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">CP Speed</label>
                            <input type="number" className="form-control" value={cpSpeed} onChange={(e) => setCpSpeed(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">CP Consumption Total</label>
                            <input type="number" className="form-control" value={cpConsumptionTotal} onChange={(e) => setCpConsumptionTotal(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleUpdate}>Update</button>
                </div>
            </div>
        </div>
    );
};

export default EditVoyageModal;

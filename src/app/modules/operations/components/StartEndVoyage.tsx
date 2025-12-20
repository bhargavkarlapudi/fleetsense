import React, { useEffect, useState } from 'react';
import { getAuth } from '../../auth';
import { Voyage } from '../core/_models';
import { getActiveVoyageForVessel, startVoyage, endVoyage } from '../core/_requests';
import { KTSVG } from '../../../../_metronic/helpers';
// import { checkVoyageStatus, startVoyage, endVoyage } from '../core/_requests';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    voyage: Voyage;
}

const StartEndVoyageModal: React.FC<Props> = ({ isOpen, onClose, voyage }) => {
    const [canStart, setCanStart] = useState(false);
    const [activeVoyageNumber, setActiveVoyageNumber] = useState("");
    const [activeVoyage, setActiveVoyage] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchStatus = async () => {
            if (voyage.active == true) {
                setCanStart(false)
            }
            else {
                setCanStart(true)
            }
        };

        fetchStatus();
    }, [isOpen, voyage]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchStatus = async () => {
            setLoading(true); // ✅ Start loading immediately
            try {

                const response = await getActiveVoyageForVessel(voyage.vessel.id);
                console.log(response[0].voyageNumber)
                // console.log(voyage.voyageNumber)
                setActiveVoyageNumber(response[0].voyageNumber);
                if(response[0].voyageNumber === voyage.voyageNumber) {
                    setActiveVoyage(true);
                }
                setCanStart(false); // If voyage found, don't allow start
            } catch (error: any) {
                console.error("Error checking active voyage:", error); // <-- full error

                const errMsg =
                    error?.response?.data?.message ??
                    error?.message ??
                    'Unknown error occurred';

                console.error("Parsed error message:", errMsg);

                if (errMsg.includes("No active voyages with status 'started'")) {
                    setCanStart(true); // ✅ allow start if no active voyage
                } else {
                    setCanStart(false); // default
                }
            }
            finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [isOpen, voyage]);

    const handleStart = async () => {
        try {
            await startVoyage(voyage.id);
            onClose();
        } catch (error) {
            console.error('Failed to start voyage:', error);
        }
    };

    const handleEnd = async () => {
        try {

            await endVoyage(voyage.id);
            onClose();
        } catch (error) {
            console.error('Failed to end voyage:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Manage Voyage</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {loading ? (
                        <p>Loading status...</p>
                    ) : canStart ? (
                        <div>
                            <p>You can start a new voyage.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="alert alert-warning">
                                Voyage {activeVoyageNumber} is an active voyage for this vessel.<br />
                                Please mark it as completed before creating a new one.
                            </div>
                        </div>
                    )}

                    <div>
                        {canStart ? (
                            <button className="btn btn_success"
                                onClick={handleStart}
                            >Start Voyage</button>
                        ) : activeVoyage ? (
                            <button className="btn btn_danger" onClick={handleEnd}>End Voyage</button>
                        ) : <></>}
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default StartEndVoyageModal;

import React, { useState, useEffect } from 'react';
import { createField, createSubmenuItem } from '../core/_requests';
import { getAuth } from '../../auth';
import { KTSVG } from '../../../../_metronic/helpers';
import { WarningLevel } from '../core/_models';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    menuId: number;
    onTabAdded: () => void;
}

const AddTabModal: React.FC<Props> = ({ onClose, isOpen, menuId, onTabAdded }) => {
    const [tabType, setTabType] = useState<'custom' | 'consumption_rob'>('custom');
    const [tabName, setTabName] = useState('');

    useEffect(() => {
        // Automatically set the tab name if consumption & ROB is selected
        if (tabType === 'consumption_rob') {
            setTabName('Consumption & ROB');
        } else {
            setTabName('');
        }
    }, [tabType]);

    const handleAddSubMenuItem = async () => {
        if (!tabName.trim()) {
            alert("Please enter a tab name");
            return;
        }

        try {
            // 1️⃣ Create the submenu
            const submenu = await createSubmenuItem(menuId, tabName, true);
            const newSubmenuId = submenu?.id;

            // 2️⃣ If this is our special Consumption & ROB tab, bootstrap its fields
            if (tabType === 'consumption_rob') {
                // Fuel-type select options
                const fuelOptions = [
                    "HFO", "VLSFO", "LSFO", "MGO", "MDO", "ULSFO", "LNG",
                    "Methanol", "BioFuel", "LPG", "Hydrogen / Ammonia"
                ];

                // Machinery select options
                const machOptions = [
                    "ME 1", "ME 2", "AE 1", "AE 2", "AE 3", "AE 4", "Boiler-1", "Boiler-2"
                ];

                // 2.a Fuel Type
                await createField(
                    newSubmenuId,
                    "Fuel Type",
                    "select",
                    false,           // readOnly
                    true,            // required
                    true,            // isActive
                    undefined,       // warningOnly
                    undefined,       // unit
                    undefined,       // min
                    undefined,       // max
                    fuelOptions      // optionsJson
                );

                // 2.b Outer ROB
                await createField(
                    newSubmenuId,
                    "ROB",
                    "number",
                    false,
                    true,
                    true,
                    WarningLevel.SOFT, // or STRICT as per your rules
                    undefined,
                    undefined,
                    undefined,
                    null
                );

                // 2.c Machinery
                await createField(
                    newSubmenuId,
                    "Machinery",
                    "select",
                    false,
                    true,
                    true,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    machOptions
                );

                // 2.d Consumed
                await createField(
                    newSubmenuId,
                    "Consumed",
                    "number",
                    false,
                    true,
                    true,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    null
                );

                // 2.e Inner ROB
                await createField(
                    newSubmenuId,
                    "ROB",
                    "number",
                    false,
                    true,
                    true,
                    WarningLevel.SOFT,
                    undefined,
                    undefined,
                    undefined,
                    null
                );
            }

            console.log("submenu + fields created", submenu);
        }
        catch (err) {
            console.error("Failed to add submenu or its fields", err);
        }

        onTabAdded();
        onClose();
    }
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Add Tab</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {/* Tab Type First */}
                    <label className="modal_label d-block">Tab Type</label>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input"
                            type="radio"
                            id="customRadio"
                            value="custom"
                            checked={tabType === 'custom'}
                            onChange={() => setTabType('custom')}
                        />
                        <label className="form-check-label" htmlFor="customRadio">
                            Custom
                        </label>
                    </div>

                    <div className="form-check form-check-inline mb-3">
                        <input
                            className="form-check-input"
                            type="radio"
                            id="consumptionRobRadio"
                            value="consumption_rob"
                            checked={tabType === 'consumption_rob'}
                            onChange={() => setTabType('consumption_rob')}
                        />
                        <label className="form-check-label" htmlFor="consumptionRobRadio">
                            Consumption and ROB
                        </label>
                    </div>
                    <br />
                    {/* Tab Name Field */}
                    <label className="modal_label">Tab Name</label>
                    <input
                        type="text"
                        value={tabName}
                        readOnly={tabType === 'consumption_rob'}
                        onChange={(e) => setTabName(e.target.value)}
                        className="form-control"
                    />
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleAddSubMenuItem}>Add</button>
                </div>
            </div>
        </div>
    );
};

export default AddTabModal;

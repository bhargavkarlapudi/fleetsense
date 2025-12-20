import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'bootstrap'; // ✅ Import Modal constructor
import { getAuth } from '../../auth';
import { createField, createTemplate } from '../core/_requests';
import { WarningLevel } from '../core/_models';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    submenuId: number;
    onFieldAdded: () => void;
}

const AddFieldModal: React.FC<Props> = ({ onClose, isOpen, submenuId, onFieldAdded }) => {

    const [label, setLabel] = useState("");
    const [warningOnly, setWarningOnly] = useState<WarningLevel | null>(null);
    const [inputType, setInputType] = useState("text");
    const [minValue, setMinValue] = useState<number | undefined>();
    const [maxValue, setMaxValue] = useState<number | undefined>();
    const [unit, setUnit] = useState("");
    const [options, setOptions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [optionInput, setOptionInput] = useState("");
    const [isRequired, setIsRequired] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLabel("");
            setWarningOnly(null);
            setInputType("text");
            setMinValue(undefined);
            setMaxValue(undefined);
            setUnit("");
            setOptions([]);
            setError(null);
            setOptionInput("");
            setIsRequired(false);
            setIsReadOnly(false);
        }
    }, [isOpen]);

    const handleAddFieldItem = async () => {
        try {

            const response = await createField(
                submenuId,
                label,
                inputType,
                isReadOnly,
                isRequired,
                true,
                warningOnly || undefined,
                unit || undefined,
                minValue,
                maxValue,
                options && options.length > 0 ? options : null
            );
            console.log("field creation response", response);
            clearData();
            onFieldAdded();
        } catch (err) {
            console.error('Failed to add field:', err);
        }
        onClose();
    };

    const handleAddOption = () => {
        if (optionInput.trim()) {
            setOptions(prev => [...prev, optionInput.trim()]);
            setOptionInput("");
        }
    };

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setMinValue(value);

        if (maxValue !== undefined && value > maxValue) {
            setError("Min value cannot be greater than max value.");
        } else {
            setError(null);
        }
    };

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setMaxValue(value);

        if (minValue !== undefined && minValue !== 0 && value < minValue) {
            setError("Max value cannot be less than min value.");
        } else {
            setError(null);
        }
    };

    const clearData = () => {
        setLabel("");
        setWarningOnly(null);
        setInputType("text");
        setMinValue(undefined);
        setMaxValue(undefined);
        setUnit("");
        setOptions([]);
        setError(null);
        setOptionInput("");
        setIsRequired(false);
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Add Field</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    <div style={{ paddingInline: '2.5rem', marginBottom: '1rem' }}>
                        <div className='d-flex align-items-center mb-5'>
                            <label className="modal_label me-3 mb-0">
                                Not editable
                            </label>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="requiredCheckbox"
                                checked={isReadOnly}
                                onChange={(e) => setIsReadOnly(e.target.checked)}
                            />

                        </div>
                        {!isReadOnly ?
                            <div>
                                <label className='modal_label'>Label Name</label>
                                <input
                                    type='text'
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    className='form-control'
                                />
                            </div> :
                            <div>
                                <label className='modal_label'>Label Name</label>
                                <select
                                    className='form-select py-4'
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                >
                                    <option value="">Select Label</option>
                                    <option value="Vessel Name">Vessel Name</option>
                                    <option value="Voyage Number">Voyage Number</option>
                                    <option value="Report Type">Report Type</option>
                                    <option value="Departure Port">Departure Port</option>
                                    <option value="Departure Datetime">Departure Datetime</option>
                                    <option value="Arrival Port">Arrival Port</option>
                                    <option value="ETA Datetime">ETA Datetime</option>
                                </select>
                            </div>}
                        <label className='modal_label mt-5'>Choose Input Type:</label>
                        <select
                            className='form-select py-4'
                            value={isReadOnly ? "text" : inputType}
                            onChange={(e) => {
                                setInputType(e.target.value);
                                setOptions([]); // reset options if type changes
                            }}
                            disabled={isReadOnly}
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="datetime">Date Time</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="radio">Radio Buttons</option>
                            <option value="select">Dropdown (Select)</option>
                            <option value="textarea">Textarea</option>
                        </select>
                        {inputType === "number" || inputType === "text" && (
                            <div className="mt-4">
                                <label className="modal_label mt-4">Validation Range</label>
                                <div className="d-flex gap-3">
                                    <input
                                        type="number"
                                        value={minValue ?? ""}
                                        onChange={handleMinChange}
                                        className="form-control no-spinner"
                                        placeholder="Min Value"
                                    />
                                    <input
                                        type="number"
                                        value={maxValue ?? ""}
                                        onChange={handleMaxChange}
                                        className="form-control no-spinner"
                                        placeholder="Max Value"
                                    />
                                </div>
                                {error && (
                                    <div className="text-danger mt-2">
                                        <small>{error}</small>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Show options input only if needed */}
                        {(inputType === "select" || inputType === "radio" || inputType === "checkbox") && (
                            <div className="mt-4">
                                <label className='modal_label'>Add Options:</label>
                                <div className="d-flex gap-2">
                                    <input
                                        type="text"
                                        value={optionInput}
                                        onChange={(e) => setOptionInput(e.target.value)}
                                        className="form-control"
                                        placeholder="Option value"
                                    />
                                    <button className="btn btn-outline-secondary" onClick={handleAddOption}>Add</button>
                                </div>
                                <ul className="mt-2 ps-0">
                                    {options.map((opt, idx) => (
                                        <li key={idx}
                                            className='list-group-item border rounded-1 py-3 mb-2'
                                            style={{
                                                backgroundColor: '#f0f4f8',
                                                color: '#1f2937',
                                                fontWeight: 500
                                            }}
                                        >
                                            {opt}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {inputType === "number" || inputType === "text" && (
                            <>
                                <label className='modal_label mt-5'>Unit</label>
                                <select
                                    className='form-select py-4'
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                >
                                    <option value="">Select a unit</option>
                                    <option value="%">Percentage (%)</option>
                                    <option value="Hrs">Hrs</option>
                                    <option value="Deg">Deg</option>
                                    <option value="min">min</option>
                                    <option value="rev">rev</option>
                                    <option value="kWh">kWh</option>
                                    <option value="kW">kW</option>
                                    <option value="RPM">RPM</option>
                                    <option value="Bar">Bar</option>
                                    <option value="m">m</option>
                                    <option value="m³">m³</option>
                                    <option value="MT">MT</option>
                                    <option value="NM">NM</option>
                                    <option value="°C">Celsius (°C)</option>
                                    <option value="mbar">mbar (Millibar)</option>
                                    <option value="bar">bar (Bar)</option>
                                    <option value="psi">psi (Pounds per square inch)</option>
                                    <option value="Pa">Pa (Pascal)</option>
                                    <option value="kPa">kPa (Kilopascal)</option>
                                    <option value="atm">atm (Atmosphere)</option>
                                    <option value="mmHg">mmHg (Millimeters of mercury)</option>
                                    <option value="inHg">inHg (Inches of mercury)</option>
                                    <option value="°C">°C (Celsius)</option>
                                    <option value="knots">knots</option>
                                    <option value="m/s">m/s (Meters per second)</option>
                                    <option value="ppt">ppt (Salinity)</option>
                                    <option value="sec">sec</option>
                                </select>
                            </>
                        )}
                        {
                            inputType === "number" && (
                                <>
                                    <label className='modal_label mt-5'>Validation Type</label>
                                    <div className='d-flex gap-4 mb-5'>
                                        <div className="form-check">
                                            <input
                                                type='radio'
                                                value={WarningLevel.STRICT}
                                                name='type'
                                                className="form-check-input"
                                                checked={warningOnly === WarningLevel.STRICT}
                                                onChange={() => setWarningOnly(WarningLevel.STRICT)}
                                            />
                                            <label className="modal_label">Strict</label>
                                        </div>
                                        <div className="form-check">
                                            <input
                                                type='radio'
                                                value={WarningLevel.SOFT}
                                                name='type'
                                                className="form-check-input"
                                                checked={warningOnly === WarningLevel.SOFT}
                                                onChange={() => setWarningOnly(WarningLevel.SOFT)}
                                            />
                                            <label className="modal_label">Soft</label>
                                        </div>
                                    </div>
                                </>
                            )
                        }
                        {!isReadOnly && <div className='d-flex align-items-center mt-5'>
                            <label className="modal_label me-3 mb-0">
                                Required
                            </label>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="requiredCheckbox"
                                checked={isRequired}
                                onChange={(e) => setIsRequired(e.target.checked)}
                            />

                        </div>}
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleAddFieldItem}>Add</button>
                </div>
            </div>
        </div>

    );
};

export default AddFieldModal;

import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

interface MachineryRow {
    machinery: string;
    consumed: string;
    rob: string;
}

interface OuterRow {
    fieldType: string;
    initialRob: string;
    lastRob: string;
    machineries: MachineryRow[];
}

const eventType = [
    {
        label: "Select Fuel Type",
        value: "Select Fuel Type"
    },
    {
        label: "HFO",
        value: "HFO"
    },
    {
        label: "VLSFO",
        value: "VLSFO"
    },
    {
        label: "LSFO",
        value: "LSFO"
    },
    {
        label: "MGO",
        value: "MGO"
    },
    {
        label: "MDO",
        value: "MDO"
    },
    {
        label: "ULSFO",
        value: "ULSFO"
    },
    {
        label: "LNG",
        value: "LNG"
    },
    {
        label: "Methanol",
        value: "Methanol"
    },
    {
        label: "BioFuel",
        value: "BioFuel"
    },
    {
        label: "LPG",
        value: "LPG"
    },
    {
        label: "Hydrogen / Ammonia",
        value: "Hydrogen / Ammonia"
    }
]

const machinaryData = [
    {
        label: "ME 1",
        value: ""
    },
    {
        label: "ME 2",
        value: ""
    },
    {
        label: "AE 1",
        value: ""
    },
    {
        label: "AE 2",
        value: ""
    },
    {
        label: "AE 3",
        value: ""
    },
    {
        label: "AE 4",
        value: ""
    },
    {
        label: "Boiler-1",
        value: ""
    },
    {
        label: "Boiler-2",
        value: ""
    }
]
const ConsumptionAndROB: React.FC = () => {
    const [rows, setRows] = useState<OuterRow[]>([
        {
            fieldType: '',
            initialRob: '',
            lastRob: '',
            machineries: [{ machinery: '', consumed: '', rob: '' }],
        }
    ]);

    const handleOuterChange = (
        index: number,
        field: 'fieldType' | 'initialRob' | 'lastRob',
        value: string
    ) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const handleInnerChange = (
        outerIndex: number,
        innerIndex: number,
        field: keyof MachineryRow,
        value: string
    ) => {
        const newRows = [...rows];
        newRows[outerIndex].machineries[innerIndex][field] = value;
        setRows(newRows);
    };

    const addOuterRow = () => {
        setRows([
            ...rows,
            {
                fieldType: '',
                initialRob: '',
                lastRob: '',
                machineries: [{ machinery: '', consumed: '', rob: '' }],
            }
        ]);
    };

    const addInnerRow = (outerIndex: number) => {
        const newRows = [...rows];
        newRows[outerIndex].machineries.push({ machinery: '', consumed: '', rob: '' });
        setRows(newRows);
    };

    return (
        <Form onSubmit={(e) => {
            e.preventDefault();
            console.log('Form Data:', rows); // Replace this with API call or state update
        }}>
            {rows.map((row, outerIndex) => (
                <div key={outerIndex} className="mb-4 border p-3 rounded">
                    <Row className="mb-2 align-items-end">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label style={{ color: '#000', fontWeight: '500', fontSize: 15, marginLeft: "5px" }}>Field Type</Form.Label>
                                <Form.Select
                                    value={row.fieldType}
                                    onChange={(e) => handleOuterChange(outerIndex, 'fieldType', e.target.value)}
                                >
                                    {eventType.map((event, index) => (<option key={index} value={event.label}>{event.label}</option>))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label style={{ color: '#000', fontWeight: '500', fontSize: 15, marginLeft: "5px" }}>Initial ROB</Form.Label>
                                <Form.Control
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    value={row.initialRob}
                                    onChange={(e) => handleOuterChange(outerIndex, 'initialRob', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label style={{ color: '#000', fontWeight: '500', fontSize: 15, marginLeft: "5px" }}>Last ROB</Form.Label>
                                <Form.Control
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    value={row.lastRob}
                                    onChange={(e) => handleOuterChange(outerIndex, 'lastRob', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end justify-content-end">
                            <Button variant="primary" onClick={addOuterRow}>+</Button>
                        </Col>
                    </Row>

                    {row.machineries.map((machineryRow, innerIndex) => (
                        <Row key={innerIndex} className="mb-2 mx-6">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label style={{ color: '#000',fontWeight:'500',fontSize:15, marginLeft:"5px" }}>Machinery</Form.Label>
                                    <Form.Select
                                        value={machineryRow.machinery}
                                        onChange={(e) => handleInnerChange(outerIndex, innerIndex, 'machinery', e.target.value)}
                                    >
                                        {machinaryData.map((data, index) => (
                                            <option key={index} value={data.label}>{data.label}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label style={{ color: '#000',fontWeight:'500',fontSize:15, marginLeft:"5px" }}>Consumed</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={machineryRow.consumed}
                                        onChange={(e) => handleInnerChange(outerIndex, innerIndex, 'consumed', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label style={{ color: '#000',fontWeight:'500',fontSize:15, marginLeft:"5px" }}>ROB</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={machineryRow.rob}
                                        onChange={(e) => handleInnerChange(outerIndex, innerIndex, 'rob', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Button variant="success" onClick={() => addInnerRow(outerIndex)}>+</Button>
                            </Col>
                        </Row>
                    ))}
                </div>
            ))}

            {/* Submit Button */}
            <div className="text-center">
                <Button type="submit" variant="primary">Submit</Button>
            </div>
        </Form>
    );

};

export default ConsumptionAndROB;

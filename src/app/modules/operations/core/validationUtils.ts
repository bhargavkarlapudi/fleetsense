import { Fields, WarningLevel } from '../core/_models';
function isValidLatLonFormat(input: string): boolean {
    input = input.trim();

    // Match decimal degrees (optionally with degree symbol)
    const decimalRegex = /^-?\d{1,3}(\.\d+)?°?$/;
    if (decimalRegex.test(input)) return true;

    // Match DMS or DDM formats with optional direction
    const dmsRegex = /^(\d{1,3})°\s*(\d{1,2})['′]?\s*(\d{1,2}(?:\.\d+)?)?["″]?\s*([NSEW])?$/i;
    const ddmRegex = /^(\d{1,3})°\s*(\d{1,2}(?:\.\d+)?)['′]?\s*([NSEW])?$/i;

    return dmsRegex.test(input) || ddmRegex.test(input);
}

export const validateField = (field: Fields, value: any): string => {
    if (field.required) {
        const isEmpty =
            value === undefined ||
            value === null ||
            (typeof value === 'string' && !value.trim()) ||
            (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
            return `${field.label} is required.`;
        }
    }

    const label = field.label?.toLowerCase() ?? '';

    // if (label.includes('latitude') || label.includes('longitude')) {
    //     if (typeof value !== 'string' || !isValidLatLonFormat(value)) {
    //         return `${field.label} must be a valid coordinate format (e.g., 37.7°, 37°25'19.07"N)`;
    //     }
    //     // const numberValue = Number(value);
    //     // if (isNaN(numberValue)) return `${field.label} must be a number`;
    //     // if (numberValue < -90 || numberValue > 90) return `${field.label} must be between -90 and 90`;
    // }

    switch (field.fieldType.toLowerCase()) {
        case 'number':
            // console.log(`[DEBUG] Validating field:`, field);
            // console.log(`[DEBUG] Raw value before trim:`, value);

            if (typeof value === 'object' && value?.value !== undefined) {
                value = value.value;
            }
            const numberValue = Number(value);
            const isValidNumber = value !== '' && !isNaN(numberValue) && isFinite(numberValue);

            // console.log(`[DEBUG] Parsed value:`, numberValue, 'Valid?', isValidNumber);

            if (!isValidNumber) {
                // console.warn(`[WARN] Invalid number input for field: ${field.label}`);
                return `${field.label} must be a valid number`;
            }

            const hasMin = field.minValue !== undefined && field.minValue !== null;
            const hasMax = field.maxValue !== undefined && field.maxValue !== null;

            const isBelowMin = hasMin && numberValue < field.minValue!;
            const isAboveMax = hasMax && numberValue > field.maxValue!;

            if (isBelowMin || isAboveMax) {
                // console.warn(`[WARN] ${field.label} is outside bounds. Min: ${field.minValue}, Max: ${field.maxValue}`);

                if (field.warningOnly === WarningLevel.STRICT) {
                    if (hasMin && hasMax) {
                        return `${field.label} must be a number between ${field.minValue} and ${field.maxValue}`;
                    } else if (hasMin) {
                        return `${field.label} must be a number ≥ ${field.minValue}`;
                    } else if (hasMax) {
                        return `${field.label} must be a number ≤ ${field.maxValue}`;
                    }
                } else if (field.warningOnly === WarningLevel.SOFT) {
                    if (hasMin && hasMax) {
                        return `⚠️ Warning: ${field.label} should be a number between ${field.minValue} and ${field.maxValue}`;
                    } else if (hasMin) {
                        return `⚠️ Warning: ${field.label} should be a number ≥ ${field.minValue}`;
                    } else if (hasMax) {
                        return `⚠️ Warning: ${field.label} should be a number ≤ ${field.maxValue}`;
                    }
                }
            }

            break;

        case 'text':
            if (typeof value === 'string') {
                const trimmedValue = value.trim();
                const hasMinLength = field.minValue !== undefined && field.minValue !== null;
                const hasMaxLength = field.maxValue !== undefined && field.maxValue !== null;

                if (hasMinLength && trimmedValue.length < field.minValue!) {
                    return `${field.label} must be at least ${field.minValue} characters long`;
                }

                if (hasMaxLength && trimmedValue.length > field.maxValue!) {
                    return `${field.label} must be at most ${field.maxValue} characters long`;
                }
            }
            break;
        case 'date':
        case 'time':
        case 'datetime':
            if (field.required && !value) {
                return `${field.label} is required`;
            }
            break;
    }

    return '';
};

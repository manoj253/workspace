const moment = require('moment');

exports.transformValue = (value, columnType) => {
    if (!value || value.trim() === '') return null;
    
    try {
        switch (columnType.toLowerCase()) {
            case 'double precision':
                return parseFloat(value.replace(',', '.'));
                
            case 'integer':
                return parseInt(value.replace(',', ''));
                
            case 'date':
            case 'timestamp without time zone':
                if (value.includes('.')) {
                    return moment(value, 'DD.MM.YYYY').format('YYYY-MM-DD');
                } else if (value.length === 8) {
                    return moment(value, 'YYYYMMDD').format('YYYY-MM-DD');
                }
                return value;
                
            case 'character varying':
            case 'text':
                return value.replace(/'/g, "''").replace(/\\"/g, '\\"');
                
            default:
                return value;
        }
    } catch (error) {
        throw new Error(`Error transforming value ${value} for type ${columnType}: ${error.message}`);
    }
}; 
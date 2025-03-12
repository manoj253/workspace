exports.ALLOWED_FILES = [
    'infactory.csv',
    'in_khk.csv',
    'in_saph.csv',
    'in_sapg.csv'
];

exports.SUCCESS_FOLDER = 'success';
exports.FAILED_FOLDER = 'failed';
exports.PARTIAL_SUCCESS_FOLDER = 'partial_success';
exports.PARTIAL_FAILED_FOLDER = 'partial_failed';
exports.BATCH_SIZE = 1000;

exports.COLUMN_MAPPINGS = {
    infactory: {
        'CSV_HEADER1': 'table_column1',
        'CSV_HEADER2': 'table_column2',
        // Add your column mappings here
    },
    in_khk: {
        // Add your column mappings here
    },
    in_saph: {
        // Add your column mappings here
    },
    in_sapg: {
        // Add your column mappings here
    }
}; 
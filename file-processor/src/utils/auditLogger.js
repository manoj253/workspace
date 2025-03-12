exports.createAuditEntry = async (client, fileName, status, fileLocation) => {
    const query = `
        INSERT INTO data_migration_audit 
        (file_name, status, file_location, is_post_processed, created_at)
        VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
    `;
    
    try {
        await client.query(query, [fileName, status, fileLocation]);
    } catch (error) {
        console.error('Error creating audit entry:', error);
        throw error;
    }
};

exports.createPartialAuditEntries = async (client, successFileName, failedFileName, successLocation, failedLocation) => {
    const queries = [
        {
            text: `
                INSERT INTO data_migration_audit 
                (file_name, status, file_location, is_post_processed, created_at)
                VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
            `,
            values: [successFileName, 'PARTIAL_SUCCESS', successLocation]
        },
        {
            text: `
                INSERT INTO data_migration_audit 
                (file_name, status, file_location, is_post_processed, created_at)
                VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
            `,
            values: [failedFileName, 'PARTIAL_FAILURE', failedLocation]
        }
    ];
    
    try {
        await client.query('BEGIN');
        for (const query of queries) {
            await client.query(query.text, query.values);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating partial audit entries:', error);
        throw error;
    }
};

exports.updateAuditEntry = async (client, fileName, status, fileLocation, errorMessage = null) => {
    const query = `
        UPDATE data_migration_audit 
        SET status = $2,
            file_location = $3,
            error_message = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE file_name = $1
        AND is_post_processed = false
    `;
    
    try {
        await client.query(query, [fileName, status, fileLocation, errorMessage]);
    } catch (error) {
        console.error('Error updating audit entry:', error);
        throw error;
    }
}; 
exports.getUnprocessedFiles = async (client) => {
    const query = `
        SELECT file_name, original_file_name 
        FROM data_migration_audit 
        WHERE is_post_processed = false 
        AND status IN ('SUCCESS', 'PARTIAL_SUCCESS')
        AND file_name LIKE 'success_%'
    `;
    
    const result = await client.query(query);
    
    const files = {
        infactory: [],
        in_khk: [],
        in_saph: [],
        in_sapg: []
    };
    
    result.rows.forEach(row => {
        const fileType = row.original_file_name.split('.')[0];
        if (files.hasOwnProperty(fileType)) {
            files[fileType].push(row.file_name);
        }
    });
    
    return files;
};

exports.updatePostProcessStatus = async (client, fileName) => {
    const query = `
        UPDATE data_migration_audit 
        SET is_post_processed = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE file_name = $1
    `;
    
    await client.query(query, [fileName]);
}; 
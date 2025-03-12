const { createAuditEntry, updateAuditEntry, createPartialAuditEntries } = require('../utils/auditLogger');

async function createResultFile(s3, bucket, folder, fileName, rows, type) {
    const csvContent = convertToCSV(rows);
    const key = `${folder}/${type}_${fileName}`;
    
    await s3.putObject({
        Bucket: bucket,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv'
    }).promise();
}

function convertToCSV(rows) {
    if (rows.length === 0) return '';
    
    const headers = Object.keys(rows[0]);
    const csvRows = [
        headers.join(','),
        ...rows.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ];
    
    return csvRows.join('\n');
}

exports.moveProcessedFile = async (s3, bucket, sourceKey, targetFolder, newFileName, result, client) => {
    try {
        const successKey = `${targetFolder}/success_${newFileName}`;
        const failedKey = `${targetFolder}/failed_${newFileName}`;

        if (result.successRows.length > 0 && result.failedRows.length > 0) {
            await createResultFile(s3, bucket, targetFolder, newFileName, result.successRows, 'success');
            await createResultFile(s3, bucket, targetFolder, newFileName, result.failedRows, 'failed');
            
            await createPartialAuditEntries(
                client,
                `success_${newFileName}`,
                `failed_${newFileName}`,
                `s3://${bucket}/${successKey}`,
                `s3://${bucket}/${failedKey}`
            );
        } else if (result.successRows.length > 0) {
            await createResultFile(s3, bucket, targetFolder, newFileName, result.successRows, 'success');
            await updateAuditEntry(
                client,
                newFileName,
                'SUCCESS',
                `s3://${bucket}/${successKey}`
            );
        } else if (result.failedRows.length > 0) {
            await createResultFile(s3, bucket, targetFolder, newFileName, result.failedRows, 'failed');
            await updateAuditEntry(
                client,
                newFileName,
                'FAILED',
                `s3://${bucket}/${failedKey}`,
                'All rows failed processing'
            );
        }

        await s3.deleteObject({
            Bucket: bucket,
            Key: sourceKey
        }).promise();

    } catch (error) {
        console.error('Error moving processed file:', error);
        await updateAuditEntry(
            client,
            newFileName,
            'ERROR',
            `s3://${bucket}/${sourceKey}`,
            error.message
        );
        throw error;
    }
}; 
const { getDbConnection, closePool } = require('./utils/db');
const { getSecretValue } = require('./utils/secrets');
const { getUnprocessedFiles, updatePostProcessStatus } = require('./services/auditQueries');
const { executePostProcessing } = require('./services/procedureExecutor');

async function processInfactoryFiles(client, files) {
    if (files.length === 0) return;
    
    console.log('Processing infactory files:', files);
    try {
        await client.query('BEGIN');
        await executePostProcessing(client, ['proc1', 'proc2']);
        await Promise.all(files.map(file => updatePostProcessStatus(client, file)));
        await client.query('COMMIT');
        console.log('Successfully processed infactory files');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing infactory files:', error);
        throw error;
    }
}

async function processSapFiles(client, sapFiles) {
    if (!sapFiles.every(files => files.length > 0)) return;
    
    const allFiles = sapFiles.flat();
    console.log('Processing SAP files:', allFiles);
    
    try {
        await client.query('BEGIN');
        await executePostProcessing(client, ['proc3', 'proc4', 'proc5']);
        await Promise.all(allFiles.map(file => updatePostProcessStatus(client, file)));
        await client.query('COMMIT');
        console.log('Successfully processed SAP files');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing SAP files:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    let client;
    
    try {
        const dbConfig = await getSecretValue(process.env.DB_SECRET_NAME);
        client = await getDbConnection(dbConfig);
        
        const unprocessedFiles = await getUnprocessedFiles(client);
        
        await processInfactoryFiles(client, unprocessedFiles.infactory);
        
        const sapFiles = [
            unprocessedFiles.in_khk,
            unprocessedFiles.in_saph,
            unprocessedFiles.in_sapg
        ];
        await processSapFiles(client, sapFiles);
        
        return {
            statusCode: 200,
            body: 'Post-processing completed successfully'
        };
    } catch (error) {
        console.error('Error in post-processor:', error);
        throw error;
    } finally {
        if (client) {
            await client.release();
        }
        await closePool();
    }
}; 
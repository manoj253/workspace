const AWS = require('aws-sdk');
const { getDbConnection, closePool } = require('./utils/db');
const { processFile } = require('./services/fileProcessor');
const { getSecretValue } = require('./utils/secrets');
const { ALLOWED_FILES } = require('./config/constants');
const { determineTargetFolder } = require('./utils/folderHelper');
const { moveProcessedFile } = require('./services/fileHandler');
const { sendProcessingEvent } = require('./services/eventService');

const s3 = new AWS.S3();
const eventbridge = new AWS.EventBridge();

async function processS3Record(record, client) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const fileName = key.split('/').pop();
    
    if (!ALLOWED_FILES.includes(fileName)) {
        console.log(`Skipping file ${fileName} as it's not in the allowed list`);
        return;
    }
    
    const result = await processFile(s3, client, bucket, key, fileName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const newFileName = `${fileName}_${timestamp}.csv`;
    
    const targetFolder = determineTargetFolder(result);
    await moveProcessedFile(s3, bucket, key, targetFolder, newFileName, result);
    await sendProcessingEvent(eventbridge, newFileName, result.success, fileName);
}

exports.handler = async (event) => {
    let client;
    
    try {
        const dbConfig = await getSecretValue(process.env.DB_SECRET_NAME);
        client = await getDbConnection(dbConfig);
        
        await Promise.all(event.Records.map(record => processS3Record(record, client)));
        
        return { statusCode: 200, body: 'Processing completed' };
    } catch (error) {
        console.error('Error in lambda handler:', error);
        throw error;
    } finally {
        if (client) {
            await client.release();
        }
        await closePool();
    }
}; 
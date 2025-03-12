const csv = require('csv-parse');
const { Transform } = require('stream');
const { COLUMN_MAPPINGS, BATCH_SIZE } = require('../config/constants');
const { transformValue } = require('./dataTransformer');
const { getTableColumnTypes } = require('../utils/db');
const { createAuditEntry, updateAuditEntry } = require('../utils/auditLogger');
const { Readable } = require('stream');
const copyFrom = require('pg-copy-streams').from;

exports.processFile = async (s3, client, bucket, key, fileName) => {
    const tableName = fileName.split('.')[0];
    const columnMapping = COLUMN_MAPPINGS[tableName];
    const columnTypes = await getTableColumnTypes(client, tableName);
    
    const successRows = [];
    const failedRows = [];
    let currentBatch = [];
    
    try {
        await client.query('BEGIN');
        
        await createAuditEntry(client, fileName, 'PROCESSING', `s3://${bucket}/${key}`);
        
        const s3Stream = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();
        
        const parser = csv({
            columns: true,
            skip_empty_lines: true,
            delimiter: ';'
        });
        
        const transformer = new Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                try {
                    const transformedRow = {};
                    for (const [csvHeader, tableColumn] of Object.entries(columnMapping)) {
                        const value = chunk[csvHeader];
                        const columnType = columnTypes[tableColumn];
                        if (!columnType) {
                            throw new Error(`Column type not found for column: ${tableColumn}`);
                        }
                        transformedRow[tableColumn] = transformValue(value, columnType);
                    }
                    callback(null, transformedRow);
                } catch (error) {
                    const errorRow = { ...chunk, error: error.message };
                    failedRows.push(errorRow);
                    callback();
                }
            }
        });

        const columns = Object.values(columnMapping);
        const copyQuery = `
            COPY ${tableName} (${columns.join(', ')})
            FROM STDIN WITH (FORMAT csv, DELIMITER ';', QUOTE '"')
        `;

        for await (const row of s3Stream.pipe(parser).pipe(transformer)) {
            try {
                currentBatch.push(row);
                
                if (currentBatch.length >= BATCH_SIZE) {
                    await processBatch(client, copyQuery, currentBatch, successRows, failedRows);
                    currentBatch = [];
                }
            } catch (error) {
                const errorRow = { ...row, error: error.message };
                failedRows.push(errorRow);
            }
        }
        
        if (currentBatch.length > 0) {
            await processBatch(client, copyQuery, currentBatch, successRows, failedRows);
        }

        return {
            success: successRows.length > 0,
            successRows,
            failedRows
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
};

async function processBatch(client, copyQuery, batch, successRows, failedRows) {
    try {
        const csvData = batch.map(row => {
            return Object.values(row)
                .map(value => {
                    if (value === null || value === undefined) return '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                })
                .join(';');
        }).join('\n');

        const dataStream = Readable.from([csvData + '\n']);
        const copyStream = client.query(copyFrom(copyQuery));
        
        await new Promise((resolve, reject) => {
            dataStream.pipe(copyStream)
                .on('error', (error) => {
                    batch.forEach(row => {
                        failedRows.push({
                            ...row,
                            error: error.message
                        });
                    });
                    reject(error);
                })
                .on('finish', () => {
                    successRows.push(...batch);
                    resolve();
                });
        });
    } catch (error) {
        console.error('Error processing batch:', error);
        batch.forEach(row => {
            failedRows.push({
                ...row,
                error: error.message
            });
        });
    }
} 
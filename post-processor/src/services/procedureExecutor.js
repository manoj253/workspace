exports.executePostProcessing = async (client, procedures) => {
    for (const procedure of procedures) {
        try {
            console.log(`Executing procedure: ${procedure}`);
            await client.query(`CALL ${procedure}()`);
            console.log(`Successfully executed procedure: ${procedure}`);
        } catch (error) {
            console.error(`Error executing procedure ${procedure}:`, error);
            throw error;
        }
    }
}; 
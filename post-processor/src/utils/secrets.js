const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

exports.getSecretValue = async (secretName) => {
    try {
        const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        return JSON.parse(data.SecretString);
    } catch (error) {
        console.error('Error getting secret:', error);
        throw error;
    }
}; 
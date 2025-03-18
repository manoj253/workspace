/**
 * Service for sending processing events to EventBridge
 */

/**
 * Sends a file processing event to EventBridge
 * 
 * @param {AWS.EventBridge} eventbridge - The EventBridge client
 * @param {string} fileName - The name of the processed file
 * @param {boolean} success - Whether the processing was successful
 * @param {string} originalFileName - The original name of the file
 * @returns {Promise<AWS.EventBridge.PutEventsResponse>} - The EventBridge response
 */
async function sendProcessingEvent(eventbridge, fileName, success, originalFileName) {
  console.log(`Sending processing event for file: ${fileName}, success: ${success}`);
  
  const params = {
    Entries: [
      {
        Source: 'file-processor',
        DetailType: 'FileProcessingComplete',
        Detail: JSON.stringify({
          fileName,
          originalFileName,
          success,
          timestamp: new Date().toISOString()
        }),
        EventBusName: process.env.EVENT_BUS_NAME || 'default'
      }
    ]
  };

  try {
    const result = await eventbridge.putEvents(params).promise();
    console.log('Event sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending event:', error);
    throw error;
  }
}

module.exports = {
  sendProcessingEvent
}; 
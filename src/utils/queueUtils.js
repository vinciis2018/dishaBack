import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis('redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

const monitoringPicAnalysisQueue = new Queue('monitoring-pic-analysis-queue', { 
    connection, 
    defaultJobOptions: {
        removeOnComplete: 5 * 60, // Keep completed jobs for 5 minutes
        removeOnFail: 5 * 60,    // Keep failed jobs for 5 minutes
        attempts: 3,            // Number of attempts to run the job
        backoff: {
            type: 'exponential',  // Back off exponentially
            delay: 1000          // Start with 1 second delay
        }
    } 
});


const auditReportGenerationQueue = new Queue('audit-report-generation-queue', { 
    connection, 
    defaultJobOptions: {
        removeOnComplete: 5 * 60, // Keep completed jobs for 5 minutes
        removeOnFail: 5 * 60,    // Keep failed jobs for 5 minutes
        attempts: 3,            // Number of attempts to run the job
        backoff: {
            type: 'exponential',  // Back off exponentially
            delay: 1000          // Start with 1 second delay
        }
    } 
});


export { monitoringPicAnalysisQueue, auditReportGenerationQueue };
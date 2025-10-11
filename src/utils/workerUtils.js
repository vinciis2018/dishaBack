import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import connectMongoDB, { checkMongoDBConnection } from '../config/db.js';
import { monitoringPicAnalysisJob, auditReportGenerationJob } from '../job/analyticsJob.js';

const connection = new IORedis('redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});
console.log('👷 Worker started...');

// Ensure DB connection before processing jobs
const ensureMongoDbConnection = async () => {
    if (!checkMongoDBConnection()) {
        console.log('No active DB connection. Reconnecting...');
        await connectMongoDB();
    }
};

const monitoringPicAnalysisWorker = new Worker(
    'monitoring-pic-analysis-queue',
    async job => {
        
        try {
            await ensureMongoDbConnection();
            console.log(`⚙️  Processing ${job.name} job ${job.id}`);
            await job.updateProgress(10);
            const result = await monitoringPicAnalysisJob(job);
            await job.updateProgress(99);
            console.log(`✅ monitoring picture analysis worker ${job.name} job ${job.id} completed successfully`);
            console.log("resilt", result)
            return result.data;
        } catch (error) {
            console.error(`❌ Monitoring picture analysis workerError in job ${job.id}:`, error);
            await job.updateProgress(job.progress || 0);
            throw error;
        }
    },
    { connection }
);

monitoringPicAnalysisWorker.on('progress', (job, progress) => {
    console.log(`⚙️ ${job.name} monitoring pic analysis job ${job.id}: ${progress}%`)
    return { jobId: job.id, progress: progress, result: null, status: "active", job: job }
});

monitoringPicAnalysisWorker.on('completed', async (job, result) => {
    console.log(`🎉 ${job.name} monitoring pic analysis job ${job.id} completed`);
    return { jobId: job.id, progress: 100, result: result, status: "completed", job: job}
});

monitoringPicAnalysisWorker.on('failed', async (job, err) => {
    console.error(`❌ ${job.name} monitoring pic analysis job ${job.id} failed with error:`, err);
    return { jobId: job.id, progress: job.progress, result: err, status: "failed", job: job }
});

monitoringPicAnalysisWorker.on('error', err => {
    console.error(`❗ ${job.name} monitoring pic analysis worker error: ${err}`);
    return { jobId: job.id, progress: job.progress, result: err, status: "error", job: job }
});






const auditReportGenerationWorker = new Worker(
    'audit-report-generation-queue',
    async job => {
        
        try {
            await ensureMongoDbConnection();
            console.log(`⚙️  Processing ${job.name} job ${job.id}`);
            await job.updateProgress(10);
            const result = await auditReportGenerationJob(job);
            await job.updateProgress(99);
            console.log(`✅ audit report generation worker ${job.name} job ${job.id} completed successfully`);
            console.log("resilt", result)
            return result.data;
        } catch (error) {
            console.error(`❌ Audit report generation workerError in job ${job.id}:`, error);
            await job.updateProgress(job.progress || 0);
            throw error;
        }
    },
    { connection }
);

auditReportGenerationWorker.on('progress', (job, progress) => {
    console.log(`⚙️ ${job.name} audit report generation job ${job.id}: ${progress}%`)
    return { jobId: job.id, progress: progress, result: null, status: "active", job: job }
});

auditReportGenerationWorker.on('completed', async (job, result) => {
    console.log(`🎉 ${job.name} audit report generation job ${job.id} completed`);
    return { jobId: job.id, progress: 100, result: result, status: "completed", job: job}
});

auditReportGenerationWorker.on('failed', async (job, err) => {
    console.error(`❌ ${job.name} audit report generation job ${job.id} failed with error:`, err);
    return { jobId: job.id, progress: job.progress, result: err, status: "failed", job: job }
});

auditReportGenerationWorker.on('error', err => {
    console.error(`❗ ${job.name} audit report generation worker error: ${err}`);
    return { jobId: job.id, progress: job.progress, result: err, status: "error", job: job }
});


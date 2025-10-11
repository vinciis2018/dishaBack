import { auditReportGenerationQueue, monitoringPicAnalysisQueue } from './queueUtils.js';

// campaign plan docs generation websocket utils
export const monitoringPicAnalysisWebscktUtils = async (processedJob, sckt, cleanupListeners, isSubscribed, pollInterval, handleDisconnection, handleUnsubscribtion) => {
    const jobId = processedJob.jobId;
    const campaignId = processedJob.id;
    const siteId = processedJob.siteId;

    if (!jobId && !campaignId && !siteId) {
        return sckt.emit('monitoringPicAnalysisJobStatus', {
            state: 'failed',
            progress: 0,
            error: 'Either jobId or campaignId or siteId is required'
        });
    }
    console.log(`[Websocket] Subscribed to monitoring picture analysis job ${jobId}...`);

    const emitJobStatus = async (job) => {
        if (!isSubscribed || !job) return;
        
        try {
            const state = await job.getState();
            const progress = typeof job.progress === 'function' 
                ? await job.progress() 
                : (job.progress || 0);

            var status = { state, progress };
            status = {...status, jobId: job.id}
            
            // Handle completed job
            if (state === 'completed') {
                // Get the job's return value
                const returnValue = job.returnvalue || await job.getState() === 'completed' ? await job.returnvalue : null;
                status.result = returnValue;
            } else if (state === 'failed') {
                const failedReason = await job.getFailedReason();
                if (failedReason) {
                    status.error = failedReason.message || 'Job failed';
                }
            }
            sckt.emit('monitoringPicAnalysisJobStatus', status);
            
            // If job is in final state, clean up listeners
            if (['completed', 'failed'].includes(state)) {
                cleanupListeners();
            }
            
            return state;
        } catch (error) {
            console.error(`[Websocket] Error emitting job status for monitoring pic analysis job status ${jobId}:`, error);
            sckt.emit('monitoringPicAnalysisJobStatus', {
                state: 'error',
                progress: 0,
                error: error.message
            });
            cleanupListeners();
            return 'error';
        }
    };

    try {
        // Register cleanup handlers
        sckt.on('unsubscribeToMonitoringPicAnalysisJob', handleUnsubscribtion);
        sckt.on('disconnect', handleDisconnection);

        // Try to get the job if jobId is provided
        if (jobId) {
            const job = await monitoringPicAnalysisQueue.getJob(jobId);
            
            if (job) {
                // Initial status check
                const state = await emitJobStatus(job);
                
                // Only set up polling if job is not in final state
                if (state && !['completed', 'failed', 'error'].includes(state)) {
                    // Poll for job updates every 2 seconds
                    pollInterval = setInterval(async () => {
                        if (!isSubscribed) {
                            clearInterval(pollInterval);
                            return;
                        }
                        const updatedJob = await monitoringPicAnalysisQueue.getJob(jobId);
                        if (updatedJob) {
                            const newState = await emitJobStatus(updatedJob);
                            if (['completed', 'failed', 'error'].includes(newState)) {
                                clearInterval(pollInterval);
                            }
                        } else {
                            console.log(`[Websckt] Job ${jobId} no longer exists`);
                            clearInterval(pollInterval);
                            cleanupListeners();
                        }
                    }, 2000);
                }
            } else {
                throw new Error('No job found with the provided ID');
            }
        } 
    } catch (error) {
        console.error(`[Websocket] Error in job monitoring analysis job subscription for ${jobId}:`, error);
        sckt.emit('monitoringPicAnalysisJobStatus', {
            state: 'error',
            progress: 0,
            error: error.message
        });
        cleanupListeners();
    }
}



export const auditReportGenerationWebscktUtils = async (jobProcessed, sckt, cleanupListeners, isSubscribed, pollInterval, handleDisconnection, handleUnsubscribtion) => {
    console.log("job processed", jobProcessed);
    const jobId = jobProcessed.jobId;
    const campaignId = jobProcessed.campaignId;
    console.log("JobId", jobId)
    console.log("CampaignId", campaignId)
    if (!jobId && !campaignId) {
        return sckt.emit('auditReportGenerationJobStatus', {
            state: 'failed',
            progress: 0,
            error: 'Either jobId or campaignId is required'
        });
    }
    console.log(`[Websocket] Subscribed to audit report generation job ${jobId}...`);
  
    const emitJobStatus = async (job) => {
        if (!isSubscribed || !job) return;
        
        try {
            const state = await job.getState();
            const progress = typeof job.progress === 'function' 
                ? await job.progress() 
                : (job.progress || 0);
  
            var status = { state, progress };
            status = {...status, jobId: job.id}
            if (state === 'completed') {
              const returnValue = job.returnvalue || await job.getState() === 'completed' ? await job.returnvalue : null;
              status.result = returnValue;
            } else if (state === 'failed') {
              const failedReason = await job.getFailedReason();
              if (failedReason) {
                  status.error = failedReason.message || 'Job failed';
              }
            }
            sckt.emit('auditReportGenerationJobStatus', status);
            
            if (['completed', 'failed'].includes(state)) {
                cleanupListeners();
            }
            
            return state;
        } catch (error) {
            console.error(`[Websocket] Error emitting job status for audit report generation job status ${jobId}:`, error);
            sckt.emit('auditReportGenerationJobStatus', {
                state: 'error',
                progress: 0,
                error: error.message
            });
            cleanupListeners();
            return 'error';
        }
    };
  
    try {
      // Register cleanup handlers
      sckt.on('unsubscribeToAuditReportGenerationJob', handleUnsubscribtion);
      sckt.on('disconnect', handleDisconnection);
      // Try to get the job if jobId is provided
      console.log("jobId", jobId)

      if (jobId) {
      const job = await auditReportGenerationQueue.getJob(jobId);
          console.log("job")
          if (job) {
              // Initial status check
              const state = await emitJobStatus(job);
              console.log("state", state)
              // Only set up polling if job is not in final state
              if (state && !['completed', 'failed', 'error'].includes(state)) {
                  // Poll for job updates every 2 seconds
                  pollInterval = setInterval(async () => {
                      if (!isSubscribed) {
                          clearInterval(pollInterval);
                          return;
                      }
                      const updatedJob = await auditReportGenerationQueue.getJob(jobId);
                      if (updatedJob) {
                          const newState = await emitJobStatus(updatedJob);
                          if (['completed', 'failed', 'error'].includes(newState)) {
                              clearInterval(pollInterval);
                          }
                      } else {
                          console.log(`[Websckt] Job ${jobId} no longer exists`);
                          clearInterval(pollInterval);
                          cleanupListeners();
                      }
                  }, 2000);
              }
          } else {
              throw new Error('No job found with the provided ID');
          }
      } 
    } catch (error) {
        console.error(`[Websocket] Error in job audit report generation job subscription for ${jobId}:`, error);
        sckt.emit('auditReportGenerationJobStatus', {
            state: 'error',
            progress: 0,
            error: error.message
        });
        cleanupListeners();
    }
  }
  
  
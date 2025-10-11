import { Server as SocketIOServer } from 'socket.io';
import { auditReportGenerationWebscktUtils, monitoringPicAnalysisWebscktUtils } from '../utils/websocketUtils.js';

var wss;

function createWebSocket(server) {
  wss = new SocketIOServer(server);
  wss.on("connect", (sckt) => {
    console.log("New Socket Connected...");
    
    sckt.on("disconnect", () => {
      console.log("disconnected from user...");
    });

    sckt.on("subscribe", (room) => {
      sckt.join(room);
      console.log(`frontend with ${sckt.id} joined room: ${room}`);
    });
    
    sckt.on("unsubscribe", (room) => {
      sckt.leave(room);
      console.log(`frontend with ${sckt.id} left room: ${room}`);
    });

    sckt.on("error", (error) => {
      console.log(`frontend with ${sckt.id} error: ${error}`);
    });

    // monitoring picture analysis
    sckt.on("subscribeToMonitoringPicAnalysisJob", async (processedJob) => {
        let isSubscribed = true;
        let pollInterval;
        console.log("monitoring job", processedJob)
        const handleDisconnection = () => {
            isSubscribed = false;
            clearInterval(pollInterval);
        };

        const handleUnsubscribtion = () => {
          console.log(`[WebSocket] UnsubscribeToMonitoringPicAnalysisJob from job ${processedJob.id}`);
          cleanupListeners();
          sckt.emit('monitoringPicAnalysisJobStatus', {
              state: 'unsubscribed',
              progress: 0
          });
        };

        const cleanupListeners = () => {
          isSubscribed = false;
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          console.log(`[WebSocket] monitoring picture analysis clean up listeners for job ${processedJob.jobId}`);

          sckt.off("disconnect", handleDisconnection);
          sckt.off("unsubscribeToMonitoringPicAnalysisJob", handleUnsubscribtion);
        };

        if (!processedJob) {
          return null
        }
        try {
          await monitoringPicAnalysisWebscktUtils(processedJob, sckt, cleanupListeners, isSubscribed, pollInterval, handleDisconnection, handleUnsubscribtion);
        } catch (error) {
          console.error('Error in subscribingToMonitoringPicAnalysisJob:', error);
          sckt.emit('monitoringPicAnalysisJobStatus', {
              state: 'error',
              error: 'Internal server error',
              progress: 0
          });
          cleanupListeners()
        }
    });

    // Audit report generation
    sckt.on("subscribeToAuditReportGenerationJob", async (processedJob) => {
      let isSubscribed = true;
      let pollInterval;
      console.log("audit job", processedJob);
      const handleDisconnection = () => {
        console.log("handledDisconnection..")
          isSubscribed = false;
          clearInterval(pollInterval);
      };

      const handleUnsubscribtion = () => {
        console.log(`[WebSocket] UnsubscribeToAuditReportGenerationJob from job ${processedJob.id}`);
        cleanupListeners();
        sckt.emit('auditReportGenerationJobStatus', {
            state: 'unsubscribed',
            progress: 0
        });
      };

      const cleanupListeners = () => {
        isSubscribed = false;
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        sckt.off("disconnect", handleDisconnection);
        sckt.off("unsubscribeToAuditReportGenerationJob", handleUnsubscribtion);
      };

      if (!processedJob) {
        return null
      }
      try {
        await auditReportGenerationWebscktUtils(processedJob, sckt, cleanupListeners, isSubscribed, pollInterval, handleDisconnection, handleUnsubscribtion);
      } catch (error) {
        console.error('Error in subscribingToAuditReportGenerationJob:', error);
        sckt.emit('auditReportGenerationJobStatus', {
            state: 'error',
            error: 'Internal server error',
            progress: 0
        });
        cleanupListeners()
      }
    });
  })
}

export { createWebSocket };

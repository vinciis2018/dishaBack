import axios from 'axios';
import Campaign from '../models/campaignModel.js';
import ErrorResponse from '../utils/errorResponse.js';
import { auditReportGenerationQueue, monitoringPicAnalysisQueue } from '../utils/queueUtils.js';
import { getLogsByDate, getMonitoringPicturesData, getSlotDeliveryData, groupLogsByHour } from '../helpers/analyticsHelper.js';
import Audit from '../models/auditModel.js';
import { calculateOohditScore } from '../utils/oohditScoreUtils.js';

const pythonServer = process.env.PYTHON_SERVER || "https://beta.vinciis.in";


// @desc    Analyze monitoring pictures
// @route   POST /api/v1/analytics/monitoringPicAnalysis/:id/:siteId
// @access  Private
export const monitoringPicAnalysis = async (req, res, next) => {
  try {
    const { id, site_id: siteId } = req.query;
    console.log(id, siteId);
    // Find the campaign and site
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return next(new ErrorResponse('Campaign not found', 404));
    }
    console.log("campaign", campaign.sites)

    const site = campaign.sites.find(site => site.siteId.toString() === siteId);
    if (!site) {
      return next(new ErrorResponse('Site not found in this campaign', 404));
    }
    console.log("site", site);
    // Check if there are any monitoring data files
    if (!site.monitoringData || site.monitoringData.length === 0) {
      return next(new ErrorResponse('No monitoring data found for this site', 404));
    }

    const jobPayload = {
      id, siteId,
      timestamp: Date.now()
    };

    const activeJobs = await monitoringPicAnalysisQueue.getActive();

    const sameJob = activeJobs.find((job) => {
      return job.data.id === jobPayload.id && job.data.siteId === jobPayload.siteId;
    })

    let monitoringPicAnalysisJob
    if (sameJob) {
      monitoringPicAnalysisJob= sameJob
    } else {
      monitoringPicAnalysisJob = await monitoringPicAnalysisQueue.add(
        `monitoring-pic-analysis-queue`,
        jobPayload,
        {
          removeOnComplete: false,
          removeOnFail: true,
          // removeOnComplete: 5 * 60, // Keep completed jobs for 5 minutes
          // removeOnFail: 5 * 60,    // Keep failed jobs for 5 minutes
          // attempts: 3,            // Number of attempts to run the job
          // backoff: {
          //   type: 'exponential',  // Back off exponentially
          //   delay: 1000          // Start with 1 second delay
          // }
        }
      );
    }

    var monitoringPicAnalysisJobProcessed = await monitoringPicAnalysisQueue.getJob(monitoringPicAnalysisJob.id);
    monitoringPicAnalysisJobProcessed = {
      ...monitoringPicAnalysisJob,
      data: {
        ...monitoringPicAnalysisJob.data,
        jobId: monitoringPicAnalysisJob.id
      }
    };
    console.log("monitoringPicAnalysisJobProcessed", monitoringPicAnalysisJobProcessed.data)

    res.status(200).json({
      ...monitoringPicAnalysisJobProcessed.data
    });
    
  } catch (err) {
    console.error('Error in monitoring pic analysis controller:', err);
    next(err);
  }
};



export const generateAuditReport = async (req, res, next) => {
  try {
    const { id } = req.query;
    const campaign = await Campaign.findById(id);
    let audit = await Audit.findOne({campaignId: id})

    console.log("audit", audit?._id)
    if (!audit) {
      audit = new Audit({
        campaignId: id,
        name: campaign.name,
        duration: campaign.duration,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        cost: campaign.cost,
        sites: []
      });
      await audit.save();
    }
    const sites = campaign.sites.filter(site => site.excelFiles.length > 0);

    for (const site of sites) {
    
      const excelUrl = `${pythonServer}/api/v1/exceldata/analyse-excel-data?id=${id}&site_id=${site.siteId}`;
      const excelResponse = await axios({
          method: 'post',
          url: excelUrl, // replace with your route
          data: { id: id, site_id: site.siteId }, // pass payload if needed
      });
  
      const allLogs = excelResponse.data.excel_data.sheets;
      const logsByDate = getLogsByDate(allLogs);
  
      const logs = {}
      const hourlyLogs = {}
      for (const datedLogs of logsByDate) {
        logs[datedLogs.sheetName] = datedLogs.logs.length;
        const hourlyDatedLogs = groupLogsByHour(datedLogs.logs);
        console.log(hourlyDatedLogs)
        Object.keys(hourlyDatedLogs)?.forEach((hour) => {
          if (!hourlyLogs[datedLogs.sheetName]) {
            hourlyLogs[datedLogs.sheetName] = {};
          }
          hourlyLogs[datedLogs.sheetName][hour] = hourlyDatedLogs[hour].length;
        })
      }
  
      const matched = [];
      const unmatched = [];
      const source = {}
      for (const monitoringData of site.monitoringData) {
        getMonitoringPicturesData(monitoringData.monitoringMedia, matched, unmatched, source, logsByDate);
      }
  
      const slotDeliveryData = getSlotDeliveryData(excelResponse.data.excel_data.sheets, site, campaign, logsByDate);
  
      const siteOohditScore = calculateOohditScore(
        slotDeliveryData?.totalSlotsDelivered || 0,
        slotDeliveryData?.totalSlotsPromised || 0,
        slotDeliveryData?.avgLoopTimeDelivered || 0,
        site?.campaignLoopTime || 0,
        matched.length + unmatched.length || 0,
        matched.length || 0
      );
      const auditReportDataForSite = {
        siteId: site.siteId,
        siteName: site.siteName,
        vendorName: site.vendorName,
        siteOohditScore: Math.abs(siteOohditScore.oohditScore),
        siteOohditPerformance: Math.abs(siteOohditScore.adjPerf),
        avgLoopTimeDelivered: slotDeliveryData?.avgLoopTimeDelivered || 0,
        avgLoopTimePromised: site?.campaignLoopTime || 0,
        totalSlotsDelivered: slotDeliveryData?.totalSlotsDelivered || 0,
        totalSlotsPromised: slotDeliveryData?.totalSlotsPromised || 0,
        dailySlotDelivery: logs,
        dailyHourlySlotDelivery: hourlyLogs,
        monitoringPicturesMatched: matched || 0,
        monitoringPicturesNotMatched: unmatched || 0,
        monitoringPicturesBySource: source || 0,
      }

      const siteIndex = audit.sites.findIndex((s) => s.siteId.toString() === site.siteId.toString());
      if (siteIndex < 0) {
        audit.sites.push(auditReportDataForSite);
        await audit.save();
      } else {
        const updateSite = audit.sites.filter((_, i) => i !== siteIndex);
        updateSite.push(auditReportDataForSite);
        audit.sites = updateSite;
        await audit.save();
      }
    }
    
    campaign.auditDate = new Date().toISOString();
    await campaign.save();

    console.log(id, "campaign id")
    const jobPayload = {
      campaignId: id,
      timestamp: Date.now()
    };

    const activeJobs = await auditReportGenerationQueue.getActive();

    const sameJob = activeJobs.find((job) => {
      return job.data.campaignId === jobPayload.campaignId;
    })

    let auditReportGenerationJob;
    if (sameJob) {
      auditReportGenerationJob= sameJob
    } else {
      auditReportGenerationJob = await auditReportGenerationQueue.add(
        `audit-report-generation-queue`,
        jobPayload,
        {
          removeOnComplete: false,
          removeOnFail: true,
          // removeOnComplete: 5 * 60, // Keep completed jobs for 5 minutes
          // removeOnFail: 5 * 60,    // Keep failed jobs for 5 minutes
          // attempts: 3,            // Number of attempts to run the job
          // backoff: {
          //   type: 'exponential',  // Back off exponentially
          //   delay: 1000          // Start with 1 second delay
          // }
        }
      );
    }

    var auditReportGenerationJobProcessed = await auditReportGenerationQueue.getJob(auditReportGenerationJob.id);
    
    auditReportGenerationJobProcessed = {
      ...auditReportGenerationJobProcessed,
      data: {
        jobId: auditReportGenerationJob.id,
        ...auditReportGenerationJobProcessed.data
      }
    };

    res.status(200).json({
      ...auditReportGenerationJobProcessed.data
    });

  } catch (error) {
    next(error)
  }
}


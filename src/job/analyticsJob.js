import axios from "axios";
import { wait } from "../utils/helperUtils.js";
import dotenv from 'dotenv';

dotenv.config();

// const pythonServer = process.env.PYTHON_SERVER || "http://127.0.0.1:8000";
const pythonServer = process.env.PYTHON_SERVER || "https://beta.vinciis.in";

// used in default campaign creation
export const landingDataAnalysisJob = async (req) => {
    // const result = await axios.post(`${pythonServer}/api/v1/metadata/analyse-monitoring-data?id=${job.data.id}&site_id=${job.data.siteId}`, { id: job.data.id, site_id: job.data.siteId });
    const url1 = `${pythonServer}/api/v1/exceldata/analyse-excel-data?id=${req.query.id}&site_id=${req.query.site_id}`;
    const url2 = `${pythonServer}/api/v1/metadata/direct-analyse-monitoring-data?id=${req.query.id}&site_id=${req.query.site_id}`;
    try {
        // Request stream from your Express route
        const response1 = await axios({
            method: 'post',
            url: url1, // replace with your route
            data: { id: req.query.id, site_id: req.query.site_id }, // pass payload if needed
        });
        const response2 = await axios({
            method: 'post',
            url: url2, // replace with your route
            data: { id: req.query.id, site_id: req.query.site_id }, // pass payload if needed
        });
        return {
            monitoringAnalysisData: response2.data.monitoring_data,
            excelAnalysisData: response1.data.excel_data
        }
    } catch (err) {
        console.error('❌ Axios request failed:', err.message);
        throw err;
    }
}



export const monitoringPicAnalysisJob = async (job) => {
    await job.updateProgress(15);
    // const result = await axios.post(`${pythonServer}/api/v1/metadata/analyse-monitoring-data?id=${job.data.id}&site_id=${job.data.siteId}`, { id: job.data.id, site_id: job.data.siteId });
    const url = `${pythonServer}/api/v1/metadata/analyse-monitoring-data?id=${job.data.id}&site_id=${job.data.siteId}`;
    var chunkedResult = [];
    try {
        // Request stream from your Express route
        const response = await axios({
            method: 'post',
            url: url, // replace with your route
            data: { id: job.data.id, site_id: job.data.siteId }, // pass payload if needed
            responseType: 'stream',  // important: get response as stream
        });
        await job.updateProgress(25);

        return new Promise((resolve, reject) => {
            let buffer = '';
            job.updateProgress(50).then(() => {});

            response.data.on('data', chunk => {
                buffer += chunk.toString();
        
                // Split by newline (assuming server sends NDJSON-style or `\n` after each JSON object)
                let parts = buffer.split('\n');
        
                // Keep the last partial chunk in buffer
                buffer = parts.pop();
        
                for (const part of parts) {
                    if (!part.trim()) continue;
                    try {
                        const parsed = JSON.parse(part);
                        if (parsed.data) {
                            chunkedResult.push(parsed.data);
                        }
                        // console.log("✅ Parsed part:", parsed);
                    } catch (err) {
                        console.error("❌ Failed to parse part:", part, err.message);
                    }
                }
                // resolve({data: {
                //     "monitoring_data" : chunkedResult
                // }});
            });
        
            response.data.on('end', () => {
                console.log('✅ Stream finished');
                job.updateProgress(95).then(() => {});
                resolve({data: {
                    "monitoring_data" : chunkedResult
                }});
            });
        
            response.data.on('error', err => {
                console.error('❌ Stream error:', err);
                reject(err);
            });
        });
    } catch (err) {
        console.error('❌ Axios stream request failed:', err.message);
        throw err;
    }
}



export const auditReportGenerationJob = async (job) => {
    await job.updateProgress(15);
    // const result = await axios.post(`${pythonServer}/api/v1/metadata/analyse-monitoring-data?id=${job.data.id}&site_id=${job.data.siteId}`, { id: job.data.id, site_id: job.data.siteId });
    const url = `${pythonServer}/api/v1/analytics/generate-audit-report-pdf?id=${job.data.campaignId}&site_id=${job.data.siteId}`;
    var chunkedResult = [];
    
    try {
        // Request stream from your Express route
        const response = await axios({
            method: 'post',
            url: url, // replace with your route
            data: {
                id: job.data.id,
                site_id: job.data.siteId,
                campaign: job.data.campaign,
                site: job.data.site,
                audit_report_data: job.data.audit_report_data,
                timestamp: job.data.timestamp
            }, // pass payload if needed
            responseType: 'stream',  
        });
        await job.updateProgress(25);

        return new Promise((resolve, reject) => {
            let buffer = '';
            job.updateProgress(50).then(() => {});

            response.data.on('data', chunk => {
                buffer += chunk.toString();
                chunkedResult.push(chunk);
            });
        
            response.data.on('end', () => {
                console.log('✅ Stream finished');
                job.updateProgress(95).then(() => {});
                resolve({data: {
                    "audit_report" : chunkedResult
                }});
            });
        
            response.data.on('error', err => {
                console.error('❌ Stream error:', err);
                reject(err);
            });
        });
    //     wait(2);
    // await job.updateProgress(25);
    // wait(2);
        
        // return {data: {"message": "Hello there"}}
    } catch (err) {
        console.error('❌ Axios stream request failed:', err.message);
        throw err;
    }
}
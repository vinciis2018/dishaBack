export function isLogMatchingMonitoringData(log, monitoringData = []) {
  if (!log['Log Time'] || !monitoringData?.length) return false;
  const logTime = new Date(log['Log Time']);
  if (isNaN(logTime.getTime())) return false;
  const logDate = logTime.toISOString().split('T')[0];
  const logHour = logTime.getHours().toString().padStart(2, '0');
  const logMinute = logTime.getMinutes().toString().padStart(2, '0');
  return monitoringData.some(monitor => {
    const monitorDate = monitor.extractedDate;
    const monitorHour = monitor.extractedTime?.split(":")[0];
    const monitorMinute = monitor.extractedTime?.split(":")[1];
    return logDate === monitorDate && logHour === monitorHour && logMinute === monitorMinute;
  });
};



export function toLogEntry(headers, row) {
  const entry = {};
  // Handle array rows
  if (Array.isArray(row)) {
    headers.forEach((header, index) => {
      const value = row[index];
      entry[header] = value?.toString() || '';
    });
  } 
  // Handle object rows
  else if (row && typeof row === 'object') {
    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = normalizeFieldName(key);
      entry[normalizedKey] = value?.toString() || '';
    });
  }

  // Parse and normalize dates
  const parseDate = (dateStr) => {
    if (!dateStr) return '';
    
    // Try parsing with Date object
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Format as YYYY-MM-DD HH:mm:ss
      const pad = (n) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    
    // Try common date formats
    const formats = [
      // YYYY-MM-DD HH:MM:SS
      /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})$/,
      // MM/DD/YYYY, HH:MM:SS AM/PM
      /^(\d{1,2})\/(\d{1,2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/i,
      // DD-MM-YYYY HH:MM:SS
      /^(\d{1,2})-(\d{1,2})-(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/,
    ];
    
    for (const regex of formats) {
      const match = dateStr.match(regex);
      if (match) {
        let year, month, day, hours, minutes, seconds;
        
        if (match[3].length === 4) {
          // YYYY-MM-DD or MM/DD/YYYY format
          year = parseInt(match[3], 10);
          month = parseInt(match[1], 10) - 1;
          day = parseInt(match[2], 10);
        } else {
          // DD-MM-YYYY format
          year = parseInt(match[3], 10);
          month = parseInt(match[2], 10) - 1;
          day = parseInt(match[1], 10);
        }
        
        // Handle time
        if (match[4]) {
          hours = parseInt(match[4], 10);
          minutes = parseInt(match[5], 10);
          seconds = match[6] ? parseInt(match[6], 10) : 0;
          
          // Handle 12-hour format
          if (match[7] && match[7].toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
          } else if (match[7] && match[7].toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }
        
        const parsedDate = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0);
        if (!isNaN(parsedDate.getTime())) {
          const pad = (n) => n.toString().padStart(2, '0');
          return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())} ${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}:${pad(parsedDate.getSeconds())}`;
        }
      }
    }
    
    return dateStr; // Return original if parsing fails
  };
  return entry;
};


export function groupLogsByHour(logs) {
  const grouped = {};

  if (!Array.isArray(logs) || logs.length === 0) {
    return grouped;
  }

  logs.forEach((log) => {
    if (!log['Log Time']) return;
    
    const logTime = new Date(log['Log Time']);
    if (isNaN(logTime.getTime())) return;
    
    const hour = logTime.getHours();
    const hourKey = `${hour.toString().padStart(2, '0')}:00`;
    
    if (!grouped[hourKey]) {
      grouped[hourKey] = [];
    }
    
    grouped[hourKey].push(log);
  });

  return grouped;
};



export function getLogsByDate(excelData) {

  if (!Array.isArray(excelData) || excelData.length === 0) {
    console.error('No excelData or empty array provided');
    return [];
  }
  return excelData
    .filter(sheet => {
      const isValid = sheet && 
                      sheet.sheetName && 
                      Array.isArray(sheet.rows) && 
                      Array.isArray(sheet.headers);
      if (!isValid) {
        console.warn('Invalid sheet data:', sheet);
      }
      return isValid;
    })
    .map(sheet => {
      try {
        // Convert sheet name (YYYY-MM-DD) to Date object
        const date = new Date(sheet.sheetName);
        // Process rows - they might be arrays or objects
        const logs = (sheet.rows || []).map(row => {
          // If row is already an object with the correct structure, use it directly
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            return row;
          }
          // If row is an array, convert it using toLogEntry
          if (Array.isArray(row)) {
            return toLogEntry(sheet.headers, row);
          }
          // Skip invalid rows
          console.warn('Skipping invalid row:', row);
          return null;
        }).filter((log) => log !== null);
        
        // Filter out 'Device Time' from headers and create a new array
        const filteredHeaders = (sheet.headers || []).filter(header => 
          header.toLowerCase() !== 'device time' && header.toLowerCase() !== 'devicetime'
        );

        return {
          sheetName: sheet.sheetName,
          date,
          logs,
          headers: filteredHeaders
        };
      } catch (error) {
        console.error('Error processing sheet:', sheet.sheetName, error);
        return null;
      }
    })
    .filter((sheet) => sheet !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date
};


export function getMonitoringPicturesData(monitoringAnalytics, matched, unmatched, source, logsByDate) {
    try {
      monitoringAnalytics.forEach(analytic => {
        const sameDateLogs = logsByDate.find((log) => {
          return new Date(log.sheetName).toDateString() === new Date(analytic.extractedDate).toDateString();
        });

        if (sameDateLogs) {

          const hourWiseLogs = groupLogsByHour(sameDateLogs.logs);
          const hourKey = `${analytic.extractedTime?.split(':')[0]}:00`;
          const logsInSameHour = hourWiseLogs[hourKey] || [];
          
          const hasMatchingLog = logsInSameHour.some(log => 
            isLogMatchingMonitoringData(log, [analytic])
          );

          if (hasMatchingLog) {
            matched.push(analytic);
          } else {
            unmatched.push(analytic);
          }
        } else {
          unmatched.push(analytic);
        }

        const sourceType = analytic.source;
        source[sourceType] = source[sourceType] || [];
        source[sourceType].push(analytic);

      });

      return {
        matched: matched.sort((a, b) => {
          const dateA = new Date(a.extracted_date).getTime();
          const dateB = new Date(b.extracted_date).getTime();
          
          // First sort by date
          if (dateA !== dateB) {
              return dateA - dateB;
          }
          
          // If dates are equal, sort by time
          const timeA = new Date(`1970-01-01T${a.extracted_time}`).getTime();
          const timeB = new Date(`1970-01-01T${b.extracted_time}`).getTime();
          return timeA - timeB;
        }),

        unmatched: unmatched.sort((a, b) => {
          const dateA = new Date(a.extracted_date).getTime();
          const dateB = new Date(b.extracted_date).getTime();
          
          // First sort by date
          if (dateA !== dateB) {
              return dateA - dateB;
          }
          
          // If dates are equal, sort by time
          const timeA = new Date(`1970-01-01T${a.extracted_time}`).getTime();
          const timeB = new Date(`1970-01-01T${b.extracted_time}`).getTime();
          return timeA - timeB;
        }),
        source: source
      };
    } catch (error) {
      console.error(error);
      return error;
    }
}

export function getSlotDeliveryData(excelData, site, campaign, logsByDate) {
    try {
      const totalLogs = (!excelData || excelData.length === 0)? 0 : excelData.reduce((sum, sheet) => sum + (sheet.rows?.length || 0), 0);

      let totalSlotsPromised = 0;
      if (site && site?.siteOperationalData?.duration && campaign) {
        const campaignDays = campaign?.duration || 0;
        const operationalSeconds = site.siteOperationalData.duration * 60 * 60;
        const campaignLoopTime = site.campaignLoopTime || 180;
        const siteLoopTime = site.siteLoopTime || 180;
        const slotsPerLoop = siteLoopTime / campaignLoopTime;
        totalSlotsPromised = ((operationalSeconds / siteLoopTime) * slotsPerLoop) * campaignDays;
      }

      let avgLogDiffSec = 0;

      if (excelData && excelData.length > 0) {
        try {
          const times = [];
          logsByDate.forEach(day => {
            day.logs.forEach(log => {
              const t = log['Log Time'] ? new Date(log['Log Time']) : null;
              if (t && !isNaN(t.getTime())) times.push(t);
            });
          });
          if (times.length >= 2) {
            times.sort((a, b) => a.getTime() - b.getTime());
            let sum = 0;
            for (let i = 1; i < times.length; i++) {
              sum += (times[i].getTime() - times[i - 1].getTime()) / 1000; // seconds
            }
            avgLogDiffSec = Math.round((sum / (times.length - 1)) * 10) / 10; // 1 decimal
          }
        } catch {
          avgLogDiffSec = 0;
        }
      }
      return {
        totalSlotsPromised,
        totalSlotsDelivered: totalLogs,
        avgLoopTimeDelivered: avgLogDiffSec,
      }
    } catch (error) {
      console.error(error);
      return error;
    }
}
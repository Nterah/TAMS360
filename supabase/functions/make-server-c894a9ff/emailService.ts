/**
 * TAMS360 Email Notification Service
 * Sends email notifications for inspections, maintenance, and system events
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface InspectionAlertData {
  assetRef: string;
  assetType: string;
  inspectionDate: string;
  ci: number;
  urgency: string;
  inspectorName: string;
  organizationName: string;
  dashboardUrl: string;
}

interface MaintenanceAlertData {
  assetRef: string;
  assetType: string;
  maintenanceType: string;
  scheduledDate: string;
  priority: string;
  status: string;
  organizationName: string;
  dashboardUrl: string;
}

interface MaintenanceDueData {
  records: Array<{
    assetRef: string;
    assetType: string;
    maintenanceType: string;
    scheduledDate: string;
    priority: string;
    daysUntilDue: number;
  }>;
  organizationName: string;
  dashboardUrl: string;
}

/**
 * Send email using Resend API
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.warn("[Email Service] RESEND_API_KEY not configured - Email notifications disabled");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: options.from || "TAMS360 <notifications@tams360.co.za>",
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Email Service] Failed to send email:", errorData);
      return false;
    }

    const data = await response.json();
    console.log(`[Email Service] ✅ Email sent successfully: ${data.id}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Error sending email:", error);
    return false;
  }
}

/**
 * Generate HTML email template with branding
 */
function generateEmailTemplate(
  title: string,
  content: string,
  organizationName: string,
  primaryColor: string = "#010D13",
  accentColor: string = "#39AEDF"
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: ${primaryColor};
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .alert-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .alert-box.critical {
      background-color: #f8d7da;
      border-left-color: #dc3545;
    }
    .alert-box.success {
      background-color: #d4edda;
      border-left-color: #28a745;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: ${accentColor};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .data-table th,
    .data-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    .data-table th {
      background-color: #f8f9fa;
      font-weight: 600;
      color: ${primaryColor};
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-critical {
      background-color: #dc3545;
      color: white;
    }
    .badge-high {
      background-color: #fd7e14;
      color: white;
    }
    .badge-medium {
      background-color: #ffc107;
      color: #333;
    }
    .badge-low {
      background-color: #28a745;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${organizationName}</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Road & Traffic Asset Management</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>TAMS360</strong> - Road & Traffic Asset Management Suite</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
      <p style="margin-top: 10px;">
        <a href="https://tams360.co.za" style="color: ${accentColor};">Visit Website</a> |
        <a href="https://app.tams360.co.za" style="color: ${accentColor};">Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send inspection alert email (Critical CI or High Urgency)
 */
export async function sendInspectionAlert(
  to: string,
  data: InspectionAlertData
): Promise<boolean> {
  const isCritical = data.ci < 25 || data.urgency === "Critical";
  const alertClass = isCritical ? "critical" : "";
  
  const content = `
    <h2>🚨 Inspection Alert</h2>
    <p>A recent inspection has identified issues requiring attention:</p>
    
    <div class="alert-box ${alertClass}">
      <strong>${isCritical ? "⚠️ CRITICAL ALERT" : "⚠️ Attention Required"}</strong>
    </div>
    
    <table class="data-table">
      <tr>
        <th>Asset Reference</th>
        <td>${data.assetRef}</td>
      </tr>
      <tr>
        <th>Asset Type</th>
        <td>${data.assetType}</td>
      </tr>
      <tr>
        <th>Inspection Date</th>
        <td>${data.inspectionDate}</td>
      </tr>
      <tr>
        <th>Condition Index (CI)</th>
        <td><strong>${data.ci.toFixed(1)}</strong> ${data.ci < 25 ? '<span class="badge badge-critical">Poor</span>' : data.ci < 50 ? '<span class="badge badge-medium">Fair</span>' : '<span class="badge badge-low">Good</span>'}</td>
      </tr>
      <tr>
        <th>Urgency</th>
        <td><span class="badge badge-${data.urgency.toLowerCase()}">${data.urgency}</span></td>
      </tr>
      <tr>
        <th>Inspector</th>
        <td>${data.inspectorName}</td>
      </tr>
    </table>
    
    <p><strong>Recommended Action:</strong> ${isCritical ? "Immediate maintenance required." : "Schedule maintenance soon."}</p>
    
    <a href="${data.dashboardUrl}" class="button">View Inspection Details</a>
    
    <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
      This alert was automatically generated based on the inspection results.
    </p>
  `;

  return await sendEmail({
    to,
    subject: `${isCritical ? "🚨 CRITICAL" : "⚠️"} Inspection Alert - ${data.assetRef}`,
    html: generateEmailTemplate(
      "Inspection Alert",
      content,
      data.organizationName
    ),
  });
}

/**
 * Send maintenance due reminder email
 */
export async function sendMaintenanceDueReminder(
  to: string,
  data: MaintenanceDueData
): Promise<boolean> {
  const criticalCount = data.records.filter(r => r.daysUntilDue <= 0).length;
  const upcomingCount = data.records.filter(r => r.daysUntilDue > 0 && r.daysUntilDue <= 7).length;
  
  const recordsHtml = data.records.map(record => `
    <tr>
      <td>${record.assetRef}</td>
      <td>${record.assetType}</td>
      <td>${record.maintenanceType}</td>
      <td>${new Date(record.scheduledDate).toLocaleDateString('en-ZA')}</td>
      <td><span class="badge badge-${record.priority.toLowerCase()}">${record.priority}</span></td>
      <td><strong>${record.daysUntilDue <= 0 ? 'OVERDUE' : `${record.daysUntilDue} days`}</strong></td>
    </tr>
  `).join('');
  
  const content = `
    <h2>📅 Maintenance Due Reminder</h2>
    <p>You have <strong>${data.records.length}</strong> maintenance task${data.records.length !== 1 ? 's' : ''} requiring attention:</p>
    
    ${criticalCount > 0 ? `
      <div class="alert-box critical">
        <strong>⚠️ ${criticalCount} OVERDUE TASK${criticalCount !== 1 ? 'S' : ''}</strong>
      </div>
    ` : ''}
    
    ${upcomingCount > 0 ? `
      <div class="alert-box">
        <strong>🔔 ${upcomingCount} task${upcomingCount !== 1 ? 's' : ''} due within 7 days</strong>
      </div>
    ` : ''}
    
    <table class="data-table">
      <thead>
        <tr>
          <th>Asset</th>
          <th>Type</th>
          <th>Maintenance</th>
          <th>Scheduled</th>
          <th>Priority</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${recordsHtml}
      </tbody>
    </table>
    
    <a href="${data.dashboardUrl}" class="button">View Maintenance Schedule</a>
    
    <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
      You will receive these reminders daily until all overdue tasks are completed.
    </p>
  `;

  return await sendEmail({
    to,
    subject: `📅 Maintenance Due Reminder - ${criticalCount > 0 ? `${criticalCount} Overdue` : `${upcomingCount} Upcoming`}`,
    html: generateEmailTemplate(
      "Maintenance Reminder",
      content,
      data.organizationName
    ),
  });
}

/**
 * Send maintenance created notification
 */
export async function sendMaintenanceCreatedNotification(
  to: string,
  data: MaintenanceAlertData
): Promise<boolean> {
  const content = `
    <h2>✅ Maintenance Work Order Created</h2>
    <p>A new maintenance work order has been scheduled:</p>
    
    <table class="data-table">
      <tr>
        <th>Asset Reference</th>
        <td>${data.assetRef}</td>
      </tr>
      <tr>
        <th>Asset Type</th>
        <td>${data.assetType}</td>
      </tr>
      <tr>
        <th>Maintenance Type</th>
        <td>${data.maintenanceType}</td>
      </tr>
      <tr>
        <th>Scheduled Date</th>
        <td>${new Date(data.scheduledDate).toLocaleDateString('en-ZA')}</td>
      </tr>
      <tr>
        <th>Priority</th>
        <td><span class="badge badge-${data.priority.toLowerCase()}">${data.priority}</span></td>
      </tr>
      <tr>
        <th>Status</th>
        <td>${data.status}</td>
      </tr>
    </table>
    
    <a href="${data.dashboardUrl}" class="button">View Work Order</a>
    
    <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
      This work order was automatically generated from an inspection.
    </p>
  `;

  return await sendEmail({
    to,
    subject: `✅ New Maintenance Work Order - ${data.assetRef}`,
    html: generateEmailTemplate(
      "Maintenance Work Order",
      content,
      data.organizationName
    ),
  });
}

/**
 * Send daily maintenance digest
 */
export async function sendDailyMaintenanceDigest(
  to: string,
  organizationName: string,
  stats: {
    overdueCount: number;
    dueTodayCount: number;
    dueThisWeekCount: number;
    completedTodayCount: number;
  },
  dashboardUrl: string
): Promise<boolean> {
  const content = `
    <h2>📊 Daily Maintenance Digest</h2>
    <p>Here's your maintenance summary for today:</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0; font-size: 32px; color: #dc3545;">${stats.overdueCount}</h3>
        <p style="margin: 5px 0 0 0; color: #721c24;">Overdue</p>
      </div>
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0; font-size: 32px; color: #856404;">${stats.dueTodayCount}</h3>
        <p style="margin: 5px 0 0 0; color: #856404;">Due Today</p>
      </div>
      <div style="background: #cfe2ff; padding: 20px; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0; font-size: 32px; color: #084298;">${stats.dueThisWeekCount}</h3>
        <p style="margin: 5px 0 0 0; color: #084298;">Due This Week</p>
      </div>
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0; font-size: 32px; color: #155724;">${stats.completedTodayCount}</h3>
        <p style="margin: 5px 0 0 0; color: #155724;">Completed Today</p>
      </div>
    </div>
    
    ${stats.overdueCount > 0 ? `
      <div class="alert-box critical">
        <strong>⚠️ Action Required:</strong> You have ${stats.overdueCount} overdue maintenance task${stats.overdueCount !== 1 ? 's' : ''}.
      </div>
    ` : ''}
    
    <a href="${dashboardUrl}" class="button">View Full Dashboard</a>
    
    <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
      You're receiving this digest daily. Manage your email preferences in the dashboard settings.
    </p>
  `;

  return await sendEmail({
    to,
    subject: `📊 Daily Maintenance Digest - ${organizationName}`,
    html: generateEmailTemplate(
      "Daily Digest",
      content,
      organizationName
    ),
  });
}

export { sendEmail, generateEmailTemplate };

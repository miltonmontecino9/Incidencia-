import {
  Incident,
  IncidentCategory,
  IncidentSector,
  IncidentStatus,
  OrganizationOption,
  UrgencyLevel,
  ProgressComment,
  AuditLogEntry,
} from '../types/incident';

export interface SheetMetadata {
  id: string;
  name: string;
  url: string;
  sheetTitle: string;
}

const DEFAULT_SHEET_TITLE = 'Incidencias';
const SPREADSHEET_NAME = 'Museo Patagónico - Registro de Incidencias';

export const SHEET_HEADERS = [
  'Incident_ID',
  'Timestamp',
  'Reporter_Name',
  'Reporter_Email',
  'Organization',
  'Category',
  'Urgency',
  'Sector',
  'Exact_Location',
  'Description',
  'Evidence_Photo',
  'Status',
  'Assigned_To',
  'Resolution_Notes',
  'Progress_Comments',
  'Audit_Log',
];

/**
 * Format category for sheet storage (e.g. if 'Otra', includes the custom name)
 */
function formatCategoryForSheet(incident: Incident): string {
  if (incident.category === 'Otra' && incident.customCategory?.trim()) {
    return `Otra: ${incident.customCategory.trim()}`;
  }
  return incident.category;
}

/**
 * Parse category stored in sheet back to category + customCategory
 */
function parseCategoryFromSheet(stored: string): { category: IncidentCategory; customCategory?: string } {
  if (!stored) return { category: 'Técnica / Audiovisual' };
  if (stored.startsWith('Otra:') || stored.startsWith('Otra (')) {
    const custom = stored.replace(/^Otra[:(]\s*/i, '').replace(/\)$/, '').trim();
    return { category: 'Otra', customCategory: custom };
  }
  return { category: stored as IncidentCategory };
}

/**
 * Format sector for sheet storage (e.g. if 'Otro / Especificar', includes custom name)
 */
function formatSectorForSheet(incident: Incident): string {
  if (incident.sector === 'Otro / Especificar' && incident.customSector?.trim()) {
    return `Otro: ${incident.customSector.trim()}`;
  }
  return incident.sector;
}

/**
 * Parse sector stored in sheet back to sector + customSector
 */
function parseSectorFromSheet(stored: string): { sector: IncidentSector; customSector?: string } {
  if (!stored) return { sector: 'Auditorio Principal' };
  if (stored.startsWith('Otro:') || stored.startsWith('Otro /') || stored.startsWith('Otro (')) {
    const custom = stored.replace(/^Otro[:/(\s]+(Especificar[:\s]*)?/i, '').replace(/\)$/, '').trim();
    return { sector: 'Otro / Especificar', customSector: custom || undefined };
  }
  return { sector: (stored as IncidentSector) || 'Auditorio Principal' };
}

/**
 * Find existing incident spreadsheet or create a new one in user's Google Drive
 */
export async function findOrCreateSpreadsheet(accessToken: string): Promise<SheetMetadata> {
  // 1. Search existing spreadsheet in Drive
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name%20%3D%20'${encodeURIComponent(
      SPREADSHEET_NAME
    )}'%20and%20mimeType%20%3D%20'application/vnd.google-apps.spreadsheet'%20and%20trashed%20%3D%20false&fields=files(id,name,webViewLink)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        // Fetch spreadsheet metadata to get exact tab name
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${file.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        let tabTitle = DEFAULT_SHEET_TITLE;
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const firstSheet = metaData.sheets?.[0]?.properties?.title;
          if (firstSheet) tabTitle = firstSheet;
        }

        return {
          id: file.id,
          name: file.name,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          sheetTitle: tabTitle,
        };
      }
    }
  } catch (err) {
    console.warn('No se pudo buscar archivo en Drive, procediendo a crearlo:', err);
  }

  // 2. Create new spreadsheet with styled headers
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_NAME,
      },
      sheets: [
        {
          properties: {
            title: DEFAULT_SHEET_TITLE,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: SHEET_HEADERS.map((h) => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: {
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                      backgroundColor: { red: 0.12, green: 0.22, blue: 0.32 },
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Error al crear la planilla de Google Sheets: ${errorText}`);
  }

  const createdData = await createRes.json();
  return {
    id: createdData.spreadsheetId,
    name: createdData.properties.title,
    url: createdData.spreadsheetUrl,
    sheetTitle: DEFAULT_SHEET_TITLE,
  };
}

/**
 * Fetch all incidents from the spreadsheet
 */
export async function fetchIncidentsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  tabTitle = DEFAULT_SHEET_TITLE
): Promise<Incident[]> {
  const range = `${encodeURIComponent(tabTitle)}!A2:P`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al leer incidencias de la planilla: ${errorText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows.map((row, index) => {
    const { category, customCategory } = parseCategoryFromSheet((row[5] || '').toString());
    const { sector, customSector } = parseSectorFromSheet((row[7] || '').toString());

    let progressComments: ProgressComment[] = [];
    if (row[14]) {
      try {
        progressComments = JSON.parse(row[14].toString());
      } catch {
        progressComments = [
          {
            id: `c_${index}`,
            timestamp: (row[1] || '').toString(),
            author: 'Coordinación',
            text: row[14].toString(),
          },
        ];
      }
    }

    let auditLog: AuditLogEntry[] = [];
    if (row[15]) {
      try {
        auditLog = JSON.parse(row[15].toString());
      } catch {
        auditLog = [];
      }
    }

    return {
      incidentId: (row[0] || `INC-${String(index + 1).padStart(3, '0')}`).toString(),
      timestamp: (row[1] || '').toString(),
      reporterName: (row[2] || '').toString(),
      reporterEmail: (row[3] || '').toString(),
      organization: (row[4] || 'Museo Patagónico') as OrganizationOption,
      category,
      customCategory,
      urgency: (row[6] || 'Media') as UrgencyLevel,
      sector,
      customSector,
      exactLocation: (row[8] || '').toString(),
      description: (row[9] || '').toString(),
      evidencePhoto: (row[10] || '').toString(),
      status: (row[11] || 'Pendiente') as IncidentStatus,
      assignedTo: (row[12] || '').toString(),
      resolutionNotes: (row[13] || '').toString(),
      progressComments,
      auditLog,
      rowIndex: index + 2,
    };
  });
}

/**
 * Append newly submitted incident to the spreadsheet
 */
export async function appendIncidentToSheet(
  accessToken: string,
  spreadsheetId: string,
  incident: Incident,
  tabTitle = DEFAULT_SHEET_TITLE
): Promise<{ rowIndex: number }> {
  const range = `${encodeURIComponent(tabTitle)}!A:P`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const categoryFormatted = formatCategoryForSheet(incident);
  const sectorFormatted = formatSectorForSheet(incident);
  const commentsSerialized = incident.progressComments ? JSON.stringify(incident.progressComments) : '';
  const auditSerialized = incident.auditLog ? JSON.stringify(incident.auditLog) : '';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [
        [
          incident.incidentId,
          incident.timestamp,
          incident.reporterName,
          incident.reporterEmail,
          incident.organization,
          categoryFormatted,
          incident.urgency,
          sectorFormatted,
          incident.exactLocation,
          incident.description,
          incident.evidencePhoto || '',
          incident.status,
          incident.assignedTo || '',
          incident.resolutionNotes || '',
          commentsSerialized,
          auditSerialized,
        ],
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al registrar fila en Google Sheets: ${errorText}`);
  }

  const result = await res.json();
  const updatedRange = result.updates?.updatedRange || '';
  const match = updatedRange.match(/([0-9]+)$/);
  const rowIndex = match ? parseInt(match[1], 10) : 2;

  return { rowIndex };
}

/**
 * Update an existing incident row in Google Sheets
 */
export async function updateIncidentInSheet(
  accessToken: string,
  spreadsheetId: string,
  rowIndex: number,
  incident: Incident,
  tabTitle = DEFAULT_SHEET_TITLE
): Promise<void> {
  const range = `${encodeURIComponent(tabTitle)}!A${rowIndex}:P${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const categoryFormatted = formatCategoryForSheet(incident);
  const sectorFormatted = formatSectorForSheet(incident);
  const commentsSerialized = incident.progressComments ? JSON.stringify(incident.progressComments) : '';
  const auditSerialized = incident.auditLog ? JSON.stringify(incident.auditLog) : '';

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [
        [
          incident.incidentId,
          incident.timestamp,
          incident.reporterName,
          incident.reporterEmail,
          incident.organization,
          categoryFormatted,
          incident.urgency,
          sectorFormatted,
          incident.exactLocation,
          incident.description,
          incident.evidencePhoto || '',
          incident.status,
          incident.assignedTo || '',
          incident.resolutionNotes || '',
          commentsSerialized,
          auditSerialized,
        ],
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al actualizar la incidencia en Google Sheets: ${errorText}`);
  }
}

/**
 * Seed initial incidents if the sheet is empty
 */
export async function seedInitialIncidents(
  accessToken: string,
  spreadsheetId: string,
  incidents: Incident[],
  tabTitle = DEFAULT_SHEET_TITLE
): Promise<void> {
  const range = `${encodeURIComponent(tabTitle)}!A2:P`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const rows = incidents.map((inc) => [
    inc.incidentId,
    inc.timestamp,
    inc.reporterName,
    inc.reporterEmail,
    inc.organization,
    formatCategoryForSheet(inc),
    inc.urgency,
    formatSectorForSheet(inc),
    inc.exactLocation,
    inc.description,
    inc.evidencePhoto || '',
    inc.status,
    inc.assignedTo || '',
    inc.resolutionNotes || '',
    inc.progressComments ? JSON.stringify(inc.progressComments) : '',
    inc.auditLog ? JSON.stringify(inc.auditLog) : '',
  ]);

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    console.warn('Aviso: no se pudieron sembrar filas iniciales en Google Sheets:', await res.text());
  }
}

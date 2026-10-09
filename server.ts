import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware de CORS manual (Garantiza que Vercel pueda acceder siempre)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '25mb' }));

// Persistent JSON Store file path
const DATA_FILE = path.join(process.cwd(), 'central-store.json');

// Helper to load or initialize database
function loadCentralStore() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading central-store.json, using defaults', e);
    }
  }

  const initialData = {
    incidents: [
      {
        incidentId: 'INC-001',
        timestamp: '2026-10-07 09:15',
        reporterName: 'Carlos Méndez',
        reporterEmail: 'carlos.m@museopatagonico.org',
        organization: 'Museo Patagónico',
        category: 'Seguridad y Salud',
        urgency: 'Alta',
        sector: 'Salas de Exposición',
        exactLocation: 'Sala B, Sector Paleontología junto a réplica de fósil',
        description: 'Goteo constante desde el ducto del aire acondicionado formando un charco resbaloso sobre el pasillo de circulación. Varios asistentes casi resbalan.',
        status: 'En Curso',
        assignedTo: 'sofia.alvarez@museopatagonico.org',
        resolutionNotes: 'Conos amarillos de precaución colocados; personal de mantenimiento en camino con secador.',
        progressComments: [
          {
            id: 'c1',
            timestamp: '2026-10-07 09:22',
            author: 'Sofía Álvarez',
            text: 'Conos amarillos de seguridad delimitados en el área.',
          },
          {
            id: 'c2',
            timestamp: '2026-10-07 09:35',
            author: 'Esteban Moreno',
            text: 'Técnico de refrigeración revisando bandeja de desagote.',
          },
        ],
        auditLog: [
          {
            id: 'a1',
            timestamp: '2026-10-07 09:20',
            coordinatorName: 'Dr. Lucas Vedia',
            action: "Estado cambiado de 'Pendiente' a 'En Curso'",
          },
          {
            id: 'a2',
            timestamp: '2026-10-07 09:21',
            coordinatorName: 'Dr. Lucas Vedia',
            action: 'Asignado a Sofía Álvarez (Seguridad & Primeros Auxilios)',
          },
        ],
        rowIndex: 2,
      },
      {
        incidentId: 'INC-002',
        timestamp: '2026-10-07 09:30',
        reporterName: 'Valeria Ríos',
        reporterEmail: 'valeria.r@asociacionespanola.org',
        organization: 'Asociación Española',
        category: 'Técnica / Audiovisual',
        urgency: 'Alta',
        sector: 'Auditorio Principal',
        exactLocation: 'Atril 1 y Consola Lateral de Escenario',
        description: 'El micrófono corbatero inalámbrico principal tiene microcortes de señal por interferencia cada 45 segundos durante la previa del panel inaugural.',
        status: 'Pendiente',
        assignedTo: 'camila.rossi@museopatagonico.org',
        resolutionNotes: '',
        progressComments: [
          {
            id: 'c3',
            timestamp: '2026-10-07 09:40',
            author: 'Camila Rossi',
            text: 'Cambiando canal UHF para evitar solapamiento con móviles de prensa.',
          },
        ],
        auditLog: [
          {
            id: 'a4',
            timestamp: '2026-10-07 09:35',
            coordinatorName: 'Dr. Lucas Vedia',
            action: 'Asignado a Camila Rossi (Jefa Técnica & AV)',
          },
        ],
        rowIndex: 3,
      },
      {
        incidentId: 'INC-003',
        timestamp: '2026-10-07 10:05',
        reporterName: 'Mariana Gómez',
        reporterEmail: 'mariana.g@diariorionegro.com.ar',
        organization: 'Auditorio Diario Río Negro',
        category: 'Logística y Catering',
        urgency: 'Media',
        sector: 'Área de Catering / Buffet',
        exactLocation: 'Estación de Café 2 (Ala Este)',
        description: 'Termo de agua caliente vacío y stock de vasos compostables bajo antes del receso plenario de la mañana.',
        status: 'En Curso',
        assignedTo: 'mariano.diaz@museopatagonico.org',
        resolutionNotes: 'Personal de catering reponiendo 2 termos y 500 vasos.',
        progressComments: [
          {
            id: 'c4',
            timestamp: '2026-10-07 10:15',
            author: 'Mariano Díaz',
            text: 'Proveedor notificado; camión de reposición descargando en depósito.',
          },
        ],
        auditLog: [
          {
            id: 'a5',
            timestamp: '2026-10-07 10:10',
            coordinatorName: 'Mariano Díaz',
            action: "Estado cambiado de 'Pendiente' a 'En Curso'",
          },
        ],
        rowIndex: 4,
      },
      {
        incidentId: 'INC-004',
        timestamp: '2026-10-07 10:20',
        reporterName: 'Diego Torres',
        reporterEmail: 'diego.t@museopatagonico.org',
        organization: 'Museo Patagónico',
        category: 'Control de Acceso / Aforo',
        urgency: 'Media',
        sector: 'Hall Central / Acreditaciones',
        exactLocation: 'Mesa 4, Fila Rápida con lector QR',
        description: 'Lector óptico con batería baja tiene problemas para escanear pantallas de teléfonos reflectantes, generando fila de 25 personas.',
        status: 'Pendiente',
        assignedTo: 'lucas.vedia@museopatagonico.org',
        resolutionNotes: '',
        progressComments: [],
        auditLog: [],
        rowIndex: 5,
      },
      {
        incidentId: 'INC-005',
        timestamp: '2026-10-07 08:45',
        reporterName: 'Esteban Moreno',
        reporterEmail: 'esteban.moreno@museopatagonico.org',
        organization: 'Museo Patagónico',
        category: 'Mobiliario y Señaléctica',
        urgency: 'Baja',
        sector: 'Salas de Exposición',
        exactLocation: 'Sector Posters Científicos, Stand 18',
        description: 'Tornillo mariposa del caballete de presentación flojo; el panel con el poster queda inclinado.',
        status: 'Resuelto',
        assignedTo: 'esteban.moreno@museopatagonico.org',
        resolutionNotes: 'Se ajustó la abrazadera con llave mariposa y se niveló el panel.',
        progressComments: [
          {
            id: 'c5',
            timestamp: '2026-10-07 08:55',
            author: 'Esteban Moreno',
            text: 'Caballete reparado y firme.',
          },
        ],
        auditLog: [],
        rowIndex: 6,
      },
      {
        incidentId: 'INC-006',
        timestamp: '2026-10-07 08:30',
        reporterName: 'Ana Beltrán',
        reporterEmail: 'ana.beltran@asociacionespanola.org',
        organization: 'Asociación Española',
        category: 'Limpieza e Higiene',
        urgency: 'Baja',
        sector: 'Sanitarios',
        exactLocation: 'Baño Planta Baja (Corredor Este)',
        description: 'Dispensador de toallas de papel trabado en el gabinete 2.',
        status: 'Resuelto',
        assignedTo: 'esteban.moreno@museopatagonico.org',
        resolutionNotes: 'Se lubricó la traba y se recargó la toalla de papel.',
        progressComments: [],
        auditLog: [],
        rowIndex: 7,
      },
    ],
    staff: [
      { id: 'st_1', name: 'Dr. Lucas Vedia', email: 'lucas.vedia@museopatagonico.org', role: 'Coordinador General', active: true },
      { id: 'st_2', name: 'Camila Rossi', email: 'camila.rossi@museopatagonico.org', role: 'Jefa Técnica & AV', active: true },
      { id: 'st_3', name: 'Esteban Moreno', email: 'esteban.moreno@museopatagonico.org', role: 'Logística & Mantenimiento', active: true },
      { id: 'st_4', name: 'Sofía Álvarez', email: 'sofia.alvarez@museopatagonico.org', role: 'Seguridad & Primeros Auxilios', active: true },
      { id: 'st_5', name: 'Mariano Díaz', email: 'mariano.diaz@museopatagonico.org', role: 'Acreditaciones y Sala', active: true },
    ],
    pin: '2026',
  };
  saveCentralStore(initialData);
  return initialData;
}

function saveCentralStore(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving central store to file:', err);
  }
}

// REST API Endpoints

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', online: true, time: new Date().toISOString() });
});

// Full Sync (Incidents + Staff)
app.get('/api/sync', (_req, res) => {
  const store = loadCentralStore();
  res.json({
    incidents: store.incidents || [],
    staff: store.staff || [],
    updatedAt: new Date().toISOString(),
  });
});

// Incidents List
app.get('/api/incidents', (_req, res) => {
  const store = loadCentralStore();
  res.json(store.incidents || []);
});

// ==========================================
// SERVICIO DE NOTIFICACIONES PUSH (ONESIGNAL)
// ==========================================
async function enviarNotificacionPushOneSignal(incidencia: any) {
  const appId = process.env.ONESIGNAL_APP_ID || '9bd6ab2e-b994-4686-88fd-6a957ac745b8';
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey) {
    console.warn('⚠️ [OneSignal] Falta ONESIGNAL_REST_API_KEY en variables de entorno. Notificación push omitida.');
    return;
  }

  const payload = {
    app_id: appId,
    included_segments: ['Total Subscriptions', 'Subscribed Users'],
    headings: {
      es: `🚨 Nueva Incidencia: [${incidencia.incidentId}]`,
      en: `🚨 New Incident: [${incidencia.incidentId}]`,
    },
    contents: {
      es: `Sector: ${incidencia.sector || 'General'} | Urgencia: ${incidencia.urgency || 'Media'}\n${(incidencia.description || '').slice(0, 100)}...`,
      en: `Sector: ${incidencia.sector || 'General'} | Urgency: ${incidencia.urgency || 'Media'}\n${(incidencia.description || '').slice(0, 100)}...`,
    },
    url: 'https://incidencias-final.vercel.app',
  };

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('✅ [OneSignal] Notificación push enviada con éxito:', data);
  } catch (error) {
    console.error('❌ [OneSignal] Error al conectar con API de OneSignal:', error);
  }
}

// ==========================================
// SERVICIO DE CORREO ELECTRÓNICO (RESEND)
// ==========================================
async function enviarEmailCoordinadores(incidencia: any) {
  const apiKey = process.env.RESEND_API_KEY;
  let emailsDestino: string[] = [];

  if (process.env.COORDINADOR_EMAILS) {
    emailsDestino = process.env.COORDINADOR_EMAILS.split(',')
      .map((e: string) => e.trim())
      .filter(Boolean);
  } else {
    // Si no se definieron en el .env, usamos los correos activos del staff registrado
    const store = loadCentralStore();
    emailsDestino = (store.staff || [])
      .filter((s: any) => s.active && s.email)
      .map((s: any) => s.email);
  }

  if (!apiKey) {
    console.warn('⚠️ [Resend] Falta RESEND_API_KEY en variables de entorno. Email omitido.');
    return;
  }

  if (emailsDestino.length === 0) {
    console.warn('⚠️ [Resend] No hay destinatarios configurados en COORDINADOR_EMAILS ni en el staff. Email omitido.');
    return;
  }

  const colorUrgencia: Record<string, string> = {
    Baja: '#22c55e',
    Media: '#eab308',
    Alta: '#f97316',
    Crítica: '#ef4444',
  };
  const colorHeader = colorUrgencia[incidencia.urgency] || '#3b82f6';

  const htmlBody = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
        .card { background-color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e293b, #0f172a); border-left: 6px solid ${colorHeader}; padding: 24px; }
        .header h1 { margin: 0; font-size: 20px; color: #ffffff; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; background-color: ${colorHeader}; color: #ffffff; margin-top: 8px; }
        .body { padding: 24px; line-height: 1.6; color: #cbd5e1; }
        .row { margin-bottom: 14px; }
        .label { font-weight: bold; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { color: #f1f5f9; font-size: 15px; margin-top: 3px; }
        .footer { padding: 20px 24px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Congreso Herpetológico / Museo Patagónico</h1>
          <span class="badge">Urgencia: ${incidencia.urgency || 'Media'}</span>
        </div>
        <div class="body">
          <div class="row">
            <div class="label">Código de Incidencia</div>
            <div class="value"><strong>${incidencia.incidentId}</strong></div>
          </div>
          <div class="row">
            <div class="label">Sector / Ubicación</div>
            <div class="value">${incidencia.sector || 'No especificado'} ${incidencia.exactLocation ? `— ${incidencia.exactLocation}` : ''}</div>
          </div>
          <div class="row">
            <div class="label">Descripción Detallada</div>
            <div class="value">${incidencia.description || 'Sin descripción provista.'}</div>
          </div>
          <div class="row">
            <div class="label">Reportado Por</div>
            <div class="value">${incidencia.reporterName || 'Anónimo'} ${incidencia.organization ? `(${incidencia.organization})` : ''}</div>
          </div>
          <div class="row">
            <div class="label">Fecha y Hora de Registro</div>
            <div class="value">${incidencia.timestamp || new Date().toLocaleString('es-AR')}</div>
          </div>
        </div>
        <div class="footer">
          <a class="btn" href="https://incidencias-final.vercel.app" target="_blank">Abrir en Panel de Control</a>
        </div>
      </div>
    </body>
  </html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Congreso Herpetológico <onboarding@resend.dev>',
        to: emailsDestino,
        subject: `🚨 [${incidencia.urgency || 'Nueva'}] Incidencia en ${incidencia.sector || 'Museo'} (${incidencia.incidentId})`,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    console.log('✅ [Resend] Email despachado a coordinadores:', data);
  } catch (error) {
    console.error('❌ [Resend] Error al enviar email:', error);
  }
}

// Create Incident
app.post('/api/incidents', (req, res) => {
  const store = loadCentralStore();
  const newIncident = req.body;
  if (!newIncident || !newIncident.incidentId) {
    return res.status(400).json({ error: 'Payload de incidencia inválido' });
  }

  const existingIdx = store.incidents.findIndex((i: any) => i.incidentId === newIncident.incidentId);
  const isNew = existingIdx === -1;

  if (existingIdx !== -1) {
    store.incidents[existingIdx] = newIncident;
  } else {
    store.incidents.unshift(newIncident);
  }
  saveCentralStore(store);

  // Respuesta instantánea al frontend
  res.status(201).json(newIncident);

  // Si es una incidencia nueva, despachamos notificaciones Push y Correo en paralelo
  if (isNew) {
    Promise.allSettled([
      enviarNotificacionPushOneSignal(newIncident),
      enviarEmailCoordinadores(newIncident),
    ]).catch((err) => console.error('Error en notificaciones en segundo plano:', err));
  }
});

// Update Incident
app.put('/api/incidents/:id', (req, res) => {
  const { id } = req.params;
  const updatedIncident = req.body;
  const store = loadCentralStore();
  const idx = store.incidents.findIndex((i: any) => i.incidentId === id);
  if (idx === -1) {
    store.incidents.unshift(updatedIncident);
  } else {
    store.incidents[idx] = updatedIncident;
  }
  saveCentralStore(store);
  res.json(updatedIncident);
});

// Staff List
app.get('/api/staff', (_req, res) => {
  const store = loadCentralStore();
  res.json(store.staff || []);
});

// Update Staff List
app.post('/api/staff', (req, res) => {
  const store = loadCentralStore();
  const staffList = req.body;
  if (Array.isArray(staffList)) {
    store.staff = staffList;
    saveCentralStore(store);
    return res.json(store.staff);
  }
  res.status(400).json({ error: 'Se esperaba un arreglo de miembros del equipo' });
});

// PIN Verification
app.post('/api/pin/verify', (req, res) => {
  const { pin } = req.body;
  const store = loadCentralStore();
  const currentPin = store.pin || '2026';
  res.json({ valid: pin === currentPin });
});

// PIN Update
app.post('/api/pin/update', (req, res) => {
  const { currentPin, newPin } = req.body;
  const store = loadCentralStore();
  const serverPin = store.pin || '2026';
  if (currentPin !== serverPin) {
    return res.status(401).json({ error: 'El PIN actual no es correcto' });
  }
  if (!/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'El nuevo PIN debe tener 4 dígitos numéricos' });
  }
  store.pin = newPin;
  saveCentralStore(store);
  res.json({ success: true });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      app.get('/', (_req, res) => {
        res.send('Servidor Central de Incidencias Activo');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

// Initialize store on startup
loadCentralStore();

startServer();
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware de CORS manual (Garantiza acceso desde Vercel o local)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '25mb' }));

// Base de datos persistente en archivo JSON
const DATA_FILE = path.join(process.cwd(), 'central-store.json');

function loadCentralStore() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Error al leer central-store.json, usando valores predeterminados', e);
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
        description: 'Goteo constante desde el ducto del aire acondicionado formando un charco resbaloso sobre el pasillo de circulación.',
        status: 'En Curso',
        assignedTo: 'sofia.alvarez@museopatagonico.org',
        resolutionNotes: 'Conos amarillos de precaución colocados; personal de mantenimiento en camino.',
        progressComments: [],
        auditLog: [],
        rowIndex: 2,
      }
    ],
    staff: [
      { id: 'st_1', name: 'Coordinación Museo', email: 'incidencias.museopatagonico@gmail.com', role: 'Coordinador General', active: true },
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
    console.error('Error al guardar central store:', err);
  }
}

// ==========================================
// CONFIGURACIÓN DE NOTIFICACIONES Y EMAIL
// ==========================================

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '9bd6ab2e-b994-4686-88fd-6a957ac745b8';
const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_KEY;

// Transporte de Gmail con Nodemailer usando SSL directo (puerto 465, seguro para Vercel y cloud)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true para puerto 465 (evita bloqueos de puerto 587 en Vercel)
  auth: {
    user: process.env.EMAIL_USER || 'incidencias.museopatagonico@gmail.com',
    pass: process.env.EMAIL_PASS || 'pviphaasnlpcpdaq', // Contraseña de aplicación de 16 caracteres
  },
});

// Función Notificación Push (OneSignal)
async function enviarNotificacionPushOneSignal(incidencia: any) {
  if (!ONESIGNAL_REST_KEY) {
    console.warn('⚠️ [OneSignal] Falta REST API Key. Notificación push omitida.');
    return;
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ['Total Subscriptions', 'Subscribed Users'],
    headings: {
      es: `🚨 Nueva Incidencia: [${incidencia.incidentId || 'INC'}]`,
      en: `🚨 New Incident: [${incidencia.incidentId || 'INC'}]`,
    },
    contents: {
      es: `Sector: ${incidencia.sector || 'General'} | Urgencia: ${incidencia.urgency || incidencia.urgencia || 'Media'}\n${(incidencia.description || incidencia.descripcion || '').slice(0, 100)}...`,
      en: `Sector: ${incidencia.sector || 'General'} | Urgency: ${incidencia.urgency || incidencia.urgencia || 'Media'}\n${(incidencia.description || incidencia.descripcion || '').slice(0, 100)}...`,
    },
    url: 'https://incidencias-final.vercel.app',
  };

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log('✅ [OneSignal] Notificación push enviada con éxito:', data);
  } catch (error) {
    console.error('❌ [OneSignal] Error enviando notificación push:', error);
  }
}

// Función auxiliar de envío de emails
async function sendEmail(to: string | string[], subject: string, htmlContent: string) {
  try {
    const mailOptions = {
      from: '"Museo Patagónico - Gestión de Incidencias" <incidencias.museopatagonico@gmail.com>',
      to: Array.isArray(to) ? to.join(',') : to,
      subject: subject,
      html: htmlContent,
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ [Nodemailer] Correo enviado correctamente a: ${mailOptions.to}`);
  } catch (error) {
    console.error('❌ [Nodemailer] Error al enviar correo:', error);
  }
}

// Envío de correo a los coordinadores al crearse la incidencia
async function enviarEmailCoordinadores(incidencia: any, emailsAdminsExtra?: string[]) {
  const store = loadCentralStore();
  let emailsDestino: string[] = [];

  if (emailsAdminsExtra && Array.isArray(emailsAdminsExtra) && emailsAdminsExtra.length > 0) {
    emailsDestino = emailsAdminsExtra;
  } else if (process.env.COORDINADOR_EMAILS) {
    emailsDestino = process.env.COORDINADOR_EMAILS.split(',').map((e: string) => e.trim()).filter(Boolean);
  } else {
    emailsDestino = (store.staff || [])
      .filter((s: any) => s.active && s.email)
      .map((s: any) => s.email);
  }

  if (emailsDestino.length === 0) {
    console.warn('⚠️ [Nodemailer] No hay correos de coordinadores configurados.');
    return;
  }

  const urgencia = incidencia.urgency || incidencia.urgencia || 'Media';
  const colorUrgencia: Record<string, string> = {
    Baja: '#22c55e',
    Media: '#eab308',
    Alta: '#f97316',
    Crítica: '#ef4444',
  };
  const colorHeader = colorUrgencia[urgencia] || '#3b82f6';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
          .card { background-color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
          .header { background: #1e293b; border-left: 6px solid ${colorHeader}; padding: 24px; }
          .header h1 { margin: 0; font-size: 20px; color: #ffffff; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; background-color: ${colorHeader}; color: #ffffff; margin-top: 8px; }
          .body { padding: 24px; line-height: 1.6; color: #cbd5e1; }
          .row { margin-bottom: 14px; }
          .label { font-weight: bold; color: #94a3b8; font-size: 12px; text-transform: uppercase; }
          .value { color: #f1f5f9; font-size: 15px; margin-top: 3px; }
          .footer { padding: 20px 24px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Museo Patagónico - Nueva Incidencia</h1>
            <span class="badge">Urgencia: ${urgencia}</span>
          </div>
          <div class="body">
            <div class="row">
              <div class="label">Código de Incidencia</div>
              <div class="value"><strong>${incidencia.incidentId || incidencia.codigo || 'S/D'}</strong></div>
            </div>
            <div class="row">
              <div class="label">Sector / Ubicación</div>
              <div class="value">${incidencia.sector || 'No especificado'} ${incidencia.exactLocation ? `— ${incidencia.exactLocation}` : ''}</div>
            </div>
            <div class="row">
              <div class="label">Descripción Detallada</div>
              <div class="value">${incidencia.description || incidencia.descripcion || 'Sin descripción provista.'}</div>
            </div>
            <div class="row">
              <div class="label">Reportado Por</div>
              <div class="value">${incidencia.reporterName || 'Anónimo'} ${incidencia.reporterEmail ? `(${incidencia.reporterEmail})` : ''}</div>
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

  await sendEmail(emailsDestino, `🚨 [${urgencia}] Nueva Incidencia en ${incidencia.sector || 'Museo'} (${incidencia.incidentId || 'INC'})`, htmlBody);
}

// Envío de correo al voluntario/solicitante al resolverse
async function enviarEmailResolución(incidencia: any) {
  const emailDestino = incidencia.reporterEmail || incidencia.emailSolicitante;
  if (!emailDestino) return;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
      <h2 style="color: #0f5132;">✅ Tu reporte ha sido RESUELTO</h2>
      <p>Hola <strong>${incidencia.reporterName || 'estimado/a'}</strong>,</p>
      <p>Te informamos que la incidencia con código <strong>${incidencia.incidentId || incidencia.codigo}</strong> en el sector <strong>${incidencia.sector}</strong> ha sido atendida y resuelta por el equipo del Museo Patagónico.</p>
      ${incidencia.resolutionNotes ? `<p><strong>Notas de resolución:</strong> ${incidencia.resolutionNotes}</p>` : ''}
      <br/>
      <p>¡Muchas gracias por colaborar con el mantenimiento de nuestro museo!</p>
      <hr style="border: 0; border-top: 1px solid #ccc;" />
      <p style="font-size: 12px; color: #888;">Museo Patagónico - Sistema Oficial de Gestión de Incidencias</p>
    </div>
  `;

  await sendEmail(emailDestino, `✅ Incidencia ${incidencia.incidentId || incidencia.codigo} Resuelta`, htmlBody);
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', online: true, time: new Date().toISOString() });
});

app.get('/api/sync', (_req, res) => {
  const store = loadCentralStore();
  res.json({
    incidents: store.incidents || [],
    staff: store.staff || [],
    updatedAt: new Date().toISOString(),
  });
});

app.get('/api/incidents', (_req, res) => {
  const store = loadCentralStore();
  res.json(store.incidents || []);
});

// Crear Incidencia (Recibe datos del formulario)
app.post('/api/incidents', (req, res) => {
  const store = loadCentralStore();
  const newIncident = req.body;

  if (!newIncident || (!newIncident.incidentId && !newIncident.codigo)) {
    return res.status(400).json({ error: 'Payload de incidencia inválido' });
  }

  const incId = newIncident.incidentId || newIncident.codigo;
  const existingIdx = store.incidents.findIndex((i: any) => (i.incidentId || i.codigo) === incId);
  const isNew = existingIdx === -1;

  // Asegurar que auditLog esté inicializado
  if (!Array.isArray(newIncident.auditLog)) {
    newIncident.auditLog = [
      {
        id: `audit_init_${Date.now()}`,
        timestamp: newIncident.timestamp || new Date().toLocaleString('es-AR'),
        coordinatorName: newIncident.reporterName || 'Sistema',
        action: 'Incidencia creada y registrada en el sistema',
      },
    ];
  }

  if (existingIdx !== -1) {
    store.incidents[existingIdx] = newIncident;
  } else {
    store.incidents.unshift(newIncident);
  }

  saveCentralStore(store);
  res.status(201).json(newIncident);

  if (isNew) {
    Promise.allSettled([
      enviarNotificacionPushOneSignal(newIncident),
      enviarEmailCoordinadores(newIncident, newIncident.emailsAdmins),
    ]).catch((err) => console.error('Error enviando notificaciones en segundo plano:', err));
  }
});

// Actualizar / Resolver Incidencia
app.put('/api/incidents/:id', (req, res) => {
  const { id } = req.params;
  const updatedIncident = req.body;
  const store = loadCentralStore();

  const idx = store.incidents.findIndex((i: any) => (i.incidentId || i.codigo) === id);
  const prevStatus = idx !== -1 ? store.incidents[idx].status : null;

  // Preservar o actualizar el arreglo de auditLog
  if (!Array.isArray(updatedIncident.auditLog)) {
    updatedIncident.auditLog = idx !== -1 && Array.isArray(store.incidents[idx].auditLog)
      ? store.incidents[idx].auditLog
      : [];
  }

  if (idx === -1) {
    store.incidents.unshift(updatedIncident);
  } else {
    store.incidents[idx] = updatedIncident;
  }

  saveCentralStore(store);
  res.json(updatedIncident);

  // Si el estado cambió a 'Resuelto', enviamos mail al usuario
  if (updatedIncident.status === 'Resuelto' && prevStatus !== 'Resuelto') {
    enviarEmailResolución(updatedIncident).catch((err) => console.error('Error enviando email de resolución:', err));
  }
});

// Eliminar Incidencia
app.delete('/api/incidents/:id', (req, res) => {
  const { id } = req.params;
  const store = loadCentralStore();

  const idx = store.incidents.findIndex((i: any) => (i.incidentId || i.codigo) === id);
  if (idx === -1) {
    return res.status(404).json({ error: `Incidencia ${id} no encontrada` });
  }

  const deleted = store.incidents.splice(idx, 1)[0];
  saveCentralStore(store);
  console.log(`🗑️ [CentralStore] Incidencia eliminada definitivamente: ${id}`);
  res.json({ success: true, deletedId: id, deletedIncident: deleted });
});

app.get('/api/staff', (_req, res) => {
  const store = loadCentralStore();
  res.json(store.staff || []);
});

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

app.post('/api/pin/verify', (req, res) => {
  const { pin } = req.body;
  const store = loadCentralStore();
  const currentPin = store.pin || '2026';
  res.json({ valid: pin === currentPin });
});

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

// Inicialización del servidor HTTP + Vite en desarrollo
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
        res.send('Servidor Central de Incidencias del Museo Patagónico Activo');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor del Museo Patagónico corriendo en el puerto ${PORT}`);
  });
}

loadCentralStore();
startServer();
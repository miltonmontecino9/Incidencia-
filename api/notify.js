export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { titulo, sector, urgencia } = req.body || {};

  const ONESIGNAL_APP_ID = "9bd6ab2e-b994-4686-88fd-6a957ac745b8";
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  if (!ONESIGNAL_REST_KEY) {
    return res.status(500).json({ error: 'Falta la variable ONESIGNAL_REST_KEY' });
  }

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Total Subscriptions"],
        headings: { en: `Nueva Incidencia [${(urgencia || 'NUEVA').toUpperCase()}]` },
        contents: { en: `${titulo || 'Nuevo reporte'} - Sector: ${sector || 'General'}` },
        url: "https://incidencias-final.vercel.app"
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

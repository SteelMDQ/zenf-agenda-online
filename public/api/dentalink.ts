import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = 'gRe8kr5FR3dtRr6rp3Ynk99QmPy2cFNWaswgiwD7.GMJwhQr6xi8AJl6gRc3QzIvfxPoySozbwkZnPSIm'; // Reemplaza con tu API key
  
  try {
    const dentistasRes = await fetch('https://api.dentalink.healthatom.com/api/v1/dentistas', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    const dentistas = await dentistasRes.json();
    
    const sucursalesRes = await fetch('https://api.dentalink.healthatom.com/api/v1/sucursales', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    const sucursales = await sucursalesRes.json();

    res.status(200).json({
      dentistas: dentistas.filter(d => d.habilitado),
      sucursales: sucursales.filter(s => s.habilitada)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar' });
  }
}

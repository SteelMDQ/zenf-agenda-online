export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const dentistasRes = await fetch('https://api.dentalink.healthatom.com/api/v1/dentistas', {
            headers: {
                'Authorization': `Bearer ${process.env.DENTALINK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const dentistas = await dentistasRes.json();
        
        const sucursalesRes = await fetch('https://api.dentalink.healthatom.com/api/v1/sucursales', {
            headers: {
                'Authorization': `Bearer ${process.env.DENTALINK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const sucursales = await sucursalesRes.json();

        res.status(200).json({ 
            dentistas: dentistas.filter(d => d.habilitado && d.agenda_online),
            sucursales: sucursales.filter(s => s.habilitada)
        });

    } catch (error) {
        res.status(500).json({ error: 'Error al cargar datos' });
    }
}

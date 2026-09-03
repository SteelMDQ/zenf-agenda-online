import axios from 'axios';

const dentalinkAPI = axios.create({
    baseURL: 'https://api.dentalink.healthatom.com/api/v1',
    headers: {
        'Authorization': `Bearer ${process.env.DENTALINK_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://zenf.cl');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { dentistaId, fechaDesde, fechaHasta } = req.body;

    if (!dentistaId || !fechaDesde || !fechaHasta) {
        return res.status(400).json({ error: 'Parámetros faltantes' });
    }

    try {
        const citasRes = await dentalinkAPI.get(`/dentistas/${dentistaId}/citas`, {
            params: {
                fecha_desde: fechaDesde,
                fecha_hasta: fechaHasta
            }
        });

        const citas = citasRes.data || [];
        const horarios = [];
        
        for (let h = 9; h < 18; h++) {
            for (let m = 0; m < 60; m += 30) {
                const tiempo = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const ocupado = citas.some(c => c.hora === tiempo);
                horarios.push({ tiempo, disponible: !ocupado });
            }
        }

        res.status(200).json({ horarios });

    } catch (error) {
        console.error('Disponibilidad Error:', error.message);
        res.status(500).json({ error: 'Error al consultar disponibilidad' });
    }
}

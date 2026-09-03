import axios from 'axios';

export default async function handler(req, res) {
    const dentalinkAPI = axios.create({
        baseURL: 'https://api.dentalink.healthatom.com/api/v1',
        ...
    headers: {
        'Authorization': `Bearer ${process.env.DENTALINK_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://zenf.cl');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const dentistasRes = await dentalinkAPI.get('/dentistas');
        const dentistas = dentistasRes.data
            .filter(d => d.habilitado && d.agenda_online)
            .map(d => ({
                id: d.id,
                nombre: d.nombre,
                apellidos: d.apellidos,
                especialidad: d.especialidad,
                habilitado: d.habilitado,
                intervalo: d.intervalo,
                sucursal_id: d.id_sucursal
            }));

        const sucursalesRes = await dentalinkAPI.get('/sucursales');
        const sucursales = sucursalesRes.data
            .filter(s => s.habilitada)
            .map(s => ({
                id: s.id,
                nombre: s.nombre,
                ciudad: s.ciudad,
                telefono: s.telefono
            }));

        res.status(200).json({ dentistas, sucursales });

    } catch (error) {
        console.error('Dentalink API Error:', error.message);
        res.status(500).json({ 
            error: 'No pudimos cargar los datos',
            message: error.message 
        });
    }
}

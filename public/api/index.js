export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { pathname } = new URL(req.url, 'http://localhost');
    
    // DATOS INICIALES
    if (pathname === '/api/dentalink/datos-iniciales' && req.method === 'GET') {
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

            return res.status(200).json({ 
                dentistas: dentistas.filter(d => d.habilitado && d.agenda_online),
                sucursales: sucursales.filter(s => s.habilitada)
            });
        } catch (error) {
            return res.status(500).json({ error: 'Error al cargar datos' });
        }
    }
    
    // DISPONIBILIDAD
    if (pathname === '/api/dentalink/disponibilidad' && req.method === 'POST') {
        const { dentistaId, fechaDesde, fechaHasta } = req.body;

        if (!dentistaId || !fechaDesde || !fechaHasta) {
            return res.status(400).json({ error: 'Parámetros faltantes' });
        }

        try {
            const citasRes = await fetch(`https://api.dentalink.healthatom.com/api/v1/dentistas/${dentistaId}/citas?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.DENTALINK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const citas = await citasRes.json();
            const horarios = [];
            
            for (let h = 9; h < 18; h++) {
                for (let m = 0; m < 60; m += 30) {
                    const tiempo = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    const ocupado = citas.some(c => c.hora === tiempo);
                    horarios.push({ tiempo, disponible: !ocupado });
                }
            }

            return res.status(200).json({ horarios });
        } catch (error) {
            return res.status(500).json({ error: 'Error al consultar disponibilidad' });
        }
    }
    
    // AGENDAR
    if (pathname === '/api/dentalink/agendar' && req.method === 'POST') {
        const { dentistaId, fecha, hora, nombre, email, telefono, sucursalId } = req.body;

        if (!dentistaId || !fecha || !hora || !nombre || !email || !telefono || !sucursalId) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        try {
            const citaRes = await fetch(`https://api.dentalink.healthatom.com/api/v1/sucursales/${sucursalId}/citas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.DENTALINK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_dentista: dentistaId,
                    fecha_cita: fecha,
                    hora_cita: hora,
                    nombre_paciente: nombre,
                    email_paciente: email,
                    telefono_paciente: telefono,
                    motivo: 'Cita agendada online'
                })
            });

            const cita = await citaRes.json();
            return res.status(201).json({
                success: true,
                message: 'Cita agendada exitosamente',
                cita_id: cita.id
            });
        } catch (error) {
            return res.status(500).json({ message: 'No pudimos agendar tu cita' });
        }
    }
    
    return res.status(404).json({ error: 'Ruta no encontrada' });
}

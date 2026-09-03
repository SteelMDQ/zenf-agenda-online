export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

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

        res.status(201).json({
            success: true,
            message: 'Cita agendada exitosamente',
            cita_id: cita.id
        });

    } catch (error) {
        res.status(500).json({ message: 'No pudimos agendar tu cita' });
    }
}

import axios from 'axios';

const dentalinkAPI = axios.create({
    baseURL: 'https://api.dentalink.healthatom.com/api/v1',
    headers: {
        'Authorization': `Bearer ${process.env.DENTALINK_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

const RATE_LIMIT_STORE = new Map();

function checkRateLimit(ip) {
    const limit = 5;
    const window = 60 * 1000;
    const now = Date.now();

    if (!RATE_LIMIT_STORE.has(ip)) {
        RATE_LIMIT_STORE.set(ip, []);
    }

    const attempts = RATE_LIMIT_STORE.get(ip)
        .filter(t => now - t < window);

    if (attempts.length >= limit) {
        return false;
    }

    attempts.push(now);
    RATE_LIMIT_STORE.set(ip, attempts);
    return true;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://zenf.cl');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Demasiados intentos. Intenta en 1 minuto.' });
    }

    const { dentistaId, fecha, hora, nombre, email, telefono, sucursalId } = req.body;

    if (!dentistaId || !fecha || !hora || !nombre || !email || !telefono || !sucursalId) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
    }

    if (telefono.replace(/[^0-9]/g, '').length < 7) {
        return res.status(400).json({ error: 'Teléfono inválido' });
    }

    try {
        const citaRes = await dentalinkAPI.post(`/sucursales/${sucursalId}/citas`, {
            id_dentista: dentistaId,
            fecha_cita: fecha,
            hora_cita: hora,
            id_paciente: null,
            nombre_paciente: nombre,
            email_paciente: email,
            telefono_paciente: telefono,
            motivo: 'Cita agendada online'
        });

        const cita = citaRes.data;

        console.log(`[CITA_CREADA] IP: ${ip}, Dentista: ${dentistaId}, Fecha: ${fecha}`);

        res.status(201).json({
            success: true,
            message: 'Cita agendada exitosamente',
            cita_id: cita.id,
            confirmacion: `Tu cita ha sido confirmada para el ${fecha} a las ${hora}`
        });

    } catch (error) {
        console.error('Agendar Error:', error.response?.data || error.message);
        
        if (error.response?.status === 409) {
            return res.status(409).json({ 
                message: 'Esa hora ya fue agendada. Selecciona otra.' 
            });
        }

        res.status(500).json({ 
            message: 'No pudimos agendar tu cita. Intenta nuevamente.' 
        });
    }
}

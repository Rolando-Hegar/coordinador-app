/**
 * Business logic for coordinador-app — Supabase backend.
 */

import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: ReturnType<typeof createClient<any>> | null = null;

export function initCoordinator() {
  _supabase = createClient<any>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

function db() {
  if (!_supabase) throw new Error('Supabase no inicializado');
  return _supabase;
}

function nowMexico(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' }).replace('T', ' ');
}

function parseTiendas(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().replace('T', ' ').split('.')[0];
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function handleGet(params: URLSearchParams): Promise<unknown> {
  const action = params.get('action');

  // ── Login ──────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const code = params.get('code') ?? '';
    if (!code) throw Object.assign(new Error('Código requerido'), { statusCode: 400 });
    const { data } = await db()
      .from('coordinadores')
      .select('codigo_coordinador, nombre, tiendas_asignadas')
      .eq('codigo_acceso', code)
      .eq('activo', true)
      .single();
    if (!data) throw Object.assign(new Error('Código incorrecto'), { statusCode: 401 });
    return { coordinador: data };
  }

  // ── Resumen general ────────────────────────────────────────────────────────
  if (action === 'getResumen') {
    const tiendas = parseTiendas(params.get('tiendas'));
    if (!tiendas.length) return { tiendas: [], totales: { abiertos: 0, porConfirmar: 0, conFalla: 0 } };

    const [
      { data: tiendaRows },
      { data: serviciosAbiertos },
      { data: maquinasConFalla },
    ] = await Promise.all([
      db().from('tiendas').select('codigo_tienda, nombre_tienda').in('codigo_tienda', tiendas).eq('activa', true),
      db().from('servicios').select('codigo_tienda, estado').in('codigo_tienda', tiendas).neq('estado', 'resuelto'),
      db().from('maquinas').select('codigo_tienda').in('codigo_tienda', tiendas).eq('activa', true).neq('estado', 'ok'),
    ]);

    const abiertos: Record<string, number> = {};
    const porConfirmar: Record<string, number> = {};
    for (const s of (serviciosAbiertos ?? [])) {
      const ct = s.codigo_tienda as string;
      abiertos[ct] = (abiertos[ct] ?? 0) + 1;
      if (s.estado === 'pendiente_confirmacion') porConfirmar[ct] = (porConfirmar[ct] ?? 0) + 1;
    }

    const conFalla: Record<string, number> = {};
    for (const m of (maquinasConFalla ?? [])) {
      const ct = m.codigo_tienda as string;
      conFalla[ct] = (conFalla[ct] ?? 0) + 1;
    }

    const rows = (tiendaRows ?? []).map(t => ({
      codigo_tienda:  t.codigo_tienda as string,
      nombre_tienda:  t.nombre_tienda as string,
      abiertos:       abiertos[t.codigo_tienda as string] ?? 0,
      porConfirmar:   porConfirmar[t.codigo_tienda as string] ?? 0,
      conFalla:       conFalla[t.codigo_tienda as string] ?? 0,
    }));

    const totales = rows.reduce(
      (acc, r) => ({ abiertos: acc.abiertos + r.abiertos, porConfirmar: acc.porConfirmar + r.porConfirmar, conFalla: acc.conFalla + r.conFalla }),
      { abiertos: 0, porConfirmar: 0, conFalla: 0 },
    );

    return { tiendas: rows, totales };
  }

  // ── Mis tiendas con fallas recurrentes ─────────────────────────────────────
  if (action === 'getMisTiendas') {
    const tiendas = parseTiendas(params.get('tiendas'));
    if (!tiendas.length) return { tiendas: [] };

    const since = daysAgoISO(30);

    const [
      { data: tiendaRows },
      { data: maquinas },
      { data: serviciosActivos },
      { data: serviciosRecientes },
    ] = await Promise.all([
      db().from('tiendas').select('codigo_tienda, nombre_tienda').in('codigo_tienda', tiendas).eq('activa', true),
      db().from('maquinas').select('codigo_tienda, estado').in('codigo_tienda', tiendas).eq('activa', true),
      db().from('servicios').select('codigo_tienda').in('codigo_tienda', tiendas).neq('estado', 'resuelto'),
      db().from('servicios').select('codigo_tienda, codigo_maquina').in('codigo_tienda', tiendas).gte('fecha_reporte', since),
    ]);

    // aggregate machines
    const totalMaq: Record<string, number> = {};
    const fallaMaq: Record<string, number> = {};
    for (const m of (maquinas ?? [])) {
      const ct = m.codigo_tienda as string;
      totalMaq[ct] = (totalMaq[ct] ?? 0) + 1;
      if (m.estado !== 'ok') fallaMaq[ct] = (fallaMaq[ct] ?? 0) + 1;
    }

    const abiertos: Record<string, number> = {};
    for (const s of (serviciosActivos ?? [])) {
      const ct = s.codigo_tienda as string;
      abiertos[ct] = (abiertos[ct] ?? 0) + 1;
    }

    // recurring failures: machines with 3+ tickets in last 30 days
    const machineHits: Record<string, Record<string, number>> = {};
    for (const s of (serviciosRecientes ?? [])) {
      const ct = s.codigo_tienda as string;
      const cm = s.codigo_maquina as string;
      if (!machineHits[ct]) machineHits[ct] = {};
      machineHits[ct][cm] = (machineHits[ct][cm] ?? 0) + 1;
    }

    const recurrentes: Record<string, { codigo_maquina: string; count: number }[]> = {};
    for (const [ct, hits] of Object.entries(machineHits)) {
      recurrentes[ct] = Object.entries(hits)
        .filter(([, n]) => n >= 3)
        .map(([codigo_maquina, count]) => ({ codigo_maquina, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    const rows = (tiendaRows ?? []).map(t => ({
      codigo_tienda:   t.codigo_tienda as string,
      nombre_tienda:   t.nombre_tienda as string,
      total_maquinas:  totalMaq[t.codigo_tienda as string] ?? 0,
      maquinas_falla:  fallaMaq[t.codigo_tienda as string] ?? 0,
      tickets_abiertos: abiertos[t.codigo_tienda as string] ?? 0,
      recurrentes:     recurrentes[t.codigo_tienda as string] ?? [],
    }));

    return { tiendas: rows };
  }

  // ── Técnicos con sus tickets abiertos ──────────────────────────────────────
  if (action === 'getTecnicos') {
    const tiendas = parseTiendas(params.get('tiendas'));

    const [{ data: tecnicoRows }, { data: tickets }] = await Promise.all([
      db().from('tecnicos').select('codigo_tecnico, nombre_tecnico').eq('activo', true),
      tiendas.length
        ? db().from('servicios')
            .select('id_servicio, asignado_a, estado, codigo_tienda, codigo_maquina, tipo_servicio, descripcion')
            .in('codigo_tienda', tiendas).neq('estado', 'resuelto').not('asignado_a', 'is', null)
        : db().from('servicios')
            .select('id_servicio, asignado_a, estado, codigo_tienda, codigo_maquina, tipo_servicio, descripcion')
            .neq('estado', 'resuelto').not('asignado_a', 'is', null),
    ]);

    const byTecnico: Record<string, { total: number; en_proceso: number; tickets: unknown[] }> = {};
    for (const t of (tickets ?? [])) {
      const at = t.asignado_a as string;
      if (!byTecnico[at]) byTecnico[at] = { total: 0, en_proceso: 0, tickets: [] };
      byTecnico[at].total++;
      const estado = t.estado as string;
      if (estado === 'en_proceso' || estado === 'pendiente_confirmacion') byTecnico[at].en_proceso++;
      byTecnico[at].tickets.push(t);
    }

    const tecnicos = (tecnicoRows ?? []).map(t => ({
      codigo_tecnico:      t.codigo_tecnico as string,
      nombre_tecnico:      t.nombre_tecnico as string,
      tickets_asignados:   byTecnico[t.codigo_tecnico as string]?.total ?? 0,
      tickets_en_proceso:  byTecnico[t.codigo_tecnico as string]?.en_proceso ?? 0,
      tickets:             byTecnico[t.codigo_tecnico as string]?.tickets ?? [],
    })).sort((a, b) => b.tickets_asignados - a.tickets_asignados);

    return { tecnicos };
  }

  // ── Encargadas: métricas por tienda ────────────────────────────────────────
  if (action === 'getEncargadas') {
    const tiendas = parseTiendas(params.get('tiendas'));
    if (!tiendas.length) return { encargadas: [] };

    const since = daysAgoISO(30);

    const [
      { data: tiendaRows },
      { data: sesiones },
      { data: pendientes },
      { data: confirmados },
      { data: rechazos },
    ] = await Promise.all([
      db().from('tiendas').select('codigo_tienda, nombre_tienda').in('codigo_tienda', tiendas).eq('activa', true),
      db().from('sesiones').select('codigo_tienda, nombre_usuario, fecha_inicio').in('codigo_tienda', tiendas).order('fecha_inicio', { ascending: false }),
      db().from('servicios').select('codigo_tienda').in('codigo_tienda', tiendas).eq('estado', 'pendiente_confirmacion'),
      db().from('servicios').select('codigo_tienda, fecha_reparacion, fecha_confirmacion').in('codigo_tienda', tiendas).eq('estado', 'resuelto').not('confirmado_por', 'is', null).gte('fecha_confirmacion', since),
      db().from('bitacora').select('codigo_tienda').in('codigo_tienda', tiendas).eq('tipo_accion', 'RECHAZAR').gte('fecha_hora', since),
    ]);

    // last session per store
    const lastSession: Record<string, { nombre_usuario: string; fecha_inicio: string }> = {};
    for (const s of (sesiones ?? [])) {
      const ct = s.codigo_tienda as string;
      if (!lastSession[ct]) lastSession[ct] = { nombre_usuario: s.nombre_usuario as string, fecha_inicio: s.fecha_inicio as string };
    }

    const pendienteCount: Record<string, number> = {};
    for (const s of (pendientes ?? [])) {
      const ct = s.codigo_tienda as string;
      pendienteCount[ct] = (pendienteCount[ct] ?? 0) + 1;
    }

    const confirmedData: Record<string, { count: number; totalMin: number }> = {};
    for (const s of (confirmados ?? [])) {
      const ct = s.codigo_tienda as string;
      if (!confirmedData[ct]) confirmedData[ct] = { count: 0, totalMin: 0 };
      confirmedData[ct].count++;
      if (s.fecha_reparacion && s.fecha_confirmacion) {
        const diff = new Date(s.fecha_confirmacion as string).getTime() - new Date(s.fecha_reparacion as string).getTime();
        confirmedData[ct].totalMin += diff / 60000;
      }
    }

    const rechazoCount: Record<string, number> = {};
    for (const r of (rechazos ?? [])) {
      const ct = r.codigo_tienda as string;
      rechazoCount[ct] = (rechazoCount[ct] ?? 0) + 1;
    }

    const encargadas = (tiendaRows ?? []).map(t => {
      const ct = t.codigo_tienda as string;
      const cd = confirmedData[ct];
      return {
        codigo_tienda:          ct,
        nombre_tienda:          t.nombre_tienda as string,
        encargada:              lastSession[ct]?.nombre_usuario ?? 'Sin acceso reciente',
        ultimo_acceso:          lastSession[ct]?.fecha_inicio ?? null,
        pendientes:             pendienteCount[ct] ?? 0,
        confirmados_mes:        cd?.count ?? 0,
        avg_confirmacion_min:   cd && cd.count > 0 ? Math.round(cd.totalMin / cd.count) : null,
        rechazos_mes:           rechazoCount[ct] ?? 0,
      };
    });

    return { encargadas };
  }

  // ── Ranking técnicos (oculto) ──────────────────────────────────────────────
  if (action === 'getRanking') {
    const tiendas = parseTiendas(params.get('tiendas'));
    const since = daysAgoISO(30);

    const qResueltos = db().from('servicios').select('asignado_a, duracion_minutos').eq('estado', 'resuelto').not('asignado_a', 'is', null).gte('fecha_resolucion', since);
    const qAbiertos  = db().from('servicios').select('asignado_a').neq('estado', 'resuelto').not('asignado_a', 'is', null);

    const [{ data: tecnicoRows }, { data: resueltos }, { data: abiertos }] = await Promise.all([
      db().from('tecnicos').select('codigo_tecnico, nombre_tecnico').eq('activo', true),
      tiendas.length ? qResueltos.in('codigo_tienda', tiendas) : qResueltos,
      tiendas.length ? qAbiertos.in('codigo_tienda', tiendas)  : qAbiertos,
    ]);

    const byTec: Record<string, { resueltos: number; duraciones: number[] }> = {};
    for (const s of (resueltos ?? [])) {
      const at = s.asignado_a as string;
      if (!byTec[at]) byTec[at] = { resueltos: 0, duraciones: [] };
      byTec[at].resueltos++;
      if (s.duracion_minutos) byTec[at].duraciones.push(s.duracion_minutos as number);
    }

    const pendienteByTec: Record<string, number> = {};
    for (const s of (abiertos ?? [])) {
      const at = s.asignado_a as string;
      pendienteByTec[at] = (pendienteByTec[at] ?? 0) + 1;
    }

    const ranking = (tecnicoRows ?? [])
      .map(t => {
        const ct = t.codigo_tecnico as string;
        const d = byTec[ct] ?? { resueltos: 0, duraciones: [] };
        const total = d.resueltos + (pendienteByTec[ct] ?? 0);
        const avg = d.duraciones.length > 0
          ? Math.round(d.duraciones.reduce((a, b) => a + b, 0) / d.duraciones.length)
          : null;
        return {
          codigo_tecnico:   ct,
          nombre_tecnico:   t.nombre_tecnico as string,
          resueltos_mes:    d.resueltos,
          avg_duracion_min: avg,
          tasa_completado:  total > 0 ? Math.round((d.resueltos / total) * 100) : null,
        };
      })
      .filter(t => t.resueltos_mes > 0 || (pendienteByTec[t.codigo_tecnico] ?? 0) > 0)
      .sort((a, b) => {
        const ra = a.tasa_completado ?? 0;
        const rb = b.tasa_completado ?? 0;
        return rb !== ra ? rb - ra : b.resueltos_mes - a.resueltos_mes;
      });

    return { ranking };
  }

  throw new Error(`Acción GET desconocida: ${action}`);
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function handlePost(body: Record<string, unknown>): Promise<unknown> {
  const action = body.action as string;
  const data   = (body.data ?? {}) as Record<string, unknown>;

  // ── Reasignar tickets en bloque ────────────────────────────────────────────
  if (action === 'reasignarTickets') {
    const tickets            = data.tickets as string[];
    const codigoDestino      = (data.codigo_tecnico_destino as string ?? '').toUpperCase().trim();
    const nombreDestino      = data.nombre_tecnico_destino as string ?? codigoDestino;
    const usuario            = data.usuario as string ?? 'coordinador';

    if (!Array.isArray(tickets) || !tickets.length) throw Object.assign(new Error('Sin tickets seleccionados'), { statusCode: 400 });
    if (!codigoDestino) throw Object.assign(new Error('Técnico destino requerido'), { statusCode: 400 });

    for (const id_servicio of tickets) {
      await db().from('servicios').update({ asignado_a: codigoDestino }).eq('id_servicio', id_servicio);
      const { data: srv } = await db().from('servicios').select('codigo_tienda').eq('id_servicio', id_servicio).single();
      if (srv) {
        await db().from('bitacora').insert({
          id_evento:   `BIT-${Date.now()}-${id_servicio}`,
          fecha_hora:  nowMexico(),
          codigo_tienda: srv.codigo_tienda,
          usuario,
          tipo_accion: 'REASIGNAR',
          entidad:     'Servicio',
          entidad_id:  id_servicio,
          detalle_nuevo: `reasignado a ${nombreDestino}`,
        });
      }
    }
    return { ok: true, reasignados: tickets.length };
  }

  throw new Error(`Acción POST desconocida: ${action}`);
}

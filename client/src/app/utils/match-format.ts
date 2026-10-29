const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

export function todayInSaoPaulo(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Number(values['year']), Number(values['month']) - 1, Number(values['day']), 12);
}

export function toApiDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values['year'] + '-' + values['month'] + '-' + values['day'];
}

export function dateFromApiValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatKickoff(utcDate: string): string {
  const date = new Date(utcDate);
  if (!Number.isFinite(date.getTime())) return 'Horário a confirmar';
  return date.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE, hour: '2-digit', minute: '2-digit',
  });
}

export function formatUpdateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE, hour: '2-digit', minute: '2-digit',
  });
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    TIMED: 'Agendado', SCHEDULED: 'Agendado', IN_PLAY: 'Ao vivo', LIVE: 'Ao vivo',
    PAUSED: 'Intervalo', FINISHED: 'Encerrado', EXTRA_TIME: 'Prorrogação',
    PENALTY_SHOOTOUT: 'Pênaltis', POSTPONED: 'Adiado', SUSPENDED: 'Suspenso',
    CANCELLED: 'Cancelado', AWARDED: 'W.O.', UNKNOWN: 'Status indisponível',
  };
  return labels[status] ?? (status || 'Status indisponível');
}

export function isLive(status: string): boolean {
  return ['IN_PLAY', 'LIVE', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(status);
}

export function goalLabel(goal: {
  scorer: string; minute: number | null; injuryTime: number | null; type: string;
}): string {
  let label = goal.scorer || (goal.type === 'OWN' ? 'Gol contra' : 'Gol');
  if (goal.type === 'OWN' && goal.scorer) label += ' (GC)';
  else if (goal.type === 'PENALTY') label += ' (pên.)';
  if (goal.minute !== null) {
    const extra = goal.injuryTime !== null && goal.injuryTime > 0 ? '+' + goal.injuryTime : '';
    label += ' ' + goal.minute + extra + '′';
  }
  return label;
}

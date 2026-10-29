import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { BroadcastInfo, Match, MatchPreview } from '../../models/match';
import { MatchesApiService } from '../../services/matches-api.service';
import { formatDay, formatKickoff, formatUpdateTime, goalLabel, statusLabel, todayInSaoPaulo, toApiDate } from '../../utils/match-format';

@Component({
  selector: 'app-match-detail-page',
  imports: [ButtonDirective, CardModule, RouterLink],
  templateUrl: './match-detail-page.html',
  styleUrl: './match-detail-page.css',
})
export class MatchDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MatchesApiService);
  protected readonly match = signal<Match | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly dateValue = signal('');
  protected readonly preview = signal<MatchPreview | null>(null);
  protected readonly previewLoading = signal(false);
  protected readonly previewError = signal('');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const requestedDate = this.route.snapshot.queryParamMap.get('data');
    const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : toApiDate(todayInSaoPaulo());
    this.dateValue.set(date);
    this.api.getMatches(date).subscribe({
      next: (response) => {
        const found = response.matches.find((item) => String(item.id) === id) ?? null;
        this.match.set(found);
        this.loading.set(false);
        if (!found) this.error.set('Não encontramos este jogo para a data selecionada.');
        else this.loadPreview(found.id, date);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.error.set(error.message);
      },
    });
  }

  protected goBackDate(): string {
    return formatDay(this.dateValue());
  }

  protected kickoff(value: string): string {
    return formatKickoff(value);
  }

  protected label(status: string): string {
    return statusLabel(status);
  }

  protected scorers(match: Match, teamId: number | null): string[] {
    if (teamId === null) return [];
    return match.goals.filter((goal) => goal.teamId === teamId).map(goalLabel);
  }

  protected score(value: number | null): string {
    return value === null ? '–' : String(value);
  }

  protected previewUpdatedAt(value: string | null): string {
    const time = value ? formatUpdateTime(value) : '';
    if (!time || !value) return '';
    const date = new Date(value);
    const day = date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    });
    return 'Atualizado pelo ge em ' + day + ' às ' + time;
  }

  protected reloadPreview(): void {
    const game = this.match();
    if (game) this.loadPreview(game.id, this.dateValue());
  }

  private loadPreview(matchId: number, date: string): void {
    this.previewLoading.set(true);
    this.previewError.set('');
    this.api.getMatchPreview(date, matchId).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.previewLoading.set(false);
      },
      error: (error: Error) => {
        this.previewError.set(error.message || 'Não foi possível carregar a prévia agora.');
        this.previewLoading.set(false);
      },
    });
  }

  protected broadcastLabel(broadcast: BroadcastInfo): string {
    if (broadcast.status === 'confirmed' && broadcast.channels.length > 0) {
      return broadcast.channels.join(', ');
    }
    if (broadcast.status === 'review') return 'Transmissão encontrada para conferir';
    return 'Canal a confirmar';
  }

  protected broadcastNote(broadcast: BroadcastInfo): string {
    if (broadcast.status === 'confirmed') {
      const source = broadcast.source === 'GE' ? 'agenda do ge' : 'programação da CBF';
      return broadcast.stale
        ? 'Última informação salva da ' + source + '.'
        : 'Conforme a ' + source + (broadcast.source === 'CBF' ? ' (alternativa).' : '.');
    }
    if (broadcast.status === 'review') {
      const source = broadcast.source === 'GE' ? 'O ge' : 'A CBF';
      return source + ' lista esse confronto, mas o horário diverge. Confira antes de considerar o canal confirmado.';
    }
    if (broadcast.status === 'unavailable') {
      return 'Não foi possível consultar a agenda do ge nem a programação da CBF agora.';
    }
    return 'Não encontramos uma transmissão confirmada para este jogo nas fontes consultadas.';
  }
}

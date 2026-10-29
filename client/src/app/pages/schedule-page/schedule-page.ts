import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { Match, MatchDayResponse } from '../../models/match';
import { MatchesApiService } from '../../services/matches-api.service';
import {
  formatDay, formatKickoff, formatUpdateTime, goalLabel, isLive, statusLabel, todayInSaoPaulo, toApiDate,
} from '../../utils/match-format';

@Component({
  selector: 'app-schedule-page',
  imports: [ButtonDirective, CardModule, DatePickerModule, FormsModule, RouterLink, SelectButtonModule, TagModule],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.css',
})
export class SchedulePage {
  private readonly api = inject(MatchesApiService);
  protected readonly selectedDate = signal(todayInSaoPaulo());
  protected readonly dateValue = computed(() => toApiDate(this.selectedDate()));
  protected readonly matches = signal<Match[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly stale = signal(false);
  protected readonly goalEventsAvailable = signal<boolean | null>(null);
  protected readonly matchesSource = signal<'ge' | 'football-data.org' | 'cbf'>('ge');
  protected readonly fetchedAt = signal('');
  protected readonly selectedCompetition = signal('all');
  protected readonly competitionOptions = computed(() => {
    const names = [...new Set(this.matches().map((match) => match.competition.name))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [{ label: 'Todas', value: 'all' }, ...names.map((name) => ({ label: name, value: name }))];
  });
  protected readonly filteredMatches = computed(() =>
    this.selectedCompetition() === 'all'
      ? this.matches()
      : this.matches().filter((match) => match.competition.name === this.selectedCompetition()),
  );
  protected readonly liveCount = computed(() => this.matches().filter((match) => isLive(match.status)).length);
  protected readonly completedCount = computed(() => this.matches().filter((match) => match.status === 'FINISHED').length);

  constructor() {
    this.loadMatches();
  }

  protected loadMatches(): void {
    const date = this.dateValue();
    this.loading.set(true);
    this.error.set('');
    this.api.getMatches(date).subscribe({
      next: (payload: MatchDayResponse) => {
        this.matches.set(payload.matches ?? []);
        this.stale.set(payload.stale);
        this.matchesSource.set(payload.matchesSource);
        this.goalEventsAvailable.set(payload.goalEventsAvailable);
        this.fetchedAt.set(payload.fetchedAt);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.matches.set([]);
        this.loading.set(false);
        this.error.set(error.message || 'Não foi possível carregar os jogos.');
      },
    });
  }

  protected selectToday(): void {
    this.selectedDate.set(todayInSaoPaulo());
    this.selectedCompetition.set('all');
    this.loadMatches();
  }

  protected onDateSelected(date: Date | null): void {
    if (!date) return;
    this.selectedDate.set(date);
    this.selectedCompetition.set('all');
    this.loadMatches();
  }

  protected onCompetitionChange(value: string | null): void {
    this.selectedCompetition.set(value || 'all');
  }

  protected readableDate(): string {
    return formatDay(this.dateValue());
  }

  protected updateMessage(): string {
    const time = formatUpdateTime(this.fetchedAt());
    if (this.stale()) return 'A fonte está indisponível. Exibindo os últimos dados salvos' + (time ? ' às ' + time : '') + '.';
    let message = this.matchesSource() === 'ge'
      ? 'Agenda e transmissões do ge'
      : this.matchesSource() === 'cbf' ? 'Jogos da programação oficial da CBF' : 'Jogos da Football-Data.org';
    message += time ? ' · atualizado às ' + time + '.' : '.';
    message += ' Canais priorizam o ge, com a CBF como alternativa.';
    if (this.goalEventsAvailable() === false) {
      message += this.matchesSource() === 'ge'
        ? ' Os autores dos gols são complementados pela Football-Data.org e podem não estar disponíveis.'
        : this.matchesSource() === 'cbf'
          ? ' A CBF não fornece os autores dos gols nesta programação.'
          : ' Os autores dos gols não estão disponíveis para esta chave ou cobertura.';
    }
    return message;
  }

  protected kickoff(match: Match): string {
    return formatKickoff(match.utcDate);
  }

  protected labelStatus(status: string): string {
    return statusLabel(status);
  }

  protected live(status: string): boolean {
    return isLive(status);
  }

  protected scorerNames(match: Match, teamId: number | null): string[] {
    if (teamId === null) return [];
    return match.goals.filter((goal) => goal.teamId === teamId).map(goalLabel);
  }

  protected score(value: number | null): string {
    return value === null ? '–' : String(value);
  }

  protected statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (isLive(status)) return 'success';
    if (status === 'FINISHED') return 'secondary';
    if (['POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(status)) return 'danger';
    return 'info';
  }
}

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { MatchDayResponse, MatchPreview } from '../models/match';

@Injectable({ providedIn: 'root' })
export class MatchesApiService {
  private readonly http = inject(HttpClient);

  getMatches(date: string): Observable<MatchDayResponse> {
    const params = new HttpParams().set('date', date);
    return this.http.get<MatchDayResponse>('/api/matches', { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        const message =
          typeof error.error?.error === 'string'
            ? error.error.error
            : error.status === 0
              ? 'Não foi possível conectar ao servidor. Confira se a API está iniciada.'
              : 'Não foi possível carregar os jogos agora.';
        return throwError(() => new Error(message));
      }),
    );
  }

  getMatchPreview(date: string, matchId: number): Observable<MatchPreview> {
    const params = new HttpParams().set('date', date);
    return this.http.get<MatchPreview>(`/api/matches/${matchId}/preview`, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        const message =
          typeof error.error?.error === 'string'
            ? error.error.error
            : error.status === 0
              ? 'Não foi possível conectar ao servidor para carregar a prévia.'
              : 'Não foi possível carregar a prévia deste jogo agora.';
        return throwError(() => new Error(message));
      }),
    );
  }
}

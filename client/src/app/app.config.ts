import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    providePrimeNG({
      overlayAppendTo: 'body',
      translation: {
        dayNames: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
        dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
        dayNamesMin: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
        monthNames: [
          'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
        ],
        monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
        firstDayOfWeek: 1,
        dateFormat: 'dd/mm/yy',
        today: 'Hoje',
        clear: 'Limpar',
        weekHeader: 'Sem.',
        chooseDate: 'Escolher data',
        chooseMonth: 'Escolher mês',
        chooseYear: 'Escolher ano',
        prevMonth: 'Mês anterior',
        nextMonth: 'Próximo mês',
        prevYear: 'Ano anterior',
        nextYear: 'Próximo ano',
        prevDecade: 'Década anterior',
        nextDecade: 'Próxima década',
        aria: {
          close: 'Fechar',
          previous: 'Anterior',
          next: 'Próximo',
        },
      },
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.app-dark' },
      },
    }),
  ],
};


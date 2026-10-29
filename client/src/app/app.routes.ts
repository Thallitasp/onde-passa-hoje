import { Routes } from '@angular/router';
import { BlogPage } from './pages/blog-page/blog-page';
import { MatchDetailPage } from './pages/match-detail-page/match-detail-page';
import { SchedulePage } from './pages/schedule-page/schedule-page';

export const routes: Routes = [
  { path: '', component: SchedulePage, title: 'Jogos de hoje | Onde Passa Hoje' },
  { path: 'jogos/:id', component: MatchDetailPage, title: 'Detalhes do jogo | Onde Passa Hoje' },
  { path: 'blog', component: BlogPage, title: 'Blog | Onde Passa Hoje' },
  { path: 'blog/:slug', component: BlogPage, title: 'Artigo | Onde Passa Hoje' },
  { path: '**', redirectTo: '' },
];

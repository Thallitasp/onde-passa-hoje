import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonDirective } from 'primeng/button';
import { CardModule } from 'primeng/card';

interface BlogPost {
  slug: string;
  category: string;
  title: string;
  summary: string;
  paragraphs: string[];
  readingTime: string;
}

const POSTS: BlogPost[] = [
  {
    slug: 'guia-da-rodada',
    category: 'GUIA DA RODADA',
    title: 'Guia da rodada: o que olhar em cada jogo',
    summary: 'Um roteiro rápido para acompanhar os confrontos, os horários e as histórias da rodada.',
    paragraphs: [
      'Uma boa rodada começa antes de a bola rolar. Confira os horários, veja quais equipes chegam em melhor fase e escolha os confrontos que merecem sua atenção.',
      'A agenda do Onde Passa Hoje reúne os jogos do dia no horário de Brasília. As informações de transmissão vêm da agenda do ge, com a CBF como alternativa, e podem mudar perto da partida.',
      'Volte à página de jogos para acompanhar os placares e, quando a cobertura da competição disponibilizar, os autores dos gols.',
    ],
    readingTime: '3 min de leitura',
  },
  {
    slug: 'como-assistir',
    category: 'ONDE ASSISTIR',
    title: 'Como encontrar a transmissão de cada partida',
    summary: 'Entenda onde consultar a programação e por que os canais podem variar de uma rodada para outra.',
    paragraphs: [
      'Os direitos de transmissão podem mudar de acordo com o campeonato, a rodada e até o horário do jogo. Por isso, é importante conferir a programação perto do início da partida.',
      'No Onde Passa Hoje, os jogos são carregados automaticamente. Para transmissões, consultamos primeiro a agenda do ge e usamos a programação da CBF como alternativa. Quando não conseguimos associar um canal ao confronto e ao horário com segurança, mostramos “Canal a confirmar”.',
      'Use o seletor de data para navegar pela agenda e abra um jogo para consultar os detalhes disponíveis.',
    ],
    readingTime: '2 min de leitura',
  },
];

@Component({
  selector: 'app-blog-page',
  imports: [ButtonDirective, CardModule, RouterLink],
  templateUrl: './blog-page.html',
  styleUrl: './blog-page.css',
})
export class BlogPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly posts = POSTS;
  private readonly slug = signal<string | null>(this.route.snapshot.paramMap.get('slug'));
  protected readonly selectedPost = computed(() => {
    const slug = this.slug();
    return slug ? POSTS.find((post) => post.slug === slug) ?? null : null;
  });
  protected readonly relatedPosts = computed(() => POSTS.filter((post) => post.slug !== this.selectedPost()?.slug));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => this.slug.set(params.get('slug')));
  }
}

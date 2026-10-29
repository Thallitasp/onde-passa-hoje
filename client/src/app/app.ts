import { Component, Inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  imports: [ButtonDirective, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly version = packageJson.version;
  protected readonly darkMode = signal(true);

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.darkMode.set(this.readThemePreference());
    this.applyTheme();
  }

  protected toggleTheme(): void {
    this.darkMode.update((value) => !value);
    this.applyTheme();
    try {
      this.document.defaultView?.localStorage.setItem('onde-passa-hoje-theme', this.darkMode() ? 'dark' : 'light');
    } catch {
      // O tema continua funcionando mesmo se o navegador bloquear o armazenamento local.
    }
  }

  private readThemePreference(): boolean {
    try {
      return this.document.defaultView?.localStorage.getItem('onde-passa-hoje-theme') !== 'light';
    } catch {
      return true;
    }
  }

  private applyTheme(): void {
    this.document.documentElement.classList.toggle('app-dark', this.darkMode());
  }
}

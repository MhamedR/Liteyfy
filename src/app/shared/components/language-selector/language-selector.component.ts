import { Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslationService, Language } from '@core/services/translation.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button mat-icon-button [matMenuTriggerFor]="languageMenu" class="language-button">
      <span class="language-code">{{ currentLanguage()?.displayCode }}</span>
    </button>

    <mat-menu #languageMenu="matMenu" class="language-menu">
      <button
        mat-menu-item
        *ngFor="let language of availableLanguages"
        (click)="changeLanguage(language.code)"
        [class.active]="language.code === currentLanguage()?.code">
        <span class="language-code">{{ language.displayCode }}</span>
        <span class="language-name">{{ language.name }}</span>
        <mat-icon *ngIf="language.code === currentLanguage()?.code" class="check-icon">
          check
        </mat-icon>
      </button>
    </mat-menu>
  `,
  styles: [`
    .language-button {
      .language-code {
        font-size: 14px;
        font-weight: 700;
        display: inline-block;
        transition: all 0.3s ease;
        color: white;
        letter-spacing: 0.5px;
      }

      &:hover .language-code {
        transform: scale(1.05);
        opacity: 0.9;
      }
    }

    :host ::ng-deep .language-menu {
      .mat-mdc-menu-content {
        padding: 8px 0;
      }

      .mat-mdc-menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        min-height: 48px;
        transition: all 0.2s ease;

        &.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          color: #667eea;
          font-weight: 600;
        }

        &:hover {
          background: rgba(102, 126, 234, 0.08);
        }

        .language-code {
          font-size: 13px;
          font-weight: 700;
          min-width: 32px;
          text-align: center;
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
        }

        .language-name {
          flex: 1;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.87);
          font-weight: 500;
        }

        .check-icon {
          color: #667eea;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }
  `]
})
export class LanguageSelectorComponent implements OnInit {
  private readonly translationService = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  availableLanguages: Language[] = [];
  currentLanguage = signal<Language | undefined>(undefined);

  ngOnInit(): void {
    this.availableLanguages = this.translationService.availableLanguages;
    this.updateCurrentLanguage();

    // Subscribe to language changes
    this.translationService.currentLanguage$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.updateCurrentLanguage();
    });
  }

  private updateCurrentLanguage(): void {
    this.currentLanguage.set(this.translationService.getCurrentLanguageObject());
  }

  changeLanguage(languageCode: string): void {
    this.translationService.setLanguage(languageCode);
  }
}


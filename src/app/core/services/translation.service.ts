import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Language {
  code: string;
  name: string;
  displayCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'liteyfy_language';
  private readonly DEFAULT_LANGUAGE = 'en';

  public availableLanguages: Language[] = [
    { code: 'en', name: 'English', displayCode: 'EN' },
    { code: 'fr', name: 'Français', displayCode: 'FR' },
    { code: 'nl', name: 'Nederlands', displayCode: 'NL' }
  ];

  private currentLanguageSubject = new BehaviorSubject<string>(this.DEFAULT_LANGUAGE);
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor(private translate: TranslateService) {
    this.initializeLanguage();
  }

  /**
   * Initialize translation service with saved or browser language
   */
  private initializeLanguage(): void {
    // Set available languages
    const languageCodes = this.availableLanguages.map(lang => lang.code);
    this.translate.addLangs(languageCodes);

    // Get saved language or detect from browser
    const savedLanguage = this.getSavedLanguage();
    const browserLanguage = this.getBrowserLanguage();
    const languageToUse = savedLanguage || browserLanguage || this.DEFAULT_LANGUAGE;

    // Set the language
    this.setLanguage(languageToUse);
  }

  /**
   * Get saved language from local storage
   */
  private getSavedLanguage(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Detect browser language
   */
  private getBrowserLanguage(): string {
    const browserLang = this.translate.getBrowserLang();
    const supportedLangs = this.availableLanguages.map(lang => lang.code);
    return supportedLangs.includes(browserLang || '') ? browserLang! : this.DEFAULT_LANGUAGE;
  }

  /**
   * Set application language
   */
  setLanguage(languageCode: string): void {
    if (!this.availableLanguages.find(lang => lang.code === languageCode)) {
      console.warn(`Language ${languageCode} not supported, falling back to ${this.DEFAULT_LANGUAGE}`);
      languageCode = this.DEFAULT_LANGUAGE;
    }

    this.translate.use(languageCode);
    localStorage.setItem(this.STORAGE_KEY, languageCode);
    this.currentLanguageSubject.next(languageCode);

    // Update HTML lang attribute
    document.documentElement.lang = languageCode;
  }

  /**
   * Get current language code
   */
  getCurrentLanguage(): string {
    return this.translate.currentLang || this.DEFAULT_LANGUAGE;
  }

  /**
   * Get current language object
   */
  getCurrentLanguageObject(): Language | undefined {
    return this.availableLanguages.find(
      lang => lang.code === this.getCurrentLanguage()
    );
  }

  /**
   * Get translation for a key
   */
  get(key: string, params?: object): Observable<string> {
    return this.translate.get(key, params);
  }

  /**
   * Get instant translation for a key
   */
  instant(key: string, params?: object): string {
    return this.translate.instant(key, params);
  }

  /**
   * Check if language is RTL
   */
  isRTL(): boolean {
    // None of our supported languages are RTL, but keeping for future
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(this.getCurrentLanguage());
  }
}


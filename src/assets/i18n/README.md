# Translation Files

This directory contains translation files for the Liteyfy application.

## Supported Languages

- **English (en)** - Default language
- **French (fr)** - Français
- **Dutch (nl)** - Nederlands

## File Structure

Each language file (`en.json`, `fr.json`, `nl.json`) contains translations organized by feature:

- `APP` - Application-level strings
- `NAV` - Navigation menu items
- `DASHBOARD` - Dashboard page
- `NOTIFICATIONS` - Notifications page
- `SUBSCRIPTIONS` - Subscription management pages
  - `TRAINS` - Train subscriptions
  - `WEATHER` - Weather subscriptions
  - `STIB` - STIB/MIVB subscriptions
  - `SETTINGS` - Settings page
- `LIVE_STATUS` - Live status page
- `COMMON` - Common/shared strings

## Usage in Components

### In Templates

```html
<!-- Simple translation -->
<h1>{{ 'APP.TITLE' | translate }}</h1>

<!-- Translation with parameters -->
<p>{{ 'NOTIFICATIONS.UNREAD' | translate: { count: unreadCount } }}</p>

<!-- Translation in attributes -->
<button [title]="'COMMON.SAVE' | translate">
  {{ 'COMMON.SAVE' | translate }}
</button>
```

### In TypeScript

```typescript
import { TranslationService } from '@core/services/translation.service';

constructor(private translationService: TranslationService) {}

// Get translation as Observable
this.translationService.get('APP.TITLE').subscribe(translation => {
  console.log(translation);
});

// Get instant translation (synchronous)
const title = this.translationService.instant('APP.TITLE');

// Change language
this.translationService.setLanguage('fr');
```

## Adding New Translations

1. Add the translation key to all three language files (`en.json`, `fr.json`, `nl.json`)
2. Follow the existing structure and naming conventions
3. Use UPPER_CASE for translation keys
4. Group related translations together
5. Test in all supported languages

## Translation Key Naming Convention

- Use descriptive, hierarchical keys: `FEATURE.SECTION.KEY`
- Use UPPER_CASE with underscores
- Be specific but concise
- Examples:
  - `DASHBOARD.STATS.SUBSCRIPTIONS`
  - `SUBSCRIPTIONS.TRAINS.NOTIFY_DELAYS`
  - `COMMON.LOADING`

## Adding a New Language

1. Create a new JSON file (e.g., `de.json` for German)
2. Copy the structure from `en.json`
3. Translate all strings
4. Update `src/app/core/services/translation.service.ts`:
   ```typescript
   public availableLanguages: Language[] = [
     { code: 'en', name: 'English', flag: '🇬🇧' },
     { code: 'fr', name: 'Français', flag: '🇫🇷' },
     { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
     { code: 'de', name: 'Deutsch', flag: '🇩🇪' }  // New language
   ];
   ```

## Testing Translations

1. Start the development server: `npm start`
2. Click the language selector (flag icon) in the top toolbar
3. Select each language to verify translations appear correctly
4. Check for:
   - Missing translations (will show translation key)
   - Text overflow/truncation
   - Proper pluralization
   - Date/time format localization

## Notes

- The app automatically detects the browser's language preference
- User's language choice is saved in localStorage
- All translation files are cached by the Service Worker for offline use
- Missing translations will fall back to the translation key itself


import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NetworkStatusService } from '@core/services/network-status.service';
import { NotificationHistoryService } from '@core/services/notification-history.service';
import { PushNotificationService } from '@core/services/push-notification.service';
import { TranslationService } from '@core/services/translation.service';
import { LanguageSelectorComponent } from './shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatBadgeModule,
    TranslateModule,
    LanguageSelectorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly notificationHistory = inject(NotificationHistoryService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly translationService = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  title = 'Liteyfy';

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay(),
      takeUntilDestroyed()
    );

  isOnline$: Observable<boolean>;
  unreadCount$: Observable<number>;
  isPushEnabled$: Observable<boolean>;

  constructor() {
    this.isOnline$ = this.networkStatus.online$;
    this.unreadCount$ = this.notificationHistory.unreadCount$;
    this.isPushEnabled$ = this.pushNotificationService.subscription$.pipe(
      map(subscription => subscription !== null),
      takeUntilDestroyed()
    );

    // Initialize translation service
    this.translationService.setLanguage(this.translationService.getCurrentLanguage());
  }

  ngOnInit(): void {
    // Listen to push notification clicks
    this.pushNotificationService.listenToNotificationClicks().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      console.log('Notification clicked:', event);
      // Handle notification click (navigate to relevant page)
    });

    // Listen to push messages
    this.pushNotificationService.listenToNotifications().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(message => {
      console.log('Push message received:', message);
      // Store notification in history
    });
  }
}


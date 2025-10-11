import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionsComponent {
  navLinks = [
    { path: 'trains', label: 'Train Lines', icon: 'train' },
    { path: 'weather', label: 'Weather', icon: 'wb_sunny' },
    { path: 'stib', label: 'STIB', icon: 'directions_bus' },
    { path: 'settings', label: 'Settings', icon: 'settings' }
  ];
}


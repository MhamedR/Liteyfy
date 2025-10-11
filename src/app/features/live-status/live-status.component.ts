import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-live-status',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './live-status.component.html',
  styleUrl: './live-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveStatusComponent implements OnInit {
  isLoading = signal(true);

  // Mock data - in production, fetch from APIs
  trainDelays = [
    { train: 'IC 2534', from: 'Brussels', to: 'Antwerp', delay: 15, reason: 'Technical issue' },
    { train: 'S1 1245', from: 'Nivelles', to: 'Brussels', delay: 8, reason: 'Signal failure' },
    { train: 'IC 1832', from: 'Ghent', to: 'Brussels', delay: 22, reason: 'Person on tracks' }
  ];

  weatherAlerts = [
    { region: 'Brussels', type: 'Heavy Rain', severity: 'YELLOW', startTime: new Date() },
    { region: 'Antwerp', type: 'Wind', severity: 'ORANGE', startTime: new Date() }
  ];

  stibDisruptions = [
    { line: 'Metro 1', type: 'METRO', issue: 'Signal failure at Schuman', severity: 'MAJOR' },
    { line: 'Tram 4', type: 'TRAM', issue: 'Accident at Louise', severity: 'MINOR' }
  ];

  ngOnInit(): void {
    // Simulate loading
    setTimeout(() => {
      this.isLoading.set(false);
    }, 1000);
  }

  refresh(): void {
    this.isLoading.set(true);
    // In production, re-fetch from APIs
    setTimeout(() => {
      this.isLoading.set(false);
    }, 1000);
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'GREEN': return '#4caf50';
      case 'YELLOW': return '#ffeb3b';
      case 'ORANGE': return '#ff9800';
      case 'RED': return '#f44336';
      case 'MINOR': return '#2196f3';
      case 'MAJOR': return '#ff9800';
      case 'CRITICAL': return '#f44336';
      default: return '#757575';
    }
  }
}


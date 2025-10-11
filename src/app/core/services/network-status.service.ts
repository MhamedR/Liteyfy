import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public online$ = this.onlineSubject.asObservable();

  constructor() {
    this.initNetworkStatusListener();
  }

  /**
   * Initialize listeners for online/offline events
   */
  private initNetworkStatusListener(): void {
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    merge(online$, offline$).subscribe(status => {
      this.onlineSubject.next(status);
    });
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.onlineSubject.value;
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return !this.onlineSubject.value;
  }

  /**
   * Get network connection type (if available)
   */
  getConnectionType(): string {
    const connection = (navigator as any).connection 
      || (navigator as any).mozConnection 
      || (navigator as any).webkitConnection;
    
    return connection?.effectiveType || 'unknown';
  }

  /**
   * Check if connection is slow
   */
  isSlowConnection(): boolean {
    const connectionType = this.getConnectionType();
    return connectionType === 'slow-2g' || connectionType === '2g';
  }
}


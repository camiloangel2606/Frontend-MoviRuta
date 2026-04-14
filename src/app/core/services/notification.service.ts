import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'role' | 'permission' | 'security';
  createdAt: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly STORAGE_KEY = 'app_notifications';
  private notificationsSubject = new BehaviorSubject<AppNotification[]>(this.loadNotifications());
  notifications$ = this.notificationsSubject.asObservable();

  add(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
    const nextNotification: AppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false
    };

    const nextNotifications = [nextNotification, ...this.notificationsSubject.value].slice(0, 20);
    this.persist(nextNotifications);
  }

  markAllAsRead(): void {
    const updated = this.notificationsSubject.value.map(notification => ({
      ...notification,
      read: true
    }));

    this.persist(updated);
  }

  private loadNotifications(): AppNotification[] {
    const rawNotifications = localStorage.getItem(this.STORAGE_KEY);
    return rawNotifications ? JSON.parse(rawNotifications) : [];
  }

  private persist(notifications: AppNotification[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);
  }
}

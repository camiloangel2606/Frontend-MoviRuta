import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../services/user.service';
import { RoleService, Role } from '../services/role.service';
import { UserRoleService } from '../services/user-role.service';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  stats = {
    totalUsers: 0,
    totalRoles: 0,
    totalAssignments: 0
  };

  loading = true;
  recentRoles: Role[] = [];

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private userRoleService: UserRoleService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.userService.getAll().subscribe({
      next: users => this.stats.totalUsers = users.length,
      error: err => SecurityLogger.warn('Admin', 'No se pudieron cargar los usuarios del panel admin', err)
    });

    this.roleService.getAll().subscribe({
      next: roles => {
        this.stats.totalRoles = roles.length;
        this.recentRoles = roles.slice(0, 5);
        this.loading = false;
      },
      error: err => {
        SecurityLogger.warn('Admin', 'No se pudieron cargar los roles del panel admin', err);
        this.loading = false;
      }
    });

    this.userRoleService.getAll().subscribe({
      next: assignments => this.stats.totalAssignments = assignments.length,
      error: err => SecurityLogger.warn('Admin', 'No se pudieron cargar las asignaciones de roles', err)
    });
  }
}

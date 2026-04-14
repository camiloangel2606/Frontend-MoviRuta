import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { RoleService, Role } from '../../../services/role.service';
import { UserRoleService, UserRole } from '../../../services/user-role.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { User } from '../../../../../shared/models/user.model';

@Component({
  selector: 'app-user-role-manager',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-role-manager.component.html',
  styleUrl: './user-role-manager.component.scss'
})
export class UserRoleManagerComponent implements OnInit {
  userId: string | null = null;
  user: User | null = null;
  allRoles: Role[] = [];
  userRoles: UserRole[] = [];
  loading = true;
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private roleService: RoleService,
    private userRoleService: UserRoleService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId');
    if (this.userId) {
      this.loadData();
    }
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      roles: this.roleService.getAll(),
      userRoles: this.userRoleService.getAll()
    }).subscribe({
      next: ({ roles, userRoles }) => {
        this.allRoles = roles;
        this.userRoles = userRoles.filter(ur => ur.user?.id === this.userId);

        if (this.userRoles.length > 0 && this.userRoles[0].user) {
          this.user = this.userRoles[0].user as User;
          this.finishLoading();
          return;
        }

        this.loadUserById();
      },
      error: () => {
        this.error = 'Error cargando datos';
        this.finishLoading();
      }
    });
  }

  private loadUserById(): void {
    this.userService.getById(this.userId!).subscribe({
      next: (user) => {
        this.user = user;
        this.finishLoading();
      },
      error: () => {
        this.error = 'No se pudo cargar la informacion del usuario';
        this.finishLoading();
      }
    });
  }

  private finishLoading(): void {
    this.loading = false;
    this.cdr.detectChanges();
  }

  hasRole(roleId: string): boolean {
    return this.userRoles.some(ur => ur.role?.id === roleId);
  }

  getUserRoleId(roleId: string): string | null {
    const userRole = this.userRoles.find(ur => ur.role?.id === roleId);
    return userRole?.id || null;
  }

  toggleRole(role: Role): void {
    if (!this.userId || this.saving) {
      return;
    }

    this.saving = true;
    this.error = null;
    this.successMessage = null;

    if (this.hasRole(role.id)) {
      this.removeRole(role);
      return;
    }

    this.userRoleService.assignRole(this.userId, role.id).subscribe({
      next: (userRole) => {
        const existingIndex = this.userRoles.findIndex(ur => ur.id === userRole.id || ur.role?.id === userRole.role?.id);

        if (existingIndex >= 0) {
          this.userRoles = this.userRoles.map((currentRole, index) => index === existingIndex ? userRole : currentRole);
        } else {
          this.userRoles = [...this.userRoles, userRole];
        }

        if (!this.user && userRole.user) {
          this.user = userRole.user as User;
        }

        this.notificationService.add({
          type: 'role',
          title: 'Rol asignado',
          message: `Se asigno el rol "${role.name}" a ${userRole.user?.name || 'un usuario'}.`
        });

        this.successMessage = `Rol "${role.name}" asignado`;
        this.completeSave();
      },
      error: () => {
        this.error = 'Error al asignar el rol';
        this.completeSave();
      }
    });
  }

  private removeRole(role: Role): void {
    const userRoleId = this.getUserRoleId(role.id);

    if (!userRoleId) {
      this.error = 'No se encontro la asignacion para remover el rol';
      this.completeSave();
      return;
    }

    this.userRoleService.removeRole(userRoleId).subscribe({
      next: () => {
        this.userRoles = this.userRoles.filter(ur => ur.id !== userRoleId);
        this.notificationService.add({
          type: 'role',
          title: 'Rol removido',
          message: `Se removio el rol "${role.name}" de ${this.user?.name || 'un usuario'}.`
        });
        this.successMessage = `Rol "${role.name}" removido`;
        this.completeSave();
      },
      error: () => {
        this.error = 'Error al quitar el rol';
        this.completeSave();
      }
    });
  }

  private completeSave(): void {
    this.saving = false;
    this.cdr.detectChanges();
    this.clearMessage();
  }

  private clearMessage(): void {
    if (!this.successMessage) {
      return;
    }

    setTimeout(() => {
      this.successMessage = null;
      this.cdr.detectChanges();
    }, 3000);
  }
}

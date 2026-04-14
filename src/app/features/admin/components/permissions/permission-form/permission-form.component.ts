import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Permission, PermissionService } from '../../../services/permission.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-permission-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './permission-form.component.html',
  styleUrl: './permission-form.component.scss'
})
export class PermissionFormComponent implements OnInit {
  permission: Permission = {
    url: '',
    method: 'GET',
    model: ''
  };
  isEdit = false;
  loading = false;

  httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  commonModels = ['User', 'Role', 'Permission', 'Session', 'Profile'];

  constructor(
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.loadPermission(id);
    }
  }

  loadPermission(id: string): void {
    this.loading = true;
    this.permissionService.getById(id).subscribe({
      next: (permission) => {
        this.permission = permission;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.permission.url || !this.permission.method || !this.permission.model) {
      this.toast.warning('Completa metodo, modelo y URL antes de guardar.');
      return;
    }

    this.loading = true;
    const operation = this.isEdit
      ? this.permissionService.update(this.permission.id!, this.permission)
      : this.permissionService.create(this.permission);

    operation.subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Permiso actualizado correctamente.' : 'Permiso creado correctamente.');
        this.router.navigate(['/admin/permissions']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

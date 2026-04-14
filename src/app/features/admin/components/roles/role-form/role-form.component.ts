import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProgressSpinnerMode, MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RoleService, CreateRoleDto } from '../../../services/role.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './role-form.component.html',
  styleUrl: './role-form.component.scss'
})
export class RoleFormComponent implements OnInit {
  roleForm!: FormGroup;
  isEditMode = false;
  roleId: string | null = null;
  loading = false;
  loadingRole = false;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.roleId = this.route.snapshot.paramMap.get('id');
    if (this.roleId) {
      this.isEditMode = true;
      this.loadRole(this.roleId);
    }
  }

  private initForm(): void {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]]
    });
  }

  private loadRole(id: string): void {
    this.loadingRole = true;
    this.roleService.getById(id).subscribe({
      next: (role) => {
        this.roleForm.patchValue({
          name: role.name,
          description: role.description
        });
        this.loadingRole = false;
      },
      error: () => {
        this.loadingRole = false;
      }
    });
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      this.toast.warning('Completa los campos requeridos antes de guardar.');
      return;
    }

    this.loading = true;

    const roleData: CreateRoleDto = {
      name: this.roleForm.value.name.trim(),
      description: this.roleForm.value.description.trim()
    };

    const request = this.isEditMode
      ? this.roleService.update(this.roleId!, roleData)
      : this.roleService.create(roleData);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEditMode ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
        this.router.navigate(['/admin/roles']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get name() {
    return this.roleForm.get('name');
  }

  get description() {
    return this.roleForm.get('description');
  }
}

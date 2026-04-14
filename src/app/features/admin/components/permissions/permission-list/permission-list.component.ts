import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Permission, PermissionService } from '../../../services/permission.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './permission-list.component.html',
  styleUrl: './permission-list.component.scss'
})
export class PermissionListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['method', 'model', 'url', 'actions'];
  dataSource = new MatTableDataSource<Permission>([]);
  loading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private permissionService: PermissionService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
    this.dataSource.filterPredicate = (permission, filter) => {
      const normalized = filter.trim().toLowerCase();
      return permission.url.toLowerCase().includes(normalized) ||
        permission.method.toLowerCase().includes(normalized) ||
        permission.model.toLowerCase().includes(normalized);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadPermissions(): void {
    this.loading = true;
    this.permissionService.getAll().subscribe({
      next: (permissions) => {
        this.dataSource.data = permissions;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(term: string): void {
    this.dataSource.filter = term;
    this.dataSource.paginator?.firstPage();
  }

  deletePermission(id: string): void {
    if (!confirm('Eliminar este permiso?')) {
      return;
    }

    this.permissionService.delete(id).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(permission => permission.id !== id);
        this.toast.success('Permiso eliminado correctamente.');
      },
      error: () => {}
    });
  }

  getMethodClass(method: string): string {
    const classes: Record<string, string> = {
      GET: 'app-badge-success',
      POST: 'app-badge-info',
      PUT: 'app-badge-warning',
      DELETE: 'app-badge-warning',
      PATCH: 'app-badge-info'
    };

    return classes[method.toUpperCase()] || 'app-badge-info';
  }
}

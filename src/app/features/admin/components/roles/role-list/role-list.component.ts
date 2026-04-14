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
import { RoleService, Role } from '../../../services/role.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-role-list',
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
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.scss'
})
export class RoleListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['name', 'description', 'actions'];
  dataSource = new MatTableDataSource<Role>([]);
  loading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private roleService: RoleService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.dataSource.filterPredicate = (role, filter) => {
      const normalized = filter.trim().toLowerCase();
      return role.name.toLowerCase().includes(normalized) || role.description.toLowerCase().includes(normalized);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadRoles(): void {
    this.loading = true;
    this.roleService.getAll().subscribe({
      next: (roles) => {
        this.dataSource.data = roles;
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

  deleteRole(role: Role): void {
    if (!confirm(`Eliminar el rol "${role.name}"?`)) {
      return;
    }

    this.roleService.delete(role.id).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(currentRole => currentRole.id !== role.id);
        this.toast.success(`Rol "${role.name}" eliminado correctamente.`);
      },
      error: () => {}
    });
  }
}

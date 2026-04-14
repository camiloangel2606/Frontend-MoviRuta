import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../services/user.service';
import { User } from '../../../../../shared/models/user.model';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['user', 'email', 'provider', 'actions'];
  dataSource = new MatTableDataSource<User>([]);
  loading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private userService: UserService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.dataSource.filterPredicate = (user, filter) => {
      const normalized = filter.trim().toLowerCase();
      return user.name?.toLowerCase().includes(normalized) || user.email?.toLowerCase().includes(normalized);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (users) => {
        this.dataSource.data = users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(term: string): void {
    this.dataSource.filter = term;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getProviderIcon(provider: string | undefined): string {
    switch (provider?.toUpperCase()) {
      case 'GOOGLE':
        return 'public';
      case 'GITHUB':
        return 'code';
      case 'MICROSOFT':
        return 'window';
      default:
        return 'key';
    }
  }
}

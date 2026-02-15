import { Component, inject, signal, OnInit, AfterViewInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ClientService } from "./services/client.service.base";
import { NavigationComponent } from "../../shared/components/navigation/navigation.component";
import { Client, ClientType } from "../../core/models/client.model";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-clients",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavigationComponent,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    MatSortModule,
    RouterModule,
  ],
  templateUrl: "./clients.component.html",
  styleUrl: "./clients.component.scss",
})
export class ClientsComponent implements OnInit, AfterViewInit {
  private clientService = inject(ClientService);

  displayedColumns: string[] = ["name", "type", "rating", "actions"];
  dataSource = new MatTableDataSource<Client>([]);
  isLoading = signal(false);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.loadClients();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  loadClients() {
    this.isLoading.set(true);
    this.clientService.getClients().subscribe({
      next: (data) => {
        console.log("clients:", data);
        this.dataSource.data = data;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error("Error loading clients:", error);
        this.isLoading.set(false);
      }
    });
  }

  deleteClient(id: string) {
    if (confirm("Are you sure you want to delete this client?")) {
      this.clientService.deleteClient(id).subscribe({
        next: () => {
          this.loadClients();
        },
        error: (error) => {
          console.error("Error deleting client:", error);
        }
      });
    }
  }
}
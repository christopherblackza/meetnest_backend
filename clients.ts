import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SupabaseService } from "../core/supabase.service";
import { NavigationComponent } from "../shared/navigation";
import { MapSelectorComponent } from "../shared/map-selector";
import { Client, ClientType } from "../core/types";

@Component({
  selector: "app-clients",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavigationComponent,
    MapSelectorComponent,
  ],
  templateUrl: "./clients.component.html",
})
export class ClientsPage implements OnInit {
  private supabase = inject(SupabaseService);

  clients = signal<Client[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  showForm = false;
  showMapSelector = signal(false);
  editingId = signal<string | null>(null);

  formData: Omit<Client, "id" | "created_at"> = {
    name: "",
    type: "cafe",
    description: "",
    latitude: 40.7128,
    longitude: -74.006,
    address: "",
    website_url: "",
    instagram_url: "",
    google_maps_link: "",
    contact_number: "",
    email: "",
    rating: 0,
  };

  ngOnInit() {
    this.loadClients();
  }

  async loadClients() {
    this.isLoading.set(true);
    try {
      const data = await this.supabase.getClients();
      this.clients.set(data);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveClient() {
    if (
      !this.formData.name ||
      !this.formData.type ||
      !this.formData.description
    ) {
      alert("Please fill in all required fields");
      return;
    }

    this.isSaving.set(true);
    try {
      try {
        if (this.editingId()) {
          await this.supabase.updateClient(this.editingId()!, this.formData);
        } else {
          await this.supabase.createClient(this.formData);
        }
      } catch (saveError) {
        throw saveError;
      }

      this.resetForm();
      await this.loadClients();
      this.showForm = false;
    } catch (error: any) {
      const errorMsg =
        error?.message ||
        error?.error_description ||
        String(error) ||
        "Unknown error";
      console.error("Error saving client:", errorMsg);
      alert("Error: " + errorMsg);
    } finally {
      this.isSaving.set(false);
    }
  }

  onLocationSelected(location: { latitude: number; longitude: number }) {
    this.formData.latitude = parseFloat(location.latitude.toFixed(6));
    this.formData.longitude = parseFloat(location.longitude.toFixed(6));
    this.showMapSelector.set(false);
  }

  editClient(client: Client) {
    this.editingId.set(client.id);
    this.formData = { ...client };
    this.showForm = true;
  }

  async deleteClient(id: string) {
    if (confirm("Are you sure you want to delete this client?")) {
      try {
        await this.supabase.deleteClient(id);
        await this.loadClients();
      } catch (error) {
        console.error("Error deleting client:", error);
      }
    }
  }

  private resetForm() {
    this.editingId.set(null);
    this.formData = {
      name: "",
      type: "cafe",
      description: "",
      latitude: 40.7128,
      longitude: -74.006,
      address: "",
      website_url: "",
      instagram_url: "",
      google_maps_link: "",
      contact_number: "",
      email: "",
      rating: 0,
    };
  }
}

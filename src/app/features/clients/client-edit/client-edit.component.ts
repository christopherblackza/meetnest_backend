import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientService } from '../services/client.service.base';
import { Client } from '../../../core/models/client.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MapSelectorComponent } from '../../../shared/components/map-selector/map-selector.component';

@Component({
  selector: 'app-client-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MapSelectorComponent
  ],
  templateUrl: './client-edit.component.html',
  styleUrls: ['./client-edit.component.scss'],
})
export class ClientEditComponent implements OnInit {
  private clientService = inject(ClientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);

  clientForm: FormGroup;
  editingId = signal<string | null>(null);
  isSaving = signal(false);
  isUploading = signal(false);
  isUploadingLogo = signal(false);
  isLoading = signal(false);
  showMapSelector = signal(false);
  clientImages = signal<string[]>([]);
  logoUrl = signal<string | null>(null);
  selectedLogoFile: File | null = null;
  originalLogoUrl: string | null = null;

  clientTypes = [
    'Bar',
    'Restaurant',
    'Cafe',
    'Gym',
    'Market',
    'Volunteering',
    'Social',
  ];

  constructor() {
    this.clientForm = this.formBuilder.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      description: [''],
      address: ['', Validators.required],
      contact_number: [''],
      latitude: [0, Validators.required],
      longitude: [0, Validators.required],
      email: ['', Validators.email],
      website_url: [''],
      instagram_url: [''],
      google_maps_link: [''],
      rating: [0],
      image_url: [[]],
      logo_url: [''],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.loadClientData(id);
    }
  }

  loadClientData(id: string) {
    this.isLoading.set(true);
    this.clientService.getClientById(id).subscribe({
      next: (client) => {
        if (client) {
          this.clientForm.patchValue(client);
          // Check both property names to be safe, preferring image_url as per interface
          const images = client.image_url || (client as any).imageUrls || [];
          this.clientImages.set(images);
          
          if (client.logo_url) {
            this.logoUrl.set(client.logo_url);
          }
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading client:', error);
        this.isLoading.set(false);
      }
    });
  }

  async onLogoSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const clientId = this.editingId();
    if (!clientId) {
      alert('Please save the client before uploading a logo.');
      return;
    }

    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      alert(`File ${file.name} is not a valid image format (jpg, jpeg, png, webp).`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(`File ${file.name} exceeds the 5MB size limit.`);
      return;
    }

    // Store original URL if this is the first selection
    if (!this.selectedLogoFile) {
      this.originalLogoUrl = this.logoUrl();
    }
    
    this.selectedLogoFile = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoUrl.set(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Reset file input so same file can be selected again if needed
    event.target.value = '';
  }

  async uploadLogo() {
    if (!this.selectedLogoFile) return;
    
    const clientId = this.editingId();
    if (!clientId) return;

    this.isUploadingLogo.set(true);
    
    this.clientService.uploadClientLogo(clientId, this.selectedLogoFile).subscribe({
      next: (newLogoUrl) => {
        this.logoUrl.set(newLogoUrl);

   
        this.clientForm.patchValue({ logo_url: newLogoUrl });
        
        // Clear selection state
        this.selectedLogoFile = null;
        this.originalLogoUrl = null;
        this.isUploadingLogo.set(false);
      },
      error: (error: any) => {
        console.error('Error uploading logo:', error);
        alert('Failed to upload logo: ' + (error.message || 'Unknown error'));
        this.isUploadingLogo.set(false);
      }
    });
  }

  cancelLogoUpload() {
    if (this.originalLogoUrl) {
      this.logoUrl.set(this.originalLogoUrl);
    } else {
      // If there was no original logo (or it was null), clear it
      // But we should check if we should revert to null or keep it empty
      // If we loaded a client with no logo, originalLogoUrl is null.
      // If we loaded a client with a logo, originalLogoUrl is that string.
      this.logoUrl.set(this.originalLogoUrl);
    }
    this.selectedLogoFile = null;
    this.originalLogoUrl = null;
  }

  async onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const clientId = this.editingId();
    if (!clientId) {
      alert('Please save the client before uploading images.');
      return;
    }

    if (this.clientImages().length + files.length > 10) {
      alert('You can only upload up to 10 images per client.');
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
        alert(`File ${file.name} is not a valid image format (jpg, jpeg, png, webp).`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 5MB size limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    this.isUploading.set(true);
    
    this.clientService.uploadClientImages(clientId, validFiles).subscribe({
      next: (newUrls) => {
        const updatedImages = [...this.clientImages(), ...newUrls];
        this.clientImages.set(updatedImages);
        this.clientForm.patchValue({ image_url: updatedImages });
        this.isUploading.set(false);
        // Reset file input
        event.target.value = '';
      },
      error: (error: any) => {
        console.error('Error uploading images:', error);
        alert('Failed to upload images: ' + (error.message || 'Unknown error'));
        this.isUploading.set(false);
        // Reset file input
        event.target.value = '';
      }
    });
  }

  removeImage(imageUrl: string) {
    const clientId = this.editingId();
    if (!clientId) return;

    if (!confirm('Are you sure you want to remove this image?')) return;

    this.clientService.removeClientImage(clientId, imageUrl).subscribe({
      next: () => {
        const updatedImages = this.clientImages().filter(url => url !== imageUrl);
        this.clientImages.set(updatedImages);
        this.clientForm.patchValue({ image_url: updatedImages });
      },
      error: (error: any) => {
        console.error('Error removing image:', error);
        alert('Failed to remove image: ' + (error.message || 'Unknown error'));
      }
    });
  }

  saveClient() {
    if (this.clientForm.invalid) {
      alert('Please fill in all required fields');
      return;
    }

    this.isSaving.set(true);
    const formData = this.clientForm.value;
      console.log("formData", formData)

    let request$;
    if (this.editingId()) {
      request$ = this.clientService.updateClient(this.editingId()!, formData);
    } else {
      request$ = this.clientService.createClient(formData);
    }
    
    request$.subscribe({
      next: () => {
        this.router.navigate(['/clients']);
        this.isSaving.set(false);
      },
      error: (error: any) => {
        const errorMsg =
          error?.message || error?.error_description || String(error) || 'Unknown error';
        console.error('Error saving client:', errorMsg);
        alert('Error: ' + errorMsg);
        this.isSaving.set(false);
      }
    });
  }

  onLocationSelected(location: any) {
    this.clientForm.patchValue({
      latitude: parseFloat(location.lat.toFixed(6)),
      longitude: parseFloat(location.lng.toFixed(6)),
    });
    this.showMapSelector.set(false);
  }

  cancel() {
    this.router.navigate(['/clients']);
  }
}
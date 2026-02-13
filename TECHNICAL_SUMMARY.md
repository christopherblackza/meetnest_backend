# Client Image Upload System - Technical Summary

## Overview
A comprehensive image management system for the Client Edit functionality, enabling users to upload, view, and remove images for clients. The system leverages NestJS for backend processing, Supabase for storage/auth, and Angular for the frontend interface.

## Architecture

### Frontend (Angular)
- **Component**: `ClientEditComponent`
  - Handles file selection, validation (size/type), and upload progress.
  - Displays thumbnail grid with delete controls.
  - Integration with `SupabaseService` for API communication.
- **Service**: `SupabaseService`
  - `uploadClientImages`: Sends `FormData` with Bearer token.
  - `removeClientImage`: Sends delete request with Bearer token.

### Backend (NestJS)
- **Module**: `ClientsModule`
- **Controller**: `ClientsController`
  - `POST /clients/:id/images`: Handles multipart file uploads (up to 10 files).
  - `DELETE /clients/:id/images`: Handles image removal.
  - Protected by `AuthGuard`.
- **Service**: `ClientsService`
  - **Image Optimization**: Uses `sharp` to resize images (max 1920x1920) and convert to WebP (80% quality).
  - **Storage**: Uploads optimized files to Supabase Storage (`client-images` bucket).
  - **Database**: Updates `image_url` array in `public.clients` table.
  - **Cleanup**: Automatically deletes files from Supabase Storage when removed from the database.
- **Security**: `AuthGuard`
  - Validates Supabase Bearer tokens from the `Authorization` header.
  - Ensures only authenticated users can perform modifications.

### Storage & Database
- **Supabase Storage**:
  - Bucket: `client-images`
  - Path Structure: `client-images/{client-slug}/{timestamp}-{random}.webp`
- **PostgreSQL**:
  - Table: `clients`
  - Field: `image_url` (text array) - Stores public URLs of uploaded images.

## Key Features
1.  **Validation**:
    - Client-side: File type (JPG, PNG, WEBP), Size (<5MB), Count (Max 10).
    - Server-side: `ParseFilePipe` with `MaxFileSizeValidator` and `FileTypeValidator`.
2.  **Optimization**:
    - Automatic conversion to modern WebP format.
    - Resizing to ensure optimal display performance without quality loss.
3.  **Security**:
    - Endpoints secured via Supabase Auth.
    - Token propagation from client to server.
4.  **Data Integrity**:
    - Database and Storage are kept in sync (deletion removes both).
    - Unique file naming prevents collisions.

## Usage
- **Upload**: Select files in the Client Edit form. Images are processed and appended to the list.
- **Remove**: Click the "X" on a thumbnail. The image is removed from the UI, Database, and Storage.

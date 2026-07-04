# Yena Photo - API Integration Guide

## Overview

The Yena Photo application is now fully integrated with your backend API. All components have been updated to use real API calls with proper error handling, loading states, and user-friendly error messages.

## What's Been Integrated

### 1. **API Client Utility** (`lib/api-client.ts`)
A typed API client that wraps all three backend endpoints with:
- Request/response formatting
- FormData handling for file uploads
- Comprehensive error handling with meaningful messages
- Type-safe interfaces for SearchResult and UploadResponse

**Key Functions:**
- `uploadPhotos()` - POST /photos
- `searchPhotos()` - POST /search
- `getImageUrl()` - GET /image/:photoId
- `getImageBlob()` - Download images as blobs

### 2. **Event Upload Form** (`components/event-upload-form.tsx`)
Enhanced with:
- ✅ Real API integration using `uploadPhotos()`
- ✅ File object storage (not just metadata)
- ✅ FormData submission with event details and files
- ✅ Error handling with user-friendly messages
- ✅ Loading state during upload
- ✅ Success confirmation display
- ✅ Event date picker field

**Error Handling:**
- Network errors: "Unable to connect to the service"
- Upload failures: "Failed to upload photos. Please try again."
- Invalid files: "Please upload valid image files"

### 3. **Find Photos Page** (`app/find-photos/page.tsx`)
Updated with:
- ✅ Real API integration using `searchPhotos()`
- ✅ File object storage and passing
- ✅ SessionStorage for result persistence
- ✅ Error handling with specific messages
- ✅ Loading indicator during search
- ✅ "No face found" error handling

**Error Handling:**
- No face detection: "We couldn't detect a face in your photo. Try a clearer image"
- Network errors: "Unable to connect to the service"
- Search failures: "Search failed. Please try again"

### 4. **Search Results Page** (`app/search-results/page.tsx`)
Enhanced with:
- ✅ Real API data loading from sessionStorage
- ✅ Dynamic result count display
- ✅ Loading skeleton state while fetching
- ✅ Empty results messaging
- ✅ Download functionality via `getImageBlob()`
- ✅ Real confidence scores from API

### 5. **Photo Card Component** (`components/photo-card.tsx`)
Now displays:
- ✅ Real images via `GET /image/:photoId`
- ✅ Loading indicator while fetching
- ✅ Error fallback display
- ✅ Proper CORS handling with `crossOrigin="anonymous"`
- ✅ Next.js Image optimization

### 6. **Photo Viewer Modal** (`components/photo-viewer-modal.tsx`)
Upgraded with:
- ✅ Real image display from API
- ✅ Zoom controls
- ✅ Download functionality
- ✅ Loading and error states
- ✅ Responsive image sizing

## API Configuration

The API base URL is configured via:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

**To change the API endpoint:**
1. Set the `NEXT_PUBLIC_API_URL` environment variable
2. Or update the default in `lib/api-client.ts`

Example for production:
```bash
NEXT_PUBLIC_API_URL=https://api.yena.com
```

## Data Flow

### Upload Flow
1. User fills event form with name, date, description
2. User selects photos (stored as File objects)
3. Click "Upload Photos" → POST /photos with FormData
4. API returns success/error response
5. Show success message or error alert

### Search Flow
1. User uploads selfie on Find Photos page
2. File object stored in component state
3. Click "Search Photos" → POST /search with selfie File
4. Results stored in sessionStorage
5. Navigate to /search-results
6. Load results and display with real images

### Results Display Flow
1. Results page loads results from sessionStorage
2. For each result, construct image URL via `getImageUrl(photoId)`
3. PhotoCard fetches image from GET /image/:photoId
4. Display confidence score and image
5. User can zoom/download via modal

## Error Handling

All API errors are caught and displayed to users with:
- ✅ User-friendly error messages
- ✅ Error icons and styling
- ✅ Clear call-to-action (retry button, try another photo)
- ✅ Network error distinction
- ✅ File validation errors

**Error Types Handled:**
- Network unavailability
- Invalid file formats
- No face detected in selfie
- Upload failures
- Search failures
- Image loading failures

## Loading States

Every async operation displays appropriate loading feedback:
- ✅ Upload: "Uploading..." button state
- ✅ Search: "Searching Photos..." with spinner
- ✅ Results: Skeleton loader while fetching
- ✅ Images: Per-image loading indicator in cards
- ✅ Modal: Image loading indicator in viewer

## Type Safety

Full TypeScript support with interfaces:
```typescript
// Search results
interface SearchResult {
  photoId: string;
  confidence: number;
}

// Upload response
interface UploadResponse {
  success: boolean;
  message: string;
  photos?: {
    id: string;
    eventName: string;
    uploadedAt: string;
  }[];
}
```

## File Handling

### Upload (FormData)
```typescript
const formData = new FormData();
formData.append('eventName', eventName);
formData.append('eventDate', eventDate);
formData.append('description', description);
files.forEach(file => formData.append('photos', file));

await fetch(`${API_BASE_URL}/photos`, {
  method: 'POST',
  body: formData
});
```

### Search (FormData)
```typescript
const formData = new FormData();
formData.append('selfie', selfieFile);

await fetch(`${API_BASE_URL}/search`, {
  method: 'POST',
  body: formData
});
```

### Image Retrieval (URL-based)
```typescript
const imageUrl = `${API_BASE_URL}/image/${photoId}`;
<Image src={imageUrl} crossOrigin="anonymous" />
```

## Testing

### Test Upload
1. Go to `/upload-photos`
2. Fill in event name (required)
3. Optionally add date and description
4. Drag-and-drop or click to select images
5. Click "Upload Photos"
6. See loading state, then success/error message

### Test Search
1. Go to `/find-photos`
2. Upload a clear selfie
3. Click "Search Photos"
4. See loading state with spinner
5. Redirected to `/search-results`
6. View real results with images

### Test Results
1. On results page, see photo grid with real images
2. Hover to see View/Download buttons
3. Click View to open modal
4. Use zoom controls
5. Click Download to save image
6. Test filters (All/High/Medium)

## Debugging

### Enable Debug Logging
The app includes `console.log("[v0] ...")` statements for debugging. To see them:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by "[v0]"

### Common Issues

**Images not loading:**
- Check API base URL in `lib/api-client.ts`
- Verify CORS headers from backend
- Check photoId format in API response

**Search not working:**
- Verify selfie file is being sent
- Check API /search endpoint response format
- Ensure results have `photoId` and `confidence` fields

**Upload failing:**
- Verify FormData is being sent correctly
- Check event name is provided
- Ensure files are valid images

## Next Steps

1. **Environment Setup**: Configure `NEXT_PUBLIC_API_URL` for your environment
2. **Testing**: Test all flows with your actual backend
3. **Styling**: Customize colors/fonts if needed
4. **Analytics**: Add tracking for user actions
5. **Performance**: Optimize image loading if needed

## Support

If you encounter issues:
1. Check the browser console for [v0] debug logs
2. Verify API endpoint is accessible
3. Check API response format matches expectations
4. Ensure CORS is properly configured on backend

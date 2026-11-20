-- SECURITY.md finding S-2: storage buckets had no size or file-type limits,
-- and bulk-import photos upload straight from the browser to the public
-- product_images bucket, so any file of any size could be stored there.
-- Storage now enforces the limits for every upload, browser or server.
--
-- Each limit sits at or above the app's own check, so nothing that uploads
-- today is refused. Types are the JPG/PNG/WebP list in lib/storage.ts
-- (SUPPORTED_IMAGE_MIME_TYPES). Existing files are untouched; limits apply to
-- new uploads only. avatars already has limits (20261109120000).

-- Product photos: 2 MB per file in the forms (MAX_PRODUCT_IMAGE_BYTES), but
-- remote image links may be up to 10 MB (fetch-remote-image.ts) and the
-- optimizer falls back to the original if it fails, so allow 10 MB.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product_images';

-- Home banners and category images: 5 MB (lib/admin/banners.ts, categories.ts).
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('banners', 'category_images');

-- Supplier logos: 2 MB (MAX_LOGO_BYTES in lib/supplier/kyb.ts).
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'company_logos';

-- KYB documents (private; no current upload code): scans and PDFs, 10 MB.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'company_docs';

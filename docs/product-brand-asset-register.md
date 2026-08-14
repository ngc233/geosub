# Product Brand Asset Register

Updated: 2026-08-14

This register defines which kinds of product-brand visuals GeoSub may render.
It separates technical availability from the legal right to publish an asset.
A downloaded file is not automatically an approved public asset.

## Source classes

| Class | Public use | Meaning |
| --- | --- | --- |
| `permission-backed` | Allowed | The owner supplied the asset or granted documented permission covering GeoSub's use. |
| `simple-icons` | Conditionally allowed | Local Simple Icons glyph under CC0; trademark and brand-guideline review still applies. |
| `geosub-neutral` | Allowed | A neutral text or initial fallback created by GeoSub; it must not imitate protected trade dress. |
| `app-store-restricted` | Not preferred | Artwork obtained from Apple-hosted App Store endpoints without a separate documented redistribution basis. Diagnostic retention only by default. |
| `remote-unreviewed` | Blocked | A remote logo URL with no recorded owner, license, checksum, or review decision. |

## Current transition policy

1. Prefer `permission-backed` official assets stored locally.
2. Otherwise use a reviewed `simple-icons` glyph where available.
3. Otherwise render a `geosub-neutral` fallback that identifies the product by
   text or initials without pretending to be an official logo.
4. Do not silently fall back to a third-party remote URL.
5. Existing App Store artwork may remain in the diagnostic cache for migration
   and audit purposes, but cache presence alone does not authorize public use.

The machine-readable registry is `ai-price-site/lib/product-brand-assets.ts`.
As of 2026-08-14 it contains no permission-backed product files. Public pages
therefore use reviewed Simple Icons mappings or GeoSub neutral initials. This
is intentional and must not be bypassed by a database Logo URL.

## Required record for approved official assets

Every future permission-backed asset must record:

- product slug and owner;
- original source URL or delivery record;
- local filename, MIME type, dimensions, and checksum;
- license or permission basis;
- review date and reviewer;
- expiry or re-review date when applicable;
- whether modifications such as cropping or rounded masks are permitted.

## Display rules

- Keep the complete mark visible; do not stretch or crop it to fill a square.
- Use `object-fit: contain` for official assets unless the owner's guideline
  explicitly provides an app-icon crop.
- A rounded container belongs to GeoSub's interface and must not be presented
  as part of the original logo.
- Mark neutral fallbacks internally as neutral so they are never reported as
  official assets in the admin system.

## Review cadence

Review permission-backed and Simple Icons mappings at each minor release and
whenever a product changes its public identity. The logo release gate must fail
when a published product has neither an approved local asset, a reviewed
Simple Icons mapping, nor a neutral fallback.

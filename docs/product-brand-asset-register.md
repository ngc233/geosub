# Product Brand Asset Register

Updated: 2026-08-15

This register defines which kinds of product-brand visuals GeoSub may render.
It separates technical availability from the legal right to publish an asset.
A downloaded file is not automatically an approved public asset.

## Source classes

| Class | Public use | Meaning |
| --- | --- | --- |
| `permission-backed` | Allowed | The owner supplied the asset or granted documented permission covering GeoSub's use. |
| `official-app-store-artwork` | Owner approved | Artwork published by the named product owner through its verified Apple App Store listing, stored locally for nominative product identification. |
| `simple-icons` | Conditionally allowed | Local Simple Icons glyph under CC0; trademark and brand-guideline review still applies. |
| `geosub-neutral` | Allowed | A neutral text or initial fallback created by GeoSub; it must not imitate protected trade dress. |
| `app-store-restricted` | Not preferred | Artwork obtained from Apple-hosted App Store endpoints without a separate documented redistribution basis. Diagnostic retention only by default. |
| `remote-unreviewed` | Blocked | A remote logo URL with no recorded owner, license, checksum, or review decision. |

## Current public policy

1. Every published product must have a committed local app icon in
   `public/brand-assets` and a complete provenance record in
   `data/product-brand-assets.json`.
2. Current App Store artwork is accepted by the site owner for nominative
   product identification. This decision is not described as written trademark
   permission and does not imply affiliation or endorsement.
3. Simple Icons and neutral initials remain fallback-only for unpublished or
   diagnostic views. They do not satisfy the published-product release gate.
4. Do not load a database Logo URL, Apple CDN URL, or any other remote image at
   public-page runtime.
5. Refreshing assets is an explicit maintenance action. It validates the App
   Store product identity, downloads all assets as one batch, and rewrites the
   source URL, seller, checksum and review date.

The machine-readable registry is
`ai-price-site/data/product-brand-assets.json`. It is consumed through
`ai-price-site/lib/product-brand-assets.ts`. Run `npm run refresh:brand-assets`
only when intentionally reviewing product identity changes; normal builds and
page requests never download artwork.

## Required record for approved official assets

Every public local asset must record:

- product slug and owner;
- original source URL or delivery record;
- local filename, MIME type, dimensions, and checksum;
- source class and GeoSub usage decision;
- review date and reviewer;
- expiry or re-review date when applicable;
- whether modifications such as cropping or rounded masks are permitted.

## Display rules

- App Store artwork uses its complete square artwork with `object-fit: cover`
  inside a 22% rounded-square mask, matching the proportions of an iOS app icon.
- Standalone brand marks use `object-fit: contain` and must not be stretched.
- Mark neutral fallbacks internally as neutral so they are never reported as
  official assets in the admin system.

## Review cadence

Review published assets at each minor release, whenever a product changes its
identity, and at least once every 120 days. The logo release gate fails for a
missing file, changed checksum, stale review, or any published product that
would fall back to Simple Icons or neutral initials.

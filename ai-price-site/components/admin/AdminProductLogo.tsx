import BrandIcon from "../BrandIcon";

/** Product names remain visible beside this decorative identifier. */
export default function AdminProductLogo({
  slug,
  name,
  size = "sm",
}: {
  slug: string;
  name?: string | null;
  size?: "xs" | "sm" | "md";
}) {
  return (
    <span aria-hidden="true" data-admin-product-logo={slug} className="inline-flex shrink-0">
      <BrandIcon key={slug} product={{ slug, name: name || undefined }} size={size} appearance="admin" />
    </span>
  );
}

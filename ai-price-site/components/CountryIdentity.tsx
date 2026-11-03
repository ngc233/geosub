import CountryFlag from "./CountryFlag";
// Preserve the identity import for callers; all public flags share one renderer.
export default function CountryIdentity({ code }: { code: string }) { return <CountryFlag code={code} identity />; }

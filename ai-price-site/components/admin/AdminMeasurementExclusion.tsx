"use client";

import { useEffect } from "react";
import { markInternalMeasurementBrowser } from "../../lib/page-view-measurement";

// Mounted only after the server layout has authenticated the administrator.
export default function AdminMeasurementExclusion() {
  useEffect(() => { markInternalMeasurementBrowser(); }, []);
  return null;
}

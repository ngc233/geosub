"use client";

import AppleStyleExpandableRows from "./AppleStyleExpandableRows";

type Props = {
  hiddenCount: number;
  showLabel: string;
  hideLabel: string;
  renderChildren: () => React.ReactNode;
};

export default function ExpandableAffordabilityRows({
  hiddenCount,
  showLabel,
  hideLabel,
  renderChildren,
}: Props) {
  return (
    <AppleStyleExpandableRows
      hiddenCount={hiddenCount}
      showLabel={showLabel}
      hideLabel={hideLabel}
      renderChildren={renderChildren}
    />
  );
}

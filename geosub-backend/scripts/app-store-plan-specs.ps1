# Shared read-only catalog loader. Maintained specifications take precedence.
function Read-AppStorePlanSpecs {
  $specPath = Join-Path $PSScriptRoot "..\data\product-plan-specs.json"
  $expansionPath = Join-Path $PSScriptRoot "..\data\catalog-expansion-2026-08.json"
  $merged = [ordered]@{}

  if (Test-Path -LiteralPath $expansionPath) {
    $expansionJson = [IO.File]::ReadAllText($expansionPath, [Text.Encoding]::UTF8)
    $expansion = $expansionJson | ConvertFrom-Json
    $expandedProducts = @($expansion.products) + @($expansion.required_products) + @($expansion.existing_plan_specs)

    foreach ($product in $expandedProducts) {
      if ($null -eq $product.app_store -or ![bool]$product.app_store.collector_enabled) {
        continue
      }

      $spec = [ordered]@{
        name = [string]$product.name
        app_store_id = [string]$product.app_store.id
        plans = @($product.plans | ForEach-Object {
          $plan = [ordered]@{
            slug = [string]$_.slug
            name = [string]$_.name
            billing_cycle = [string]$_.billing_cycle
            aliases = @($_.aliases)
            sort_order = [int]$_.sort_order
            expected_monthly_usd_min = [decimal]$_.expected_usd_min
            expected_monthly_usd_max = [decimal]$_.expected_usd_max
          }
          if ($_.PSObject.Properties.Name -contains "price_selection_strategy") {
            $plan.price_selection_strategy = [string]$_.price_selection_strategy
          }
          if ($_.PSObject.Properties.Name -contains "allow_recurring_consumable_terms") {
            $plan.allow_recurring_consumable_terms = [bool]$_.allow_recurring_consumable_terms
          }
          [pscustomobject]$plan
        })
      }

      if ($product.PSObject.Properties.Name -contains "match_product_name") {
        $spec.match_product_name = [string]$product.match_product_name
      }

      if ($product.PSObject.Properties.Name -contains "excluded_aliases") {
        $spec.excluded_aliases = @($product.excluded_aliases)
      }
      if ($product.PSObject.Properties.Name -contains "country_scoped_aliases") {
        $spec.country_scoped_aliases = @($product.country_scoped_aliases)
      }

      $merged[[string]$product.slug] = [pscustomobject]$spec
    }
  }

  # Maintained product specifications are authoritative. The expansion file
  # supplies review-first defaults for newly introduced catalog entries.
  if (Test-Path -LiteralPath $specPath) {
    $specJson = [IO.File]::ReadAllText($specPath, [Text.Encoding]::UTF8)
    $baseSpecs = $specJson | ConvertFrom-Json
    foreach ($property in @($baseSpecs.PSObject.Properties)) {
      $merged[$property.Name] = $property.Value
    }
  }

  if ($merged.Count -eq 0) {
    return $null
  }

  return [pscustomobject]$merged
}

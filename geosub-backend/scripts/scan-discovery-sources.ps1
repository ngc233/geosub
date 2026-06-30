param(
  [int]$Limit = 10,
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [string]$SourceId,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Quote-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Quote-SqlJson {
  param([object]$Value)

  $json = $Value | ConvertTo-Json -Depth 20 -Compress
  return (Quote-SqlString $json) + "::jsonb"
}

function Invoke-Psql {
  param([string]$Sql)

  $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed with exit code $LASTEXITCODE."
  }
}

function Invoke-PsqlJson {
  param([string]$Sql)

  $result = $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q `
    -t `
    -A

  $text = ($result -join "").Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return $text | ConvertFrom-Json
}

function Get-DueSources {
  $forceSql = if ($Force) { "TRUE" } else { "FALSE" }
  $sourceFilterSql = if ([string]::IsNullOrWhiteSpace($SourceId)) {
    ""
  } else {
    "AND id = $(Quote-SqlString $SourceId)::uuid"
  }

  $sources = Invoke-PsqlJson @"
SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
FROM (
  SELECT
    id,
    name,
    source_type::text,
    url,
    category_hint::text,
    query,
    scan_interval_hours,
    reliability_score,
    strategy,
    promote_threshold,
    watch_threshold,
    last_checked_at,
    manual_scan_requested_at,
    last_content_hash,
    note
  FROM discovery_sources
  WHERE status = 'active'::discovery_source_status
    $sourceFilterSql
    AND (
      $forceSql
      OR manual_scan_requested_at IS NOT NULL
      OR last_checked_at IS NULL
      OR last_checked_at <= NOW() - (scan_interval_hours || ' hours')::interval
    )
  ORDER BY last_checked_at NULLS FIRST, reliability_score DESC
  LIMIT $Limit
) s;
"@

  if ($null -eq $sources) {
    return @()
  }

  return @($sources | Where-Object { $_ -and $_.id })
}

function Normalize-Slug {
  param([string]$Value)

  $slug = $Value.ToLowerInvariant()
  $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
  $slug = [regex]::Replace($slug, "^-+|-+$", "")
  $slug = [regex]::Replace($slug, "-+", "-")

  if ([string]::IsNullOrWhiteSpace($slug)) {
    return "discovered-service"
  }

  return $slug
}

function Get-Hash {
  param([string]$Value)

  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  $hash = [Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Get-SourceStrategy {
  param([object]$Source)

  if ($Source.strategy) {
    return [string]$Source.strategy
  }

  if ($Source.source_type -eq "rss") { return "announcement_feed" }
  if ($Source.source_type -eq "app_store" -or $Source.source_type -eq "google_play") { return "marketplace" }
  if ($Source.source_type -eq "competitor") { return "competitor_page" }
  if ($Source.source_type -eq "search") { return "search_result" }

  $hint = "$($Source.name) $($Source.url) $($Source.query)".ToLowerInvariant()
  if ($hint.Contains("pricing") -or $hint.Contains("price")) {
    return "pricing_page"
  }

  return "auto"
}

function Get-PromoteThreshold {
  param([object]$Source)

  if ($Source.promote_threshold) {
    return [int]$Source.promote_threshold
  }

  return 60
}

function Get-WatchThreshold {
  param([object]$Source)

  if ($Source.watch_threshold) {
    return [int]$Source.watch_threshold
  }

  return 40
}

function Add-KeywordMatches {
  param(
    [string]$Text,
    [string[]]$Keywords,
    [System.Collections.Generic.List[string]]$Matched
  )

  $count = 0
  foreach ($keyword in $Keywords) {
    if ($Text.Contains($keyword.ToLowerInvariant())) {
      $count += 1
      $Matched.Add($keyword)
    }
  }

  return $count
}

function Add-WeightedKeywordScore {
  param(
    [string]$Text,
    [hashtable]$WeightedKeywords,
    [System.Collections.Generic.List[string]]$Matched
  )

  $score = 0
  foreach ($keyword in $WeightedKeywords.Keys) {
    if ($Text.Contains($keyword.ToLowerInvariant())) {
      $score += [int]$WeightedKeywords[$keyword]
      $Matched.Add($keyword)
    }
  }

  return $score
}

function Get-WeightedSignals {
  return @{
    price = @{
      "pricing" = 18
      "price" = 16
      "prices" = 16
      "billing" = 14
      "subscription" = 14
      "subscribe" = 10
      "plan" = 10
      "plans" = 10
      "monthly" = 8
      "annual" = 8
      "yearly" = 8
      "discount" = 8
      "free trial" = 8
      "usd" = 6
      "$" = 6
      "/mo" = 8
      "per month" = 8
      "per 1m tokens" = 10
      "token" = 6
      "tokens" = 6
    }
    model = @{
      "model" = 12
      "models" = 12
      "new model" = 18
      "api model" = 14
      "reasoning" = 12
      "multimodal" = 12
      "preview" = 8
      "context" = 6
      "benchmark" = 6
      "gpt-" = 12
      "claude" = 10
      "gemini" = 10
      "deepseek" = 10
    }
    launch = @{
      "launch" = 16
      "launched" = 16
      "released" = 14
      "introducing" = 16
      "announcing" = 14
      "new product" = 16
      "available now" = 12
      "beta" = 8
      "early access" = 10
      "waitlist" = 8
    }
    marketplace = @{
      "app store" = 14
      "google play" = 14
      "in-app" = 14
      "iap" = 12
      "subscription" = 12
      "per item" = 8
      "purchase" = 8
      "developer" = 4
    }
  }
}

function Strip-Html {
  param([string]$Html)

  $withoutScripts = [regex]::Replace($Html, "<script[\s\S]*?</script>", " ", "IgnoreCase")
  $withoutStyles = [regex]::Replace($withoutScripts, "<style[\s\S]*?</style>", " ", "IgnoreCase")
  $text = [regex]::Replace($withoutStyles, "<[^>]+>", " ")
  $text = [System.Net.WebUtility]::HtmlDecode($text)
  $text = [regex]::Replace($text, "\s+", " ").Trim()
  return $text
}

function Get-Title {
  param([string]$Html)

  $match = [regex]::Match($Html, "<title[^>]*>(?<title>[\s\S]*?)</title>", "IgnoreCase")
  if ($match.Success) {
    return ([System.Net.WebUtility]::HtmlDecode($match.Groups["title"].Value) -replace "\s+", " ").Trim()
  }

  return $null
}

function Get-MetaDescription {
  param([string]$Html)

  $match = [regex]::Match($Html, '<meta[^>]+name=["'']description["''][^>]+content=["''](?<content>[^"'']+)["'']', "IgnoreCase")
  if ($match.Success) {
    return ([System.Net.WebUtility]::HtmlDecode($match.Groups["content"].Value) -replace "\s+", " ").Trim()
  }

  return $null
}

function Get-XmlChildText {
  param([object]$Node, [string[]]$Names)

  foreach ($name in $Names) {
    $child = $Node.SelectSingleNode("*[local-name()='$name']")
    if ($child -and ![string]::IsNullOrWhiteSpace([string]$child.InnerText)) {
      return ([System.Net.WebUtility]::HtmlDecode([string]$child.InnerText) -replace "\s+", " ").Trim()
    }
  }

  return $null
}

function Get-FeedLink {
  param([object]$Node)

  $linkNode = $Node.SelectSingleNode("*[local-name()='link' and (@rel='alternate' or not(@rel))]")
  if ($linkNode) {
    if ($linkNode.Attributes -and $linkNode.Attributes["href"]) {
      return [string]$linkNode.Attributes["href"].Value
    }

    if (![string]::IsNullOrWhiteSpace([string]$linkNode.InnerText)) {
      return ([string]$linkNode.InnerText).Trim()
    }
  }

  return $null
}

function Parse-DateOrNull {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  try {
    return ([DateTimeOffset]::Parse($Value)).UtcDateTime
  } catch {
    return $null
  }
}

function Get-FeedPage {
  param([object]$Source)

  $response = Invoke-WebRequest `
    -Uri $Source.url `
    -UseBasicParsing `
    -TimeoutSec 30 `
    -Headers @{
      "User-Agent" = "Mozilla/5.0 (compatible; GeoSubDiscoveryBot/0.1; +https://geosub.local)"
      "Accept" = "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      "Accept-Language" = "en-US,en;q=0.9,zh-CN;q=0.8"
    }

  [xml]$feed = [string]$response.Content
  $feedTitle = Get-XmlChildText -Node $feed.DocumentElement -Names @("title")

  $nodes = @($feed.SelectNodes("//*[local-name()='item' or local-name()='entry']"))
  $items = @()

  foreach ($node in ($nodes | Select-Object -First 30)) {
    $title = Get-XmlChildText -Node $node -Names @("title")
    $summary = Get-XmlChildText -Node $node -Names @("summary", "description", "content", "encoded")
    $link = Get-FeedLink -Node $node
    $externalId = Get-XmlChildText -Node $node -Names @("guid", "id")
    $publishedRaw = Get-XmlChildText -Node $node -Names @("published", "updated", "pubDate")
    $publishedAt = Parse-DateOrNull -Value $publishedRaw

    if ([string]::IsNullOrWhiteSpace($externalId)) {
      $externalId = if ($link) { $link } else { $title }
    }

    if (![string]::IsNullOrWhiteSpace($title)) {
      $items += [pscustomobject]@{
        Title = $title
        Summary = $summary
        Link = $link
        ExternalId = $externalId
        PublishedAt = $publishedAt
        PublishedRaw = $publishedRaw
      }
    }
  }

  if ($items.Count -eq 0) {
    throw "RSS/Atom source returned no readable items."
  }

  $fingerprint = ($items | Select-Object -First 20 | ForEach-Object {
    "$($_.ExternalId)|$($_.Title)|$($_.Link)|$($_.PublishedRaw)"
  }) -join "`n"

  $selected = $items | Select-Object -First 1
  $plainText = ($items | Select-Object -First 10 | ForEach-Object {
    "$($_.Title) $($_.Summary)"
  }) -join " "
  $plainText = ($plainText -replace "\s+", " ").Trim()
  $summary = if ($selected.Summary) { [string]$selected.Summary } else { [string]$selected.Title }
  if ($summary.Length -gt 500) { $summary = $summary.Substring(0, 500) }

  return [pscustomobject]@{
    HttpStatus = [int]$response.StatusCode
    FinalUrl = [string]$response.BaseResponse.ResponseUri
    Title = [string]$selected.Title
    Summary = $summary
    ContentHash = Get-Hash -Value $fingerprint
    PlainText = $plainText
    PlainTextLength = $plainText.Length
    FeedTitle = $feedTitle
    TriggerUrl = $selected.Link
    TriggerExternalId = $selected.ExternalId
    TriggerPublishedAt = $selected.PublishedAt
    TriggerPayload = @{
      feed_title = $feedTitle
      title = $selected.Title
      summary = $selected.Summary
      link = $selected.Link
      external_id = $selected.ExternalId
      published_at = if ($selected.PublishedAt) { $selected.PublishedAt.ToString("o") } else { $null }
      item_count = $items.Count
    }
  }
}

function Get-SourcePage {
  param([object]$Source)

  if ($Source.source_type -eq "rss") {
    return Get-FeedPage -Source $Source
  }

  $response = Invoke-WebRequest `
    -Uri $Source.url `
    -UseBasicParsing `
    -TimeoutSec 30 `
    -Headers @{
      "User-Agent" = "Mozilla/5.0 (compatible; GeoSubDiscoveryBot/0.1; +https://geosub.local)"
      "Accept-Language" = "en-US,en;q=0.9,zh-CN;q=0.8"
    }

  $html = [string]$response.Content
  $title = Get-Title -Html $html
  $meta = Get-MetaDescription -Html $html
  $plainText = Strip-Html -Html $html
  $summarySource = if ($meta) { $meta } else { $plainText }
  $summary = if ($summarySource.Length -gt 500) { $summarySource.Substring(0, 500) } else { $summarySource }
  $hashText = if ($plainText.Length -gt 20000) { $plainText.Substring(0, 20000) } else { $plainText }
  $contentHash = Get-Hash -Value $hashText

  return [pscustomobject]@{
    HttpStatus = [int]$response.StatusCode
    FinalUrl = [string]$response.BaseResponse.ResponseUri
    Title = $title
    Summary = $summary
    ContentHash = $contentHash
    PlainText = $plainText
    PlainTextLength = $plainText.Length
    FeedTitle = $null
    TriggerUrl = $null
    TriggerExternalId = $null
    TriggerPublishedAt = $null
    TriggerPayload = $null
  }
}

function Get-ChangeClassification {
  param([object]$Source, [object]$Page, [bool]$Changed)

  $strategy = Get-SourceStrategy -Source $Source

  if (!$Changed) {
    return [pscustomobject]@{
      Kind = "no_change"
      Importance = 0
      Keywords = @()
      Strategy = $strategy
    }
  }

  $text = @(
    [string]$Source.name,
    [string]$Page.Title,
    [string]$Page.Summary,
    [string]$Page.PlainText
  ) -join " "

  $lower = $text.ToLowerInvariant()
  $matched = New-Object System.Collections.Generic.List[string]
  $score = 20
  $kind = "content_update"

  $signals = Get-WeightedSignals
  $priceScore = Add-WeightedKeywordScore -Text $lower -WeightedKeywords $signals.price -Matched $matched
  $modelScore = Add-WeightedKeywordScore -Text $lower -WeightedKeywords $signals.model -Matched $matched
  $launchScore = Add-WeightedKeywordScore -Text $lower -WeightedKeywords $signals.launch -Matched $matched
  $marketScore = Add-WeightedKeywordScore -Text $lower -WeightedKeywords $signals.marketplace -Matched $matched
  $allScores = @{
    price_change = $priceScore
    new_model_or_plan = $modelScore
    product_launch = $launchScore
    marketplace = $marketScore
  }

  switch ($strategy) {
    "pricing_page" {
      if ($priceScore -ge 14) {
        $kind = "price_change"
        $score = 55 + $priceScore
      } elseif ($modelScore -ge 14) {
        $kind = "new_model_or_plan"
        $score = 45 + $modelScore
      } elseif ($launchScore -ge 14) {
        $kind = "product_launch"
        $score = 42 + $launchScore
      }
    }
    "announcement_feed" {
      if ($modelScore -ge 14) {
        $kind = "new_model_or_plan"
        $score = 52 + $modelScore
      } elseif ($launchScore -ge 14) {
        $kind = "product_launch"
        $score = 50 + $launchScore
      } elseif ($priceScore -ge 18) {
        $kind = "price_change"
        $score = 48 + $priceScore
      }
    }
    "marketplace" {
      if ($priceScore -ge 14 -or $marketScore -ge 14) {
        $kind = "price_change"
        $score = 48 + [Math]::Max($priceScore, $marketScore)
      } elseif ($modelScore -ge 14 -or $launchScore -ge 14) {
        $kind = "new_model_or_plan"
        $score = 42 + [Math]::Max($modelScore, $launchScore)
      }
    }
    "competitor_page" {
      if ($priceScore -ge 14) {
        $kind = "price_change"
        $score = 48 + $priceScore
      } elseif ($modelScore -ge 14) {
        $kind = "new_model_or_plan"
        $score = 46 + $modelScore
      } elseif ($launchScore -ge 14) {
        $kind = "product_launch"
        $score = 44 + $launchScore
      }
    }
    "search_result" {
      if ($launchScore -ge 16) {
        $kind = "product_launch"
        $score = 44 + $launchScore
      } elseif ($modelScore -ge 16) {
        $kind = "new_model_or_plan"
        $score = 44 + $modelScore
      } elseif ($priceScore -ge 24) {
        $kind = "price_change"
        $score = 38 + $priceScore
      }
    }
    default {
      $dominant = $allScores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1
      if ($dominant.Value -ge 14 -and $dominant.Name -ne "marketplace") {
        $kind = [string]$dominant.Name
        $score = 42 + [int]$dominant.Value
      } elseif ($marketScore -ge 14) {
        $kind = "price_change"
        $score = 42 + $marketScore
      }
    }
  }

  if ($Page.TriggerPublishedAt) {
    $ageHours = ([DateTime]::UtcNow - ([DateTime]$Page.TriggerPublishedAt).ToUniversalTime()).TotalHours
    if ($ageHours -le 72) {
      $score += 8
    } elseif ($ageHours -le 168) {
      $score += 4
    }
  }

  if ($Source.source_type -eq "official_site" -or $Source.source_type -eq "rss") {
    $score += 5
  }

  if ($Source.reliability_score -ge 80) {
    $score += 5
  }

  $uniqueKeywords = @($matched | Select-Object -Unique)

  return [pscustomobject]@{
    Kind = $kind
    Importance = [Math]::Min(100, $score)
    Keywords = $uniqueKeywords
    Strategy = $strategy
  }
}

function Get-CandidateName {
  param([object]$Source, [object]$Page)

  if ($Source.source_type -eq "rss" -and ![string]::IsNullOrWhiteSpace($Page.Title)) {
    return $Page.Title.Split("|")[0].Trim()
  }

  $name = [string]$Source.name
  $name = $name -replace "\bofficial\b", ""
  $name = $name -replace "\bpricing\b", ""
  $name = $name -replace "\bprice\b", ""
  $name = $name -replace "\s+", " "
  $name = $name.Trim(" -")

  if (![string]::IsNullOrWhiteSpace($name)) {
    return $name
  }

  if (![string]::IsNullOrWhiteSpace($Page.Title)) {
    return $Page.Title.Split("|")[0].Trim()
  }

  return "Discovered service"
}

function Upsert-Candidate {
  param(
    [object]$Source,
    [object]$Page,
    [bool]$Changed,
    [object]$Classification,
    [string]$InitialStatus = "new"
  )

  $name = Get-CandidateName -Source $Source -Page $Page
  $slug = Normalize-Slug -Value $name
  $confidence = [Math]::Min(95, [int]$Source.reliability_score + $(if ($Changed) { 10 } else { 0 }) + $(if ($Classification.Importance -ge 80) { 5 } else { 0 }))
  $candidateUrl = if ($Page.TriggerUrl) { [string]$Page.TriggerUrl } else { [string]$Source.url }
  $statusNote = if ($InitialStatus -eq "watching") { "Kept for observation" } else { "Ready for review" }
  $reason = if ($Changed) {
    "Discovery source changed: $($Source.name). Classification: $($Classification.Kind), importance $($Classification.Importance). $statusNote."
  } else {
    "Discovery source scanned without content change: $($Source.name)."
  }

  if ($DryRun) {
    Write-Host "[dry-run] candidate $name ($slug), changed=$Changed, confidence=$confidence"
    return $null
  }

  $row = Invoke-PsqlJson @"
WITH upserted AS (
  INSERT INTO product_discovery_candidates (
    id,
    name,
    suggested_slug,
    suggested_category,
    provider,
    official_url,
    pricing_url,
    source_type,
    source_name,
    source_url,
    discovery_reason,
    confidence_score,
    status,
    raw_payload,
    first_seen_at,
    last_seen_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    $(Quote-SqlString $name),
    $(Quote-SqlString $slug),
    COALESCE($(Quote-SqlString $Source.category_hint)::product_category, 'ai'::product_category),
    $(Quote-SqlString $name),
    $(Quote-SqlString $candidateUrl),
    $(Quote-SqlString $candidateUrl),
    $(Quote-SqlString $Source.source_type)::discovery_candidate_source_type,
    $(Quote-SqlString $Source.name),
    $(Quote-SqlString $Source.url),
    $(Quote-SqlString $reason),
    $confidence,
      $(Quote-SqlString $InitialStatus)::discovery_candidate_status,
    $(Quote-SqlJson @{
      scanner = "scan-discovery-sources.ps1"
      title = $Page.Title
      summary = $Page.Summary
      content_hash = $Page.ContentHash
      feed_title = $Page.FeedTitle
      trigger_url = $Page.TriggerUrl
      trigger_external_id = $Page.TriggerExternalId
      trigger_published_at = if ($Page.TriggerPublishedAt) { $Page.TriggerPublishedAt.ToString("o") } else { $null }
      changed = $Changed
      change_kind = $Classification.Kind
      importance_score = $Classification.Importance
      source_strategy = $Classification.Strategy
      matched_keywords = $Classification.Keywords
    }),
    NOW(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (suggested_slug) WHERE suggested_slug IS NOT NULL AND status IN ('new', 'watching')
  DO UPDATE SET
    last_seen_at = NOW(),
    confidence_score = GREATEST(product_discovery_candidates.confidence_score, EXCLUDED.confidence_score),
    discovery_reason = EXCLUDED.discovery_reason,
    raw_payload = product_discovery_candidates.raw_payload || EXCLUDED.raw_payload,
    updated_at = NOW()
  RETURNING id
)
SELECT row_to_json(upserted) FROM upserted;
"@

  return [string]$row.id
}

function Record-Check {
  param(
    [object]$Source,
    [string]$Status,
    [object]$Page,
    [bool]$Changed,
    [object]$Classification,
    [AllowNull()][string]$CandidateId,
    [AllowNull()][string]$ErrorMessage
  )

  if ($DryRun) {
    $kind = if ($Classification) { $Classification.Kind } else { "unknown" }
    $importance = if ($Classification) { $Classification.Importance } else { 0 }
    Write-Host "[dry-run] check $($Source.name): status=$Status changed=$Changed kind=$kind importance=$importance"
    return
  }

  $httpStatus = if ($Page) { [int]$Page.HttpStatus } else { "NULL" }
  $finalUrl = if ($Page) { Quote-SqlString $Page.FinalUrl } else { "NULL" }
  $contentHash = if ($Page) { Quote-SqlString $Page.ContentHash } else { "NULL" }
  $title = if ($Page) { Quote-SqlString $Page.Title } else { "NULL" }
  $summary = if ($Page) { Quote-SqlString $Page.Summary } else { "NULL" }
  $candidate = if ($CandidateId) { "$(Quote-SqlString $CandidateId)::uuid" } else { "NULL" }
  $triggerUrl = if ($Page -and $Page.TriggerUrl) { Quote-SqlString $Page.TriggerUrl } else { "NULL" }
  $triggerExternalId = if ($Page -and $Page.TriggerExternalId) { Quote-SqlString $Page.TriggerExternalId } else { "NULL" }
  $triggerPublishedAt = if ($Page -and $Page.TriggerPublishedAt) { "$(Quote-SqlString ($Page.TriggerPublishedAt.ToString("o")))::timestamptz" } else { "NULL" }
  $triggerPayload = if ($Page -and $Page.TriggerPayload) { Quote-SqlJson $Page.TriggerPayload } else { "NULL" }
  $changeKind = if ($Classification) { [string]$Classification.Kind } else { "unknown" }
  $sourceStrategy = if ($Classification) { [string]$Classification.Strategy } else { Get-SourceStrategy -Source $Source }
  $importance = if ($Classification) { [int]$Classification.Importance } else { 0 }
  $keywords = if ($Classification -and $Classification.Keywords.Count -gt 0) {
    "ARRAY[" + (($Classification.Keywords | ForEach-Object { Quote-SqlString ([string]$_) }) -join ",") + "]::text[]"
  } else {
    "ARRAY[]::text[]"
  }

  Invoke-Psql @"
INSERT INTO discovery_source_checks (
  id,
  source_id,
  status,
  http_status,
  final_url,
  content_hash,
  title,
  summary,
  changed,
  change_kind,
  importance_score,
  matched_keywords,
  source_strategy,
  trigger_url,
  trigger_external_id,
  trigger_published_at,
  trigger_payload,
  candidate_id,
  error_message,
  checked_at,
  created_at
)
VALUES (
  gen_random_uuid(),
  $(Quote-SqlString $Source.id)::uuid,
  $(Quote-SqlString $Status),
  $httpStatus,
  $finalUrl,
  $contentHash,
  $title,
  $summary,
  $(if ($Changed) { "TRUE" } else { "FALSE" }),
  $(Quote-SqlString $changeKind),
  $importance,
  $keywords,
  $(Quote-SqlString $sourceStrategy),
  $triggerUrl,
  $triggerExternalId,
  $triggerPublishedAt,
  $triggerPayload,
  $candidate,
  $(Quote-SqlString $ErrorMessage),
  NOW(),
  NOW()
);
"@

  if ($Status -eq "succeeded") {
    Invoke-Psql @"
UPDATE discovery_sources
SET
  last_checked_at = NOW(),
  last_success_at = NOW(),
  manual_scan_requested_at = NULL,
  last_error = NULL,
  last_content_hash = $contentHash,
  last_title = $title,
  last_candidate_id = $candidate
WHERE id = $(Quote-SqlString $Source.id)::uuid;
"@
  } else {
    Invoke-Psql @"
UPDATE discovery_sources
SET
  last_checked_at = NOW(),
  manual_scan_requested_at = NULL,
  last_error = $(Quote-SqlString $ErrorMessage)
WHERE id = $(Quote-SqlString $Source.id)::uuid;
"@
  }
}

$sources = @(Get-DueSources)

if ($sources.Count -eq 0) {
  Write-Host "No discovery sources are due."
  return
}

$summary = @{
  checked = 0
  changed = 0
  candidates = 0
  watching = 0
  failed = 0
}

foreach ($source in $sources) {
  Write-Host "Scanning discovery source: $($source.name) <$($source.url)>"
  $summary.checked += 1

  try {
    $page = Get-SourcePage -Source $source
    $changed = [string]::IsNullOrWhiteSpace([string]$source.last_content_hash) -or $source.last_content_hash -ne $page.ContentHash
    $candidateId = $null

    $classification = Get-ChangeClassification -Source $source -Page $page -Changed $changed

    $promoteThreshold = Get-PromoteThreshold -Source $source
    $watchThreshold = Get-WatchThreshold -Source $source

    if ($changed -and $classification.Importance -ge $promoteThreshold) {
      $summary.changed += 1
      $candidateId = Upsert-Candidate -Source $source -Page $page -Changed $changed -Classification $classification -InitialStatus "new"
      if ($candidateId) { $summary.candidates += 1 }
    } elseif ($changed -and $classification.Importance -ge $watchThreshold) {
      $summary.changed += 1
      $candidateId = Upsert-Candidate -Source $source -Page $page -Changed $changed -Classification $classification -InitialStatus "watching"
      if ($candidateId) { $summary.watching += 1 }
      Write-Host "Changed and kept for observation: $($classification.Kind), score $($classification.Importance), promote threshold $promoteThreshold."
    } elseif ($changed) {
      $summary.changed += 1
      Write-Host "Changed but below watch threshold: $($classification.Kind), score $($classification.Importance), watch threshold $watchThreshold."
    }

    Record-Check -Source $source -Status "succeeded" -Page $page -Changed $changed -Classification $classification -CandidateId $candidateId -ErrorMessage $null
  } catch {
    $summary.failed += 1
    Write-Host "Failed: $($_.Exception.Message)"
    Record-Check -Source $source -Status "failed" -Page $null -Changed $false -Classification $null -CandidateId $null -ErrorMessage $_.Exception.Message
  }
}

Write-Host "Discovery scan complete. Checked: $($summary.checked). Changed: $($summary.changed). Candidates: $($summary.candidates). Watching: $($summary.watching). Failed: $($summary.failed)."

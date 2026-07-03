WITH plan_specs(product_slug, plan_slug, plan_name, sort_order) AS (
  VALUES
    ('chatgpt', 'go', 'ChatGPT Go', 10),
    ('chatgpt', 'plus', 'ChatGPT Plus', 20),
    ('chatgpt', 'pro-5x', 'ChatGPT Pro 5x', 30),
    ('chatgpt', 'pro', 'ChatGPT Pro 20x', 40),
    ('claude', 'pro', 'Claude Pro', 10),
    ('claude', 'max-5x', 'Claude Max 5x', 20),
    ('claude', 'max-20x', 'Claude Max 20x', 30),
    ('netflix', 'basic', 'Netflix Basic', 10),
    ('netflix', 'standard', 'Netflix Standard', 20),
    ('netflix', 'premium', 'Netflix Premium', 30)
)
UPDATE plans plan
SET
  name = plan_specs.plan_name,
  sort_order = plan_specs.sort_order,
  updated_at = NOW()
FROM plan_specs
JOIN products product ON product.slug = plan_specs.product_slug
WHERE plan.product_id = product.id
  AND plan.slug = plan_specs.plan_slug;

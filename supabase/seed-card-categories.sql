-- ============================================================
-- Card Categories — Spend Category Multipliers
-- Powers the Spend Optimizer ("which card for dining?").
-- 20 priority cards × their bonus categories.
--
-- NOTE: card_id references use NULL placeholders.
-- In production, replace with actual UUIDs from the cards table.
-- For local dev, these are matched by card name in the hook.
-- ============================================================

-- ─── Chase Sapphire Reserve ────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'travel', 3.00, 'Chase Sapphire Reserve — 3x on travel'),
(NULL, 'dining', 3.00, 'Chase Sapphire Reserve — 3x on dining');

-- ─── Chase Sapphire Preferred ──────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'travel', 2.00, 'Chase Sapphire Preferred — 2x on travel'),
(NULL, 'dining', 3.00, 'Chase Sapphire Preferred — 3x on dining'),
(NULL, 'streaming', 3.00, 'Chase Sapphire Preferred — 3x on streaming'),
(NULL, 'grocery', 3.00, 'Chase Sapphire Preferred — 3x on online grocery');

-- ─── Chase Freedom Flex ────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, cap_amount, cap_period, notes) VALUES
(NULL, 'rotating', 5.00, 1500.00, 'quarter', 'Chase Freedom Flex — 5x rotating quarterly (activate required)'),
(NULL, 'travel', 5.00, NULL, NULL, 'Chase Freedom Flex — 5x on Chase travel portal'),
(NULL, 'dining', 3.00, NULL, NULL, 'Chase Freedom Flex — 3x on dining'),
(NULL, 'drugstore', 3.00, NULL, NULL, 'Chase Freedom Flex — 3x on drugstores');

-- ─── Chase Freedom Unlimited ───────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'travel', 5.00, 'Chase Freedom Unlimited — 5x on Chase travel portal'),
(NULL, 'dining', 3.00, 'Chase Freedom Unlimited — 3x on dining'),
(NULL, 'drugstore', 3.00, 'Chase Freedom Unlimited — 3x on drugstores');

-- ─── Chase Ink Business Preferred ──────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, cap_amount, cap_period, notes) VALUES
(NULL, 'travel', 3.00, 150000.00, 'year', 'Chase Ink Business Preferred — 3x travel (first $150K/yr)'),
(NULL, 'shipping', 3.00, 150000.00, 'year', 'Chase Ink Business Preferred — 3x shipping (first $150K/yr)'),
(NULL, 'advertising', 3.00, 150000.00, 'year', 'Chase Ink Business Preferred — 3x social media/search ads (first $150K/yr)'),
(NULL, 'internet', 3.00, 150000.00, 'year', 'Chase Ink Business Preferred — 3x internet/cable/phone (first $150K/yr)');

-- ─── Chase Ink Business Cash ───────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, cap_amount, cap_period, notes) VALUES
(NULL, 'office', 5.00, 25000.00, 'year', 'Chase Ink Cash — 5x office supplies (first $25K/yr)'),
(NULL, 'internet', 5.00, 25000.00, 'year', 'Chase Ink Cash — 5x internet/cable/phone (first $25K/yr)'),
(NULL, 'gas', 2.00, 25000.00, 'year', 'Chase Ink Cash — 2x gas/dining (first $25K/yr)'),
(NULL, 'dining', 2.00, 25000.00, 'year', 'Chase Ink Cash — 2x gas/dining (first $25K/yr)');

-- ─── Chase Ink Business Unlimited ──────────────────────────────────────────
-- Flat 1.5x on everything, no bonus categories

-- ─── Amex Platinum ─────────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'flights', 5.00, 'Amex Platinum — 5x flights booked directly or via Amex Travel'),
(NULL, 'hotels', 5.00, 'Amex Platinum — 5x prepaid hotels via Amex Travel');

-- ─── Amex Gold ─────────────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'dining', 4.00, 'Amex Gold — 4x worldwide dining'),
(NULL, 'grocery', 4.00, 'Amex Gold — 4x US supermarkets (up to $25K/yr then 1x)'),
(NULL, 'flights', 3.00, 'Amex Gold — 3x flights booked directly with airlines');

-- ─── Amex Green ────────────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'travel', 3.00, 'Amex Green — 3x travel'),
(NULL, 'dining', 3.00, 'Amex Green — 3x dining'),
(NULL, 'transit', 3.00, 'Amex Green — 3x transit');

-- ─── Capital One Venture X ─────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'flights', 10.00, 'Capital One Venture X — 10x flights via Capital One Travel'),
(NULL, 'hotels', 10.00, 'Capital One Venture X — 10x hotels via Capital One Travel');

-- ─── Capital One Venture ───────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'flights', 5.00, 'Capital One Venture — 5x flights via Capital One Travel'),
(NULL, 'hotels', 5.00, 'Capital One Venture — 5x hotels via Capital One Travel');

-- ─── Capital One Savor ─────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'dining', 4.00, 'Capital One Savor — 4x dining'),
(NULL, 'entertainment', 4.00, 'Capital One Savor — 4x entertainment'),
(NULL, 'streaming', 4.00, 'Capital One Savor — 4x streaming'),
(NULL, 'grocery', 3.00, 'Capital One Savor — 3x grocery');

-- ─── Citi Strata Premier ──────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'flights', 3.00, 'Citi Strata Premier — 3x air travel'),
(NULL, 'hotels', 3.00, 'Citi Strata Premier — 3x hotels'),
(NULL, 'dining', 3.00, 'Citi Strata Premier — 3x dining'),
(NULL, 'grocery', 3.00, 'Citi Strata Premier — 3x grocery'),
(NULL, 'gas', 3.00, 'Citi Strata Premier — 3x gas');

-- ─── Citi Double Cash ──────────────────────────────────────────────────────
-- Flat 2% (1% purchase + 1% payment), no bonus categories

-- ─── Citi Custom Cash ──────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, cap_amount, cap_period, notes) VALUES
(NULL, 'top_category', 5.00, 500.00, 'billing_cycle', 'Citi Custom Cash — 5% on your highest spend category (up to $500/cycle)');

-- ─── Bilt Mastercard ───────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'dining', 3.00, 'Bilt Mastercard — 3x dining'),
(NULL, 'travel', 2.00, 'Bilt Mastercard — 2x travel'),
(NULL, 'rent', 1.00, 'Bilt Mastercard — 1x on rent (unique: no other card earns on rent)');

-- ─── US Bank Altitude Reserve ──────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'mobile_wallet', 3.00, 'US Bank Altitude Reserve — 3x on mobile wallet (Apple Pay, Google Pay, Samsung Pay)'),
(NULL, 'travel', 3.00, 'US Bank Altitude Reserve — 3x travel'),
(NULL, 'dining', 3.00, 'US Bank Altitude Reserve — 3x dining via mobile wallet');

-- ─── Discover it ───────────────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, cap_amount, cap_period, notes) VALUES
(NULL, 'rotating', 5.00, 1500.00, 'quarter', 'Discover it — 5% rotating quarterly (activate required)');

-- ─── BofA Premium Rewards ──────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'travel', 2.00, 'BofA Premium Rewards — 2x travel'),
(NULL, 'dining', 2.00, 'BofA Premium Rewards — 2x dining');

-- ─── Wells Fargo Autograph ─────────────────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'dining', 3.00, 'Wells Fargo Autograph — 3x dining'),
(NULL, 'travel', 3.00, 'Wells Fargo Autograph — 3x travel'),
(NULL, 'gas', 3.00, 'Wells Fargo Autograph — 3x gas'),
(NULL, 'transit', 3.00, 'Wells Fargo Autograph — 3x transit'),
(NULL, 'streaming', 3.00, 'Wells Fargo Autograph — 3x streaming'),
(NULL, 'phone', 3.00, 'Wells Fargo Autograph — 3x phone plans');

-- ─── Barclays AAdvantage Aviator Red ───────────────────────────────────────
INSERT INTO card_categories (card_id, category, multiplier, notes) VALUES
(NULL, 'american_airlines', 2.00, 'Barclays AAdvantage Aviator Red — 2x on American Airlines purchases');

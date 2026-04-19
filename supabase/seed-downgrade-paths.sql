-- ============================================================
-- Downgrade Paths — Static Reference Data
-- Maps premium cards to their no-fee or lower-fee alternatives.
-- Used by the Annual Fee Advisor when recommending downgrades.
--
-- NOTE: card_id references use card names as comments.
-- In production, replace with actual UUIDs from the cards table.
-- For local dev, these are matched by card name in the hook.
-- ============================================================

-- Chase product changes
INSERT INTO downgrade_paths (from_card_id, to_card_id, issuer, notes) VALUES
-- CSR → CSP
(NULL, NULL, 'chase', 'Chase Sapphire Reserve → Chase Sapphire Preferred|Keep UR earning at lower fee ($95 vs $550). Retain transfer partners.'),
-- CSR → CFF
(NULL, NULL, 'chase', 'Chase Sapphire Reserve → Chase Freedom Flex|No annual fee. Quarterly 5x categories. Keep UR pool if you have another Sapphire/Ink.'),
-- CSR → CFU
(NULL, NULL, 'chase', 'Chase Sapphire Reserve → Chase Freedom Unlimited|No annual fee. Flat 1.5% on everything. UR pool preserved with another premium card.'),
-- CSP → CFF
(NULL, NULL, 'chase', 'Chase Sapphire Preferred → Chase Freedom Flex|No annual fee. Quarterly rotating 5x categories. Keeps UR ecosystem active.'),
-- CSP → CFU
(NULL, NULL, 'chase', 'Chase Sapphire Preferred → Chase Freedom Unlimited|No annual fee. 1.5x on everything. Solid daily driver.'),
-- Ink Preferred → Ink Cash
(NULL, NULL, 'chase', 'Chase Ink Business Preferred → Chase Ink Business Cash|No annual fee. 5x office supplies/internet/phone. Keeps UR pool for biz spend.'),
-- Ink Preferred → Ink Unlimited
(NULL, NULL, 'chase', 'Chase Ink Business Preferred → Chase Ink Business Unlimited|No annual fee. 1.5x flat rate on business purchases.');

-- Amex product changes
INSERT INTO downgrade_paths (from_card_id, to_card_id, issuer, notes) VALUES
-- Platinum → Green
(NULL, NULL, 'amex', 'Amex Platinum → Amex Green|Lower fee ($150 vs $695). Keeps MR pool. Travel and dining multipliers.'),
-- Platinum → EveryDay
(NULL, NULL, 'amex', 'Amex Platinum → Amex EveryDay|No annual fee. Keeps MR pool alive. 2x grocery, 1x everywhere.'),
-- Gold → Green
(NULL, NULL, 'amex', 'Amex Gold → Amex Green|Lower fee ($150 vs $325). Keeps MR. Travel 3x, dining 3x.'),
-- Gold → EveryDay
(NULL, NULL, 'amex', 'Amex Gold → Amex EveryDay|No annual fee. Preserves MR balance. 2x grocery with 20+ transactions/month bonus.'),
-- Green → EveryDay
(NULL, NULL, 'amex', 'Amex Green → Amex EveryDay|Eliminates $150 fee. MR pool preserved. Lower earn rate but no cost.');

-- Capital One product changes
INSERT INTO downgrade_paths (from_card_id, to_card_id, issuer, notes) VALUES
-- Venture X → Venture
(NULL, NULL, 'capital_one', 'Capital One Venture X → Capital One Venture|Lower fee ($95 vs $395). Still earns 2x miles on everything.'),
-- Venture → VentureOne
(NULL, NULL, 'capital_one', 'Capital One Venture → Capital One VentureOne|No annual fee. 1.25x miles on everything.'),
-- Savor → SavorOne
(NULL, NULL, 'capital_one', 'Capital One Savor → Capital One SavorOne|No annual fee. Dining drops from 4% to 3%, entertainment stays at 3%.');

-- Citi product changes
INSERT INTO downgrade_paths (from_card_id, to_card_id, issuer, notes) VALUES
-- Strata Premier → Double Cash
(NULL, NULL, 'citi', 'Citi Strata Premier → Citi Double Cash|No annual fee. Flat 2% on everything. TYP pool preserved.'),
-- Strata Premier → Custom Cash
(NULL, NULL, 'citi', 'Citi Strata Premier → Citi Custom Cash|No annual fee. 5% on top spend category (capped at $500/quarter).');

-- Bank of America
INSERT INTO downgrade_paths (from_card_id, to_card_id, issuer, notes) VALUES
-- Premium Rewards → Customized Cash
(NULL, NULL, 'bank_of_america', 'BofA Premium Rewards → BofA Customized Cash|No annual fee. 3% on chosen category, 2% grocery/wholesale.');

-- US Bank
INSERT INTO downgrade_paths (from_card_id, to_card_id, issuer, notes) VALUES
-- Altitude Reserve → Altitude Go
(NULL, NULL, 'us_bank', 'US Bank Altitude Reserve → Altitude Go|No annual fee. 4x dining, 2x grocery/streaming.');

-- Wells Fargo
INSERT INTO downgrade_paths (from_card_id, to_card_id, issuer, notes) VALUES
-- Autograph Journey → Autograph
(NULL, NULL, 'wells_fargo', 'Wells Fargo Autograph Journey → Autograph|No annual fee. 3x dining/travel/gas/transit/streaming.');

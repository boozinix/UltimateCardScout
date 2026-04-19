-- ============================================================
-- Retention Scripts — Curated Library
-- ~30 scripts organized by issuer × situation.
-- These are STATIC, human-reviewed. Never AI-generated at runtime.
-- ============================================================

-- Chase — below breakeven
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('chase', 'below_breakeven', 'Hi, I''ve been a Chase cardmember for a while now, and my annual fee just posted. I''m trying to evaluate whether the card still makes sense for my spending. I really value the travel benefits, but I''m not sure I''m getting enough use out of them this year. Are there any retention offers or statement credits available to help offset the fee?'),
('chase', 'above_breakeven', 'Hi, I love this card and I''ve been getting great value from it. My annual fee just posted and I wanted to check — are there any retention offers available? I''d like to keep the card for another year, but any help with the fee would be appreciated.'),
('chase', 'considering_downgrade', 'I''ve been thinking about whether I should keep this card or downgrade to the Freedom Flex or Freedom Unlimited. Before I do that, I wanted to see if there are any offers available to make keeping the premium card worthwhile for another year.'),
('chase', 'first_year', 'Hi, this is my first year with this card. I''ve enjoyed the benefits but I''m evaluating whether the annual fee makes sense going forward. Are there any offers for cardmembers considering whether to keep the card?');

-- Amex — below breakeven
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('amex', 'below_breakeven', 'Hi, I''ve been an Amex cardmember for several years and I really appreciate the service. My annual fee is coming up, and while I love the lounge access and travel credits, I''m not sure I''m using them enough to justify the fee this year. I''d like to see if there are any retention offers available before I make a decision.'),
('amex', 'above_breakeven', 'I love the card and the benefits — I use the travel credit, lounge access, and the statement credits regularly. The fee just posted and I wanted to see if there are any retention offers available before I commit for another year.'),
('amex', 'considering_downgrade', 'I''m considering whether to keep my Platinum or move to the Green card for a lower fee. I really value the Membership Rewards ecosystem and don''t want to lose my points. Before I make that switch, are there any offers to help with the annual fee?'),
('amex', 'high_spend', 'I put significant spend on this card each month and I''ve been a loyal member. My fee is coming up and I wanted to check if there are any retention offers based on my spending history. I''d like to keep the relationship strong.'),
('amex', 'first_year', 'Hi, I''m coming up on my first annual fee. I''ve been enjoying the card benefits but I want to make sure the value is there before I pay the full fee. Are there any offers available for newer cardmembers?'),
('amex', 'gold_below_breakeven', 'I have the Amex Gold and my annual fee is coming up. I love the dining and grocery multipliers, but I''m not sure the credits are covering the fee for my situation. Are there any retention offers or credits available?'),
('amex', 'gold_above_breakeven', 'I use my Gold card heavily for dining and groceries — it''s my go-to card for those categories. My fee is posting soon and I wanted to check on any available retention offers. I''d like to continue as a cardmember.');

-- Citi — below breakeven
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('citi', 'below_breakeven', 'Hi, I''m a Citi cardmember and my annual fee is approaching. I''m evaluating whether the card benefits are worth the fee for my current spending. Are there any retention offers, statement credits, or bonus points available?'),
('citi', 'above_breakeven', 'I enjoy using my Citi card, especially for the ThankYou Points and travel benefits. My annual fee is coming up and I wanted to see if there are any offers available to loyal cardmembers before I renew.'),
('citi', 'considering_downgrade', 'I''m thinking about whether to keep my Strata Premier or switch to the Double Cash for no annual fee. I value the ThankYou Points program. Before I make that change, are there any retention offers available?');

-- Capital One
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('capital_one', 'below_breakeven', 'Hi, I have the Venture X and my annual fee is coming up. While I love the lounge access and the travel credit, I''m not fully using all the benefits. Are there any offers or credits available to help with the fee?'),
('capital_one', 'above_breakeven', 'I''ve been very happy with my Venture X — the lounge access and travel credits have been great. My fee is approaching and I was wondering if there are any retention offers for loyal cardmembers.'),
('capital_one', 'considering_downgrade', 'I''m evaluating whether to keep my Venture X or move down to the regular Venture card. Before I make that decision, I wanted to see if there are any offers available to make the premium card more worthwhile.');

-- Bank of America
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('bank_of_america', 'below_breakeven', 'Hi, my annual fee is approaching on my BofA card and I''m trying to decide if it makes sense to keep it. I appreciate the rewards program but I''m not sure the fee is justified for my spending level. Are there any retention offers available?'),
('bank_of_america', 'above_breakeven', 'I''ve been a loyal Bank of America customer and I use my card regularly. My annual fee is coming up and I wanted to check if there are any offers or credits available for existing cardmembers.');

-- US Bank
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('us_bank', 'below_breakeven', 'Hi, I have the Altitude Reserve and my annual fee is coming up. I enjoy the mobile wallet multiplier but I''m not sure I''m using the travel credit enough to justify the fee. Are there any retention offers available?'),
('us_bank', 'above_breakeven', 'I love my Altitude Reserve and use the travel credit and mobile wallet bonus regularly. My fee is posting soon — are there any loyalty offers available?');

-- Barclays
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('barclays', 'below_breakeven', 'Hi, my annual fee is approaching on my Barclays card and I''m evaluating whether to keep it. I enjoy the benefits but I''m looking at whether the value matches the cost. Are there any retention offers or statement credits available?'),
('barclays', 'above_breakeven', 'I''ve been happy with my Barclays card and use the benefits regularly. My annual fee is coming up and I wanted to check if there are any offers available for loyal cardmembers.');

-- Wells Fargo
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('wells_fargo', 'below_breakeven', 'Hi, I have a Wells Fargo card with an annual fee coming up. I''m trying to decide if the rewards justify the cost for my spending patterns. Are there any retention offers or credits available?'),
('wells_fargo', 'above_breakeven', 'I enjoy using my Wells Fargo card and the rewards have been solid. My fee is approaching and I wanted to see if there are any offers for existing cardmembers.');

-- Discover (no annual fee cards generally, but include for completeness)
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('discover', 'general', 'Hi, I''ve been a Discover cardmember and I''m evaluating my card lineup. I wanted to check if there are any special offers, credit line increases, or bonus cashback promotions available for existing members.');

-- Generic / Other issuers
INSERT INTO retention_scripts (issuer, situation, script_text) VALUES
('other', 'below_breakeven', 'Hi, my annual fee is approaching and I''m evaluating whether to keep this card. I appreciate the benefits but I''m not sure the value matches the fee for my current spending. Are there any retention offers, statement credits, or bonus points available?'),
('other', 'above_breakeven', 'I''ve been enjoying this card and using the benefits regularly. My annual fee is coming up and I wanted to check if there are any loyalty offers or credits available before I renew.'),
('other', 'considering_downgrade', 'I''m considering downgrading to a no-annual-fee version of this card. Before I do that, I wanted to see if there are any offers that would make keeping the premium version worthwhile for another year.');

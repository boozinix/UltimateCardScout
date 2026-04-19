-- ============================================================
-- Seed: Points Valuations (CPP values)
-- Source: The Points Guy (TPG) consensus valuations
-- Run manually after 002_extra_tables.sql migration.
-- ============================================================

INSERT INTO points_valuations (program, cpp, source) VALUES
('Chase Ultimate Rewards', 1.25, 'TPG'),
('Amex Membership Rewards', 1.25, 'TPG'),
('Capital One Miles', 1.25, 'TPG'),
('Citi ThankYou Points', 1.25, 'TPG'),
('Bilt Points', 1.25, 'TPG'),
('World of Hyatt', 1.50, 'TPG'),
('United MileagePlus', 1.30, 'TPG'),
('Delta SkyMiles', 1.10, 'TPG'),
('American Airlines AAdvantage', 1.30, 'TPG'),
('Southwest Rapid Rewards', 1.30, 'TPG'),
('Marriott Bonvoy', 0.70, 'TPG'),
('Hilton Honors', 0.50, 'TPG'),
('IHG One Rewards', 0.50, 'TPG'),
('JetBlue TrueBlue', 1.20, 'TPG'),
('Alaska Mileage Plan', 1.50, 'TPG')
ON CONFLICT (program) DO UPDATE SET cpp = EXCLUDED.cpp, source = EXCLUDED.source, updated_at = now();

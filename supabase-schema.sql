-- Tạo bảng orders (Lưu trữ thông tin đơn hàng)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id UUID,
    ign TEXT NOT NULL,
    money_m NUMERIC NOT NULL,
    total_vnd NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid_waiting', 'completed', 'cancelled')),
    cancel_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo bảng app_configs (Lưu trữ cấu hình của shop)
CREATE TABLE IF NOT EXISTS app_configs (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS (Bảo mật cấp dòng)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies cho orders
DROP POLICY IF EXISTS "Cho phép thêm đơn hàng" ON orders;
CREATE POLICY "Cho phép thêm đơn hàng" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép xem đơn hàng" ON orders;
CREATE POLICY "Cho phép xem đơn hàng" ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép cập nhật đơn hàng" ON orders;
CREATE POLICY "Cho phép cập nhật đơn hàng" ON orders FOR UPDATE USING (true) WITH CHECK (true);

-- RLS policies cho app_configs (Cho phép đọc và chỉnh sửa cấu hình)
DROP POLICY IF EXISTS "Cho phép xem cấu hình" ON app_configs;
CREATE POLICY "Cho phép xem cấu hình" ON app_configs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép toàn quyền cấu hình" ON app_configs;
CREATE POLICY "Cho phép toàn quyền cấu hình" ON app_configs FOR ALL USING (true) WITH CHECK (true);

-- Thêm cấu hình mặc định (Tỷ giá, thông tin ngân hàng)
INSERT INTO app_configs (key, value) VALUES 
('rate_per_m', '10000'),
('bank_name', 'MB Bank'),
('bank_id', 'MB'),
('bank_account', '0123456789'),
('bank_owner', 'NGUYEN VAN A')
ON CONFLICT (key) DO NOTHING;

-- Bật realtime cho orders
BEGIN;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

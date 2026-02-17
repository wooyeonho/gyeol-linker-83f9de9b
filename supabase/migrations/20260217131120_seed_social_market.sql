INSERT INTO gyeol_skins (id, name, description, price, category, tags, downloads, rating, is_approved, skin_data) VALUES
  (gen_random_uuid(), 'Cosmic Blue', '우주 느낌의 블루 글로우', 0, 'basic', ARRAY['blue','cosmic'], 120, 4.5, true, '{"color_primary":"#1E40AF","color_secondary":"#3B82F6","glow_intensity":0.6}'),
  (gen_random_uuid(), 'Amber Warm', '따뜻한 앰버 톤', 500, 'premium', ARRAY['amber','warm'], 89, 4.8, true, '{"color_primary":"#D97706","color_secondary":"#F59E0B","glow_intensity":0.5}'),
  (gen_random_uuid(), 'Indigo Night', '깊은 인디고 나이트', 300, 'basic', ARRAY['indigo','night'], 150, 4.3, true, '{"color_primary":"#312E81","color_secondary":"#6366F1","glow_intensity":0.7}'),
  (gen_random_uuid(), 'Rose Gold', '로즈 골드 프리미엄', 800, 'premium', ARRAY['rose','gold'], 45, 4.9, true, '{"color_primary":"#BE185D","color_secondary":"#F472B6","glow_intensity":0.5}'),
  (gen_random_uuid(), 'Aurora Borealis', '오로라 효과', 1000, 'rare', ARRAY['aurora','rainbow'], 22, 5.0, true, '{"color_primary":"#059669","color_secondary":"#A855F7","glow_intensity":0.9}'),
  (gen_random_uuid(), 'Void Black', '순수한 블랙', 0, 'basic', ARRAY['black','minimal'], 300, 4.6, true, '{"color_primary":"#000000","color_secondary":"#1F2937","glow_intensity":0.2}')
ON CONFLICT DO NOTHING;

INSERT INTO gyeol_skills (id, name, description, category, min_gen, price, downloads, rating, is_approved) VALUES
  (gen_random_uuid(), 'RSS 학습', 'RSS 피드에서 자동 학습', '유틸리티', 1, 0, 200, 4.5, true),
  (gen_random_uuid(), '자기 사색', '대화 분석 후 자기 성찰', '성장', 1, 0, 180, 4.7, true),
  (gen_random_uuid(), '먼저 말 걸기', '사용자에게 먼저 인사', '소셜', 2, 0, 150, 4.8, true)
ON CONFLICT DO NOTHING;

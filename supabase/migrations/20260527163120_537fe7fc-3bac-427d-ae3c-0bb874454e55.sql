DROP POLICY IF EXISTS mockups_insert ON storage.objects;
DROP POLICY IF EXISTS mockups_update ON storage.objects;
DROP POLICY IF EXISTS mockups_delete ON storage.objects;

CREATE POLICY mockups_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mockups');
CREATE POLICY mockups_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mockups') WITH CHECK (bucket_id = 'mockups');
CREATE POLICY mockups_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mockups');
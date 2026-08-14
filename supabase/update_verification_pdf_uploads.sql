update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf']::text[]
where id in ('tutor-verifications', 'match-verifications');

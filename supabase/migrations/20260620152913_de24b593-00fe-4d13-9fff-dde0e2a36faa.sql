UPDATE public.issues 
SET title = 'Should our city expand the protected bike' || chr(160) 
WHERE title = 'Should our city expand the protected bike lane network downtown?';
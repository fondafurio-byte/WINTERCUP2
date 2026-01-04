-- Add team_photo_url field to squadre table
-- This field will store the URL of the team photo that appears below the logo

ALTER TABLE squadre 
ADD COLUMN IF NOT EXISTS team_photo_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN squadre.team_photo_url IS 'URL della foto della squadra che appare sotto il logo nella pagina partecipanti';

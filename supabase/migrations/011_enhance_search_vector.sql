-- Protocol: Search Context Enhancement
-- Improves search relevance by adding weights and indexing industry codes + product categories

CREATE OR REPLACE FUNCTION update_business_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    -- Weight A: Name and Verified Industry Codes (High relevance)
    setweight(to_tsvector('norwegian', COALESCE(NEW.legal_name, '')), 'A') ||
    setweight(to_tsvector('norwegian', COALESCE(NEW.registry_data->>'industry_codes', '')), 'A') ||
    
    -- Weight B: Description and Product Categories (Contextual relevance)
    setweight(to_tsvector('norwegian', COALESCE(NEW.company_description, '')), 'B') ||
    setweight(to_tsvector('norwegian', COALESCE(array_to_string(NEW.product_categories, ' '), '')), 'B') ||
    
    -- Weight C: Org number and Address (Specific lookup or location)
    setweight(to_tsvector('norwegian', COALESCE(NEW.org_number, '')), 'A') || -- Org number upgrade to A for direct hits
    setweight(to_tsvector('norwegian', COALESCE(NEW.domain, '')), 'C') ||
    setweight(to_tsvector('norwegian', COALESCE(NEW.registry_data->>'registered_address', '')), 'C');
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Force update on all rows to rebuild the index with new logic
UPDATE businesses SET id = id;

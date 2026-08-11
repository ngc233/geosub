-- GeoSub backfill migration. Split from sql/001_affordability_income_tables.sql; see migration-layout.json.

UPDATE countries AS c
SET iso3 = v.iso3
FROM (
  VALUES
    ('US','USA'), ('CA','CAN'), ('MX','MEX'), ('BR','BRA'), ('AR','ARG'), ('CL','CHL'), ('CO','COL'), ('PE','PER'),
    ('GB','GBR'), ('IE','IRL'), ('FR','FRA'), ('DE','DEU'), ('ES','ESP'), ('IT','ITA'), ('NL','NLD'), ('BE','BEL'),
    ('CH','CHE'), ('AT','AUT'), ('DK','DNK'), ('SE','SWE'), ('NO','NOR'), ('FI','FIN'), ('PL','POL'), ('PT','PRT'), ('TR','TUR'),
    ('JP','JPN'), ('KR','KOR'), ('CN','CHN'), ('TW','TWN'), ('HK','HKG'), ('SG','SGP'), ('MY','MYS'), ('TH','THA'),
    ('VN','VNM'), ('ID','IDN'), ('PH','PHL'), ('IN','IND'), ('PK','PAK'),
    ('AU','AUS'), ('NZ','NZL'),
    ('EG','EGY'), ('ZA','ZAF'), ('NG','NGA'), ('KE','KEN'),
    ('SA','SAU'), ('AE','ARE'), ('IL','ISR')
) AS v(code, iso3)
WHERE UPPER(c.code) = v.code
  AND (c.iso3 IS NULL OR c.iso3 = '');

-- SARS-compliant schema migration - Part 3: Initial data

-- Insert HS sections
INSERT INTO hs_code_sections (code, roman_numeral, description) VALUES
  ('S1', 'I', 'Live Animals; Animal Products'),
  ('S2', 'II', 'Vegetable Products'),
  ('S3', 'III', 'Animal or Vegetable Fats and Oils and Their Cleavage Products; Prepared Edible Fats; Animal or Vegetable Waxes'),
  ('S4', 'IV', 'Prepared Foodstuffs; Beverages, Spirits and Vinegar; Tobacco and Manufactured Tobacco Substitutes'),
  ('S5', 'V', 'Mineral Products'),
  ('S6', 'VI', 'Products of the Chemical or Allied Industries'),
  ('S7', 'VII', 'Plastics and Articles Thereof; Rubber and Articles Thereof'),
  ('S8', 'VIII', 'Raw Hides and Skins, Leather, Furskins and Articles Thereof; Saddlery and Harness; Travel Goods, Handbags and Similar Containers; Articles of Animal Gut (Other Than Silk-Worm Gut)'),
  ('S9', 'IX', 'Wood and Articles of Wood; Wood Charcoal; Cork and Articles of Cork; Manufactures of Straw, of Esparto or of Other Plaiting Materials; Basketware and Wickerwork'),
  ('S10', 'X', 'Pulp of Wood or of Other Fibrous Cellulosic Material; Recovered (Waste and Scrap) Paper or Paperboard; Paper and Paperboard and Articles Thereof'),
  ('S11', 'XI', 'Textiles and Textile Articles'),
  ('S12', 'XII', 'Footwear, Headgear, Umbrellas, Sun Umbrellas, Walking-Sticks, Seat-Sticks, Whips, Riding-Crops and Parts Thereof; Prepared Feathers and Articles Made Therewith; Artificial Flowers; Articles of Human Hair'),
  ('S13', 'XIII', 'Articles of Stone, Plaster, Cement, Asbestos, Mica or Similar Materials; Ceramic Products; Glass and Glassware'),
  ('S14', 'XIV', 'Natural or Cultured Pearls, Precious or Semi-Precious Stones, Precious Metals, Metals Clad with Precious Metal and Articles Thereof; Imitation Jewellery; Coin'),
  ('S15', 'XV', 'Base Metals and Articles of Base Metal'),
  ('S16', 'XVI', 'Machinery and Mechanical Appliances; Electrical Equipment; Parts Thereof; Sound Recorders and Reproducers, Television Image and Sound Recorders and Reproducers, and Parts and Accessories of Such Articles'),
  ('S17', 'XVII', 'Vehicles, Aircraft, Vessels and Associated Transport Equipment'),
  ('S18', 'XVIII', 'Optical, Photographic, Cinematographic, Measuring, Checking, Precision, Medical or Surgical Instruments and Apparatus; Clocks and Watches; Musical Instruments; Parts and Accessories Thereof'),
  ('S19', 'XIX', 'Arms and Ammunition; Parts and Accessories Thereof'),
  ('S20', 'XX', 'Miscellaneous Manufactured Articles'),
  ('S21', 'XXI', 'Works of Art, Collectors'' Pieces and Antiques');
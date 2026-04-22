INSERT INTO utenti (email, password, ruolo)
VALUES ('frank@mail.it', '$2b$10$dkCr4BsdKUN/24wVMqE8yOuhd/aeP9/fx.dZzgAy.mIForaoKW7jq', 'admin');

INSERT INTO edizioni (collocazione, autore, titolo, data_str, editore, descrizione)
VALUES ('1', 'Cherubini Luigi (1760-1842)', '"Cours de contrepoint et de fugue par Luigi Cherubini Membre de l''Institut de France Directeur du Conservatoire de Musique Officier de la Légion d''Honneur"', '1863', 'Paris, Au Ménestrel, Heugel & Cie Editeurs H. 4041 (2ème édition)', 'In folio, 204 pagine. Timbro “AU MENESTREL 2bis R.Vivienne HEUGEL & Cie” in basso nel frontespizio. Copertina con iniziali dorate “A.T”');

INSERT INTO immagini_edizioni (edizione_id, url_immagine, ordine)
VALUES (1, 'url immagine edizione...', 1);

INSERT INTO stampe (autore, titolo, data_str, stampa, dimensioni)
VALUES ('Elisha Kirkall (c.1682-1742) da Joseph Goupy (1689-1769)', 'Ritratto di Senesino (1686-1758)', '1727', 'Mezzatinta', 'Altezza: 31,9 cm (12,5 pollici); larghezza: 22,4 cm (8,8 pollici)');

INSERT INTO immagini_stampe (stampa_id, url_immagine, ordine)
VALUES (1, 'url immagine stampa...', 1);
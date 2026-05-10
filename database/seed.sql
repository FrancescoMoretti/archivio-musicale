INSERT INTO utenti (email, password, nome, ruolo)
VALUES ('frank@mail.it', '$2b$10$oNTgs0kfXlaXDdPPtjfZbeUD93mD4bbtsgePIE0yVjueacUlIQP0a', 'Frank', 'superadmin');

INSERT INTO utenti (email, password, nome, ruolo)
VALUES ('luca@mail.it', '$2b$10$dkCr4BsdKUN/24wVMqE8yOuhd/aeP9/fx.dZzgAy.mIForaoKW7jq', 'Luca', 'admin');

INSERT INTO utenti (email, password, nome, ruolo)
VALUES ('chichi@mail.it', '$2b$10$wTUWb.5LDnCEOLV3W8dcTOSHcsQpv2BT.Vcb86nV5GPm3z2BAToqq', 'Chichi', 'editor');

INSERT INTO edizioni (collocazione, autore, titolo, data_str, editore, descrizione)
VALUES ('1', 'Cherubini Luigi (1760-1842)', '"Cours de contrepoint et de fugue par Luigi Cherubini Membre de l''Institut de France Directeur du Conservatoire de Musique Officier de la Légion d''Honneur"', '1863', 'Paris, Au Ménestrel, Heugel & Cie Editeurs H. 4041 (2ème édition)', 'In folio, 204 pagine. Timbro “AU MENESTREL 2bis R.Vivienne HEUGEL & Cie” in basso nel frontespizio. Copertina con iniziali dorate “A.T”');

INSERT INTO immagini_edizioni (edizione_id, url_immagine, ordine)
VALUES (1, 'url immagine edizione...', 1);
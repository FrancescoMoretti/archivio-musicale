SET FOREIGN_KEY_CHECKS = 0;--disabilito controlli sulle chiavi esterne
DROP TABLE IF EXISTS immagini_edizioni;
DROP TABLE IF EXISTS edizioni;
DROP TABLE IF EXISTS immagini_stampe;
DROP TABLE IF EXISTS stampe;
DROP TABLE IF EXISTS immagini_eventi;
DROP TABLE IF EXISTS eventi;
DROP TABLE IF EXISTS utenti;
SET FOREIGN_KEY_CHECKS = 1;--riabilito i controlli sulle chiavi esterne

CREATE TABLE utenti(
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(30) NOT NULL,
    ruolo ENUM('superadmin', 'admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
    psw_cambiata BOOLEAN DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES utenti(id) ON DELETE SET NULL
);

CREATE TABLE edizioni(
    id INT AUTO_INCREMENT PRIMARY KEY,
    collocazione VARCHAR(10) UNIQUE NOT NULL,
    link_rism VARCHAR(255),
    autore VARCHAR(255) NOT NULL,
    titolo VARCHAR(255) NOT NULL,
    data_str VARCHAR(50),
    editore VARCHAR(255),
    descrizione TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (created_by) REFERENCES utenti(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES utenti(id) ON DELETE SET NULL
);

CREATE TABLE immagini_edizioni(
    id INT AUTO_INCREMENT PRIMARY KEY,
    edizione_id INT NOT NULL,
    url_immagine VARCHAR(255) NOT NULL,
    ordine INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (edizione_id) REFERENCES edizioni(id) ON DELETE CASCADE
);

CREATE TABLE stampe(
    id INT AUTO_INCREMENT PRIMARY KEY,
    collocazione VARCHAR(10) UNIQUE NOT NULL,
    autore VARCHAR(255) NOT NULL,
    titolo VARCHAR(255) NOT NULL,
    data_str VARCHAR(50),
    stampa VARCHAR(100),
    dimensioni VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (created_by) REFERENCES utenti(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES utenti(id) ON DELETE SET NULL
);

CREATE TABLE immagini_stampe(
    id INT AUTO_INCREMENT PRIMARY KEY,
    stampa_id INT NOT NULL,
    url_immagine VARCHAR(255) NOT NULL,
    ordine INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stampa_id) REFERENCES stampe(id) ON DELETE CASCADE
);

CREATE TABLE eventi(
    id INT AUTO_INCREMENT PRIMARY KEY,
    codice VARCHAR(10) UNIQUE NOT NULL,
    link_evento VARCHAR(255),
    link_facebook VARCHAR(255),
    link_instagram VARCHAR(255),
    titolo VARCHAR(100) NOT NULL,
    descrizione TEXT NOT NULL,
    data_inizio DATE NOT NULL,
    data_fine DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (created_by) REFERENCES utenti(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES utenti(id) ON DELETE SET NULL
);

CREATE TABLE immagini_eventi(
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    url_immagine VARCHAR(255) NOT NULL,
    ordine INT DEFAULT 0,
    FOREIGN KEY (evento_id) REFERENCES eventi(id) ON DELETE CASCADE
);
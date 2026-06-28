# Archivio musicale Luca Moretti
Digitalizzazione dell'archivio
```mermaid
flowchart LR

    subgraph "Utenti"
        Viewer(["visualizzatore"])
        Admin(["amministratore"])
    end

    subgraph "Server\n(Railway)"
        S_admin["/admin"]
        S_public["/public"]
    end

    subgraph "Database"
        Aiven[("Dati testuali\n(Aiven)")]
        Cloudinary[("Immagini\n(Cloudinary)")]
    end

    Viewer -- "Richiesta risorsa" --> S_public
    Admin -- "Inserimento/modifica risorse" --> S_admin
    S_admin -- "Query (Lettura/Scrittura)" --> Aiven
    S_admin -- "Upload immagini" --> Cloudinary
    S_public -- "Query (Lettura)" --> Aiven
    S_public -- "Dati risorsa + url immagini" --> Viewer
    Viewer -. "Download Immagini" .-> Cloudinary

    %%stile
    classDef viewer fill:#ececff,stroke:#9370db,stroke-width:2px, color: #1a1a1a;
    classDef server fill:#e1f5fe,stroke:#0288d1,stroke-width:2px, color: #1a1a1a;
    classDef admin fill:#ffebee,stroke:#c62828,stroke-width:2px, color: #1a1a1a;
    classDef cloud fill:#fff3e0,stroke:#f57c00,stroke-width:2px, color: #1a1a1a;
    classDef db fill:#e8f5e9,stroke:#388e3c,stroke-width:2px, color: #1a1a1a;

    class Viewer viewer;
    class Admin admin;
    class S_admin admin;
    class S_public viewer;
    class Cloudinary cloud;
    class Aiven db;
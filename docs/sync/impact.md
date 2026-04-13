manual_updated: yes
faq_updated: no
justification_if_no_change: La FAQ no requereix canvis perquè els nous comportaments queden coberts al manual i al changelog.

Què ha canviat

- Donants incorpora segment `Eliminats` i permet restaurar registres eliminats des de la mateixa pantalla.
- L'eliminació de donants queda bloquejada si hi ha qualsevol moviment associat (actiu o arxivat).
- Moviments/remeses OUT persisteixen `contactType` explícit per contactes multirol i permeten vincle manual proveïdor/treballador quan cal.
- El resum del dashboard resol millor el càlcul de `missionTransfers` amb categories legacy.

Per què importa a l'usuari

- Evita eliminacions de donants amb traça fiscal/històrica existent.
- Dona control operatiu per recuperar donants eliminats sense suport tècnic.
- Redueix errors d'assignació en pagaments SEPA OUT quan un contacte pot actuar amb més d'un rol.

Com ho notarà

- A Donants apareix el segment `Eliminats` amb acció `Restaurar`.
- En eliminar un donant amb moviments, apareix bloqueig amb recompte en lloc de confirmació.
- Al divisor de remeses OUT es pot mantenir explícit el rol de contacte (proveïdor/treballador) en els fills.

Ha de fer alguna acció?

- No, però es recomana revisar els processos interns de baixa de donants per usar `Eliminats` + `Restaurar` com a flux estàndard.
